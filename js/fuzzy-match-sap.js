/* ==========================================================================
   Fuzzy Match SAP — จับคู่ BOQ material ↔ SAP purchase history
   ใช้ร่วมกับ js/purchase-history-sap.js (51,075 records)

   Algorithm: Token-Set Jaccard (60%) + Character-trigram Jaccard (40%)
   - Pre-bucket by bigram of normalized material → ~5–15 ms per BOQ item
   - Threshold: ≥0.85 exact, 0.70-0.84 fuzzy, 0.50-0.69 ask-user, <0.50 none
   - Unit conversion: only when product family + unit class known

   Public API:
     window.FuzzyMatchSAP.init(sapRecords)
     window.FuzzyMatchSAP.match(boqName, opts) → MatchResult
     window.FuzzyMatchSAP.matchMany(boqItems[]) → MatchResult[]
     window.FuzzyMatchSAP.getStats() → { bucketCount, recordCount, isReady }
   ========================================================================== */

(function (root) {
  'use strict';

  /* ---------- Thai-aware constants ---------- */
  const THAI_STOP_WORDS = new Set([
    'ค่า', 'บริการ', 'ติดตั้ง', 'วัสดุ', 'งาน', 'และ', 'หรือ', 'ของ', 'ที่', 'ใน',
    'สำหรับ', 'ทั้ง', 'ทุก', 'ต่อ', 'จาก', 'มาตรฐาน', 'อุปกรณ์', 'ชุด',
    'บริษัท', 'ห้างหุ้นส่วน', 'จำกัด', 'มหาชน', 'นาง', 'นาย'
  ]);

  const UNIT_TOKEN_REGEX = new RegExp(
    '(กก\\.?|kg|ถุง|ตัน|เส้น|ลบ\\.?ม\\.?|m³|m3|แผ่น|ม้วน|EA|UN|JOB|M2|m²|มม\\.?|mm|นิ้ว|cm|ซม\\.?|ม\\.?\\b|ชิ้น|ลิตร|ระบบ|รายการ|ท่อน|ตัว)',
    'gi'
  );

  const SIZE_REGEX = /[\d]+(\.\d+)?\s*(มม\.|cm|mm|นิ้ว|m|ม)?/g;

  const BRAND_SYNONYMS = [
    [/ปอร์ทแลนด์|ปอร์ตแลนด์/gi, 'ปูนซีเมนต์'],
    [/RB\s*\d+|DB\s*\d+/gi, 'เหล็กเส้น'],
    [/GI\s*/gi, 'ท่อเหล็ก'],
    [/HR\s*/gi, 'เหล็กแผ่น'],
    [/ตราช้าง|ตราเพชร/gi, ''],
  ];

  /* ---------- Unit conversion factor table ----------
     1 BOQ-unit = factor SAP-unit, for known product families.
     ใช้เมื่อ BOQ unit != SAP unit แต่ product family ตรงกัน.
  */
  const UNIT_FACTORS = {
    // เหล็กเส้น: 1 เส้น (10m × 0.888 กก./m for RB 12) ≈ 8.86 กก.
    'เหล็กเส้น': {
      'ตัน->เส้น': 112.86,   // 1 ตัน ≈ 112.86 เส้น (เฉลี่ย RB 12-25 mm)
      'กก.->เส้น': 0.1128,
      'm->เส้น': 0.1,
    },
    // เหล็กแผ่น: 1 แผ่น ≈ 4'x8' ≈ 2.36 kg/mm × 5mm ≈ 73.9 kg
    'เหล็กแผ่น': {
      'ตัน->แผ่น': 13.5,    // ขึ้นกับ thickness
      'กก.->แผ่น': 0.0135,
    },
    // ปูนซีเมนต์: 1 ถุง = 50 กก., 1 ตัน = 20 ถุง
    'ปูนซีเมนต์': {
      'ตัน->ถุง': 20,
      'กก.->ถุง': 0.02,
    },
    // ทราย / หิน: 1 คิว ≈ 1.6 ตัน, 1 ตัน ≈ 0.625 คิว
    'ทราย': {
      'คิว->ตัน': 1.6,
      'ตัน->คิว': 0.625,
    },
  };

  /* ---------- Tokenize ---------- */
  function normalize(s) {
    if (!s) return '';
    let n = String(s).normalize('NFC');
    // 1. Brand/synonym substitution FIRST (so "ปอร์ตแลนด์" → "ปูนซีเมนต์")
    for (const [re, rep] of BRAND_SYNONYMS) {
      n = n.replace(re, ' ' + (rep || '') + ' ');
    }
    // 2. Split on whitespace BEFORE stripping stop words
    //    (Thai words often concatenate without spaces — stop words embedded mid-string)
    const STOP_INSIDE = /(ค่า|บริการ|ติดตั้ง|วัสดุ|งาน|และ|หรือ|ของ|ที่|ใน|สำหรับ|ทั้ง|ทุก|จาก|มาตรฐาน|อุปกรณ์|ชุด|ตราเพชร|ตราช้าง|โครงการ)/g;
    n = n.split(/\s+/)
          .map(w => w.replace(STOP_INSIDE, ' '))
          .join(' ');
    // 3. Strip size tokens (numbers + size units)
    n = n.replace(SIZE_REGEX, ' ');
    // 4. Strip unit tokens
    n = n.replace(UNIT_TOKEN_REGEX, ' ');
    // 5. Filter, dedupe consecutive whitespace
    const words = n.split(/\s+/)
                   .map(w => w.trim())
                   .filter(w => {
                     if (!w) return false;
                     if (w.length < 2) return false;
                     if (THAI_STOP_WORDS.has(w.toLowerCase())) return false;
                     // pure-numeric filter
                     if (/^[\d.,]+$/.test(w)) return false;
                     return true;
                   });
    // 6. Dedupe consecutive duplicate tokens (e.g. "ปูน ปูนซีเมนต์" → "ปูนซีเมนต์")
    const out = [];
    let last = null;
    for (const w of words) {
      if (w !== last) out.push(w);
      last = w;
    }
    return out.join(' ').trim();
  }

  function tokenize(s) {
    const n = normalize(s);
    const tokens = new Set(n ? n.split(/[\s\/\-,()]+/).filter(t => t.length > 1) : []);
    const trigrams = new Set();
    const compact = n.replace(/\s/g, '');
    for (let i = 0; i < compact.length - 2; i++) {
      trigrams.add(compact.substr(i, 3));
    }
    return { tokens, trigrams, normalized: n, compact };
  }

  /* ---------- Jaccard (with prefix match for Thai substring ambiguity) ----------
     Thai tokens frequently overlap as substrings ("ปูน" vs "ปูนซีเมนต์").
     A pure set-equality Jaccard misses this. We treat short token as a
     "prefix match" against any token in the other set if the small token
     is a prefix (length >= 2) of a longer one. This boosts recall for the
     common BOQ↔SAP case where the unit/range words reorder.
  */
  function jaccard(a, b) {
    if (!a.size && !b.size) return 0;
    const arrA = Array.from(a);
    const arrB = Array.from(b);
    let inter = 0;
    // First pass: strict set membership
    const matched = new Set();
    for (const x of arrA) {
      if (b.has(x) && !matched.has(x)) { inter++; matched.add(x); }
    }
    for (const x of arrB) {
      if (a.has(x) && !matched.has(x)) { inter++; matched.add(x); }
    }
    // Second pass: prefix match (only short tokens not already matched)
    const longA = arrA.filter(t => t.length >= 3 && !matched.has(t));
    const longB = arrB.filter(t => t.length >= 3 && !matched.has(t));
    let prefixBonus = 0;
    for (const x of arrA) {
      if (matched.has(x) || x.length < 2) continue;
      // Is x a prefix (>= 2 chars) of any long token in b?
      for (const y of longB) {
        if (y.startsWith(x) && x.length >= 2) { prefixBonus += 0.5; matched.add(x); break; }
      }
    }
    for (const x of arrB) {
      if (matched.has(x) || x.length < 2) continue;
      for (const y of longA) {
        if (y.startsWith(x) && x.length >= 2) { prefixBonus += 0.5; matched.add(x); break; }
      }
    }
    const denom = a.size + b.size - (inter - 0);
    if (denom <= 0) return 0;
    return Math.min(1, (inter + prefixBonus) / denom);
  }

  function score(query, rec) {
    const tokenScore = jaccard(query.tokens, rec._t.tokens);
    const trigramScore = jaccard(query.trigrams, rec._t.trigrams);
    // Suffix-of match: every token in query is a prefix (≥2 chars) of a token in record
    // (handles case where record normalizes to longer single token: "ปูนซีเมนต์ปอร์ตแลนด์"
    // vs query normalizes to "ปูนซีเมนต์" → record's single token IS the query's token + more)
    let suffixScore = 0;
    if (query.tokens.size > 0) {
      const recArr = Array.from(rec._t.tokens);
      let covered = 0;
      for (const qt of query.tokens) {
        if (qt.length < 2) continue;
        if (rec._t.tokens.has(qt)) continue;        // already in tokenScore
        if (recArr.some(rt => rt.startsWith(qt))) covered++;
      }
      suffixScore = covered / query.tokens.size;
    }
    return 0.5 * tokenScore + 0.3 * trigramScore + 0.2 * suffixScore;
  }

  /* ---------- Bigram index ---------- */
  function bigramsOf(s) {
    if (!s || s.length < 2) return new Set();
    const out = new Set();
    const c = s.replace(/\s/g, '');
    for (let i = 0; i < c.length - 1; i++) out.add(c.substr(i, 2));
    return out;
  }

  /* ---------- State ---------- */
  let _records = [];
  let _index = null; // Map<bigram-string, indices[]>
  let _stats = { recordCount: 0, bucketCount: 0, isReady: false };
  let _buildPromise = null;

  /* ---------- Build index ---------- */
  function build(records) {
    const bucketMap = new Map();
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      r._t = tokenize(r.material || '');
      r._bigrams = bigramsOf(r._t.normalized);
      const key = r._t.compact.substr(0, 2);
      if (!key) continue;
      if (!bucketMap.has(key)) bucketMap.set(key, []);
      bucketMap.get(key).push(i);
    }
    _records = records;
    _index = bucketMap;
    _stats = {
      recordCount: records.length,
      bucketCount: bucketMap.size,
      isReady: true,
    };
    return _stats;
  }

  function init(records) {
    if (!records || !records.length) {
      _stats.isReady = false;
      return _stats;
    }
    if (_buildPromise) return _buildPromise;
    _buildPromise = new Promise((resolve) => {
      // Yield to UI: chunked build
      const CHUNK = 5000;
      let i = 0;
      function step() {
        const end = Math.min(i + CHUNK, records.length);
        for (; i < end; i++) {
          const r = records[i];
          r._t = tokenize(r.material || '');
          r._bigrams = bigramsOf(r._t.normalized);
        }
        if (i < records.length) {
          setTimeout(step, 0);
        } else {
          _records = records;
          _index = new Map();
          for (let j = 0; j < records.length; j++) {
            const r = records[j];
            const key = (r._t.compact || '').substr(0, 2);
            if (!key) continue;
            if (!_index.has(key)) _index.set(key, []);
            _index.get(key).push(j);
          }
          _stats = {
            recordCount: records.length,
            bucketCount: _index.size,
            isReady: true,
          };
          resolve(_stats);
        }
      }
      step();
    });
    return _buildPromise;
  }

  /* ---------- Candidate retrieval ---------- */
  function candidates(query) {
    const qBigrams = bigramsOf(query.normalized);
    const seen = new Set();
    const indices = [];
    for (const bg of qBigrams) {
      const arr = _index.get(bg);
      if (!arr) continue;
      for (const idx of arr) {
        if (!seen.has(idx)) { seen.add(idx); indices.push(idx); }
      }
    }
    return indices;
  }

  /* ---------- Match ---------- */
  function match(boqName, opts) {
    opts = opts || {};
    if (!_stats.isReady) return { matchStatus: 'none', topMatches: [], priceStats: null };

    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const query = tokenize(boqName);
    if (!query.normalized) return { matchStatus: 'none', topMatches: [], priceStats: null };

    const candIdx = candidates(query);
    const MAX_CAND = opts.maxCandidates || 3000;
    const candSlice = candIdx.slice(0, MAX_CAND);

    const scored = [];
    for (const i of candSlice) {
      if ((typeof performance !== 'undefined' && performance.now) ? (performance.now() - t0) > opts.timeBudgetMs : false) break;
      const r = _records[i];
      const s = score(query, r);
      scored.push({ record: r, score: s, material: r.material, unit: r.unit });
    }
    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, opts.K || 3).filter(x => x.score >= (opts.minScore || 0.40));
    if (!top.length) return { matchStatus: 'none', topMatches: [], priceStats: null };

    const best = top[0];
    let status;
    if (best.score >= 0.85) status = 'exact';
    else if (best.score >= 0.70) status = 'fuzzy';
    else status = 'ask-user';

    const priceStats = computePriceStats(top[0].record, opts.boqUnit || null, opts.boqName || boqName);

    return {
      boqItem: boqName,
      matchStatus: status,
      score: best.score,
      bestMatch: { material: best.material, unit: best.unit, supplier: best.record.supplier, date: best.record.date },
      topMatches: top.map(t => ({ material: t.material, unit: t.unit, score: t.score })),
      priceStats,
      chip: chipFromStatus(status, best),
    };
  }

  function matchMany(boqNames, opts) {
    return boqNames.map(n => match(n, opts));
  }

  /* ---------- Price stats ---------- */
  function computePriceStats(seedRecord, boqUnit, boqName) {
    // Gather all SAP records with the SAME normalized material (or prefix-of-it).
    // Look up by bigram buckets using the seed's tokens (sum of all token bigrams).
    const seedNorm = seedRecord._t.normalized;
    if (!seedNorm) return null;

    // Use ALL tokens of the seed to find every record sharing at least one prefix
    const seedTokens = Array.from(seedRecord._t.tokens);
    const seedBigrams = new Set();
    for (const t of seedTokens) {
      for (let i = 0; i < t.length - 1; i++) seedBigrams.add(t.substr(i, 2));
    }
    const seen = new Set();
    const same = [];
    for (const bg of seedBigrams) {
      const arr = _index.get(bg);
      if (!arr) continue;
      for (const i of arr) {
        if (seen.has(i)) continue;
        seen.add(i);
        const r = _records[i];
        // Match if normalized is identical OR one is a prefix of the other
        const a = r._t.normalized, b = seedNorm;
        if (!a || !b) continue;
        if (a === b || a.startsWith(b) || b.startsWith(a)) {
          same.push(r);
        }
      }
    }
    if (!same.length) same.push(seedRecord);

    let min = Infinity, max = -Infinity, sum = 0;
    const dates = [];
    let count = 0;
    for (const r of same) {
      const p = r.netPrice;
      if (typeof p !== 'number' || p <= 0) continue;
      if (p < min) min = p;
      if (p > max) max = p;
      sum += p;
      count++;
      if (r.date) dates.push(r.date);
    }
    if (!count) return null;
    const avg = sum / count;

    // unit conversion hint
    let unitConverted = null;
    if (boqUnit && seedRecord.unit && boqUnit !== seedRecord.unit) {
      const family = detectFamily(seedNorm);
      if (family && UNIT_FACTORS[family]) {
        const key = `${boqUnit}->${seedRecord.unit}`;
        const factor = UNIT_FACTORS[family][key];
        if (typeof factor === 'number') unitConverted = { from: boqUnit, to: seedRecord.unit, factor };
      }
    }

    return {
      avgNetPrice: round2(avg),
      minNetPrice: round2(min),
      maxNetPrice: round2(max),
      recordCount: count,
      currency: seedRecord.currency || 'THB',
      lastDate: dates.sort().slice(-1)[0] || null,
      unitConverted,
    };
  }

  function detectFamily(normalized) {
    if (/(ปูน|ซีเมนต์)/.test(normalized)) return 'ปูนซีเมนต์';
    if (/(เหล็กแผ่น|HR)/.test(normalized)) return 'เหล็กแผ่น';
    if (/(เหล็กเส้น|RB|DB)/.test(normalized)) return 'เหล็กเส้น';
    if (/(ทราย)/.test(normalized)) return 'ทราย';
    return null;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /* ---------- Chip ---------- */
  function chipFromStatus(status, best) {
    if (status === 'exact') return { kind: 'exact', label: 'จับคู่ตรงตัว' };
    if (status === 'fuzzy') return { kind: 'fuzzy', label: `จับคู่ ${Math.round(best.score * 100)}%` };
    if (status === 'ask-user') return { kind: 'ask', label: `เลือก (${Math.round(best.score * 100)}%)` };
    return { kind: 'none', label: 'ไม่พบ' };
  }

  /* ---------- Public API ---------- */
  window.FuzzyMatchSAP = {
    init,
    match,
    matchMany,
    normalize,
    tokenize,
    getStats() { return Object.assign({}, _stats); },
    /* expose for testing */
    _internal: { build, score, UNIT_FACTORS },
  };
})(typeof window !== 'undefined' ? window : this);
