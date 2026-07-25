/* ==========================================================================
   Supplier Comparison Module (ใบเปรียบเทียบราคา 7 ผู้ขาย)

   ทำงานร่วมกับ alerts.html — เป็นโหมดที่สองของหน้า
   ใช้สำหรับ:
   - อัปโหลด / แปะไฟล์ .xlsx ที่มีราคา 7 ผู้ขายเทียบกัน
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
    isDemo: false,
  };

  /* ---------- Helpers ---------- */
  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(String(v).replace(/[,\s]/g, ''));
    return isFinite(n) ? n : null;
  };
  const stripSpaces = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const isSupplierHeader = (s) => /บริษัท|ห้าง|ร้าน|จำกัด|หจก/.test(s || '');

  /* ============================================================
     PARSER — แปลงไฟล์ XLSX ของ Blessini (7 suppliers × 7 sheets)
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
      isDemo: false,
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
    for (let r = dataStart; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const colA = String(row[0] || '').trim();
      const colB = String(row[1] || '').trim();
      if (!colA && !colB) continue;

      // ข้ามแถวหัวข้อรวม
      if (/^รวม|ราคารวม|รวมทั้งสิ้น|^Sub.?total/i.test(colB)) continue;

      // ตรวจ WD header row (เช่น "1.2 WD02 ห้องน้ำ 1,2,3")
      const wdInA = colA.match(/WD\d{2}/i);
      const wdInB = colB.match(/WD\d{2}/i);

      if (wdInA) {
        // WD header row — อัปเดต currentWD แล้วข้าม (ไม่ใช่ item)
        currentWD = wdInA[0].toUpperCase();
        continue;
      }
      if (wdInB) {
        // WD ใน col B (item header บางแบบ) — ใช้ WD นี้แต่ยังต้องเช็คว่าเป็น item หรือ header
        currentWD = wdInB[0].toUpperCase();
      }

      // ถ้าแถวนี้ไม่มี spec (วงกบ/บาน/ประตู/...) — น่าจะเป็น header/หัวข้อ
      const hasSpec = /วงกบ|บาน|ประตู|ไม้|WPC|HDF|UPVC|ผนัง|พื้น/i.test(colB);
      if (!hasSpec) continue;

      // ต้องมี WD (จาก header ก่อนหน้า หรือจาก row นี้)
      const wd = currentWD;
      if (!wd) continue;

      // ปริมาณในไฟล์จริงเป็น label — default = 1
      const qty = 1;
      const unit = stripSpaces(row[7]) || 'ชุด';

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
    const demoButton = `
      <button class="sample-btn" onclick="SupplierCompareController.loadDemo()" style="grid-column:1/-1;">
        <div class="sample-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 9h6v6H9z"/></svg>
        </div>
        <div class="sample-info">
          <div class="sample-name">BLESSINI — งาน วงกบประตู (Type S)</div>
          <div class="sample-meta">ข้อมูลตัวอย่าง · 12 รายการ · 7 ผู้ขาย</div>
        </div>
      </button>
    `;

    return `
      <div class="upload-card" id="supplierUploadCard">
        <div class="upload-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M9 14l2 2 4-4"/>
          </svg>
        </div>
        <h3>แนบไฟล์เปรียบเทียบราคา 7 ผู้ขาย</h3>
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

        <div class="divider-with-text">
          <span>หรือทดลองใช้งาน</span>
        </div>

        <p style="margin-bottom:12px;">เลือกข้อมูลตัวอย่าง (จากโครงการ BLESSINI):</p>
        <div class="sample-grid">${demoButton}</div>

        <div class="demo-hint-card">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          <span>ระบบจะเน้นผู้ที่ถูกสุดด้วยสีเขียว แต่ไม่ตัดสินใจเลือกผู้ชนะแทน — ฝ่ายจัดซื้อเลือกเอง</span>
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
            ${state.isDemo ? '<span class="sample-tag">ตัวอย่าง</span>' : ''}
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
      ${renderKpiStrip(items, suppliers)}
      ${renderComparisonTable(items, suppliers)}
      ${renderConclusionBlock(suppliers)}
      ${renderSignatureBlock()}
      ${renderTermsBlock()}
      <div class="action-bar">
        <button class="btn btn-primary" onclick="SupplierCompareController.printDocument()">
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

    const rows = items.map((item, itemIdx) => {
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
    const roles = [
      { group: 'ฝ่ายจัดทำ (ผู้จัดทำใบเปรียบเทียบ)', names: [
        'Section Manager (จัดทำ)',
        'Vice President #2',
        'Assistant Vice President #1',
        'Assistant Vice President #1',
        'Senior Vice President #2',
      ] },
      { group: 'คณะกรรมการจัดซื้อจัดจ้าง (อนุมัติ/ผ่าน)', names: [
        'Senior Managing Director',
        'Deputy Chief Executive Officer',
      ] },
      { group: 'คณะกรรมการบริหาร (อนุมัติ/ผ่าน)', names: [
        'Deputy Chief Executive Officer',
        'Deputy Chief Executive',
      ] },
    ];

    const blocks = [];
    roles.forEach(g => {
      g.names.forEach(name => {
        blocks.push({ group: g.group, name: name });
      });
    });

    return `
      <div class="card signature-card">
        <div class="card-header">
          <div>
            <h3>สายอนุมัติ (9 ระดับ)</h3>
            <div class="sub">พิมพ์เอกสารแล้วให้ผู้มีอำนาจลงนามตามลำดับ</div>
          </div>
        </div>
        <div class="card-body">
          <div class="signature-grid">
            ${blocks.map(b => `
              <div class="signature-block">
                <div class="signature-role">${escapeHtml(b.name)}</div>
                <div class="signature-line"></div>
                <div class="signature-meta">
                  <span class="placeholder">[ลายเซ็น]</span>
                </div>
                <div class="signature-fields">
                  <div class="field">
                    <div class="field-label">ชื่อ</div>
                    <div class="field-line"></div>
                  </div>
                  <div class="field">
                    <div class="field-label">วันที่</div>
                    <div class="field-line"></div>
                  </div>
                </div>
                <div class="signature-group">${escapeHtml(b.group)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderTermsBlock() {
    return `
      <div class="card terms-card">
        <div class="card-header">
          <div>
            <h3>เงื่อนไขการจัดซื้อ / กำหนดส่งมอบ</h3>
            <div class="sub">ฝ่ายจัดซื้อระบุ — พิมพ์ออกมาพร้อมกันกับใบเสนอราคา</div>
          </div>
        </div>
        <div class="card-body">
          <div class="terms-grid">
            <div class="term-field">
              <label>กำหนดเสร็จงาน</label>
              <input type="text" class="form-control" placeholder="เช่น 31 มีนาคม 2569">
            </div>
            <div class="term-field">
              <label>ระยะเวลาจัดส่ง</label>
              <input type="text" class="form-control" placeholder="เช่น 30 วัน">
            </div>
            <div class="term-field">
              <label>เครดิต (วัน)</label>
              <input type="text" class="form-control" placeholder="เช่น 30 วัน">
            </div>
            <div class="term-field">
              <label>รับประกัน</label>
              <input type="text" class="form-control" placeholder="เช่น 1 ปี">
            </div>
          </div>
        </div>
      </div>
    `;
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
          state.isDemo = false;
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
      const sample = D.supplierCompareSamples && D.supplierCompareSamples[0];
      if (!sample) {
        showToast('ไม่พบข้อมูลตัวอย่าง — ตรวจสอบ js/data.js');
        return;
      }
      state.fileName = sample.fileName || 'BLESSINI — งานวงกบประตู Type S.xlsx';
      state.workName = sample.workName;
      state.thresholdLabel = sample.thresholdLabel || 'วงเงินเกิน 500,000 ขึ้นไป';
      state.sheets = sample.sheets;
      state.activeSheetIdx = sample.sheets.length - 1;
      state.winnerByItem = {};
      state.conclusionSupplier = '';
      state.conclusionReason = '';
      state.isDemo = true;
      renderUploadCard();
      renderComparisonView();
      showToast('โหลดข้อมูลตัวอย่างสำเร็จ');
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
      state.isDemo = false;
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

    printDocument() {
      window.print();
    },

    // For testing / external access
    _state: state,
  };

  window.SupplierCompareController = controller;
})();
