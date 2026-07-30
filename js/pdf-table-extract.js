/* ============================================================
 *  PDF Table Extract (PDF.js based)
 *  -----------------------------------------------------------
 *  ดึง "BOQ rows" จาก PDF ตรงๆ ด้วย PDF.js (Mozilla) — ไม่ผ่าน AI
 *  ใช้ heuristic: group text items ตาม Y position, หาแถวที่มี
 *  text + ตัวเลข + หน่วย → เป็น BOQ row
 *
 *  Public API (window.PdfTableExtract):
 *    - extract(file, opts) → Promise<{ pages, rows, quality }>
 *    - isPdfjsReady() → boolean
 *    - setWorkerSrc(src) — override worker URL (default: ../vendor/pdf.worker.min.js)
 *    - normalize(s) — utility (NFC + ลบวรรณยุกต์ซ้ำซ้อน)
 *
 *  Quality score (0..1):
 *    - hasHeader:  +0.20 ถ้าเจอแถวหัวตาราง (มี keyword: ลำดับ/ที่/รายการ/จำนวน/หน่วย/ราคา)
 *    - rowCount:   +0.30 ถ้า ≥5 rows, +0.15 ถ้า ≥2 rows
 *    - fieldCoverage: +0.50 × (% rows ที่มี name + qty + unit)
 *
 *  ถ้า quality.score < 0.40 → ควร fallback ไป AI scan
 * ============================================================ */
