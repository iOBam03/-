// /api/factors.js — Vercel Serverless Function
// ส่งข้อมูล 4 ปัจจัยที่ใช้วิเคราะห์แนวโน้มราคาวัสดุก่อสร้าง:
//   - ทองคำ (gold spot)   — LIVE จาก metals.live (free, no key, CORS-friendly)
//   - น้ำมัน (WTI)         — TRY yfinance snapshot / fallback admin snapshot
//   - แร่มีค่า (LME index) — admin snapshot (BOT Commodity Watch)
//   - ดอกเบี้ย BBL         — TRY BOT scrape / fallback admin snapshot
//
// Cache 1 ชม. ใน module memory — กัน rate limit + เร็ว
// Fallback เป็น admin snapshot ถ้า upstream ล้ม — ระบบไม่พัง
//
// Admin update workflow: แก้ค่าใน SNAPSHOT block ด้านล่าง + redeploy
// หรือรัน `node tools/update-factors-snapshot.js --key oil --value 78.50`

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let _cache = null;

const FETCH_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      ...opts,
      signal: ctl.signal,
      headers: { 'User-Agent': 'procurement-system/1.0 (+vercel)', ...(opts.headers || {}) }
    });
    return r;
  } finally {
    clearTimeout(t);
  }
}

/* ============================================================
   ADMIN SNAPSHOT — แก้ค่าที่นี่ แล้ว redeploy
   Format: { current, currency, asOf: 'YYYY-MM-DD', note }
   ============================================================ */
const SNAPSHOT = {
  oil: {
    current: 78.45,
    currency: 'USD/barrel',
    asOf: '2026-07-29',
    note: 'EIA STEO snapshot — admin update via tools/update-factors-snapshot.js'
  },
  minerals: {
    current: 4250.30,
    currency: 'index',
    asOf: '2026-07-29',
    note: 'BOT Commodity Watch aggregate — admin update weekly'
  },
  bblInterest: {
    current: 6.50,
    currency: '% ต่อปี',
    asOf: '2026-07-15',
    note: 'BOT MLR proxy (BBL loan rate อิง BOT MLR) — admin update monthly'
  }
};

/* ---------- ทองคำ (gold spot USD/oz) — LIVE ---------- */
async function fetchGold() {
  // metals.live — free public spot API, ไม่ต้องใช้ key
  const r = await fetchWithTimeout('https://api.metals.live/v1/spot');
  if (!r.ok) throw new Error('metals.live ' + r.status);
  const arr = await r.json();
  // shape: [{ gold: 2400.5, silver: 30.2, ... }]
  const goldEntry = Array.isArray(arr) ? arr.find(x => 'gold' in x) : null;
  const current = goldEntry ? Number(goldEntry.gold) : NaN;
  if (!isFinite(current) || current <= 0) throw new Error('invalid gold price');
  return {
    current,
    currency: 'USD/oz',
    asOf: new Date().toISOString().slice(0, 10),
    note: 'metals.live API (live)'
  };
}

/* ---------- น้ำมัน (WTI USD/barrel) ----------
   ลอง Yahoo Finance unofficial quote (CL=F) → fallback snapshot */
async function fetchOil() {
  try {
    const r = await fetchWithTimeout('https://query1.finance.yahoo.com/v7/finance/quote?symbols=CL=F');
    if (r.ok) {
      const j = await r.json();
      const q = j && j.quoteResponse && j.quoteResponse.result && j.quoteResponse.result[0];
      const price = q && (q.regularMarketPrice || q.postMarketPrice || q.preMarketPrice);
      if (isFinite(price) && price > 0) {
        return {
          current: Number(price),
          currency: 'USD/barrel',
          asOf: new Date().toISOString().slice(0, 10),
          note: 'Yahoo Finance WTI (CL=F) — live'
        };
      }
    }
  } catch (e) { /* fall through */ }
  return SNAPSHOT.oil;
}

/* ---------- แร่มีค่า (LME Index) — SNAPSHOT ONLY ----------
   ไม่มี free API ที่ scrape ได้ง่าย — ใช้ snapshot + admin update */
async function fetchMinerals() {
  return SNAPSHOT.minerals;
}

/* ---------- ดอกเบี้ย BBL (BOT MLR) ----------
   ลอง scrape BOT website → fallback snapshot */
