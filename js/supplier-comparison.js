/* ==========================================================================
   Supplier Comparison Module (ใบเปรียบเทียบราคาผู้ขาย)

   ทำงานร่วมกับ alerts.html — เป็นโหมดที่สองของหน้า
   ใช้สำหรับ:
   - อัปโหลด / แปะไฟล์ .xlsx ที่มีราคาผู้ขายหลายรายเทียบกัน (จำนวนไม่ fix)
   - แสดงตารางเปรียบเทียบราคา ไฮไลต์ผู้ที่ถูกสุดต่อรายการ (visual เท่านั้น)
   - ให้ผู้ใช้เลือกผู้ชนะด้วยตัวเอง (ไม่ auto-pick)
   - สร้างข้อความ "สรุปให้...เป็นผู้ดำเนินการ..." ที่แก้ไขได้
   - แสดง 9 ช่องลายเซ็นตามสายอนุมัติ
   - พิมพ์ / บันทึก PDF ผ่าน window.print()
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- State ---------- */
  const state = {
    fileName: '',
    workName: '',          // เช่น "งานวงกบประตู"
    thresholdLabel: '',    // เช่น "วงเงินเกิน 500,000 ขึ้นไป"
    sheets: [],            // [{ name, items: [...], isFinalShortlist }]
    activeSheetIdx: 0,
    winnerByItem: {},      // { itemIdx: supplierIdx } — manual picks
    conclusionSupplier: '',
    conclusionReason: '',
    // ค่าเริ่มต้นตามไฟล์ต้นฉบับ BLESSINI — ผู้ใช้แก้ได้ในหน้าเว็บ
    signatures: {
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
    },
    terms: {},             // { supplierIdx: { key: value } }
    selectedTermsVendorIdx: null,  // idx ของ vendor ที่เลือกในหน้า terms (null = auto)
    extraTermsVendors: [],        // [{ id, name, terms: {key:value} }] — vendor ที่เพิ่มเอง
    sortByCheapest: false,        // toggle: เรียงแถวตามราคาต่ำสุด (ถูกสุดอยู่บน)
  };

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

      const parsed = parseSheet(aoa, sheetName);
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

      // ปริมาณอยู่คอลัมน์ H (index 7), หน่วยอยู่คอลัมน์ I (index 8)
      const qty = num(row[7]) !== null ? num(row[7]) : 1;
      const unit = stripSpaces(row[8]) || 'ชุด';

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

    const hasData = state.sheets.length > 0;

    if (hasData) {
      c.innerHTML = renderFileInfoBar();
    } else {
      c.innerHTML = renderUploadPrompt();
    }
  }

  function renderUploadPrompt() {
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
          ลากไฟล์ .xlsx มาวาง หรือคลิกปุ่มด้านล่างเพื่อเลือกไฟล์<br>
          ระบบจะแสดงตารางเปรียบเทียบราคา แล้วให้ผู้จัดซื้อ <strong>เลือกผู้ชนะด้วยตัวเอง</strong>
        </p>
        <input type="file" id="supplierFileInput" accept=".xlsx" style="display:none" onchange="SupplierCompareController.handleFileUpload(event)">
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="document.getElementById('supplierFileInput').click()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            อัปโหลดไฟล์ .xlsx
          </button>
        </div>
        <div class="file-types">
          <span>.xlsx</span>
        </div>
      </div>
    `;
  }

  function renderFileInfoBar() {
    const supplierCount = getSupplierCount();
    const itemCount = getActiveItems().length;
    const sheetOptions = state.sheets.map((s, i) =>
      `<option value="${i}" ${i === state.activeSheetIdx ? 'selected' : ''}>${escapeHtml(s.name)}${s.isFinalShortlist ? ' ★ (ฉบับสุดท้าย)' : ''}</option>`
    ).join('');

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
            · ${itemCount} รายการ
            · ${state.sheets.length} ฉบับ
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <select class="form-control" style="padding:6px 10px;font-size:12px;" onchange="SupplierCompareController.switchSheet(parseInt(this.value))">
            ${sheetOptions}
          </select>
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

    sec.innerHTML = `
      ${renderWinnerBanner(items, suppliers)}
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
          <td class="num qty-cell">${item.qty} <span class="unit-label">${escapeHtml(item.unit)}</span></td>
          <td class="num boq-cell">${item.boq > 0 ? fmt.currencyShort(item.boq) : '—'}</td>
          ${cells}
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
                  <th style="width:64px;">WD</th>
                  <th>รายการ</th>
                  <th class="num" style="width:70px;">ปริมาณ</th>
                  <th class="num" style="width:80px;background:var(--color-info-soft);">BOQ</th>
                  ${supplierHeaders}
                  <th style="width:140px;background:var(--color-primary-soft);">เลือกผู้ชนะ</th>
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
            <span class="placeholder">[ลายเซ็น]</span>
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
            <h3>สายอนุมัติ (${total} ช่อง)</h3>
            <div class="sub">แก้ตำแหน่ง/ชื่อได้ตามโครงการ — ค่าที่ตั้งไว้จะไปปรากฏในไฟล์ Excel</div>
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

  /* ============================================================
     AUTO-EXTRACT TERMS (R2) — รวบข้อความจาก state แล้ว regex ตาม fieldKey
     ============================================================ */
  function gatherTermsSourceText() {
    const sheet = state.sheets && state.sheets[state.activeSheetIdx];
    const parts = [];
    if (state.fileName) parts.push(state.fileName);
    if (state.projectName) parts.push(state.projectName);
    if (sheet) {
      if (sheet.projectLine) parts.push(sheet.projectLine);
      if (sheet.workLine) parts.push(sheet.workLine);
      if (sheet.name) parts.push(sheet.name);
      // รวมชื่อผู้ขาย + note ของแต่ละ vendor (ถ้ามี)
      const suppliers = (sheet.supplierNames || []);
      parts.push(suppliers.join(' '));
      // รวม note/description ของ item
      (sheet.items || []).forEach(it => {
        if (it.name) parts.push(it.name);
        if (it.wdTitle) parts.push(it.wdTitle);
      });
    }
    return parts.filter(Boolean).join('\n');
  }

  /* regex patterns สำหรับแต่ละ field — return string | null */
  function extractTermFromText(text, fieldKey) {
    if (!text) return null;
    const t = String(text);
    switch (fieldKey) {
      case 'priceNote': {
        const m = t.match(/(ราคา\s*[:]?\s*(?:รวม|ไม่รวม)?\s*ภาษีมูลค่าเพิ่ม\s*\d*\s*%|ราคารวมภาษี|VAT\s*\d+\s*%|ภาษี\s*\d+\s*%)/i);
        return m ? m[1].replace(/\s+/g, ' ').trim() : null;
      }
      case 'validUntil': {
        const m = t.match(/(ยืนราคา(?:ถึง)?\s*[\d\sก-๙]+\s*\d{4}|ยืนราคาตลอด(?:ทั้ง)?โครงการ|ยืนราคา\s*\d+\s*วัน)/);
        return m ? m[1].replace(/\s+/g, ' ').trim() : null;
      }
      case 'paymentTerm': {
        const m = t.match(/(เครดิต\s*\d+\s*วัน[^\n]{0,40}|เงินสด|ชำระ(?:เงิน)?[^\n]{0,40})/);
        return m ? m[1].replace(/\s+/g, ' ').trim() : null;
      }
      case 'delivery': {
        const m = t.match(/(ผลิต\s*\d+(?:-\d+)?\s*วัน[^\n]{0,40}|ส่งมอบ(?:ภายใน)?\s*\d+(?:-\d+)?\s*วัน[^\n]{0,40}|ภายใน\s*\d+(?:-\d+)?\s*วัน[^\n]{0,40})/);
        return m ? m[1].replace(/\s+/g, ' ').trim() : null;
      }
      case 'warranty': {
        const m = t.match(/(รับประกัน(?:สินค้า)?\s*\d+\s*ปี|รับประกัน\s*\d+\s*เดือน)/);
        return m ? m[1].replace(/\s+/g, ' ').trim() : null;
      }
      case 'contact': {
        const m = t.match(/(คุณ[^\s\d]{1,30}\s*[\d\-]{8,12}|นาย[^\s\d]{1,30}\s*[\d\-]{8,12}|นางสาว[^\s\d]{1,30}\s*[\d\-]{8,12}|0\d{1,2}[-\s]?\d{3}[-\s]?\d{4,7})/);
        return m ? m[1].replace(/\s+/g, ' ').trim() : null;
      }
    }
    return null;
  }

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
          <button type="button" class="btn-icon btn-extract"
                  title="ดึงข้อมูลจากเอกสาร (อัตโนมัติ)"
                  onclick="SupplierCompareController.autoExtractTerm('${selected.id}','${f.key}')">🔍</button>
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
  function getActiveItems() {
    const s = state.sheets[state.activeSheetIdx];
    return s ? s.items : [];
  }
  function getActiveSuppliers() {
    const items = getActiveItems();
    if (items.length === 0) return [];
    return items[0].suppliers.map((s, i) => ({ ...s, idx: i }));
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
      // restore preference
      try {
        const stored = localStorage.getItem('sortByCheapest');
        if (stored === '1') state.sortByCheapest = true;
      } catch (e) {}
      renderUploadCard();
    },

    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
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
          renderUploadCard();
          renderComparisonView();
          showToast(`โหลดสำเร็จ: ${parsed.sheets.length} ฉบับ, ${getActiveItems().length} รายการ`);
        } catch (err) {
          console.error(err);
          showToast('เกิดข้อผิดพลาด: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    },

    loadDemo() {
      // sample data removed — use actual XLSX file upload instead
      showToast('ไม่มีข้อมูลตัวอย่าง — กรุณาอัปโหลดไฟล์ .xlsx จริง', 'info');
    },

    switchSheet(idx) {
      state.activeSheetIdx = idx;
      state.winnerByItem = {};
      state.conclusionSupplier = '';
      state.conclusionReason = '';
      renderUploadCard();
      renderComparisonView();
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
      renderUploadCard();
      renderComparisonView();
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
    },

    setConclusionSupplier(name) {
      state.conclusionSupplier = name;
      const preview = document.getElementById('conclusionPreview');
      if (preview) preview.innerHTML = buildConclusionText();
    },

    setConclusionReason(reason) {
      state.conclusionReason = reason;
      const preview = document.getElementById('conclusionPreview');
      if (preview) preview.innerHTML = buildConclusionText();
    },

    updateSignature(groupKey, idx, field, value) {
      const people = sigPeople(groupKey);
      if (people[idx]) people[idx][field] = value;
    },

    addSignature(groupKey) {
      const g = state.signatures[groupKey];
      if (!g) return;
      const arr = Array.isArray(g) ? g : (g.people = g.people || []);
      arr.push({ title: '', name: '' });
      renderComparisonView();
    },

    removeSignature(groupKey, idx) {
      const people = sigPeople(groupKey);
      people.splice(idx, 1);
      renderComparisonView();
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
    },

    setTermsVendorIdx(id) {
      state.selectedTermsVendorIdx = id;
      renderComparisonView();
    },

    setSortByCheapest(on) {
      state.sortByCheapest = !!on;
      // persist preference
      try { localStorage.setItem('sortByCheapest', state.sortByCheapest ? '1' : '0'); } catch (e) {}
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
    },

    removeTermsVendor(id) {
      if (typeof id !== 'string' || !id.startsWith('e')) return;
      const idx = parseInt(id.slice(1), 10);
      if (!confirm('ลบบริษัทนี้ออกจากรายการ terms?')) return;
      state.extraTermsVendors.splice(idx, 1);
      // รีเซ็ต selection (จะ auto-pick ใหม่ตอน render)
      state.selectedTermsVendorIdx = null;
      renderComparisonView();
    },

    autoExtractTerm(supplierIdx, fieldKey) {
      // ดึงข้อความจาก sheet (workName, projectName, items, suppliers) แล้วยิง regex ตาม fieldKey
      const text = gatherTermsSourceText();
      if (!text) {
        alert('ไม่พบข้อความต้นทาง — กรุณาอัปโหลดไฟล์ก่อน');
        return;
      }
      const extracted = extractTermFromText(text, fieldKey);
      if (!extracted) {
        showToast('ไม่พบข้อความที่ตรงกับฟิลด์ "' + (TERM_FIELDS.find(f => f.key === fieldKey) || {}).label + '"', 'warn');
        return;
      }
      // เติมค่าลง state แล้ว re-render
      const ctrl = SupplierCompareController;
      ctrl.updateTerm(supplierIdx, fieldKey, extracted);
      renderComparisonView();
      showToast('ดึงข้อมูลสำเร็จ: ' + extracted, 'success');
    },

    exportExcel() {
      try {
        const payload = buildExportPayload();
        const name = `ตารางเปรียบเทียบราคา${payload.workName ? '-' + payload.workName.replace(/[\\/:*?"<>|]/g, '') : ''}.xlsx`;
        window.CompareExcelExport.download(payload, name);
      } catch (e) {
        console.error('[exportExcel]', e);
        alert('สร้างไฟล์ Excel ไม่สำเร็จ: ' + e.message);
      }
    },

    printDocument() {
      window.print();
    },

    // For testing / external access
    _state: state,
  };

  window.SupplierCompareController = controller;
})();
