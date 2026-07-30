/* ==========================================================================
   Multi-BOQ Compare Module
   ==========================================================================
   จับคู่รายการข้าม BOQ หลายไฟล์ (2-6 ไฟล์) — แต่ละไฟล์มาจากผู้ขายคนละราย
   ใช้ FuzzyMatchSAP (tokenize + _internal.score) จับ cluster + unit pre-filter

   Public API:
     window.MultiBOQ = {
       // pure helpers (testable ใน node)
       unitClass, parseSupplierFile, buildGroups, buildVendorPriceMatrix,
       pickCanonicalName, pickCommonUnit, pickCommonQty,
       runMatching, buildExportPayload, setSupplierName, removeFile,

       // DOM helpers (browser only)
       renderUploadPrompt, renderFileList, renderGroupReview,
       renderModeTabs,
     }

   ต้องโหลด <script src="vendor/exceljs.min.js"></script> ก่อน
   ต้องโหลด <script src="js/fuzzy-match-sap.js"></script> ก่อน
   ========================================================================== */

(function (root) {
  'use strict';

  /* ============================================================
     Unit class — ใช้ pre-filter ก่อน fuzzy score
     ลำดับสำคัญ: area/volume ต้องตรวจก่อน count (เพราะ 'ตร.ม.' มี 'ตัว' อยู่)
     ============================================================ */
  function unitClass(u) {
    const s = String(u || '').trim().toLowerCase();
    if (!s) return 'unknown';
    // area ก่อน (ตร.ม., ตารางเมตร, m², sqm)
    if (/(ตร\.ม|m²|m2|ตารางเมตร|sq\.?m|sqm)/.test(s)) return 'area';
    // volume (ลบ.ม., m³, คิว)
    if (/(ลบ\.ม|m³|m3|คิว|cubic)/.test(s)) return 'volume';
    // length (เมตร, ม., เส้น)
    if (/(^เมตร$|ต่อเมตร|เมตร$|ม\.ละ|^ม\.|เส้น)/.test(s)) return 'length';
    // weight
    if (/(กก\.|^กก$|kg|ตัน|ton|กรัม|^g$)/i.test(s)) return 'weight';
    // piece (แผ่น, ม้วน, ถุง, ท่อน, แท่ง, ก้อน)
    if (/(^แผ่น$|ม้วน|^ถุง$|ท่อน|แท่ง|ก้อน|ห่อ|มัด)/.test(s)) return 'piece';
    // count default — เฉพาะหน่วยที่นับเป็นชิ้น/ชุด/บาน/ตัว ฯลฯ
    if (/(^ชุด$|^ชิ้น$|^บาน$|^ตัว$|^ลูก$|^ดวง$|^อัน$|^ใบ$|^หลัง$|^set$|^ea$|^each$|^un(?!it)$|^no\.?$)/.test(s)) return 'count';
    return 'other';
  }

  /* ============================================================
     pickCanonicalName / pickCommonUnit / pickCommonQty
     ============================================================ */
  function pickCanonicalName(members) {
    if (!members || !members.length) return '';
    // ชื่อที่ normalized ยาวสุด = descriptive สุด (Tie → first occurrence)
    let best = members[0].name || '';
    let bestLen = (members[0]._t && members[0]._t.normalized ? members[0]._t.normalized.length : best.length);
    for (let i = 1; i < members.length; i++) {
      const len = (members[i]._t && members[i]._t.normalized ? members[i]._t.normalized.length : (members[i].name || '').length);
      if (len > bestLen) {
        best = members[i].name || best;
        bestLen = len;
      }
    }
    return best;
  }

  function pickCommonUnit(members) {
    if (!members || !members.length) return { unit: 'ชุด', warning: false };
    const counts = {};
    let maxCount = 0;
    let maxUnit = 'ชุด';
    for (const m of members) {
      const u = (m.unit || '').trim() || 'ชุด';
      counts[u] = (counts[u] || 0) + 1;
      if (counts[u] > maxCount) { maxCount = counts[u]; maxUnit = u; }
    }
    return {
      unit: maxUnit,
      warning: (maxCount / members.length) < 0.6,
    };
  }

  function pickCommonQty(members) {
    if (!members || !members.length) return { qty: 1, warning: false };
    const counts = {};
    let maxCount = 0;
    let maxQty = 1;
    for (const m of members) {
      const q = (typeof m.qty === 'number' && m.qty > 0) ? m.qty : 1;
      counts[q] = (counts[q] || 0) + 1;
      if (counts[q] > maxCount) { maxCount = counts[q]; maxQty = q; }
    }
    return {
      qty: maxQty,
      warning: (maxCount / members.length) < 0.6,
    };
  }

  /* ============================================================
     parseSupplierFile — ห่อ parseSimpleBOQ สำหรับ multi-BOQ
     ============================================================
     arrayBuffer = ArrayBuffer ของไฟล์ .xlsx (จาก FileReader)
     opts.fileName = ชื่อไฟล์ (ใช้ default supplierName = filename stem)
     ============================================================ */
  function parseSupplierFile(arrayBuffer, opts) {
    opts = opts || {};
    const fileName = opts.fileName || 'unknown.xlsx';

    if (typeof XLSX === 'undefined') {
      throw new Error('XLSX library ไม่ได้โหลด');
    }

    // อ่าน sheet แรกเป็น AOA
    let wb;
    try {
      wb = XLSX.read(arrayBuffer, { type: 'array' });
    } catch (e) {
      throw new Error('อ่านไฟล์ .xlsx ไม่ได้: ' + e.message);
    }
    if (!wb.SheetNames || !wb.SheetNames.length) {
      throw new Error('ไฟล์ไม่มี sheet');
    }
    const sheetName = wb.SheetNames[0];
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });

    // parseSimpleBOQ เป็น global function (จาก supplier-comparison.js)
    if (typeof parseSimpleBOQ !== 'function') {
      throw new Error('parseSimpleBOQ ไม่พร้อมใช้งาน');
    }
    const parsed = parseSimpleBOQ(aoa, sheetName);
    if (!parsed) {
      throw new Error('ไม่พบ header BOQ ในไฟล์ (ต้องมีคอลัมน์ ลำดับ/รายการ/จำนวน/หน่วย/ราคา)');
    }

    // แปลง items: แต่ละ item มี price/total จาก BOQ row เดียว
    // → flatten เป็น { name, qty, unit, price, total } (single price เพราะเป็น BOQ ของ supplier นี้)
    const items = (parsed.items || []).map((it) => {
      const supplier = (it.suppliers && it.suppliers[0]) || {};
      return {
        name: it.name,
        qty: it.qty || 1,
        unit: it.unit || 'ชุด',
        price: supplier.price || 0,
        total: supplier.total || 0,
      };
    }).filter(it => it.name);  // กรอง item ว่างออก

    // supplierName default = filename stem
    const supplierName = opts.supplierName || fileName.replace(/\.[^.]+$/, '');

    return {
      fileName: fileName,
      supplierName: supplierName,
      workName: parsed.workLine || '',
      items: items,
      _format: 'simple-boq',
    };
  }

  /* ============================================================
     setSupplierName — เปลี่ยนชื่อผู้ขาย + re-sync fileOrder
     ============================================================ */
  function setSupplierName(state, fileIdx, newName) {
    const m = state.multiBOQ;
    if (!m.files[fileIdx]) return;
    const oldName = m.files[fileIdx].supplierName;
    m.files[fileIdx].supplierName = newName;
    // อัปเดต fileOrder index
    const ord = m.fileOrder.indexOf(oldName);
    if (ord >= 0) m.fileOrder[ord] = newName;
    // อัปเดต groups.vendorPrices[].vendorName ด้วย (เพื่อให้ UI/export ตรง)
    (m.groups || []).forEach((g) => {
      const vp = g.vendorPrices && g.vendorPrices[fileIdx];
      if (vp) vp.vendorName = newName;
    });
  }

  function removeFile(state, fileIdx) {
    const m = state.multiBOQ;
    if (!m.files[fileIdx]) return;
    const removed = m.files.splice(fileIdx, 1)[0];
    if (removed && removed.supplierName) {
      const ord = m.fileOrder.indexOf(removed.supplierName);
      if (ord >= 0) m.fileOrder.splice(ord, 1);
    }
    // invalidate groups (จะต้อง re-match)
    m.groups = [];
  }

  /* ============================================================
     buildGroups — N-way greedy clustering
     ============================================================
     files = [{ items: [{ name, qty, unit, price, total }] }]
     threshold = ค่า score ขั้นต่ำ (0..1) ที่จะ accept pair
     ============================================================ */
  function buildGroups(files, threshold) {
    if (!files || !files.length) return [];
    if (typeof window === 'undefined' || !window.FuzzyMatchSAP) {
      throw new Error('FuzzyMatchSAP ไม่ได้โหลด');
    }
    const FS = window.FuzzyMatchSAP;

    // 1. flatten + tokenize
    const items = [];
    for (let fi = 0; fi < files.length; fi++) {
      const fileItems = files[fi].items || [];
      for (let ii = 0; ii < fileItems.length; ii++) {
        const it = fileItems[ii];
        const t = FS.tokenize(it.name || '');
        items.push({
          fileIdx: fi,
          itemIdx: ii,
          name: it.name,
          qty: it.qty,
          unit: it.unit,
          price: it.price,
          total: it.total,
          _t: t,
        });
      }
    }

    // 2. track assigned
    const assigned = new Set();
    const groups = [];

    // 3. sort by richness (longer normalized name first)
    const order = items
      .map((it, idx) => ({ idx, len: (it._t.normalized || '').length }))
      .sort((a, b) => b.len - a.len);

    for (const seed of order) {
      const seedItem = items[seed.idx];
      const key = seedItem.fileIdx + ':' + seedItem.itemIdx;
      if (assigned.has(key)) continue;

      const group = {
        members: [seedItem],
        canonicalName: seedItem.name,
        _canonicalT: seedItem._t,
      };
      assigned.add(key);

      // 4. find matches across remaining items
      for (let k = 0; k < order.length; k++) {
        const cand = items[order[k].idx];
        const kKey = cand.fileIdx + ':' + cand.itemIdx;
        if (assigned.has(kKey) || kKey === key) continue;

        // ≤ 1 per file in each group
        if (group.members.some(m => m.fileIdx === cand.fileIdx)) continue;

        // unit pre-filter
        const seedCls = unitClass(seedItem.unit);
        const candCls = unitClass(cand.unit);
        if (seedCls !== 'unknown' && candCls !== 'unknown' && seedCls !== candCls) continue;

        // score กับ canonical (ทุก member ที่ join หลัง seed ใช้ canonical ของกลุ่มเป็น reference)
        // score(query, rec) expects rec._t — so wrap cand._t in a record-like object
        const score = FS._internal.score(group._canonicalT, { _t: cand._t });
        if (score >= threshold) {
          group.members.push(cand);
          assigned.add(kKey);
        }
      }

      groups.push(group);
    }

    // 5. final structure
    return groups.map((g, gi) => {
      const cu = pickCommonUnit(g.members);
      const cq = pickCommonQty(g.members);
      return {
        id: 'g' + gi,
        canonicalName: pickCanonicalName(g.members),
        unit: cu.unit,
        qty: cq.qty,
        unitWarning: cu.warning,
        qtyWarning: cq.warning,
        members: g.members.map(m => ({
          fileIdx: m.fileIdx,
          itemIdx: m.itemIdx,
          name: m.name,
          unit: m.unit,
          qty: m.qty,
          score: FS._internal.score(g._canonicalT, { _t: m._t }),
        })),
      };
    });
  }

  /* ============================================================
     buildVendorPriceMatrix — ใส่ราคาแต่ละ supplier ให้แต่ละ group
     ============================================================ */
  function buildVendorPriceMatrix(groups, files, fileOrder) {
    return (groups || []).map(g => {
      const prices = (fileOrder || []).map((vendorName, fileIdx) => {
        const m = (g.members || []).find(x => x.fileIdx === fileIdx);
        if (!m) {
          return { vendorName, price: null, total: null, source: 'none', score: null };
        }
        const it = (files[fileIdx] && files[fileIdx].items) ? files[fileIdx].items[m.itemIdx] : null;
        if (!it) {
          return { vendorName, price: null, total: null, source: 'none', score: m.score };
        }
        return {
          vendorName,
          price: (typeof it.price === 'number' && it.price > 0) ? it.price : null,
          total: (typeof it.total === 'number' && it.total > 0) ? it.total : null,
          source: 'file',
          score: m.score,
          fileIdx, itemIdx: m.itemIdx,
        };
      });
      // winner = cheapest ที่ price ไม่เป็น null
      let winnerIdx = -1;
      let minPrice = Infinity;
      prices.forEach((p, i) => {
        if (p.price != null && p.price < minPrice) {
          minPrice = p.price;
          winnerIdx = i;
        }
      });
      return Object.assign({}, g, { vendorPrices: prices, winnerIdx: winnerIdx });
    });
  }

  /* ============================================================
     runMatching — top-level: อ่าน state, คำนวณ groups, เซฟกลับ state
     ============================================================ */
  function runMatching(state) {
    const m = state.multiBOQ;
    if (!m.files || m.files.length < 2) {
      throw new Error('ต้องอัปโหลดอย่างน้อย 2 ไฟล์ก่อนจับคู่');
    }
    m.fileOrder = m.files.map(f => f.supplierName);
    if (!m.workName && m.files[0] && m.files[0].workName) {
      m.workName = m.files[0].workName;
    }
    const groups = buildGroups(m.files, m.matchThreshold || 0.62);
    m.groups = buildVendorPriceMatrix(groups, m.files, m.fileOrder);
    return m.groups;
  }

  /* ============================================================
     flattenMultiToItems — แปลง multi-BOQ groups → รูป items[]
     ที่ renderer เดิม (supplier-comparison.js) เข้าใจ
     ============================================================ */
  function flattenMultiToItems(m) {
    if (!m || !m.groups || !m.groups.length) return [];
    return m.groups.map((g, idx) => ({
      idx: idx,
      name: g.canonicalName,
      qty: g.qty || 1,
      unit: g.unit || 'ชุด',
      // suppliers ต้องเรียงตาม m.fileOrder ให้ตรงกับ index ที่ vendorPrices ใช้
      suppliers: (g.vendorPrices || []).map(vp => ({
        name: vp.vendorName,
        price: vp.price,
        total: vp.total,
        isBOQ: false,
      })),
      wd: '',
      wdNo: '',
      wdTitle: '',
      group: '',
      groupQty: g.qty || 1,
      groupUnit: g.unit || 'ชุด',
      boq: 0,
      boqTotal: 0,
      _multiBOQGroup: g,   // ส่งต่อให้ highlight/exports ถ้าจำเป็น
    }));
  }

  /* ============================================================
     buildExportPayload — adapter สำหรับ CompareExcelExport
     ============================================================ */
  function buildExportPayload(state) {
    const m = state.multiBOQ;
    if (!m.groups || !m.groups.length) {
      throw new Error('ยังไม่ได้จับคู่รายการ');
    }

    const groups = m.groups.map((g, gi) => ({
      title: g.canonicalName + (g.unit ? ' (' + g.unit + ')' : ''),
      qty: g.qty || 1,
      unit: g.unit || 'ชุด',
      sections: [{
        no: String(gi + 1),
        title: 'รายการจับคู่อัตโนมัติ',
        items: [{
          name: g.canonicalName,
          qty: g.qty || 1,
          unit: g.unit || 'ชุด',
          // prices ต้อง align กับ vendors[]
          prices: (g.vendorPrices || []).map(vp => vp.price),
        }],
      }],
    }));

    const vendors = (m.fileOrder || []).map(name => ({
      name: name,
      terms: (m.terms && m.terms[name]) || {},
    }));
    // เพิ่ม extra vendors (ถ้ามี)
    (m.extraTermsVendors || []).forEach(v => {
      vendors.push({ name: v.name, terms: v.terms || {} });
    });

    const winner = m.conclusionSupplier || (vendors[0] && vendors[0].name) || '';
    const reason = m.conclusionReason || 'คุณภาพและราคาเหมาะสม';

    return {
      sheetName: 'เปรียบเทียบราคา',
      projectName: '',
      workName: m.workName || '',
      thresholdLabel: m.thresholdLabel || 'วงเงินเกิน 500,000 ขึ้นไป',
      vatRate: 0.07,
      hasBOQ: false,
      vendors: vendors,
      groups: groups,
      conclusionText: 'สรุปให้ ' + winner + ' เป็นผู้ดำเนินการ ' +
        (m.workName ? 'สำหรับ' + m.workName + ' ' : '') +
        'เนื่องจาก' + reason,
      signatures: state.signatures,
      _multiBOQ: true,  // marker (optional, export module ไม่สนใจ field นี้)
    };
  }

  /* ============================================================
     DOM HELPERS (browser only — เรียกจาก supplier-comparison.js)
     ============================================================ */

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderUploadPrompt() {
    return `
      <div class="upload-card" id="multiBoqUploadCard">
        <div class="upload-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M9 14l2 2 4-4"/>
          </svg>
        </div>
        <h3>อัปโหลด BOQ จากผู้ขาย 2-6 ราย</h3>
        <p>
          ลากไฟล์ .xlsx มาวาง หรือคลิกปุ่มด้านล่าง<br>
          ระบบจะ<strong>จับคู่รายการข้ามไฟล์อัตโนมัติ</strong> เพื่อเปรียบเทียบราคา
        </p>
        <input type="file" id="multiBoqFileInput" multiple accept=".xlsx" style="display:none"
          onchange="SupplierCompareController.handleMultiFileUpload(event)">
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px;">
          <button class="btn btn-primary" onclick="document.getElementById('multiBoqFileInput').click()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            เพิ่มไฟล์ BOQ
          </button>
        </div>
        <div class="file-types">
          <span>.xlsx เท่านั้น</span>
          <span>รองรับสูงสุด 6 ไฟล์</span>
          <span>ขั้นต่ำ 2 ไฟล์</span>
        </div>
      </div>
    `;
  }

  function renderFileList() {
    const state = (typeof window !== 'undefined' && window.SupplierCompareState) || null;
    // อ่าน state ผ่าน controller — pattern ที่ supplier-comparison.js expose ผ่าน window
    // (เราจะอ่านจาก globalThis.__supplierState ใน supplier-comparison.js หลัง integrate)
    const m = (window.__multiBOQState) || null;
    if (!m || !m.files || !m.files.length) return renderUploadPrompt();
    const fileRows = m.files.map((f, i) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">
          📄 ${escapeHtml(f.fileName)}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;">
          <input type="text" class="form-control" style="padding:4px 8px;font-size:13px;width:100%;"
            value="${escapeHtml(f.supplierName)}"
            onchange="SupplierCompareController.renameSupplierFile(${i}, this.value)">
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">${f.items.length}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;color:#2a7a2a;">✓ พร้อม</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">
          <button class="btn-icon" title="ลบไฟล์นี้"
            onclick="SupplierCompareController.removeSupplierFile(${i})">×</button>
        </td>
      </tr>
    `).join('');
    const ready = m.files.length >= 2;
    return `
      <div class="file-info-bar" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="font-weight:600;">📑 ไฟล์ BOQ ที่อัปโหลด (${m.files.length} ไฟล์)</div>
          <div style="display:flex;gap:8px;">
            <input type="file" id="multiBoqFileInputMore" multiple accept=".xlsx" style="display:none"
              onchange="SupplierCompareController.handleMultiFileUpload(event)">
            <button class="btn" onclick="document.getElementById('multiBoqFileInputMore').click()">
              + เพิ่มไฟล์
            </button>
            <button class="btn" onclick="SupplierCompareController.clear()">เริ่มใหม่</button>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f6f7f9;text-align:left;">
              <th style="padding:8px 10px;">ไฟล์</th>
              <th style="padding:8px 10px;">ชื่อผู้ขาย (แก้ไขได้)</th>
              <th style="padding:8px 10px;text-align:center;">รายการ</th>
              <th style="padding:8px 10px;text-align:center;">สถานะ</th>
              <th style="padding:8px 10px;text-align:center;"></th>
            </tr>
          </thead>
          <tbody>${fileRows}</tbody>
        </table>
        <div style="margin-top:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
            เกณฑ์จับคู่ (≥ ${(m.matchThreshold || 0.62).toFixed(2)}):
            <input type="range" min="0.50" max="0.95" step="0.01" style="width:160px;"
              value="${m.matchThreshold || 0.62}"
              oninput="SupplierCompareController.updateMatchThreshold(parseFloat(this.value)); this.previousElementSibling.textContent='เกณฑ์จับคู่ (≥ ' + this.value.toFixed(2) + '):';">
          </label>
          <button class="btn btn-primary" ${ready ? '' : 'disabled style="opacity:0.5;cursor:not-allowed;"'}
            onclick="SupplierCompareController.runMatching()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3h5v5"/><path d="M8 21H3v-5"/>
              <path d="M21 3l-7 7"/><path d="M3 21l7-7"/>
            </svg>
            จับคู่รายการอัตโนมัติ
          </button>
          ${m.groups && m.groups.length ? `
            <button class="btn" onclick="SupplierCompareController.toggleGroupReview()">
              ดูกลุ่มที่จับคู่ (${m.groups.length})
            </button>
          ` : ''}
        </div>
        ${(!ready) ? '<div style="margin-top:8px;color:#aa6600;font-size:12px;">⚠ ต้องอัปโหลดอย่างน้อย 2 ไฟล์ก่อนจับคู่</div>' : ''}
      </div>
    `;
  }

  function renderGroupReview() {
    const m = (window.__multiBOQState) || null;
    if (!m || !m.groups || !m.groups.length) return '';
    const rows = m.groups.map((g, gi) => {
      const matched = g.vendorPrices.filter(vp => vp.source === 'file').map(vp => vp.vendorName);
      const maxScore = g.members.reduce((s, m) => Math.max(s, m.score || 0), 0);
      return `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(g.canonicalName)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${escapeHtml(g.unit || 'ชุด')}${g.unitWarning ? ' ⚠' : ''}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(matched.join(', ') || '—')}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${maxScore.toFixed(2)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;color:#888;">${g.members.length} รายการ</td>
        </tr>
      `;
    }).join('');
    return `
      <div class="group-review-panel" style="margin-top:14px;padding:12px;background:#fafbfc;border:1px solid #e6e8eb;border-radius:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-weight:600;">📋 กลุ่มที่จับคู่ได้ (${m.groups.length} กลุ่ม)</div>
          <button class="btn-icon" onclick="SupplierCompareController.toggleGroupReview()">×</button>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#eef0f2;text-align:left;">
              <th style="padding:6px 10px;">กลุ่ม</th>
              <th style="padding:6px 10px;text-align:center;">หน่วย</th>
              <th style="padding:6px 10px;">ผู้ขายที่ตรง</th>
              <th style="padding:6px 10px;text-align:center;">คะแนนสูงสุด</th>
              <th style="padding:6px 10px;text-align:center;">สมาชิก</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:8px;font-size:11px;color:#888;">
          ⚠ = unit/qty ระหว่าง supplier ไม่ตรงกัน (freq &lt; 60%) — กรุณาตรวจสอบ
        </div>
      </div>
    `;
  }

  /* ============================================================
     expose
     ============================================================ */
  const api = {
    // pure helpers
    unitClass,
    parseSupplierFile,
    setSupplierName,
    removeFile,
    buildGroups,
    buildVendorPriceMatrix,
    pickCanonicalName,
    pickCommonUnit,
    pickCommonQty,
    runMatching,
    flattenMultiToItems,
    buildExportPayload,
    // DOM helpers
    renderUploadPrompt,
    renderFileList,
    renderGroupReview,
    escapeHtml,
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.MultiBOQ = api;
  }
})(typeof self !== 'undefined' ? self : this);