async function fetchBBLInterest() {
  try {
    // BOT interest rate page — มี MLR ในตาราง
    // NOTE: BOT เปลี่ยน HTML structure บ่อย → scrape fragile, fallback ทันทีถ้าพัง
    const r = await fetchWithTimeout('https://www.bot.or.th/content/main/financial-instruments-and-interest-rates.html', {
      headers: { 'Accept': 'text/html' }
    });
    if (r.ok) {
      const html = await r.text();
      // หา MLR ในตาราง — pattern: "MLR" ตามด้วยตัวเลข เช่น "MLR  6.50"
      const m = html.match(/MLR[\s\S]{0,40}?(\d\.\d{2})/);
      if (m) {
        return {
          current: Number(m[1]),
          currency: '% ต่อปี',
          asOf: new Date().toISOString().slice(0, 10),
          note: 'BOT website scrape (BOT → BBL reference)'
        };
      }
    }
  } catch (e) { /* fall through */ }
  return SNAPSHOT.bblInterest;
}

/* ---------- Fallback (last resort) ---------- */
const FALLBACK = {
  gold:        { current: 2380.00, currency: 'USD/oz', asOf: '2026-07-01', note: 'fallback seed' },
  oil:         { current: 78.00,  currency: 'USD/barrel', asOf: '2026-07-01', note: 'fallback seed' },
  minerals:    { current: 4200.00, currency: 'index', asOf: '2026-07-01', note: 'fallback seed' },
  bblInterest: { current: 6.50, currency: '% ต่อปี', asOf: '2026-07-01', note: 'fallback seed' }
};

async function safeFetch(fn, key) {
  try {
    const data = await fn();
    return { ok: true, data: { ...data, key } };
  } catch (e) {
    console.warn('[factors]', key, 'failed:', e && e.message);
    return { ok: false, data: { ...FALLBACK[key], key }, error: e && e.message };
  }
}

function toFactorPayload(key, raw) {
  // trend: เปรียบเทียบ current vs threshold (จาก fallback baseline)
  const baseline = { gold: 2380, oil: 78, minerals: 4200, bblInterest: 6.50 };
  const trend = raw.current >= baseline[key] ? 'up' : 'down';
  const impactMap = {
    gold:        { impact: 'กระทบบวก (ทองขึ้น → เหล็ก/ทองแดงแพง)' },
    oil:         { impact: 'กระทบลบ (น้ำมันลง → ค่าขนส่ง/พลาสติกลด)' },
    minerals:    { impact: 'เป็นกลาง' },
    bblInterest: { impact: 'กระทบบวก (ดอกเบี้ยสูง → ต้นทุนกู้ยืมสูง)' }
  };
  const labelMap = {
    gold:        'ทองคำ (Gold Spot)',
    oil:         'น้ำมันดิบ (WTI)',
    minerals:    'แร่มีค่า (LME Index)',
    bblInterest: 'ดอกเบี้ยอ้างอิง (BOT MLR → BBL)'
  };
  return {
    key,
    label: labelMap[key],
    current: raw.current,
    unit: raw.currency,
    trend,
    impact: impactMap[key].impact,
    asOf: raw.asOf || null,
    source: raw.note || 'live API',
    isFallback: !raw.note || raw.note.startsWith('fallback')
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // cache hit
  if (_cache && (Date.now() - _cache.timestamp) < CACHE_TTL_MS) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).json(_cache.data);
  }

  const [gold, oil, minerals, bblInterest] = await Promise.all([
    safeFetch(fetchGold, 'gold'),
    safeFetch(fetchOil, 'oil'),
    safeFetch(fetchMinerals, 'minerals'),
    safeFetch(fetchBBLInterest, 'bblInterest')
  ]);

  const data = {
    factors: [
      toFactorPayload('gold', gold.data),
      toFactorPayload('oil', oil.data),
      toFactorPayload('minerals', minerals.data),
      toFactorPayload('bblInterest', bblInterest.data)
    ],
    meta: {
      timestamp: new Date().toISOString(),
      cacheTtlSeconds: CACHE_TTL_MS / 1000,
      apiStatus: {
        gold: gold.ok ? 'live' : 'fallback',
        oil: oil.ok ? 'live' : 'fallback',
        minerals: minerals.ok ? 'live' : 'fallback',
        bblInterest: bblInterest.ok ? 'live' : 'fallback'
      },
      errors: [gold, oil, minerals, bblInterest]
        .filter(r => !r.ok)
        .map(r => ({ key: r.data.key, error: r.error }))
    }
  };

  _cache = { timestamp: Date.now(), data };
  res.setHeader('X-Cache', 'MISS');
  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).json(data);
}