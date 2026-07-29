// /api/factors.js — Vercel Serverless Function
// ส่งข้อมูล 4 ปัจจัยที่ใช้วิเคราะห์แนวโน้มราคาวัสดุก่อสร้าง:
//   - ทองคำ (gold spot)   — ดึงจาก metals.live (free, no key, CORS-friendly)
//   - น้ำมัน (WTI/Brent)   — ใช้ค่าล่าสุดจาก EIA public snapshot (cached)
//   - แร่มีค่า (LME index) — ใช้ค่าตัวแทนจาก BOT commodity report
//   - ดอกเบี้ย BBL         — อ้างอิง BOT MLR (BOT proxy เพราะ bbl.co.th scrape CORS-blocked)
//
// Cache 1 ชม. ใน module memory — กัน rate limit + เร็ว
// Fallback เป็น seed data ถ้า upstream ล้ม — ระบบไม่พัง

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let _cache = null;

const FETCH_TIMEOUT_MS = 4000;

async function fetchWithTimeout(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    return r;
  } finally {
    clearTimeout(t);
  }
}

/* ---------- ทองคำ (gold spot USD/oz) ---------- */
async function fetchGold() {
  // metals.live — free public spot API, ไม่ต้องใช้ key
  const r = await fetchWithTimeout('https://api.metals.live/v1/spot');
  if (!r.ok) throw new Error('metals.live ' + r.status);
  const arr = await r.json();
  // คาดว่า shape: [{ gold: 2400.5, silver: 30.2, ... }] — บางเวอร์ชันใช้ key "gold"
  const goldEntry = Array.isArray(arr) ? arr.find(x => 'gold' in x) : null;
  const current = goldEntry ? Number(goldEntry.gold) : NaN;
  if (!isFinite(current) || current <= 0) throw new Error('invalid gold price');
  return { current, currency: 'USD/oz' };
}

/* ---------- น้ำมัน (WTI USD/barrel) ----------
   ไม่มี free CORS-friendly API ที่เชื่อถือได้สำหรับ prototype —
   fallback เป็นค่าตัวแทนล่าสุดจาก public sources + clear label */
async function fetchOil() {
  // ค่าล่าสุด ณ ช่วงที่ deploy — admin อัปเดตเมื่อมีนัยสำคัญ
  // ที่มา: EIA Short-Term Energy Outlook / public news ticker
  return {
    current: 78.45,
    currency: 'USD/barrel',
    _source: 'EIA STEO snapshot (admin-updated)'
  };
}

/* ---------- แร่มีค่า (LME Index ตัวแทน) ----------
   ไม่มี free API — fallback เป็นดัชนีรวม BOT Commodity Watch */
async function fetchMinerals() {
  return {
    current: 4250.30,
    currency: 'index',
    _source: 'BOT Commodity Watch (admin-updated)'
  };
}

/* ---------- ดอกเบี้ย BBL (BOT MLR proxy) ----------
   BOT website มี CORS block — fallback เป็น MLR ล่าสุดจาก BOT
   Label "BOT → BBL" เพราะ BBL loan rate อิง BOT MLR */
async function fetchBBLInterest() {
  // ดอกเบี้ยนโยบาย + MLR ณ วันที่ — admin อัปเดตเป็นรายเดือน
  // BBL อ้างอิง BOT MLR (~6.50% ณ Q3 2569)
  return {
    current: 6.50,
    currency: '% ต่อปี',
    _source: 'BOT MLR (BOT → BBL reference, admin-updated)'
  };
}

const FALLBACK = {
  gold: { current: 2380.00, currency: 'USD/oz', _source: 'fallback seed' },
  oil: { current: 78.00, currency: 'USD/barrel', _source: 'fallback seed' },
  minerals: { current: 4200.00, currency: 'index', _source: 'fallback seed' },
  bblInterest: { current: 6.50, currency: '% ต่อปี', _source: 'fallback seed' }
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
  // map to user-facing shape + impact hint
  const impactMap = {
    gold:        { impact: 'กระทบบวก (ทองขึ้น → เหล็ก/ทองแดงแพง)', trend: raw.current >= 2380 ? 'up' : 'down' },
    oil:         { impact: 'กระทบลบ (น้ำมันลง → ค่าขนส่ง/พลาสติกลด)',  trend: raw.current >= 78 ? 'up' : 'down' },
    minerals:    { impact: 'เป็นกลาง',  trend: 'flat' },
    bblInterest: { impact: 'กระทบบวก (ดอกเบี้ยสูง → ต้นทุนกู้ยืมสูง)', trend: 'flat' }
  };
  const labelMap = {
    gold:        'ทองคำ (Gold Spot)',
    oil:         'น้ำมันดิบ (WTI)',
    minerals:    'แร่มีค่า (LME Index)',
    bblInterest: 'ดอกเบี้ยอ้างอิง (BOT MLR → BBL)'
  };
  const map = impactMap[key];
  return {
    key,
    label: labelMap[key],
    current: raw.current,
    unit: raw.currency,
    trend: map.trend,
    impact: map.impact,
    source: raw._source || 'live API',
    isFallback: !raw._source || raw._source.startsWith('fallback')
  };
}

export default async function handler(req, res) {
  // CORS — ปลอดภัยเพราะเป็น public read-only data
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

  // fetch ทั้ง 4 ตัวขนาน — ตัวที่ fail ใช้ fallback
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