(function (root) {
  'use strict';

  // ---------- PDF.js loader (ทนต่อ CDN โดนบล็อก) ----------
  let _pdfjs = null;
  let _workerSrcOverride = null;
  function _getPdfjs() {
    if (_pdfjs) return _pdfjs;
    if (typeof window === 'undefined') return null;
    if (typeof window.pdfjsLib !== 'undefined') {
      _pdfjs = window.pdfjsLib;
    } else if (typeof window['pdfjs-dist/build/pdf'] !== 'undefined') {
      _pdfjs = window['pdfjs-dist/build/pdf'];
    } else if (typeof globalThis !== 'undefined' && typeof globalThis.pdfjsLib !== 'undefined') {
      _pdfjs = globalThis.pdfjsLib;
    }
    if (_pdfjs) {
      try {
        _pdfjs.GlobalWorkerOptions = _pdfjs.GlobalWorkerOptions || {};
        if (_workerSrcOverride) {
          _pdfjs.GlobalWorkerOptions.workerSrc = _workerSrcOverride;
        } else if (!_pdfjs.GlobalWorkerOptions.workerSrc) {
          // default: สมมติว่าไฟล์นี้อยู่ใต้ /js/, worker อยู่ที่ /vendor/
          _pdfjs.GlobalWorkerOptions.workerSrc = '../vendor/pdf.worker.min.js';
        }
      } catch (_) { /* ignore */ }
    }
    return _pdfjs;
  }

  // ---------- Unit table (BOQ หน่วยที่พบบ่อย) ----------
  // หน่วยที่ "ตามด้วยตัวเลข" = น่าจะเป็น unit ของแถว (priority สูง)
  // หน่วยที่ "อยู่ในคำ" เช่น เสาใน เสาเข็ม = น่าจะเป็นส่วนหนึ่งของชื่อ
  const UNIT_TOKENS = [
    'กก.', 'กิโลกรัม', 'กิโล', 'kg', 'KG', 'Kg',
    'ตัน', 'ton', 'TON', 'Tons',
    'กรัม', 'g', 'mg',
    'เมตร', 'm.', 'm', 'M', 'เมตร²', 'ตร.ม.', 'ตรม.', 'm²', 'm3', 'm³',
    'ลบ.ม.', 'ลบ.ม', 'ลูกบาศก์เมตร',
    'ตารางเมตร', 'ตารางวา', 'ตร.ว.', 'ตรว.',
    'ซม.', 'cm', 'mm', 'mm.',
    'ชิ้น', 'แผ่น', 'ท่อน', 'ม้วน', 'ถุง', 'ลัง', 'ลังละ',
    'ลิตร', 'ล.', 'ลิตร.',
    'ชุด', 'ชุดละ', 'ตู้', 'ใบ', 'เล่ม', 'เล่มละ',
    'ดอก', 'ต้น', 'ผืน', 'ผื่น', 'ลูก', 'ก้อน', 'แท่ง', 'คัน',
    'เส้น', 'หลอด', 'กล่อง', 'ตลับ', 'ขวด', 'ถัง', 'ถ้วย',
    'ไม้', 'ท่อ', 'เสา', 'ตอม่อ', 'คาน',
    '%', 'เปอร์เซ็นต์',
  ];
  // regex สำหรับ "strong" matches — unit ตามด้วยตัวเลข (priority 1)
  // เช่น "ต้น 3500" → ต้นถูกต้อง, ไม่ใช่ "เสา" ใน "เสาเข็ม"
  function _escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  const UNIT_NUM_REGEX = new RegExp(
    '(' + UNIT_TOKENS.map(_escapeRe).sort((a, b) => b.length - a.length).join('|') + ')',
    'gi'
  );
  const UNIT_REGEX = new RegExp(
    '(' + UNIT_TOKENS.map(_escapeRe).sort((a, b) => b.length - a.length).join('|') + ')',
    'i'
  );
  // Set for exact-match lookups (case-insensitive)
  const UNIT_SET = new Set(UNIT_TOKENS.map(u => u.toLowerCase()));
  function _isExactUnit(token) {
    if (!token) return false;
    return UNIT_SET.has(String(token).toLowerCase().trim());
  }

  // ---------- Header / footer keyword ----------
  const HEADER_KEYWORDS = ['ลำดับ', 'ลําดับ', 'ที่', 'รายการ', 'จำนวน', 'จํานวน', 'ปริมาณ', 'หน่วย', 'ราคา', 'ราคา/หน่วย', 'รวม', 'บาท', 'WD', 'BOQ', 'Bill', 'Quantit'];
  const SKIP_KEYWORDS = [
    'ใบเสนอราคา', 'บริษัท', 'ห้างหุ้นส่วน', 'จำกัด', 'มหาชน',
    'โทร', 'Fax', 'ที่อยู่', 'วันที่', 'ลงวันที่', 'หน้า',
    'ลายเซ็น', 'ผู้เสนอ', 'ผู้อนุมัติ', 'ผู้จัดทำ',
    'ฝ่าย', 'แผนก', 'กอง', 'แผนงาน', 'งบประมาณ',
    'ผู้รับจ้าง', 'ผู้ว่าจ้าง', 'โครงการ', 'แบบเลขที่',
    'รายการประกอบแบบ', 'หมายเหตุ', 'หมายเหตุ:',
  ];
  const SUPPLIER_KEYWORDS = [
    /บริษัท\s*.+/i,
    /ห้างหุ้นส่วน\s*.+/i,
    /จำกัด/i,
    /มหาชน/i,
    /บจก\./i,
    /หจก\./i,
    /บมจ\./i,
    /Co\.,?\s*Ltd/i,
    /Limited/i,
  ];

  // ---------- Numeric regex ----------
  // รองรับทั้ง "1,200" (มี comma) และ "3500" (ไม่มี comma) โดยไม่หั่น "3500" → ["350","0"]
  const NUM_REGEX = /-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/g;
  const PRICE_REGEX = /(?:ราคา|รวม|จำนวนเงิน|บาท|baht|THB)/i;

  // ---------- Normalize ----------
  function normalize(s) {
    if (s == null) return '';
    let x = String(s).replace(/ /g, ' ');
    try { x = x.normalize('NFC'); } catch (_) { /* old browser */ }
    x = x.replace(/\s+/g, ' ').trim();
    return x;
  }

  // ---------- Group PDF.js text items into lines ----------
  function _groupItemsToLines(items) {
    if (!items || items.length === 0) return [];

    // items[i].transform = [scaleX, skewY, skewX, scaleY, translateX, translateY]
    // sort by Y descending (PDF coords: 0 at bottom), then X ascending
    const sorted = items.slice().sort((a, b) => {
      const ya = a.transform[5];
      const yb = b.transform[5];
      if (Math.abs(ya - yb) > 2.5) return yb - ya;
      return a.transform[4] - b.transform[4];
    });

    const lines = [];
    let curLine = null;
    let curY = null;
    for (const it of sorted) {
      const y = it.transform[5];
      const x = it.transform[4];
      if (curLine == null || Math.abs(y - curY) > 2.5) {
        if (curLine) lines.push(curLine);
        curLine = { y, items: [] };
        curY = y;
      }
      curLine.items.push({ x, str: it.str, w: it.width || 0 });
    }
    if (curLine) lines.push(curLine);

    // sort items in each line by x, then join with space
    for (const ln of lines) {
      ln.items.sort((a, b) => a.x - b.x);
      // join: รวม string ที่อยู่ติดกัน (gap < 2px) ติดกัน
      let text = '';
      let lastEnd = -Infinity;
      for (const it of ln.items) {
        const gap = it.x - lastEnd;
        if (gap > 2.5) text += ' ';
        text += it.str;
        lastEnd = it.x + (it.w || 0);
      }
      ln.text = normalize(text);
    }
    return lines;
  }

  // ---------- Check if line looks like BOQ row ----------
  function _lineHasUnit(s) {
    return UNIT_REGEX.test(s);
  }
  function _lineHasNumber(s) {
    const m = s.match(NUM_REGEX);
    return m && m.length > 0;
  }
  function _lineHasNumberCount(s) {
    const m = s.match(NUM_REGEX);
    return m ? m.length : 0;
  }
  function _lineHasKeyword(s, kw) {
    return kw.some(k => s.indexOf(k) !== -1);
  }
  function _lineLooksLikeHeader(line) {
    const t = line.text;
    if (t.length < 3) return false;
    let hits = 0;
    for (const k of HEADER_KEYWORDS) if (t.indexOf(k) !== -1) hits++;
    return hits >= 2; // ต้องเจอ ≥2 keyword ถึงจะนับเป็นหัวตาราง
  }
  function _lineLooksLikeSkip(line) {
    const t = line.text;
    if (t.length < 3) return false;
    return SKIP_KEYWORDS.some(k => t.indexOf(k) !== -1);
  }

  // ---------- Extract BOQ rows from lines ----------
  /**
   * แต่ละ row:
   *   - number (ลำดับ ถ้ามี)
   *   - text (ชื่อรายการ — รวม text ทั้งหมดที่ไม่ใช่ number/unit)
   *   - qty (ตัวเลขแรกที่ไม่ใช่ลำดับ)
   *   - unit (ถ้าเจอ)
   *   - price (ตัวเลขสุดท้าย — ราคา/หน่วยหรือราคารวม)
   */
  function _extractRowFromLine(line, headerRowSeen) {
    const raw = line.text;
    if (!raw || raw.length < 4) return null;
    if (_lineLooksLikeSkip(line)) return null;

    const nums = raw.match(NUM_REGEX);
    if (!nums || nums.length === 0) return null;

    // หา unit — priority 1: unit ที่ "ตามด้วยตัวเลข" (exact match เท่านั้น)
    //              priority 2: unit แรกที่เจอในสตริง (exact match)
    let unitMatch = null;
    let unit = '';
    const numFollowedUnitRe = /(\d+(?:\.\d+)?)\s*(\S+)/g;
    const numUnitCandidates = [];
    let mu;
    while ((mu = numFollowedUnitRe.exec(raw)) !== null) {
      const candidate = mu[2];
      // exact match เท่านั้น — ป้องกัน "เสาเข็ม" match กับ "เสา" / "12mm" match กับ "mm"
      if (_isExactUnit(candidate)) {
        numUnitCandidates.push({
          candidate,
          matchIdx: mu.index + String(mu[1]).length,
          raw: mu[0],
        });
      }
    }
    if (numUnitCandidates.length > 0) {
      // เลือก candidate ที่อยู่หลังสุด (ใกล้ qty จริงมากที่สุด)
      const last = numUnitCandidates[numUnitCandidates.length - 1];
      unit = last.candidate;
      unitMatch = { 0: unit, 1: unit, index: last.matchIdx, input: raw };
    } else {
      // fallback: หา unit แรกที่เป็น exact token (ใช้ \b boundary)
      const m1 = raw.match(new RegExp('\\b(' + Array.from(UNIT_SET).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|') + ')\\b', 'i'));
      if (m1) {
        unit = m1[1];
        unitMatch = m1;
      }
    }

    // ลบ unit ออกจากสตริงชั่วคราวเพื่อ parse ตัวเลขสะอาดๆ
    let cleaned = raw;
    if (unit) cleaned = cleaned.replace(unitMatch[0], ' ');

    // ดึงตัวเลขที่เหลือ
    const cleanedNums = cleaned.match(NUM_REGEX);
    if (!cleanedNums || cleanedNums.length === 0) return null;

    // heuristic: ถ้าไม่มี unit และตัวเลขน้อยกว่า 2 → น่าจะไม่ใช่ row
    if (!unit && cleanedNums.length < 2) return null;
    if (!unit && cleanedNums.length === 1) {
      // single number with no unit — อาจเป็น description line ไม่ใช่ row
      return null;
    }

    // qty = ตัวเลขแรก (หรือที่สอง ถ้าตัวแรกดูเป็น "ลำดับ")
    const numVals = cleanedNums.map(n => parseFloat(n.replace(/,/g, '')));
    let qtyIdx = 0;
    let qty = numVals[0];
    // ถ้าตัวเลขแรกเป็นจำนวนเต็มเล็ก (1-999) และตัวเลขที่สองเป็นทศนิยม → ใช้อันที่สองเป็น qty
    if (numVals.length >= 2 && Number.isInteger(numVals[0]) && numVals[0] < 1000 && !Number.isInteger(numVals[1])) {
      qtyIdx = 1;
      qty = numVals[1];
    }

    // price = ตัวเลขสุดท้าย (ถ้ามี ≥2 ตัว)
    let price = null;
    if (numVals.length >= 2 && qtyIdx < numVals.length - 1) {
      // ใช้ตัวเลขสุดท้ายที่อยู่หลัง qty
      const lastNum = numVals[numVals.length - 1];
      if (lastNum > 0) price = lastNum;
    }

    // หาชื่อรายการ — ลบตัวเลขและ unit ออก
    let name = raw;
    // ลบ unit
    if (unit) name = name.replace(unitMatch[0], '');
    // ลบตัวเลข (replace ทีละตัวเพื่อไม่ให้ลบ space ผิด)
    for (const n of nums) {
      name = name.replace(n, ' ');
    }
    name = normalize(name);
    // ลบ leading "ลำดับ ที่" pattern เช่น "1." "1)" "1 " ที่อยู่หน้าสุด
    name = name.replace(/^(\d{1,4})[\.\)\-\s]+/, '').trim();
    // ลบ special chars ที่ไม่ต้องการ (เก็บ / + - =)
    name = name.replace(/[​-‏﻿]/g, ''); // zero-width
    name = name.replace(/\s{2,}/g, ' ').trim();

    if (name.length < 2) return null; // ต้องมีชื่อรายการ

    // ถ้าตรวจเจอว่าเป็น "ชื่อ supplier" อย่างเดียว → ข้าม
    if (SUPPLIER_KEYWORDS.some(rx => rx.test(name)) && !unit) return null;

    return {
      no: numVals[0] && Number.isInteger(numVals[0]) && numVals[0] < 10000 ? numVals[0] : null,
      name,
      qty: qty != null ? qty : 1,
      unit: unit || '',
      price: price,
      _raw: raw,
    };
  }

  // ---------- Main extract ----------
  async function extract(file, opts) {
    opts = opts || {};
    const maxPages = opts.maxPages || 30;
    const minQualityForAccept = opts.minQualityForAccept || 0.40;

    const pdfjs = _getPdfjs();
    if (!pdfjs) {
      throw new Error('ไม่พบ PDF.js — ตรวจสอบว่าโหลด vendor/pdf.min.js');
    }
    if (!file) throw new Error('ไม่ได้ระบุไฟล์ PDF');

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      // suppress warnings ใน console
      verbosity: 0,
      // ใน Node test mode ต้อง disableWorker
      disableWorker: typeof window === 'undefined' || (typeof window.document === 'undefined'),
      isEvalSupported: false,
    });

    let pdf;
    try {
      pdf = await loadingTask.promise;
    } catch (e) {
      throw new Error('ไม่สามารถอ่าน PDF ได้ — ไฟล์อาจเสียหายหรือถูกเข้ารหัส');
    }

    const totalPages = Math.min(pdf.numPages, maxPages);
    const allLines = [];
    const pagesMeta = [];

    for (let p = 1; p <= totalPages; p++) {
      try {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        const lines = _groupItemsToLines(tc.items);
        allLines.push({ page: p, lines });
        pagesMeta.push({ page: p, lineCount: lines.length });
      } catch (e) {
        pagesMeta.push({ page: p, error: e.message });
      }
    }

    // ตรวจ header และ extract rows
    let headerSeen = false;
    const rows = [];
    let totalCandidateLines = 0;

    for (const pg of allLines) {
      for (const line of pg.lines) {
        if (!headerSeen && _lineLooksLikeHeader(line)) {
          headerSeen = true;
          continue;
        }
        if (_lineLooksLikeHeader(line)) continue; // ข้ามแถวหัวซ้ำ

        const row = _extractRowFromLine(line, headerSeen);
        if (row) {
          row.page = pg.page;
          rows.push(row);
          totalCandidateLines++;
        }
      }
    }

    // ---------- Quality scoring ----------
    let score = 0;
    if (headerSeen) score += 0.20;
    if (rows.length >= 5) score += 0.30;
    else if (rows.length >= 2) score += 0.15;

    let withAllFields = 0;
    for (const r of rows) {
      const hasName = r.name && r.name.length >= 2;
      const hasQty = r.qty != null && !isNaN(r.qty) && r.qty > 0;
      const hasUnit = r.unit && r.unit.length > 0;
      if (hasName && hasQty && hasUnit) withAllFields++;
    }
    const fieldCoverage = rows.length > 0 ? (withAllFields / rows.length) : 0;
    score += 0.50 * fieldCoverage;

    // ---------- De-dup near-identical rows (บาง PDF render ซ้ำ) ----------
    const dedup = [];
    const seenKey = new Set();
    for (const r of rows) {
      const key = (r.name + '|' + r.qty + '|' + r.unit).toLowerCase();
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      dedup.push(r);
    }

    const quality = {
      score: Math.round(score * 100) / 100,
      isAcceptable: score >= minQualityForAccept,
      hasHeader: headerSeen,
      rowCount: dedup.length,
      rawRowCount: rows.length,
      fieldCoverage: Math.round(fieldCoverage * 100) / 100,
      withAllFields,
      pagesScanned: totalPages,
      pagesTotal: pdf.numPages,
      threshold: minQualityForAccept,
      recommendation: score >= minQualityForAccept ? 'use-direct' : 'use-ai',
    };

    return {
      pages: pagesMeta,
      rows: dedup,
      quality,
    };
  }

  // ---------- Public API ----------
  const PdfTableExtract = {
    extract,
    isPdfjsReady: () => !!_getPdfjs(),
    setWorkerSrc: (src) => { _workerSrcOverride = src; },
    normalize,
    UNIT_REGEX,
    UNIT_TOKENS,
    HEADER_KEYWORDS,
    SKIP_KEYWORDS,
  };

  // ---------- Export ----------
  if (typeof window !== 'undefined') {
    window.PdfTableExtract = PdfTableExtract;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PdfTableExtract;
  }

})(typeof self !== 'undefined' ? self : this);
