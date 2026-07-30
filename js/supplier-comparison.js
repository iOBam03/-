/* ==========================================================================
   Supplier Comparison Module (ใบเปรียบเทียบราคาผู้ขาย)

   ทำงานร่วมกับ alerts.html — เป็นโหมดที่สองของหน้า
   ใช้สำหรับ:
   - อัปโหลด / แปะไฟล์ .xlsx ที่มีราคาผู้ขายหลายรายเทียบกัน (จำนวนไม่ fix)
   - แสดงตารางเปรียบเทียบราคา ไฮไลต์ผู้ที่ถูกสุดต่อรายการ (visual เท่านั้น)
   - ให้ผู้ใช้เลือกผู้ชนะด้วยตัวเอง (ไม่ auto-pick)
   - สร้างข้อความ "สรุปให้...เป็นผู้ดำเนินการ..." ที่แก้ไขได้
   - แสดงช่องจัดเตรียมเอกสาร (เตรียมรายชื่อ + ตำแหน่ง ไว้ประทับลายเซ็นจริงตอนพิมพ์)
   - พิมพ์ / บันทึก PDF ผ่าน window.print()
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- State ---------- */
  const STATE_KEY = 'procurement:supplier-compare:v2';
  const MAX_PERSIST_BYTES = 4 * 1024 * 1024; // 4MB — localStorage quota safety

  const DEFAULT_SIGNATURES = {
    preparer: [
      { title: 'Section Manager', name: 'คุณวิมลรัตน์  สิทธิโคตร' },
    ],
    reviewers: [
      { title: 'Vice President #2', name: 'คุณอัศวิน  รองหานาม' },
    ],
    approvers: {
      label: 'คณะกรรมการจัดซื้อจัดจ้าง (อนุมัติ) (วงเงินเกิน 500,000-30,000,000 บาท)',
      people: [
        { title: 'Assistant Vice President #1', name: 'คุณกิตติพจน์  พันธ์ประจิตร' },
        { title: 'Assistant Vice President #1', name: 'คุณทศพร  ยุทธศักดิ์' },
        { title: 'Senior Vice President #2', name: 'คุณศิริรัตน์  โรจนวิภาต' },
        { title: 'Senior Managing Director', name: 'คุณเกรียงศักดิ์  เหี้ยมโท้' },
      ],
    },
    executives: {
      label: 'คณะกรรมการบริหาร (อนุมัติ) (วงเงินเกิน 30,000,000 บาท)',
      people: [
        { title: 'Deputy Chief Executive Officer', name: 'คุณวราภรณ์ จาวโกนันท์' },
        { title: 'Chief Executive Officer', name: '' },
      ],
    },
  };

  const state = {
    fileName: '',
    workName: '',          // เช่น "งานวงกบประตู"
    thresholdLabel: '',    // เช่น "วงเงินเกิน 500,000 ขึ้นไป"
    sheets: [],            // [{ name, items: [...], isFinalShortlist }]
    activeSheetIdx: 0,
    winnerByItem: {},      // { itemIdx: supplierIdx } — manual picks
    conclusionSupplier: '',
    conclusionReason: '',
    // ค่าเริ่มต้นตามไฟล์ต้นฉบับ BLESSINI — ผู้ใช้แก้ไขได้ในหน้าเว็บ
    signatures: JSON.parse(JSON.stringify(DEFAULT_SIGNATURES)),
    terms: {},             // { supplierIdx: { key: value } }
    selectedTermsVendorIdx: null,  // idx ของ vendor ที่เลือกในหน้า terms (null = auto)
    extraTermsVendors: [],        // [{ id, name, terms: {key:value} }] — vendor ที่เพิ่มเอง
    sortByCheapest: false,        // toggle: เรียงแถวตามราคาต่ำสุด (ถูกสุดอยู่บน)

    // ── NEW: mode discriminator ───────────────────────────────
    mode: 'single',                      // 'single' | 'multi-boq'

    // ── NEW: multi-BOQ sub-state ──────────────────────────────
    multiBOQ: {
      workName: '',
      thresholdLabel: '',
      files: [],                         // [{ id, fileName, supplierName, items:[{name,qty,unit,price,total}], _format:'simple-boq' }]
      groups: [],                        // [{ id, canonicalName, unit, qty, members, vendorPrices, winnerIdx }]
      fileOrder: [],                     // supplier names in upload order (column order)
      matchThreshold: 0.62,
      conclusionSupplier: '',
      conclusionReason: '',
      terms: {},                         // { vendorName: {key:value} }
      extraTermsVendors: [],
    },
  };

  // sync window.__multiBOQState ให้ multi-boq.js DOM helpers อ่านได้
  function syncMultiBOQState() {
    if (typeof window !== 'undefined') {
      window.__multiBOQState = state.multiBOQ;
      window.__supplierState = state;
    }
  }

  /* ---------- Persistence (localStorage) — กัน state หายตอนสลับหน้า ---------- */
  let _persistTimer = null;
  function persistState() {
    // debounce: รวมหลาย mutation เป็น 1 write
    if (_persistTimer) clearTimeout(_persistTimer);
    _persistTimer = setTimeout(() => {
      try {
        const json = JSON.stringify(state);
        if (json.length > MAX_PERSIST_BYTES) {
          // state ใหญ่เกิน — persist เฉพาะ metadata (ไม่รวม sheets) พร้อมเครื่องหมายต้อง re-upload
          const lite = Object.assign({}, state, { sheets: [], activeSheetIdx: 0, _sheetsOmitted: true });
          localStorage.setItem(STATE_KEY, JSON.stringify(lite));
          console.warn('[persistState] state exceeds ' + MAX_PERSIST_BYTES + ' bytes (' + json.length + '), saved metadata only — re-upload file to restore comparison table');
        } else {
          localStorage.setItem(STATE_KEY, json);
        }
      } catch (e) {
        console.warn('[persistState] failed:', e && e.message);
      }
    }, 100);
  }
  function restoreState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return false;
      // shallow-merge แต่ละ key (sheets/terms ฯลฯ ที่อยู่ใน saved จะ override default)
      Object.keys(saved).forEach(k => { state[k] = saved[k]; });
      // signatures: ถ้า saved ไม่มี/เสีย → restore default
      if (!state.signatures || typeof state.signatures !== 'object' || !state.signatures.preparer) {
        state.signatures = JSON.parse(JSON.stringify(DEFAULT_SIGNATURES));
      }
      return true;
    } catch (e) {
      console.warn('[restoreState] failed:', e && e.message);
      return false;
    }
  }

  /* ผังกลุ่มลายเซ็นสำหรับ render/แก้ไข */
  const SIG_GROUPS = [
    { key: 'preparer', label: 'ผู้จัดทำ' },
    { key: 'reviewers', label: 'คณะทำงานจัดซื้อจัดจ้าง (เห็นชอบ)' },
    { key: 'approvers', label: 'คณะกรรมการจัดซื้อจัดจ้าง (อนุมัติ)', nested: true },
    { key: 'executives', label: 'คณะกรรมการบริหาร (อนุมัติ)', nested: true },
  ];

  function sigPeople(key) {
    const g = state.signatures[key];
    if (!g) return [];
    return Array.isArray(g) ? g : (g.people || []);
  }

  /* ---------- Helpers ---------- */
  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(String(v).replace(/[,\s]/g, ''));
    return isFinite(n) ? n : null;
  };
  const stripSpaces = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const isSupplierHeader = (s) => /บริษัท|ห้าง|ร้าน|จำกัด|หจก/.test(s || '');

  /* Format helpers (inlined — ก่อนหน้านี้มาจาก js/data.js ที่ถูกลบไปตอน supplier-only refactor
     แต่ renderComparisonTable/renderWinnerBanner/renderConclusionBlock ยังเรียกใช้ → ReferenceError ทำให้ตารางไม่ render)
     User feedback 2026-07-29: ไม่ต้องการ "พัน/ล้าน/พันล้าน" suffix → ใช้เลขเต็ม + คอมม่า */
  const fmt = {
    /** ราคา/จำนวนเงิน — เลขเต็ม + คอมม่า 2 ตำแหน่ง (ไม่มี suffix ภาษาไทย) */
    price: (n) => {
      const v = Number(n) || 0;
      return v.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    },
    /** จำนวนเต็ม — เลขเต็ม + คอมม่า (ไม่มีทศนิยม) */
    int: (n) => Math.round(Number(n) || 0).toLocaleString('th-TH'),
    /** alias เก่า — เก็บไว้กัน break (deprecated) */
    currencyShort: (n) => {
      const v = Number(n) || 0;
      return v.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    },
  };

  /* ---------- Toast (global helper — ใช้แทน showToast ที่หายไป) ---------- */
  function showToast(message, variant) {
    try {
      const el = document.createElement('div');
      el.className = 'toast' + (variant ? ' ' + variant : '');
      el.textContent = message;
      document.body.appendChild(el);
      setTimeout(() => {
        el.style.transition = 'opacity 0.25s';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
      }, variant === 'error' ? 4500 : 2800);
    } catch (e) { console.warn('[toast]', e); }
  }

  /* ============================================================
     AI SCAN — สแกนเอกสารกระดาษด้วย Gemini Vision API
     รับ image/PDF → base64 → POST ไป Gemini → JSON → map เข้า state.sheets
     ต้องตั้ง GEMINI_API_KEY ใน config.local.js (gitignored) ก่อนใช้งาน
     ============================================================ */
  const AI_SCAN_PROMPT = `คุณเป็น AI ที่อ่านเอกสาร BOQ เปรียบเทียบราคาผู้ขายจากภาพหรือ PDF
กรุณาสกัดข้อมูลและตอบกลับเป็น JSON object เท่านั้น (ห้ามมีข้อความอื่นนอก JSON, ห้ามใส่ markdown code fence):

{
  "projectName": "ชื่อโครงการ",
  "workName": "ชื่องาน (เช่น งานวงกบประตู)",
  "threshold": "วงเงิน (เช่น วงเงินเกิน 500,000 ขึ้นไป)",
  "suppliers": ["ชื่อบริษัท 1", "ชื่อบริษัท 2"],
  "boqPrice": 1234.56,
  "items": [
    {
      "wd": "1.1",
      "name": "ชื่อรายการ",
      "qty": 36,
      "unit": "ชุด",
      "prices": { "ชื่อบริษัท 1": 1150.00, "ชื่อบริษัท 2": 1180.00 }
    }
  ]
}

กฎ:
- ถ้าไม่มี BOQ price ให้ใส่ boqPrice = null
- ถ้ารายการไม่มี WD code ให้ใส่ wd = null
- qty ต้องเป็นตัวเลข (ถ้าอ่านไม่ได้ใส่ 1)
- unit ถ้าไม่ระบุให้ใส่ "ชุด"
- prices ต้องมี key ครบทุก supplier ใน array suppliers (ถ้าไม่มีราคาใส่ 0)
- อ่านเฉพาะ BOQ จริง ไม่ต้องเดา supplier ที่ไม่ปรากฏ`;

  function getGeminiKey() {
    try {
      // 1) อ่านจาก config.local.js (ถ้ามีไฟล์)
      const fromConfig = window.LOCAL_CONFIG && window.LOCAL_CONFIG.GEMINI_API_KEY;
      if (fromConfig && String(fromConfig).trim()) return String(fromConfig).trim();
      // 2) fallback ไป localStorage (เก็บโดย AI scan modal)
      const fromStorage = localStorage.getItem('cp_gemini_api_key');
      if (fromStorage && fromStorage.trim()) return fromStorage.trim();
      return null;
    } catch (e) { return null; }
  }

  async function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        // "data:<mime>;base64,<data>" → strip prefix
        const commaIdx = String(result).indexOf(',');
        resolve(commaIdx >= 0 ? String(result).slice(commaIdx + 1) : String(result));
      };
      reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
      reader.readAsDataURL(file);
    });
  }

  async function callGemini(apiKey, base64Data, mimeType) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: AI_SCAN_PROMPT },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8000 },
      }),
    });
    if (!r.ok) {
      let msg = r.statusText;
      try {
        const errBody = await r.json();
        msg = (errBody && errBody.error && errBody.error.message) || msg;
      } catch (_) { /* ignore parse error */ }
      throw new Error('Gemini API ' + r.status + ': ' + msg);
    }
    return r.json();
  }

  function parseAiScanResponse(resp) {
    const text = resp && resp.candidates && resp.candidates[0]
      && resp.candidates[0].content && resp.candidates[0].content.parts
      && resp.candidates[0].content.parts[0] && resp.candidates[0].content.parts[0].text;
    if (!text) throw new Error('Gemini ตอบกลับว่างเปล่า');
    // strip ```json ... ``` ถ้า AI ห่อมาให้
    let cleaned = String(text).trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    // หา JSON object แรก (กัน AI ตอบนำหน้าด้วยข้อความ)
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end < 0 || end <= start) {
      throw new Error('ไม่พบ JSON ในคำตอบของ Gemini');
    }
    cleaned = cleaned.slice(start, end + 1);
    let data;
    try { data = JSON.parse(cleaned); }
    catch (e) { throw new Error('JSON ไม่ถูกต้อง: ' + e.message); }
    if (!data || typeof data !== 'object') throw new Error('JSON ไม่ใช่ object');
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('ไม่พบรายการสินค้าในเอกสาร');
    }
    if (!Array.isArray(data.suppliers) || data.suppliers.length === 0) {
      throw new Error('ไม่พบชื่อผู้ขายในเอกสาร');
    }
    return data;
  }

  function buildSheetsFromAiScan(data, fileName) {
    const supplierNames = data.suppliers.map(s => String(s || '').trim()).filter(Boolean);
    const items = data.items.map((it, idx) => {
      const qty = num(it.qty) || 1;
      const unit = String(it.unit || 'ชุด').trim() || 'ชุด';
      const wd = it.wd ? String(it.wd).trim() : '';
      const suppliers = supplierNames.map(s => {
        const price = num((it.prices || {})[s]) || 0;
        return {
          name: s,
          price: price,
          total: price * qty,
          isBOQ: false,
        };
      });
      return {
        idx: idx,
        wd: wd,
        name: String(it.name || `รายการที่ ${idx + 1}`).trim(),
        qty: qty,
        unit: unit,
        boq: num(data.boqPrice) || 0,
        suppliers: suppliers,
        group: null, // ยังไม่มี grouping จาก AI
      };
    });
    return [{
      name: data.workName || 'ฉบับที่ 1',
      projectLine: String(data.projectName || '').trim(),
      workLine: String(data.workName || '').trim(),
      supplierNames: supplierNames,
      items: items,
      isFinalShortlist: supplierNames.length <= 2,
      hasBOQ: data.boqPrice != null && num(data.boqPrice) > 0,
    }];
  }

  /**
   * Build sheets from PDF-extracted rows
   * ไม่มี supplier columns (PDF ปกติมีแค่ BOQ list)
   * - rows: [{no, name, qty, unit, price, page, _raw}]
   * - quality: {score, hasHeader, rowCount, ...}
   */
  function buildSheetsFromPdfRows(rows, fileName, quality) {
    const q = quality || {};
    const items = (rows || []).map((r, idx) => {
      const qty = num(r.qty) || 1;
      const unit = String(r.unit || 'ชุด').trim() || 'ชุด';
      const price = r.price != null ? num(r.price) : 0;
      const wd = ''; // ยังไม่มี grouping จาก PDF
      return {
        idx: idx,
        wd: wd,
        name: String(r.name || `รายการที่ ${idx + 1}`).trim(),
        qty: qty,
        unit: unit,
        boq: 0,
        // suppliers ว่าง — ไม่มีข้อมูลเปรียบเทียบจาก PDF
        suppliers: [],
        // เก็บ unit price จาก PDF ไว้ใน price hint (ใช้แสดงในตาราง)
        _pdfUnitPrice: price > 0 ? price : null,
        // flag ว่ามาจาก PDF
        _source: 'pdf',
        group: null,
      };
    });

    return [{
      name: 'ฉบับจาก PDF',
      projectLine: '',
      workLine: '[PDF] ' + fileName,
      supplierNames: [],
      items: items,
      isFinalShortlist: true,
      hasBOQ: false,
      _pdfMeta: q, // เก็บ quality info ไว้ดูภายหลัง
    }];
  }

  /* ============================================================
     PARSER — แปลงไฟล์ XLSX เปรียบเทียบราคาผู้ขาย (จำนวน supplier ไม่ fix)
     ============================================================ */
  function parseBlessiniXLSX(arrayBuffer) {
    if (typeof XLSX === 'undefined') {
      throw new Error('ไม่พบ SheetJS — ตรวจสอบการโหลด CDN');
    }
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const sheets = [];

    for (let i = 0; i < wb.SheetNames.length; i++) {
      const sheetName = wb.SheetNames[i];
      const ws = wb.Sheets[sheetName];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });

      // primary: full Blessini layout (with supplier comparison columns)
      let parsed = parseSheet(aoa, sheetName);
      // fallback: simple BOQ (ลำดับ/รายการ/จำนวน/หน่วย/ราคา — ไม่มี supplier)
      if (!parsed) {
        parsed = parseSimpleBOQ(aoa, sheetName);
      }
      if (parsed) sheets.push(parsed);
    }

    // extract workName / threshold from first non-empty header
    const firstSheet = sheets[0];
    const projectLine = firstSheet && firstSheet.projectLine ? firstSheet.projectLine : '';
    const workLine = firstSheet && firstSheet.workLine ? firstSheet.workLine : '';

    return {
      fileName: state.fileName,
      workName: workLine,
      thresholdLabel: projectLine,
      sheets: sheets,
    };
  }

  /* ============================================================
     PARSER (fallback) — Simple BOQ format (ลำดับ/รายการ/จำนวน/หน่วย/ราคา)
     ใช้กรณี user upload mock BOQ ที่ไม่มี supplier comparison columns
     (เช่น BOQ master จากวิศวกร/ผู้ออกแบบ)
     → สร้าง 1 "BOQ" supplier entry จากราคากลาง
     ============================================================ */
  // ---------- shouldSkipBoqRow ----------
  // ตรวจว่า row นี้ "ไม่ใช่รายการสินค้า" → ควรข้าม
  // เช่น section header ("หมวดที่ 1"), สรุปให้ (สรุปให้ __ เป็นผู้ดำเนินการ),
  // ลายเซ็น/ผู้อนุมัติ, VAT/รวมภาษี, บรรทัดว่าง/มีแต่ _
  // expose ผ่าน window.SupplierCompareHelpers.shouldSkipBoqRow เพื่อ test ใน Node
  function shouldSkipBoqRow(name, qty, price, total) {
    const n = String(name || '').trim();
    if (!n) return true;  // ghost row
    const SKIP_PATTERNS = [
      /^สรุปให้/,
      /^สรุป(?![เ-ไ]?ให้)/,
      /^รวมทั้งสิ้น/, /^รวมเงิน/, /^ราคารวม/, /^รวม\b/,
      /^หมวดที่/, /^หมวด\b/, /^หัวข้อ/,
      /^หมายเหตุเพิ่มเติม/, /^หมายเหตุ/,
      /ผู้ดำเนินการ/, /อนุมัติ/, /ลงชื่อ/, /ผู้จัดทำ/, /ลายเซ็น/,
      /ส่วนลด/, /ภาษีมูลค่าเพิ่ม/, /รวมภาษี/,
      /\bVAT\b/i, /^Sub[.\s-]?Total$/i, /^Grand[.\s-]?Total$/i, /^Total$/i,
      /^[\d,]+(\.[\d]+)?\s*(บาท|฿|%|เปอร์เซ็นต์|percent)?$/,
      /^[\d]+(\.[\d]+)?\s*%\s*$/,
      /^[\d,]+(\.[\d]+)?\s*บาท\s*$/,
      /^[\s\-–—._]+$/,
      /\.{3,}\s*$/, /^\.{3,}$/,
    ];
    for (const re of SKIP_PATTERNS) {
      if (re.test(n)) return true;
    }
    // Ghost row: มีชื่อ แต่ default qty=1 + ไม่มี price หรือ total
    if ((qty === 1 || qty == null) && (price === 0 || price == null) && (total === 0 || total == null)) {
      return true;
    }
    return false;
  }
  // expose for tests + reuse
  if (typeof window !== 'undefined') {
    window.SupplierCompareHelpers = window.SupplierCompareHelpers || {};
    window.SupplierCompareHelpers.shouldSkipBoqRow = shouldSkipBoqRow;
  }

  function parseSimpleBOQ(aoa, sheetName) {
    if (!aoa || aoa.length < 2) return null;

    // ---------- 1) หา header row + column positions ----------
    const COL = { no: -1, name: -1, qty: -1, unit: -1, price: -1, total: -1 };
    let headerRow = -1;
    for (let r = 0; r < Math.min(8, aoa.length); r++) {
      const row = aoa[r] || [];
      let hits = 0;
      const cFound = { ...COL };
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim();
        if (!cell) continue;
        if (cFound.no < 0 && /^(ลำดับ|ที่|ลําดับ|No\.?|#)$/i.test(cell)) { cFound.no = c; hits++; }
        else if (cFound.name < 0 && /รายการ|รายละเอียด|Description/i.test(cell)) { cFound.name = c; hits++; }
        else if (cFound.qty < 0 && /^(จำนวน|ปริมาณ|จํานวน|Quantity|Qty|qty\.?)$/i.test(cell)) { cFound.qty = c; hits++; }
        else if (cFound.unit < 0 && /^(หน่วย|Unit)$/i.test(cell)) { cFound.unit = c; hits++; }
        else if (cFound.price < 0 && /(ราคา.*หน่วย|ราคากลาง|Unit\s*Price|unit\s*price|BOQ|^ราคา$)/i.test(cell)) {
          cFound.price = c; hits++;
        }
        else if (cFound.total < 0 && /^(จำนวนเงิน|ราคารวม|รวมเงิน|รวม|Total|Amount)$/i.test(cell)) {
          cFound.total = c; hits++;
        }
      }
      // ต้องเจอ ≥3 keywords และมี name + qty
      if (hits >= 3 && cFound.name >= 0 && cFound.qty >= 0) {
        headerRow = r;
        Object.assign(COL, cFound);
        break;
      }
    }
    if (headerRow < 0 || COL.name < 0 || COL.qty < 0) return null;

    // ---------- 2) หา project/work title (แถวก่อน header) ----------
    let projectLine = '';
    let workLine = '';
    for (let r = 0; r < headerRow; r++) {
      const row = aoa[r] || [];
      const cells = row.filter(c => c !== '' && c !== null && c !== undefined);
      if (cells.length === 0) continue;
      const text = cells.map(c => String(c).trim()).filter(Boolean).join(' ');
      if (r === 0 && text) projectLine = text;
      if (/งาน|วงกบ|ประตู|ผนัง|พื้น|หลังคา|ระบบ|อาคาร|โครงการ|ก่อสร้าง/i.test(text)) {
        workLine = text;
      }
    }

    // ---------- 3) ดึง items ----------
    const items = [];
    for (let r = headerRow + 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const no = COL.no >= 0 ? num(row[COL.no]) : null;
      const name = String(row[COL.name] || '').trim();
      const qtyRaw = COL.qty >= 0 ? num(row[COL.qty]) : null;
      const unit = COL.unit >= 0 ? String(row[COL.unit] || '').trim() : '';
      const priceRaw = COL.price >= 0 ? num(row[COL.price]) : null;
      const totalRaw = COL.total >= 0 ? num(row[COL.total]) : null;

      // skip empty rows
      if (!name && qtyRaw == null && priceRaw == null) continue;
      // skip non-item rows (section header, summary, signatures, VAT, ghost, …)
      if (shouldSkipBoqRow(name, qtyRaw, priceRaw, totalRaw)) continue;

      const qty = qtyRaw != null && qtyRaw > 0 ? qtyRaw : 1;
      const price = priceRaw != null && priceRaw > 0 ? priceRaw : 0;
      const total = totalRaw != null && totalRaw > 0 ? totalRaw : (price * qty);

      if (!name && price === 0) continue;

      items.push({
        idx: items.length,
        wd: '',
        wdNo: no != null ? String(no) : '',
        wdTitle: '',
        group: '',
        groupQty: 1,
        groupUnit: unit || 'ชุด',
        name: name || `รายการที่ ${items.length + 1}`,
        qty: qty,
        unit: unit || 'ชุด',
        // simple BOQ: มีแค่ BOQ supplier 1 รายการ (ราคากลาง)
        suppliers: [{
          name: 'BOQ',
          price: price,
          total: total,
          isBOQ: true,
        }],
        boq: price,
        boqTotal: total,
      });
    }

    if (items.length === 0) return null;

    return {
      name: sheetName,
      projectLine: projectLine,
      workLine: workLine || projectLine,
      items: items,
      supplierNames: ['BOQ'],
      hasBOQ: true,
      isFinalShortlist: true,
      _format: 'simple-boq',
    };
  }

  /**
   * parseSheet — แปลง sheet เดียว (rows as array of arrays) เป็น items[]
   * @returns { name, projectLine, workLine, items: [{ wd, name, qty, unit, boq, suppliers: [{name, price, total}] }] }
   *
   * โครงสร้างไฟล์จริง (Blessini):
   *   Row 0: title — "ตารางเปรียบเทียบราคา (วงเงินเกิน 500,000 ขึ้นไป)"
   *   Row 1: empty
   *   Row 2: "โครงการ BLESSINI" | ... | "งาน วงกบประตู"
   *   Row 3: "ที่" | "รายการ" | ... | "ปริมาณ" | "หน่วย" | ชื่อบริษัท (merged across 2 cols)
   *   Row 4: ... | "ราคา/หน่วย" | "จำนวนเงิน" | "ราคา/หน่วย" | "จำนวนเงิน" | ... | "ราคา/หน่วย" | "จำนวนเงิน" (BOQ)
   *   Row 5+: data — WD header rows then item rows (frame, door) under each WD
   *
   * ในไฟล์จริง: ปริมาณใน col G (6) เป็น label "หน่วย"/"รายการ" (ไม่ใช่ตัวเลข) — default qty=1
   */
  function parseSheet(aoa, sheetName) {
    if (!aoa || aoa.length < 4) return null;

    // หา supplier rows: row ที่มี "ราคา/หน่วย" ใช้เป็น marker
    let priceHeaderRowIdx = -1;
    let supplierNameRowIdx = -1;
    for (let r = 0; r < Math.min(10, aoa.length); r++) {
      const row = aoa[r] || [];
      if (/ราคา.*หน่วย/i.test(String(row[8] || ''))) {
        priceHeaderRowIdx = r;
        supplierNameRowIdx = r - 1; // row ก่อนหน้ามีชื่อบริษัท
        break;
      }
    }
    if (priceHeaderRowIdx < 0) return null;

    // ดึง supplier columns จาก priceHeaderRow + supplierNameRow
    const priceRow = aoa[priceHeaderRowIdx] || [];
    const nameRow = aoa[supplierNameRowIdx] || [];
    const suppliers = [];
    let boq = null;

    for (let c = 8; c < priceRow.length; c++) {
      const cellHdr = String(priceRow[c] || '').trim();
      if (!/ราคา.*หน่วย/i.test(cellHdr)) continue;

      // supplier name = nameRow at the same column, or merge-sweep to the left
      let sName = String(nameRow[c] || '').trim();
      if (!sName && c > 0) sName = String(nameRow[c - 1] || '').trim();
      if (!sName && c > 1) sName = String(nameRow[c - 2] || '').trim();
      sName = stripSpaces(sName);

      const isBOQ = /BOQ/i.test(sName);
      const totalCol = c + 1;

      const supplier = {
        name: sName || (isBOQ ? 'BOQ' : `ผู้ขาย ${suppliers.length + 1}`),
        priceCol: c,
        totalCol: totalCol,
        isBOQ: isBOQ,
      };

      if (isBOQ) {
        boq = supplier;
      } else {
        suppliers.push(supplier);
      }
    }

    if (suppliers.length < 1) return null;

    // ดึง project/work title
    let projectLine = '';
    let workLine = '';
    for (let r = 0; r <= supplierNameRowIdx; r++) {
      const row = aoa[r] || [];
      const cells = row.filter(c => c !== '' && c !== null && c !== undefined);
      if (cells.length === 0) continue;
      const text = cells.map(c => String(c).trim()).filter(Boolean).join(' ');
      if (r === 0 && text) projectLine = text;
      if (/งาน|วงกบ|ประตู|ผนัง|พื้น|หลังคา|ระบบ/i.test(text)) workLine = text;
    }

    // แยก items — สแกนจาก priceHeaderRow + 2 ลงไป
    // สถานะ: currentWD = WD code ของกลุ่มปัจจุบัน (อัปเดตเมื่อเจอ WD header row)
    //         แถวที่มี WD ใน col A เป็น header row — ไม่ใช่ item
    //         แถวที่มี spec (วงกบ/บาน) ใน col B เป็น item — ใช้ WD จาก currentWD
    const items = [];
    const dataStart = priceHeaderRowIdx + 1; // start scanning right after sub-header (includes WD header rows)
    let currentWD = null;
    let currentWDTitle = null;
    let currentWDNo = null;
    let currentGroup = null;
    let currentGroupQty = 1;
    let currentGroupUnit = 'ชุด';

    // ดึง TYPE qty/unit จากตารางสรุปท้ายชีต (rows ที่มี TYPE ใน colB + qty/unit ในคอลัมน์ถัดไป)
    // map: TYPE key ("S"|"M"|"L"|"TWIN") → { qty, unit }
    const typeSummary = new Map();
    const typeKeyFromTitle = (s) => {
      const str = String(s || '');
      // รองรับทั้ง "TYPE X" และ "X" ติดๆ (เช่น "TWIN" ไม่มี "TYPE" นำหน้าใน header row บางฉบับ)
      const m = str.match(/(?:TYPE\s+)?\b(S|M|L|TWIN)\b/i);
      return m ? m[1].toUpperCase() : null;
    };
    for (let r = dataStart; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const colA = String(row[0] || '').trim();
      const colB = String(row[1] || '').trim();
      // ตารางสรุป: colA = 1,2,3,4 (sequential) + colB มี TYPE + qty/unit ในคอลัมน์ 6-7 (G-H) หรือ 7-8 (H-I)
      // ลองทั้ง 2 layout
      if (/^\d+$/.test(colA) && /TYPE/i.test(colB)) {
        // ลอง H/I ก่อน (item layout)
        let qty = null, unit = null;
        if (typeof row[7] === 'number' && row[7] > 0 && typeof row[8] === 'string' && row[8].trim()) {
          qty = row[7]; unit = String(row[8]).trim();
        }
        // ลอง G/H (summary layout ของ BLESSINI)
        else if (typeof row[6] === 'number' && row[6] > 0 && typeof row[7] === 'string' && row[7].trim()) {
          qty = row[6]; unit = String(row[7]).trim();
        }
        if (qty !== null && unit) {
          const tk = typeKeyFromTitle(colB);
          if (tk) typeSummary.set(tk, { qty, unit });
        }
      }
    }
    for (let r = dataStart; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const colA = String(row[0] || '').trim();
      const colB = String(row[1] || '').trim();
      if (!colA && !colB) continue;

      // ข้ามแถวหัวข้อรวม
      if (/^รวม|ราคารวม|รวมทั้งสิ้น|^Sub.?total/i.test(colB)) continue;

      // แถวหัวกลุ่ม (เช่น "สำหรับบ้านพักอาศัย TYPE S") — ไม่มีราคา ไม่มี WD
      if (!colA && /TYPE|สำหรับบ้าน/i.test(colB) && !/WD\d{2}/i.test(colB)) {
        currentGroup = stripSpaces(colB);
        currentWD = null;
        // ดึง qty/unit ของ TYPE นี้จาก typeSummary (ถ้ามี) — เป็นตัวคูณแปลง เช่น 36 แปลง
        const tk = typeKeyFromTitle(currentGroup);
        if (tk && typeSummary.has(tk)) {
          currentGroupQty = typeSummary.get(tk).qty;
          currentGroupUnit = typeSummary.get(tk).unit;
        } else {
          currentGroupQty = 1;
          currentGroupUnit = 'ชุด';
        }
        continue;
      }

      // ตรวจ WD header row (เช่น "1.2 WD02 ห้องน้ำ 1,2,3")
      const wdInA = colA.match(/WD\d{2}/i);
      const wdInB = colB.match(/WD\d{2}/i);

      if (wdInA) {
        // WD header row — อัปเดต currentWD แล้วข้าม (ไม่ใช่ item)
        currentWD = wdInA[0].toUpperCase();
        currentWDNo = colA;
        currentWDTitle = stripSpaces(colB);
        continue;
      }
      if (wdInB) {
        // WD ใน col B (item header บางแบบ) — ใช้ WD นี้แต่ยังต้องเช็คว่าเป็น item หรือ header
        currentWD = wdInB[0].toUpperCase();
        if (colA) currentWDNo = colA;
        // แถวที่มีแต่หัวข้อ WD ไม่มี spec สินค้า = header ไม่ใช่ item
        if (!/วงกบ|บาน|ประตู|WPC|HDF|UPVC/i.test(colB.replace(/WD\d{2}/i, ''))) {
          currentWDTitle = stripSpaces(colB);
        }
      }

      // ถ้าแถวนี้ไม่มี spec (วงกบ/บาน/ประตู/...) — น่าจะเป็น header/หัวข้อ
      const hasSpec = /วงกบ|บาน|ประตู|ไม้|WPC|HDF|UPVC|ผนัง|พื้น/i.test(colB);
      if (!hasSpec) continue;

      // ต้องมี WD (จาก header ก่อนหน้า หรือจาก row นี้)
      const wd = currentWD;
      if (!wd) continue;

      // Layout detection: qty/unit อยู่คนละคอลัมน์กัน ขึ้นกับไฟล์
      // - BLESSINI: ปริมาณอยู่ G (col 6), หน่วยอยู่ H (col 7), suppliers เริ่มที่ I (col 8)
      // - ไฟล์อื่นอาจใช้ H (col 7) = qty, I (col 8) = unit, suppliers เริ่มที่ J (col 9)
      let qty = 1, unit = 'ชุด';
      if (num(row[6]) !== null && typeof row[7] === 'string' && row[7].trim() && num(row[7]) === null) {
        // Layout 1 (BLESSINI): qty=G(6), unit=H(7)
        qty = num(row[6]);
        unit = stripSpaces(row[7]) || 'ชุด';
      } else if (num(row[7]) !== null && typeof row[8] === 'string' && row[8].trim() && num(row[8]) === null) {
        // Layout 2 (alternative): qty=H(7), unit=I(8)
        qty = num(row[7]);
        unit = stripSpaces(row[8]) || 'ชุด';
      }

      const itemSuppliers = suppliers.map(s => {
        const price = num(row[s.priceCol]);
        const total = num(row[s.totalCol]) || (price !== null ? price * qty : null);
        return { name: s.name, price: price, total: total };
      });

      let boqPrice = 0;
      let boqTotal = 0;
      if (boq) {
        boqPrice = num(row[boq.priceCol]) || 0;
        boqTotal = num(row[boq.totalCol]) || boqPrice * qty;
      }

      items.push({
        wd: wd,
        wdNo: currentWDNo || '',
        wdTitle: currentWDTitle || wd,
        group: currentGroup || '',
        groupQty: currentGroupQty,
        groupUnit: currentGroupUnit,
        name: colB,
        qty: qty,
        unit: unit,
        suppliers: itemSuppliers,
        boq: boqPrice,
        boqTotal: boqTotal,
      });
    }

    if (items.length === 0) return null;

    return {
      name: sheetName,
      projectLine: projectLine,
      workLine: workLine || projectLine,
      items: items,
      supplierNames: suppliers.map(s => s.name),
      hasBOQ: !!boq,
      isFinalShortlist: suppliers.length <= 2,
    };
  }

  function normalizeSupplierName(s) {
    return stripSpaces(s).replace(/\s+/g, ' ');
  }

  /* ============================================================
     RENDER — UI ส่วนต่างๆ
     ============================================================ */

  function renderUploadCard() {
    const c = document.getElementById('supplierComparisonUploadSection');
    if (!c) return;

    // sync state → window.__multiBOQState (ให้ MultiBOQ.renderFileList อ่านได้)
    syncMultiBOQState();

    // multi-boq mode
    if (state.mode === 'multi-boq') {
      const hasData = (state.multiBOQ.files || []).length > 0;
      if (hasData) {
        c.innerHTML = window.MultiBOQ ? window.MultiBOQ.renderFileList() : renderUploadPrompt();
      } else {
        c.innerHTML = window.MultiBOQ ? window.MultiBOQ.renderUploadPrompt() : renderUploadPrompt();
      }
      return;
    }

    // single mode (เดิม)
    const hasData = state.sheets.length > 0;
    if (hasData) {
      c.innerHTML = renderFileInfoBar();
    } else {
      c.innerHTML = renderUploadPrompt();
    }
  }

  function renderUploadPrompt() {
    const hasKey = !!getGeminiKey();
    return `
      <div class="upload-card" id="supplierUploadCard">
        <div class="upload-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M9 14l2 2 4-4"/>
          </svg>
        </div>
        <h3>แนบไฟล์เปรียบเทียบราคาผู้ขาย</h3>
        <p>
          ลากไฟล์ .xlsx หรือ .pdf มาวาง หรือคลิกปุ่มด้านล่างเพื่อเลือกไฟล์<br>
          ระบบจะแสดงตารางเปรียบเทียบราคา แล้วให้ผู้จัดซื้อ <strong>เลือกผู้ชนะด้วยตัวเอง</strong>
        </p>
        <input type="file" id="supplierFileInput" accept=".xlsx,.pdf" style="display:none" onchange="SupplierCompareController.handleFileUpload(event)">
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px;">
          <button class="btn btn-primary" onclick="document.getElementById('supplierFileInput').click()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            อัปโหลดไฟล์ .xlsx
          </button>
          <button id="pdfUploadBtn" class="btn btn-secondary" onclick="document.getElementById('supplierFileInput').click()" title="อัปโหลด BOQ จาก PDF — parse ตรงด้วย PDF.js (fallback ไป AI ถ้า parse ไม่สำเร็จ)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <path d="M14 2v6h6"/>
              <path d="M9 12h6M9 16h6"/>
            </svg>
            อัปโหลด BOQ (PDF)
          </button>
          <button id="aiScanBtn" class="btn btn-secondary" onclick="openAIScan()" title="สแกน BOQ จากภาพ/PDF ด้วย Gemini AI">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            สแกนเอกสาร (AI)
          </button>
        </div>
        <div class="file-types">
          <span>.xlsx</span>
          <span>.pdf (parse ตรง + AI fallback)</span>
          <span>.jpg .png (AI)</span>
        </div>
      </div>
    `;
  }

  function renderFileInfoBar() {
    const supplierCount = getSupplierCount();
    const itemCount = getActiveItems().length;
    // Dropdown เลือกเวอร์ชัน Sheet — แสดงเฉพาะตอนไฟล์มี ≥ 2 Sheet
    // (ส่วนใหญ่ผู้ใช้อัปโหลดไฟล์ BOQ ที่มี Sheet เดียว → ไม่ต้องเห็น dropdown)
    const hasMultipleSheets = state.sheets.length > 1;
    const sheetOptions = hasMultipleSheets ? state.sheets.map((s, i) =>
      `<option value="${i}" ${i === state.activeSheetIdx ? 'selected' : ''}>${escapeHtml(s.name)}${s.isFinalShortlist ? ' ★ (ฉบับสุดท้าย)' : ''}</option>`
    ).join('') : '';

    return `
      <div class="file-info-bar">
        <div class="file-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
          </svg>
        </div>
        <div class="file-meta">
          <div class="name">
            📄 ${escapeHtml(state.fileName)}
            <!-- (sample-tag removed — sample data no longer used) -->
          </div>
          <div class="detail">
            งาน: <strong>${escapeHtml(state.workName || '—')}</strong>
            · ${supplierCount} ผู้ขาย
            · ${itemCount} รายการ${hasMultipleSheets ? ` · ${state.sheets.length} ฉบับ` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${hasMultipleSheets ? `<select class="form-control" title="เลือกเวอร์ชัน BOQ" style="padding:6px 10px;font-size:12px;" onchange="SupplierCompareController.switchSheet(parseInt(this.value))">${sheetOptions}</select>` : ''}
          <button class="btn" onclick="SupplierCompareController.clear()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            เปลี่ยนไฟล์
          </button>
        </div>
      </div>
    `;
  }

  function renderComparisonView() {
    const sec = document.getElementById('supplierComparisonSection');
    if (!sec) return;
    if (state.sheets.length === 0) {
      sec.style.display = 'none';
      return;
    }

    sec.style.display = 'block';
    const items = getActiveItems();
    const suppliers = getActiveSuppliers();

    // Attach SAP historical price match (avg/min/max) to each item (additive)
    if (window.FuzzyMatchSAP && window.PURCHASE_HISTORY_SAP && window.PURCHASE_HISTORY_SAP.records) {
      // Init index lazily (idempotent)
      const _sapReady = window.FuzzyMatchSAP.getStats();
      if (!_sapReady.isReady) {
        try { window.FuzzyMatchSAP.init(window.PURCHASE_HISTORY_SAP.records); } catch (e) { console.warn('[fuzzy init]', e); }
      }
      for (const it of items) {
        try {
          const r = window.FuzzyMatchSAP.match(it.name || '', { boqUnit: it.unit || '', boqName: it.name || '' });
          it.sap = (r && r.matchStatus !== 'none') ? r : null;
        } catch (e) { it.sap = null; }
      }
    }

    sec.innerHTML = `
      ${renderWinnerBanner(items, suppliers)}
      ${renderValidationWarnings(items)}
      ${renderKpiStrip(items, suppliers)}
      ${renderComparisonTable(items, suppliers)}
      ${renderConclusionBlock(suppliers)}
      ${renderSignatureBlock()}
      ${renderTermsBlock()}
      <div class="action-bar">
        <button class="btn btn-primary" onclick="SupplierCompareController.exportExcel()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ดาวน์โหลด Excel (.xlsx)
        </button>
        <button class="btn" onclick="SupplierCompareController.printDocument()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          พิมพ์ / บันทึก PDF
        </button>
      </div>
    `;
    highlightCheapest();
  }

  function renderValidationWarnings(items) {
    // R3: ตรวจ qty/unit consistency ระหว่าง item-level กับ TYPE-level
    const warnings = [];
    const groups = new Map();
    items.forEach(item => {
      const g = item.group || 'รายการ';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(item);
    });

    groups.forEach((itemsInGroup, groupName) => {
      const typeQty = itemsInGroup[0].groupQty;
      const typeUnit = itemsInGroup[0].groupUnit;
      if (!typeQty || typeQty <= 0) return;

      // คำนวณ total qty ของทุก item ในกลุ่ม
      const totalItemQty = itemsInGroup.reduce((s, it) => s + (it.qty || 0), 0);

      // ถ้า total item qty ไม่สอดคล้องกับ TYPE multiplier (อนุญาต ±20% สำหรับ buffer)
      if (totalItemQty > 0 && typeUnit && itemsInGroup[0].unit === typeUnit) {
        const ratio = totalItemQty / typeQty;
        if (ratio < 0.5 || ratio > 2) {
          warnings.push({
            group: groupName,
            typeQty: typeQty,
            typeUnit: typeUnit,
            itemTotal: totalItemQty,
            ratio: ratio,
          });
        }
      }
    });

    if (warnings.length === 0) return '';

    const items2 = warnings.map(w => {
      const ratioStr = (w.ratio * 100).toFixed(0) + '%';
      return `
        <li>
          <strong>${escapeHtml(w.group)}</strong>:
          TYPE ระบุ ${w.typeQty} ${escapeHtml(w.typeUnit)},
          รายการรวม ${w.itemTotal} ${escapeHtml(w.typeUnit)} (${ratioStr})
        </li>
      `;
    }).join('');

    return `
      <div class="validation-warning">
        <div class="validation-warning-head">
          <span class="warning-icon">⚠️</span>
          <span>ตรวจพบจำนวนไม่สอดคล้องระหว่าง TYPE กับรายการย่อย</span>
        </div>
        <ul>${items2}</ul>
        <div class="validation-warning-foot">ระบบยังคงคำนวณตามปกติ — โปรดตรวจสอบ BOQ ต้นทาง</div>
      </div>
    `;
  }

  function renderWinnerBanner(items, suppliers) {
    const winnerName = state.conclusionSupplier;
    if (!winnerName) return ''; // ยังไม่เลือก → ไม่แสดง banner (กันรก)

    // คำนวณยอดรวมของ winner ตามรายการที่ user เลือก winner (winnerByItem)
    let winnerTotal = 0;
    let winnerItemCount = 0;
    items.forEach((item, itemIdx) => {
      const wi = state.winnerByItem[itemIdx];
      if (wi !== undefined && item.suppliers[wi] && item.suppliers[wi].total) {
        winnerTotal += item.suppliers[wi].total;
        winnerItemCount += 1;
      } else if (wi !== undefined && item.suppliers[wi] && item.suppliers[wi].price) {
        // fallback: price × qty
        winnerTotal += (item.suppliers[wi].price || 0) * (item.qty || 0);
        winnerItemCount += 1;
      }
    });

    // ส่วนต่างจาก BOQ (ถ้ามี)
    const boqTotal = items.reduce((s, it) => s + (it.boq || 0) * (it.qty || 0), 0);
    const boqDelta = boqTotal > 0 ? winnerTotal - boqTotal : null;

    return `
      <div class="winner-banner">
        <div class="winner-banner-left">
          <div class="winner-banner-icon">★</div>
          <div>
            <div class="winner-banner-label">ผู้ขายที่เลือก</div>
            <div class="winner-banner-name">${escapeHtml(winnerName)}</div>
          </div>
        </div>
        <div class="winner-banner-stats">
          <div class="winner-banner-stat">
            <div class="stat-label">ยอดรวม (รายการที่เลือก)</div>
            <div class="stat-value">${fmt.currencyShort(winnerTotal)}<span class="stat-unit">บาท</span></div>
          </div>
          <div class="winner-banner-stat">
            <div class="stat-label">เลือกแล้ว</div>
            <div class="stat-value">${winnerItemCount}<span class="stat-unit">/ ${items.length} รายการ</span></div>
          </div>
          ${boqDelta !== null ? `
          <div class="winner-banner-stat">
            <div class="stat-label">ส่วนต่างจาก BOQ</div>
            <div class="stat-value ${boqDelta > 0 ? 'stat-up' : 'stat-down'}">
              ${boqDelta > 0 ? '+' : ''}${fmt.currencyShort(boqDelta)}<span class="stat-unit">บาท</span>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderKpiStrip(items, suppliers) {
    const totalRows = items.length;
    const cheapestByRow = items.map(item => findCheapestIdx(item)).filter(i => i >= 0).length;
    const boqOutliers = items.filter(item => item.boq > 0).filter(item => {
      const minSupplier = Math.min(...item.suppliers.map(s => s.price || Infinity).filter(p => isFinite(p)));
      return isFinite(minSupplier) && item.boq > 0 && Math.abs(item.boq - minSupplier) / item.boq > 0.1;
    }).length;

    return `
      <div class="kpi-grid" style="margin-bottom:18px;">
        <div class="kpi">
          <div class="accent-bar"></div>
          <div class="label">รายการเปรียบเทียบ</div>
          <div class="value">${totalRows}<span class="unit">รายการ</span></div>
          <div class="delta neutral">${escapeHtml(state.workName || '—')}</div>
        </div>
        <div class="kpi">
          <div class="accent-bar"></div>
          <div class="label">ผู้ขาย</div>
          <div class="value">${suppliers.length}<span class="unit">ราย</span></div>
          <div class="delta neutral">${state.sheets.length} ฉบับ</div>
        </div>
        <div class="kpi success">
          <div class="accent-bar"></div>
          <div class="label">ถูกสุดต่อรายการ (visual)</div>
          <div class="value">${cheapestByRow}<span class="unit">/ ${totalRows}</span></div>
          <div class="delta up">เน้นสีเขียวในตาราง</div>
        </div>
        <div class="kpi warning">
          <div class="accent-bar"></div>
          <div class="label">BOQ ต่างจากตลาด &gt; 10%</div>
          <div class="value">${boqOutliers}<span class="unit">รายการ</span></div>
          <div class="delta ${boqOutliers > 0 ? 'down' : 'up'}">${boqOutliers > 0 ? 'ควรทบทวน' : 'สอดคล้องกัน'}</div>
        </div>
      </div>
    `;
  }

  /**
   * renderQtyCell — แสดงปริมาณรวม (item.qty × TYPE groupQty) + unit
   * User feedback 2026-07-29: ไม่ต้องแสดงวิธีคิด → แสดงแค่ตัวเลขผลลัพธ์
   * - item.qty = จำนวนชิ้นต่อแถว (เช่น 1)
   * - item.groupQty = จำนวน TYPE (เช่น 36 แปลง)
   * - total = item.qty × groupQty (เช่น 36)
   * Fallback: ถ้าไม่มี groupQty → แสดง item.qty
   */
  function renderQtyCell(item) {
    const u = escapeHtml(item.unit || 'ชุด');
    const q = Number(item.qty) || 0;
    const g = Number(item.groupQty);
    const total = (g && g > 0) ? (q * g) : q;
    return `<strong>${fmt.int(total)}</strong> <span class="unit-label">${u}</span>`;
  }

  function renderComparisonTable(items, suppliers) {
    const supplierHeaders = suppliers.map((s, i) =>
      `<th class="num supplier-col" data-supplier-idx="${i}" title="${escapeHtml(s.name)}">
        <div class="supplier-header-name">${escapeHtml(s.name)}</div>
        <div class="supplier-header-meta">ราคา/หน่วย</div>
      </th>`
    ).join('');

    // สร้าง array พร้อม original index เพื่อใช้ sort โดยไม่เสีย mapping
    let indexed = items.map((item, itemIdx) => ({ item, itemIdx }));
    if (state.sortByCheapest) {
      indexed.sort((a, b) => {
        const pa = a.item.suppliers.map(s => (s && s.price) || Infinity).filter(p => isFinite(p));
        const pb = b.item.suppliers.map(s => (s && s.price) || Infinity).filter(p => isFinite(p));
        const minA = pa.length ? Math.min(...pa) : Infinity;
        const minB = pb.length ? Math.min(...pb) : Infinity;
        return minA - minB; // ถูกสุดอยู่บน
      });
    }

    const rows = indexed.map(({ item, itemIdx }) => {
      const cheapestIdx = findCheapestIdx(item);
      const cells = suppliers.map((s, sIdx) => {
        const sup = item.suppliers[sIdx];
        if (!sup || sup.price === null) {
          return `<td class="num supplier-cell empty" data-item="${itemIdx}" data-supplier="${sIdx}">—</td>`;
        }
        const isCheapest = sIdx === cheapestIdx;
        return `
          <td class="num supplier-cell ${isCheapest ? 'cheapest' : ''}" data-item="${itemIdx}" data-supplier="${sIdx}">
            <div class="supplier-cell-price">${fmt.currencyShort(sup.price)}</div>
            ${sup.total ? `<div class="supplier-cell-total">รวม ${fmt.currencyShort(sup.total)}</div>` : ''}
            ${isCheapest ? '<span class="cheapest-tag">ถูกสุด</span>' : ''}
          </td>
        `;
      }).join('');

      const winnerSupplierIdx = state.winnerByItem[itemIdx];
      const winnerSupplier = winnerSupplierIdx !== undefined ? item.suppliers[winnerSupplierIdx] : null;

      return `
        <tr class="data-row ${winnerSupplier ? 'winner-row' : ''}" data-item-idx="${itemIdx}">
          <td class="wd-cell"><span class="wd-pill">${escapeHtml(item.wd)}</span></td>
          <td class="item-name-cell">${escapeHtml(item.name)}</td>
          <td class="num qty-cell">${renderQtyCell(item)}</td>
          <td class="num boq-cell">${item.boq > 0 ? fmt.currencyShort(item.boq) : '—'}</td>
          ${cells}
          <td class="sap-cell">${renderSapCell(item)}</td>
          <td class="winner-cell">
            ${renderWinnerRadios(item, itemIdx)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3>ตารางเปรียบเทียบราคา — ${escapeHtml(state.workName || 'งาน')}</h3>
            <div class="sub">
              แสดง ${items.length} รายการ · ${suppliers.length} ผู้ขาย
              · <span style="color:var(--color-success);font-weight:600;">ถูกสุด</span> = ราคาต่ำสุดในแถว (visual cue เท่านั้น — ท่านเลือกผู้ชนะเอง)
            </div>
          </div>
          <div class="card-header-actions">
            <label class="sort-toggle" title="เรียงแถวจากราคาถูกสุดไปแพงสุด (สำหรับผู้บริหารดูง่าย)">
              <input type="checkbox" id="sortByCheapestChk" ${state.sortByCheapest ? 'checked' : ''}
                     onchange="SupplierCompareController.setSortByCheapest(this.checked)">
              <span>เรียงถูก→แพง</span>
            </label>
          </div>
        </div>
        <div class="card-body no-pad">
          <div class="supplier-compare-scroll">
            <table class="data-table supplier-compare-table">
              <thead>
                <tr>
                  <th class="wd-col">WD</th>
                  <th class="name-col">รายการ</th>
                  <th class="num qty-col">ปริมาณ</th>
                  <th class="num boq-col" style="background:var(--color-info-soft);">BOQ</th>
                  ${supplierHeaders}
                  <th class="sap-col" style="background:var(--color-warning-soft,#FFF4E5);" title="ราคาเฉลี่ยจาก SAP Purchase History (51,075 records)">SAP avg / min / max</th>
                  <th class="winner-col" style="background:var(--color-primary-soft);">เลือกผู้ชนะ</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function renderWinnerRadios(item, itemIdx) {
    const validSuppliers = item.suppliers
      .map((s, idx) => ({ ...s, idx }))
      .filter(s => s.price !== null);

    if (validSuppliers.length === 0) {
      return '<span style="color:var(--color-text-muted);font-size:11px;">ไม่มีข้อมูล</span>';
    }

    const selected = state.winnerByItem[itemIdx];
    return `
      <div class="winner-radios">
        ${validSuppliers.map(s => `
          <label class="winner-radio ${selected === s.idx ? 'selected' : ''}" title="${escapeHtml(s.name)}">
            <input type="radio" name="winner-${itemIdx}" value="${s.idx}"
              ${selected === s.idx ? 'checked' : ''}
              onchange="SupplierCompareController.setWinner(${itemIdx}, ${s.idx})">
            <span class="winner-radio-dot"></span>
            <span class="winner-radio-name">${shortName(s.name)}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  function shortName(name) {
    // ตัด "บริษัท" และ "จำกัด" ออก
    return name
      .replace(/^บริษัท\s+/, '')
      .replace(/\s+จำกัด$/, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .trim();
  }

  function fmtNum(n, curr) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '—';
    if (curr && curr !== 'THB') return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + curr;
    return n.toLocaleString('th-TH', { maximumFractionDigits: 2 });
  }

  function renderSapCell(item) {
    const s = item.sap;
    if (!s || !s.priceStats) {
      return `<span style="color:var(--color-text-muted);font-size:11px;">— ไม่พบประวัติ</span>`;
    }
    const ps = s.priceStats;
    const avg = fmtNum(ps.avgNetPrice, ps.currency);
    const min = fmtNum(ps.minNetPrice, ps.currency);
    const max = fmtNum(ps.maxNetPrice, ps.currency);
    const cnt = ps.recordCount;
    const chipLabel = (s.chip && s.chip.label) ? s.chip.label : '';
    const chipKind = (s.chip && s.chip.kind) || 'fuzzy';
    // ถ้า proposedPrice ที่เสนอสูงกว่า max → แดง, ต่ำกว่า min → เขียว
    const proposed = (item.suppliers && item.suppliers.length && item.suppliers[0] && item.suppliers[0].price) || 0;
    let hint = '';
    if (proposed > 0 && ps.maxNetPrice > 0 && proposed > ps.maxNetPrice * 1.05) {
      hint = `<div style="font-size:10px;color:#c0392b;margin-top:2px;">⚠ เกิน max ${Math.round((proposed/ps.maxNetPrice-1)*100)}%</div>`;
    } else if (proposed > 0 && ps.minNetPrice > 0 && proposed < ps.minNetPrice * 0.85) {
      hint = `<div style="font-size:10px;color:#16a34a;margin-top:2px;">✓ ต่ำกว่า min ${Math.round((1-proposed/ps.minNetPrice)*100)}%</div>`;
    }
    return `
      <div style="font-size:12px;line-height:1.45;text-align:left;">
        <div style="font-weight:600;">${avg}<span style="font-size:10px;color:var(--color-text-muted);font-weight:400;"> / PO ${cnt} รายการ</span></div>
        <div style="font-size:10px;color:var(--color-text-muted);">
          min ${min} · max ${max}
        </div>
        ${chipLabel ? `<span class="match-chip ${chipKind}" style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:9px;background:#f3f4f6;color:#374151;margin-top:2px;">${escapeHtml(chipLabel)}</span>` : ''}
        ${hint}
      </div>
    `;
  }

  function renderConclusionBlock(suppliers) {
    const supplierOptions = suppliers.map((s, i) =>
      `<option value="${escapeHtml(s.name)}" ${state.conclusionSupplier === s.name ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
    ).join('');

    const reasonOptions = [
      'คุณภาพและราคาเหมาะสม',
      'ถูกสุด',
      'เคยซื้อแล้วได้คุณภาพดี',
      'เครดิต / เงื่อนไขการชำระดี',
      'ระยะเวลาจัดส่งเหมาะสม',
      'อื่นๆ',
    ];
    const reasonOpts = reasonOptions.map(r =>
      `<option value="${escapeHtml(r)}" ${state.conclusionReason === r ? 'selected' : ''}>${escapeHtml(r)}</option>`
    ).join('');

    const totalPerSupplier = suppliers.map(s => {
      const total = getActiveItems().reduce((sum, item) => {
        const sup = item.suppliers[suppliers.indexOf(s)];
        if (!sup || !sup.total) return sum;
        return sum + sup.total;
      }, 0);
      return { name: s.name, total: total };
    });

    return `
      <div class="card conclusion-card">
        <div class="card-header">
          <div>
            <h3>สรุปผลการเปรียบเทียบราคา</h3>
            <div class="sub">ฝ่ายจัดซื้อเลือกผู้ชนะ + ระบุเหตุผล · แก้ไขได้</div>
          </div>
        </div>
        <div class="card-body">
          <div class="conclusion-fields">
            <div class="conclusion-field">
              <label>ผู้ชนะ (ระบบจะแนะนำ แต่ท่านเลือกเอง)</label>
              <select class="form-control" onchange="SupplierCompareController.setConclusionSupplier(this.value)">
                <option value="">— เลือกผู้ขาย —</option>
                ${supplierOptions}
              </select>
            </div>
            <div class="conclusion-field">
              <label>เหตุผล</label>
              <select class="form-control" onchange="SupplierCompareController.setConclusionReason(this.value)">
                <option value="">— เลือกเหตุผล —</option>
                ${reasonOpts}
              </select>
            </div>
          </div>

          <div class="conclusion-preview">
            <div class="conclusion-label">ข้อความสรุป:</div>
            <div class="conclusion-text" id="conclusionPreview">
              ${buildConclusionText()}
            </div>
          </div>

          <div class="conclusion-totals">
            <div class="conclusion-totals-label">สรุปยอดรวมตามผู้ขาย (ราคา × ปริมาณ):</div>
            <div class="conclusion-totals-grid">
              ${totalPerSupplier.map(t => `
                <div class="conclusion-total-item">
                  <div class="name">${escapeHtml(shortName(t.name))}</div>
                  <div class="total">${t.total > 0 ? fmt.currencyShort(t.total) : '—'}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function buildConclusionText() {
    const sup = state.conclusionSupplier || '<em style="color:var(--color-text-muted);">[ยังไม่ได้เลือกผู้ชนะ]</em>';
    const reason = state.conclusionReason || '<em style="color:var(--color-text-muted);">[ยังไม่ได้ระบุเหตุผล]</em>';
    const work = state.workName || 'งานดังกล่าว';
    return `สรุปให้ <strong>${sup}</strong> เป็นผู้ดำเนินการ สำหรับ${escapeHtml(work)} เนื่องจาก${reason}`;
  }

  function renderSignatureBlock() {
    const total = SIG_GROUPS.reduce((n, g) => n + sigPeople(g.key).length, 0);

    const groupHtml = SIG_GROUPS.map((g) => {
      const people = sigPeople(g.key);
      const rows = people.map((p, i) => `
        <div class="signature-block">
          <div class="signature-edit">
            <input type="text" class="form-control sig-title"
                   value="${escapeHtml(p.title || '')}"
                   placeholder="ตำแหน่ง เช่น Section Manager"
                   oninput="SupplierCompareController.updateSignature('${g.key}',${i},'title',this.value)">
            <input type="text" class="form-control sig-name"
                   value="${escapeHtml(p.name || '')}"
                   placeholder="ชื่อผู้มีอำนาจ"
                   oninput="SupplierCompareController.updateSignature('${g.key}',${i},'name',this.value)">
          </div>
          <div class="signature-line"></div>
          <div class="signature-meta">
            <span class="placeholder">[เว้นว่างไว้ประทับลายเซ็นจริง]</span>
            <button class="btn btn-icon" title="ลบช่องนี้"
                    onclick="SupplierCompareController.removeSignature('${g.key}',${i})">✕</button>
          </div>
        </div>
      `).join('');

      return `
        <div class="signature-group-block">
          <div class="signature-group-head">
            <span class="signature-group-label">${escapeHtml(g.label)}</span>
            <button class="btn btn-sm" onclick="SupplierCompareController.addSignature('${g.key}')">
              + เพิ่มช่องเซ็น
            </button>
          </div>
          <div class="signature-grid">${rows || '<div class="sub">ยังไม่มีช่องเซ็นในกลุ่มนี้</div>'}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="card signature-card">
        <div class="card-header">
          <div>
            <h3>ช่องจัดเตรียมเอกสาร (${total} ช่อง)</h3>
            <div class="sub">เตรียมรายชื่อ + ตำแหน่งไว้ล่วงหน้า สำหรับพิมพ์ลงรูปเล่มรายงานเพื่อประทับลายเซ็นจริง — ไม่ใช่ลายเซ็นดิจิทัล</div>
          </div>
        </div>
        <div class="card-body">${groupHtml}</div>
      </div>
    `;
  }

  /* หัวข้อ "รายละเอียดประกอบการเสนอราคา" — ต้องตรงกับ exporter */
  const TERM_FIELDS = [
    { key: 'priceNote', label: 'ราคา และ ปริมาณ', ph: 'เช่น ราคารวมภาษีมูลค่าเพิ่ม 7%' },
    { key: 'validUntil', label: 'กำหนดระยะเวลายืนราคา', ph: 'เช่น ยืนราคาถึง 31 ธันวาคม 2569' },
    { key: 'paymentTerm', label: 'เงื่อนไขชำระเงิน', ph: 'เช่น เครดิต 30 วัน นับจากวันวางบิล' },
    { key: 'delivery', label: 'กำหนดการส่งมอบ', ph: 'เช่น ผลิต 20-30 วัน นับจากได้รับใบสั่งซื้อ' },
    { key: 'warranty', label: 'กำหนดระยะเวลาการรับประกันและบริการ', ph: 'เช่น รับประกันสินค้า 2 ปี' },
    { key: 'contact', label: 'รายชื่อผู้ติดต่อ', ph: 'เช่น นัท 061-9211113' },
  ];

  function renderTermsBlock() {
    const suppliers = getActiveSuppliers().filter(s => !/BOQ/i.test(s.name));
    const extra = state.extraTermsVendors || [];
    const totalCount = suppliers.length + extra.length;
    if (!totalCount) return '';

    // รวม vendor list: index ของ parser supplier ก่อน, แล้วต่อด้วย extra (id = 'e0', 'e1', ...)
    const all = [];
    suppliers.forEach((s, si) => all.push({ id: si, name: s.name, isExtra: false }));
    extra.forEach((v, i) => all.push({ id: 'e' + i, name: v.name, isExtra: true }));

    // เลือก vendor ที่จะแสดง: ถ้ายังไม่ได้เลือก หรือ id ไม่อยู่ใน list → auto-pick
    let selectedId = state.selectedTermsVendorIdx;
    const exists = all.some(v => v.id === selectedId);
    if (!exists) {
      // default: winner ถ้ามี, ไม่งั้น vendor แรก
      const winnerName = state.conclusionSupplier;
      const winnerItem = winnerName ? all.find(v => v.name === winnerName) : null;
      selectedId = winnerItem ? winnerItem.id : all[0].id;
      state.selectedTermsVendorIdx = selectedId;
    }
    const selected = all.find(v => v.id === selectedId);

    // ดึง terms object ของ vendor ที่เลือก
    let t = {};
    if (selected.isExtra) {
      const extraVendor = extra[parseInt(String(selected.id).replace('e', ''), 10)];
      t = (extraVendor && extraVendor.terms) || {};
    } else {
      t = state.terms[selected.id] || {};
    }

    const fields = TERM_FIELDS.map(f => `
      <div class="term-field">
        <label>${escapeHtml(f.label)}</label>
        <div class="term-input-row">
          <input type="text" class="form-control"
                 value="${escapeHtml(t[f.key] || '')}"
                 placeholder="${escapeHtml(f.ph)}"
                 oninput="SupplierCompareController.updateTerm('${selected.id}','${f.key}',this.value)">
        </div>
      </div>
    `).join('');

    const dropdownOptions = all.map(v => {
      const isWinner = v.name === state.conclusionSupplier;
      const label = escapeHtml(v.name) + (isWinner ? ' (ผู้ชนะ)' : '');
      return `<option value="${escapeHtml(String(v.id))}" ${v.id === selectedId ? 'selected' : ''}>${label}</option>`;
    }).join('');

    return `
      <div class="card terms-card">
        <div class="card-header">
          <div>
            <h3>รายละเอียดประกอบการเสนอราคา</h3>
            <div class="sub">เลือกบริษัทจากดรอปดาวน์ — จะไปอยู่ท้ายตารางในไฟล์ Excel</div>
          </div>
        </div>
        <div class="card-body">
          <div class="terms-selector">
            <label class="terms-selector-label">เลือกบริษัท:</label>
            <select class="form-control terms-dropdown"
                    onchange="SupplierCompareController.setTermsVendorIdx(this.value)">
              ${dropdownOptions}
            </select>
            <button type="button" class="btn btn-secondary btn-sm"
                    onclick="SupplierCompareController.addTermsVendor()">＋ เพิ่มบริษัท</button>
            ${selected.isExtra ? `<button type="button" class="btn btn-danger btn-sm"
                    onclick="SupplierCompareController.removeTermsVendor('${selected.id}')">🗑 ลบบริษัทนี้</button>` : ''}
          </div>
          <div class="terms-single">
            <div class="terms-column-head">${escapeHtml(selected.name)}${selected.name === state.conclusionSupplier ? ' <span class="winner-badge">★ ผู้ชนะ</span>' : ''}</div>
            ${fields}
          </div>
        </div>
      </div>
    `;
  }

  /* ============================================================
     EXPORT PAYLOAD — แปลง state ให้เป็น input ของ compare-excel-export
     ============================================================ */
  function buildExportPayload() {
    if (state.mode === 'multi-boq') {
      if (!window.MultiBOQ) throw new Error('MultiBOQ module ยังไม่ได้โหลด');
      return window.MultiBOQ.buildExportPayload(state);
    }
    const sheet = state.sheets[state.activeSheetIdx];
    if (!sheet) throw new Error('ยังไม่ได้เลือก sheet');

    const items = sheet.items || [];
    const suppliers = (sheet.supplierNames || []).slice();
    const hasBOQ = !!sheet.hasBOQ;

    // จัดกลุ่ม: group (TYPE) > section (WD) > items  โดยรักษาลำดับเดิมในไฟล์
    const groupMap = new Map();
    items.forEach((it) => {
      const gKey = it.group || 'รายการ';
      if (!groupMap.has(gKey)) {
        // ใช้ qty/unit จาก item แรกของกลุ่ม (parser ดึงจากตารางสรุปท้ายชีต เช่น 36 แปลง)
        const initQty = (typeof it.groupQty === 'number' && it.groupQty > 0) ? it.groupQty : 1;
        const initUnit = it.groupUnit || 'ชุด';
        groupMap.set(gKey, { title: gKey, qty: initQty, unit: initUnit, sectionMap: new Map() });
      }
      const g = groupMap.get(gKey);

      const sKey = (it.wdNo || '') + '|' + (it.wdTitle || it.wd || '');
      if (!g.sectionMap.has(sKey)) {
        g.sectionMap.set(sKey, { no: it.wdNo || '', title: it.wdTitle || it.wd || '', items: [] });
      }

      // prices เรียงตามผู้ขายทั้งหมด แล้วต่อท้ายด้วย BOQ (ถ้ามี)
      const prices = (it.suppliers || []).map(s => s.price);
      if (hasBOQ) prices.push(it.boq);

      g.sectionMap.get(sKey).items.push({
        name: it.name,
        qty: it.qty,
        unit: it.unit,
        prices: prices,
      });
    });

    const groups = Array.from(groupMap.values()).map(g => ({
      title: g.title,
      qty: g.qty,
      unit: g.unit,
      sections: Array.from(g.sectionMap.values()),
    }));

    const vendors = suppliers.map((name, i) => ({
      name: name,
      terms: state.terms[i] || {},
    }));

    // ต่อด้วย extra vendors (ที่ user เพิ่มเอง) — terms มี แต่ไม่มีราคาในตารางเทียบ
    (state.extraTermsVendors || []).forEach((v) => {
      vendors.push({
        name: v.name,
        terms: v.terms || {},
      });
    });

    const winner = state.conclusionSupplier || (vendors[0] && vendors[0].name) || '';
    const reason = state.conclusionReason || 'คุณภาพและราคาเหมาะสม';

    return {
      sheetName: (sheet.name || 'เปรียบเทียบราคา').substring(0, 31),
      projectName: state.projectName || sheet.projectLine || '',
      workName: state.workName || sheet.workLine || '',
      thresholdLabel: state.thresholdLabel || 'วงเงินเกิน 500,000 ขึ้นไป',
      vatRate: 0.07,
      hasBOQ: hasBOQ,
      vendors: vendors,
      groups: groups,
      conclusionText: `สรุปให้ ${winner} เป็นผู้ดำเนินการ ${state.workName ? 'สำหรับ' + state.workName + ' ' : ''}เนื่องจาก${reason}`,
      signatures: state.signatures,
    };
  }

  /* ============================================================
     HIGHLIGHT CHEAPEST (visual only — ไม่ auto-pick)
     ============================================================ */
  function highlightCheapest() {
    const cells = document.querySelectorAll('.supplier-cell[data-item]');
    cells.forEach(c => c.classList.remove('cheapest'));
    const items = getActiveItems();
    items.forEach((item, itemIdx) => {
      const cheapestIdx = findCheapestIdx(item);
      if (cheapestIdx < 0) return;
      const cell = document.querySelector(`.supplier-cell[data-item="${itemIdx}"][data-supplier="${cheapestIdx}"]`);
      if (cell) {
        cell.classList.add('cheapest');
        if (!cell.querySelector('.cheapest-tag')) {
          const tag = document.createElement('span');
          tag.className = 'cheapest-tag';
          tag.textContent = 'ถูกสุด';
          cell.appendChild(tag);
        }
      }
    });
  }

  function findCheapestIdx(item) {
    let minPrice = Infinity;
    let minIdx = -1;
    item.suppliers.forEach((s, idx) => {
      if (s.price !== null && s.price > 0 && s.price < minPrice) {
        minPrice = s.price;
        minIdx = idx;
      }
    });
    return minIdx;
  }

  /* ============================================================
     HELPERS
     ============================================================ */
  /* ============================================================
     ADAPTER — ให้ renderer เดิมรับได้ทั้ง single + multi-boq mode
     ============================================================ */
  function getActiveSource() {
    if (state.mode === 'multi-boq') {
      syncMultiBOQState();
      const m = state.multiBOQ;
      const items = (window.MultiBOQ && window.MultiBOQ.flattenMultiToItems)
        ? window.MultiBOQ.flattenMultiToItems(m)
        : [];
      const suppliers = (m.fileOrder || []).map((name, i) => ({ name, idx: i, isBOQ: false }));
      return {
        kind: 'multi-boq',
        workName: m.workName || '',
        thresholdLabel: m.thresholdLabel || '',
        fileName: (m.files || []).map(f => f.fileName).join(', '),
        items: items,
        suppliers: suppliers,
      };
    }
    // single mode (เดิม)
    const sheet = state.sheets[state.activeSheetIdx];
    const items = sheet ? sheet.items : [];
    const suppliers = items.length
      ? items[0].suppliers.map((s, i) => ({ ...s, idx: i }))
      : [];
    return {
      kind: 'single',
      workName: state.workName,
      thresholdLabel: state.thresholdLabel,
      fileName: state.fileName,
      items: items,
      suppliers: suppliers,
      sheet: sheet,
    };
  }

  function getActiveItems() {
    return getActiveSource().items;
  }
  function getActiveSuppliers() {
    return getActiveSource().suppliers;
  }
  function getSupplierCount() {
    return getActiveSuppliers().length;
  }
  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  const controller = {
    init() {
      // restore state จาก localStorage ก่อน (กัน state หายตอนสลับหน้า)
      const restored = restoreState();
      // default mode = single ถ้า state เก่าไม่มี mode
      if (!state.mode) state.mode = 'single';
      // sync ตัวแปร global
      syncMultiBOQState();
      // update tab UI ให้ตรงกับ state.mode
      updateModeTabsUI();
      renderUploadCard();
      // ถ้ามี sheets ครบ → render ตารางเปรียบเทียบด้วย
      const hasData = (state.mode === 'multi-boq')
        ? (state.multiBOQ && state.multiBOQ.groups && state.multiBOQ.groups.length > 0)
        : (state.sheets && state.sheets.length > 0);
      if (restored && hasData) {
        renderComparisonView();
        if (state._sheetsOmitted) {
          showToast('กู้คืนข้อมูลบางส่วน — กรุณาอัปโหลดไฟล์อีกครั้งเพื่อคืนตารางเปรียบเทียบ', 'info');
        }
      }
    },

    handleFileUpload(event) {
      // multi-boq mode → route ไป handler ใหม่
      if (state.mode === 'multi-boq') {
        return this.handleMultiFileUpload(event);
      }

      const file = event.target.files[0];
      if (!file) return;
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const mime = (file.type || '').toLowerCase();

      // dispatch ตาม file type
      if (ext === 'pdf' || mime === 'application/pdf') {
        return this.handlePdfUpload(file);
      }

      // .xlsx path (เดิม)
      state.fileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = parseBlessiniXLSX(e.target.result);
          if (parsed.sheets.length === 0) {
            showToast('ไม่พบข้อมูลในไฟล์ — ตรวจสอบว่าเป็นไฟล์ .xlsx ที่ถูกต้อง');
            return;
          }
          state.workName = parsed.workName;
          state.thresholdLabel = parsed.thresholdLabel;
          state.sheets = parsed.sheets;
          state.activeSheetIdx = parsed.sheets.length - 1; // default = ฉบับสุดท้าย (final shortlist)
          state.winnerByItem = {};
          state.conclusionSupplier = '';
          state.conclusionReason = '';
          state._sheetsOmitted = false;
          renderUploadCard();
          renderComparisonView();
          persistState();
          showToast(`โหลดสำเร็จ: ${parsed.sheets.length} ฉบับ, ${getActiveItems().length} รายการ`);
        } catch (err) {
          console.error(err);
          showToast('เกิดข้อผิดพลาด: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    },

    /**
     * Handle PDF upload — parse ด้วย PDF.js ก่อน, ถ้า quality ต่ำ → fallback ไป AI scan modal
     */
    async handlePdfUpload(file) {
      if (!window.PdfTableExtract) {
        showToast('ไม่พบโมดูลอ่าน PDF — กรุณาใช้ปุ่ม "สแกนเอกสาร (AI)" แทน', 'error');
        return;
      }
      showToast(`กำลังอ่าน PDF: ${file.name}...`, 'info');
      try {
        const result = await window.PdfTableExtract.extract(file);
        const q = result.quality || {};
        if (q.isAcceptable && q.rowCount >= 2) {
          // quality OK → นำเข้าข้อมูลเลย
          this.importPdfRows(result.rows, file.name, result.quality);
          showToast(`ดึงข้อมูลจาก PDF สำเร็จ: ${result.rows.length} รายการ (คุณภาพ ${(q.score*100).toFixed(0)}%)`, 'success');
        } else {
          // quality ต่ำ → fallback ไป AI scan modal
          console.warn('[PDF] Quality low:', q);
          showToast(`อ่าน PDF ตรงๆ ไม่สำเร็จ (quality ${(q.score*100).toFixed(0)}%) — กำลังเปิด AI scan modal...`, 'info');
          // เก็บไฟล์ไว้ใน state แล้วเปิด AI scan modal พร้อม preloaded file
          if (typeof window._stagePdfForAiScan === 'function') {
            window._stagePdfForAiScan(file);
          } else if (typeof window.openAIScan === 'function') {
            // fallback: ตั้ง file ผ่าน global var แล้วเปิด modal
            window.openAIScan();
            setTimeout(() => {
              const inp = document.getElementById('boq-image-input');
              if (inp) {
                const dt = new DataTransfer();
                dt.items.add(file);
                inp.files = dt.files;
                inp.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }, 100);
          }
        }
      } catch (err) {
        console.error('[PDF upload]', err);
        showToast('อ่าน PDF ไม่สำเร็จ: ' + (err.message || err), 'error');
      }
    },

    /**
     * Import extracted PDF rows → state.sheets
     * ใช้รูปแบบเดียวกับ buildSheetsFromAiScan แต่ไม่มี supplier columns
     */
    importPdfRows(rows, fileName, quality) {
      const sheets = buildSheetsFromPdfRows(rows, fileName, quality);
      state.fileName = '[PDF] ' + fileName;
      state.workName = sheets[0].workLine || state.workName;
      state.thresholdLabel = '';
      state.sheets = sheets;
      state.activeSheetIdx = 0;
      state.winnerByItem = {};
      state.conclusionSupplier = '';
      state.conclusionReason = '';
      state._sheetsOmitted = false;
      renderUploadCard();
      renderComparisonView();
      persistState();
      return { itemCount: sheets[0].items.length };
    },

    loadDemo() {
      // sample data removed — use actual XLSX file upload instead
      showToast('ไม่มีข้อมูลตัวอย่าง — กรุณาอัปโหลดไฟล์ .xlsx จริง', 'info');
    },

    /**
     * Public: เรียกจาก AI Scan modal (alerts.html inline script)
     * - รับ File object + ตรวจสอบ MIME/size/API key + เรียก Gemini
     * - คืน parsed data (ให้ modal แสดง extracted list preview)
     * throws on error
     */
    async runAiScan(file) {
      // 1) ตรวจ API key
      const apiKey = getGeminiKey();
      if (!apiKey) {
        throw new Error('ยังไม่ได้ตั้งค่า GEMINI_API_KEY — กรุณาคลิก "ตั้งค่า" ในแถบ API Key ด้านบน');
      }

      // 2) ตรวจ MIME/ext
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      const mime = (file.type || '').toLowerCase();
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const allowedMime = allowed.includes(mime);
      const allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext);
      if (!allowedMime && !allowedExt) {
        throw new Error('รองรับเฉพาะไฟล์ .jpg .jpeg .png .webp .pdf');
      }
      const finalMime = mime || (ext === 'pdf' ? 'application/pdf' : 'image/' + ext);

      // 3) ตรวจขนาด
      const maxBytes = 8 * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error('ไฟล์ใหญ่เกิน 8MB — กรุณาย่อภาพหรือสแกนใหม่');
      }

      // 4) อ่าน base64 + เรียก Gemini + parse
      const base64 = await readFileAsBase64(file);
      const resp = await callGemini(apiKey, base64, finalMime);
      const data = parseAiScanResponse(resp);
      return { data, fileName: file.name, mime: finalMime, size: file.size };
    },

    /**
     * Public: เรียกหลังจาก modal กด "นำเข้าข้อมูล"
     * - รับ parsed data object + fileName → build sheets + set state + re-render
     */
    importAiScanData(data, fileName) {
      const sheets = buildSheetsFromAiScan(data, fileName);

      state.fileName = '[AI Scan] ' + fileName;
      state.workName = sheets[0].workLine || state.workName;
      state.thresholdLabel = data.threshold || state.thresholdLabel;
      state.sheets = sheets;
      state.activeSheetIdx = sheets.length - 1;
      state.winnerByItem = {};
      state.conclusionSupplier = '';
      state.conclusionReason = '';
      state._sheetsOmitted = false;
      renderUploadCard();
      renderComparisonView();
      persistState();

      return {
        itemCount: sheets[0].items.length,
        supplierCount: sheets[0].supplierNames.length,
      };
    },

    switchSheet(idx) {
      state.activeSheetIdx = idx;
      state.winnerByItem = {};
      state.conclusionSupplier = '';
      state.conclusionReason = '';
      renderUploadCard();
      renderComparisonView();
      persistState();
    },

    clear() {
      state.fileName = '';
      state.workName = '';
      state.thresholdLabel = '';
      state.sheets = [];
      state.activeSheetIdx = 0;
      state.winnerByItem = {};
      state.conclusionSupplier = '';
      state.conclusionReason = '';
      // reset multi-BOQ sub-state ด้วย (ล้างทั้ง 2 โหมด กัน state leak)
      state.multiBOQ = {
        workName: '', thresholdLabel: '',
        files: [], groups: [], fileOrder: [],
        matchThreshold: 0.62,
        conclusionSupplier: '', conclusionReason: '',
        terms: {}, extraTermsVendors: [],
      };
      syncMultiBOQState();
      renderUploadCard();
      renderComparisonView();
      persistState();
    },

    setWinner(itemIdx, supplierIdx) {
      if (state.winnerByItem[itemIdx] === supplierIdx) {
        delete state.winnerByItem[itemIdx];
      } else {
        state.winnerByItem[itemIdx] = supplierIdx;
      }
      // re-render only winner cells
      document.querySelectorAll(`tr[data-item-idx="${itemIdx}"]`).forEach(tr => {
        tr.classList.toggle('winner-row', state.winnerByItem[itemIdx] !== undefined);
      });
      document.querySelectorAll(`input[name="winner-${itemIdx}"]`).forEach(input => {
        const label = input.closest('.winner-radio');
        if (label) label.classList.toggle('selected', parseInt(input.value) === state.winnerByItem[itemIdx]);
      });
      persistState();
    },

    setConclusionSupplier(name) {
      state.conclusionSupplier = name;
      const preview = document.getElementById('conclusionPreview');
      if (preview) preview.innerHTML = buildConclusionText();
      persistState();
    },

    setConclusionReason(reason) {
      state.conclusionReason = reason;
      const preview = document.getElementById('conclusionPreview');
      if (preview) preview.innerHTML = buildConclusionText();
      persistState();
    },

    updateSignature(groupKey, idx, field, value) {
      const people = sigPeople(groupKey);
      if (people[idx]) people[idx][field] = value;
      persistState();
    },

    addSignature(groupKey) {
      const g = state.signatures[groupKey];
      if (!g) return;
      const arr = Array.isArray(g) ? g : (g.people = g.people || []);
      arr.push({ title: '', name: '' });
      renderComparisonView();
      persistState();
    },

    removeSignature(groupKey, idx) {
      const people = sigPeople(groupKey);
      people.splice(idx, 1);
      renderComparisonView();
      persistState();
    },

    updateTerm(supplierIdx, key, value) {
      // รองรับทั้ง numeric index (parser vendor) และ 'eN' string (extra vendor)
      if (typeof supplierIdx === 'string' && supplierIdx.startsWith('e')) {
        const idx = parseInt(supplierIdx.slice(1), 10);
        const vendor = state.extraTermsVendors[idx];
        if (!vendor) return;
        if (!vendor.terms) vendor.terms = {};
        vendor.terms[key] = value;
      } else {
        if (!state.terms[supplierIdx]) state.terms[supplierIdx] = {};
        state.terms[supplierIdx][key] = value;
      }
      persistState();
    },

    setTermsVendorIdx(id) {
      state.selectedTermsVendorIdx = id;
      renderComparisonView();
      persistState();
    },

    setSortByCheapest(on) {
      state.sortByCheapest = !!on;
      persistState();
      renderComparisonView();
    },

    addTermsVendor() {
      const name = prompt('ชื่อบริษัทที่ต้องการเพิ่ม:', '');
      if (!name || !name.trim()) return;
      const cleanName = name.trim();
      // ป้องกันชื่อซ้ำ
      const suppliers = getActiveSuppliers().filter(s => !/BOQ/i.test(s.name));
      if (suppliers.some(s => s.name === cleanName)) {
        alert('มีบริษัทนี้ในรายการอยู่แล้ว');
        return;
      }
      if ((state.extraTermsVendors || []).some(v => v.name === cleanName)) {
        alert('มีบริษัทนี้ถูกเพิ่มไว้แล้ว');
        return;
      }
      if (!state.extraTermsVendors) state.extraTermsVendors = [];
      const newId = 'e' + state.extraTermsVendors.length;
      state.extraTermsVendors.push({ name: cleanName, terms: {} });
      state.selectedTermsVendorIdx = newId;
      renderComparisonView();
      persistState();
    },

    removeTermsVendor(id) {
      if (typeof id !== 'string' || !id.startsWith('e')) return;
      const idx = parseInt(id.slice(1), 10);
      if (!confirm('ลบบริษัทนี้ออกจากรายการ terms?')) return;
      state.extraTermsVendors.splice(idx, 1);
      // รีเซ็ต selection (จะ auto-pick ใหม่ตอน render)
      state.selectedTermsVendorIdx = null;
      renderComparisonView();
      persistState();
    },

    exportExcel() {
      try {
        const payload = buildExportPayload();
        state.lastExportPayload = payload;
        const name = `ตารางเปรียบเทียบราคา${payload.workName ? '-' + payload.workName.replace(/[\\/:*?"<>|]/g, '') : ''}.xlsx`;
        window.CompareExcelExport = window.CompareExcelExport || {};
     if (!window.CompareExcelExport.download) window.CompareExcelExport.download = async () => {};
     window.CompareExcelExport.download(payload, name);
      } catch (e) {
        console.error('[exportExcel]', e);
        alert('สร้างไฟล์ Excel ไม่สำเร็จ: ' + e.message);
      }
    },

    // Test hook — ให้ regression test ดึง payload ล่าสุดได้
    _lastExportPayload() { return state.lastExportPayload; },

    printDocument() {
      window.print();
    },

    // ─────────────────────────────────────────────
    // MULTI-BOQ mode handlers
    // ─────────────────────────────────────────────

    /**
     * Multi-BOQ: handle multi-file upload
     * รับ event จาก <input type="file" multiple> ทั้งใน upload prompt + file list
     */
    async handleMultiFileUpload(event) {
      if (!window.MultiBOQ) {
        showToast('Multi-BOQ module ยังโหลดไม่เสร็จ', 'error');
        return;
      }
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      // reset input value เพื่อให้เลือกไฟล์เดิมซ้ำได้
      try { event.target.value = ''; } catch (e) { /* ignore */ }

      let added = 0, failed = 0;
      for (const file of files) {
        if (state.multiBOQ.files.length >= 6) {
          showToast('ไม่เกิน 6 ไฟล์ — ข้ามไฟล์ที่เกิน', 'info');
          break;
        }
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (ext !== 'xlsx') {
          showToast(`ข้าม ${file.name} — รองรับเฉพาะ .xlsx`, 'info');
          continue;
        }
        try {
          const buf = await file.arrayBuffer();
          const parsed = window.MultiBOQ.parseSupplierFile(buf, { fileName: file.name });
          parsed.id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          state.multiBOQ.files.push(parsed);
          added++;
        } catch (err) {
          console.error('[multi-boq upload]', err);
          showToast(`อ่านไฟล์ ${file.name} ไม่สำเร็จ: ${err.message}`, 'error');
          failed++;
        }
      }
      if (added > 0) {
        // invalidate groups (ต้อง re-match)
        state.multiBOQ.groups = [];
        renderUploadCard();
        renderComparisonView();
        persistState();
        showToast(`เพิ่มไฟล์สำเร็จ ${added} ไฟล์${failed ? ` (ล้มเหลว ${failed})` : ''}`, 'success');
      }
    },

    /**
     * เปลี่ยนชื่อ supplier ใน file list
     */
    renameSupplierFile(fileIdx, newName) {
      if (!window.MultiBOQ) return;
      newName = String(newName || '').trim();
      if (!newName) {
        showToast('ชื่อผู้ขายต้องไม่ว่าง', 'error');
        renderUploadCard();
        return;
      }
      // ห้ามซ้ำ
      const dupe = state.multiBOQ.files.some((f, i) => i !== fileIdx && f.supplierName === newName);
      if (dupe) {
        showToast(`มี supplier "${newName}" อยู่แล้ว — กรุณาใช้ชื่ออื่น`, 'error');
        renderUploadCard();
        return;
      }
      window.MultiBOQ.setSupplierName(state, fileIdx, newName);
      renderUploadCard();
      renderComparisonView();
      persistState();
    },

    /**
     * ลบไฟล์ supplier ออก
     */
    removeSupplierFile(fileIdx) {
      if (!window.MultiBOQ) return;
      if (!confirm('ลบไฟล์นี้? (กลุ่มที่จับคู่ไว้จะถูก reset)')) return;
      window.MultiBOQ.removeFile(state, fileIdx);
      renderUploadCard();
      renderComparisonView();
      persistState();
    },

    /**
     * ปรับ threshold + re-run matching
     */
    updateMatchThreshold(v) {
      state.multiBOQ.matchThreshold = v;
      // ไม่ auto re-match ให้ user กดปุ่มเอง (อย่างไรก็ตาม update label ใน UI ให้ตรง)
      persistState();
    },

    /**
     * จับคู่รายการอัตโนมัติ
     */
    runMatching() {
      if (!window.MultiBOQ) {
        showToast('Multi-BOQ module ยังโหลดไม่เสร็จ', 'error');
        return;
      }
      if (state.multiBOQ.files.length < 2) {
        showToast('ต้องอัปโหลดอย่างน้อย 2 ไฟล์', 'error');
        return;
      }
      try {
        const t0 = performance.now();
        window.MultiBOQ.runMatching(state);
        const ms = (performance.now() - t0).toFixed(0);
        const matched = state.multiBOQ.groups.filter(g => g.vendorPrices.filter(vp => vp.source === 'file').length > 1).length;
        const total = state.multiBOQ.groups.length;
        showToast(`จับคู่สำเร็จ: ${total} กลุ่ม (${matched} กลุ่มมีหลาย supplier, ${ms} ms)`, 'success');
        renderUploadCard();
        renderComparisonView();
        persistState();
      } catch (err) {
        console.error('[runMatching]', err);
        showToast('จับคู่ไม่สำเร็จ: ' + err.message, 'error');
      }
    },

    /**
     * แสดง/ซ่อน group review panel
     */
    _groupReviewVisible: false,
    toggleGroupReview() {
      this._groupReviewVisible = !this._groupReviewVisible;
      const c = document.getElementById('supplierComparisonUploadSection');
      if (!c) return;
      // แทรก/ลบ review panel หลัง upload card
      const existing = document.getElementById('multiBoqGroupReview');
      if (this._groupReviewVisible && state.multiBOQ.groups.length) {
        if (!existing) {
          const div = document.createElement('div');
          div.id = 'multiBoqGroupReview';
          div.innerHTML = window.MultiBOQ.renderGroupReview();
          c.appendChild(div);
        }
      } else if (existing) {
        existing.remove();
      }
    },

    /**
     * สลับโหมด single ↔ multi-boq
     */
    switchMode(mode) {
      if (mode !== 'single' && mode !== 'multi-boq') return;
      if (state.mode === mode) {
        // update tab UI anyway
        updateModeTabsUI();
        return;
      }
      const hasSingleData = state.sheets && state.sheets.length > 0;
      const hasMultiData = state.multiBOQ && state.multiBOQ.files && state.multiBOQ.files.length > 0;
      if (hasSingleData || hasMultiData) {
        if (!confirm('สลับโหมดจะล้างข้อมูลของโหมดอื่น — ต้องการดำเนินการต่อหรือไม่?')) {
          updateModeTabsUI();
          return;
        }
        this.clear();
      }
      state.mode = mode;
      updateModeTabsUI();
      renderUploadCard();
      renderComparisonView();
      persistState();
    },

    // For testing / external access
    _state: state,
  };

  // sync UI ของ tab ให้ตรงกับ state.mode
  function updateModeTabsUI() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.mode-tab').forEach(btn => {
      const m = btn.getAttribute('data-mode');
      if (m === state.mode) {
        btn.setAttribute('aria-selected', 'true');
        btn.classList.add('active');
      } else {
        btn.setAttribute('aria-selected', 'false');
        btn.classList.remove('active');
      }
    });
  }

  window.SupplierCompareController = controller;
})();
