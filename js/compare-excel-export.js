/* ==========================================================================
   Compare Excel Export — สร้างไฟล์ "ตารางเปรียบเทียบราคา" เป็น .xlsx

   หน้าตา/สไตล์ทั้งหมดถอดมาจากไฟล์ต้นฉบับ
   "ตารางเปรียบเทียบราคางานวงกบ-ประตู BLESSINI.xlsx" (sheet สุดท้าย)
   ฟอนต์ AngsanaUPC, เส้น medium/thin/hair/double, สีพื้น, numFmt accounting
   ต่างจากต้นฉบับแค่เรื่องเดียว: รองรับผู้ขาย N ราย + BOQ (ต้นฉบับ fix 2+BOQ)

   ใช้ได้ทั้งใน browser (window.CompareExcelExport) และ node (module.exports)
   ต้องมี ExcelJS โหลดไว้ก่อน (vendor/exceljs.min.js)
   ========================================================================== */

(function (root, factory) {
  let lib = typeof ExcelJS !== 'undefined' ? ExcelJS : null;
  if (!lib && typeof require === 'function') {
    try { lib = require('exceljs'); }
    catch (e) {
      try { lib = require('../vendor/exceljs.min.js'); } catch (_) { lib = null; }
    }
  }
  const api = factory(lib);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CompareExcelExport = api;
})(typeof self !== 'undefined' ? self : this, function (ExcelJS) {
  'use strict';

  /* ---------- ค่าคงที่สไตล์ (ถอดจากต้นฉบับ) ---------- */
  const FONT = 'AngsanaUPC';
  const RED = 'FFFF0000';
  const BLACK = 'FF000000';

  const FILL = {
    white: 'FFFFFFFF',
    header: 'FFD0CECE',   // theme2 tint -0.10 — หัวตาราง / คอลัมน์ BOQ
    green: 'FFE2EFDA',    // theme9 tint 0.80  — คอลัมน์ผู้ขาย / แถวยอดรวม
    grey: 'FFBFBFBF',     // theme0 tint -0.25 — แถวรวมย่อย / ช่องลายเซ็น
  };

  const NUMFMT = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)';

  const fill = (argb) => ({
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: argb }, bgColor: { argb: 'FFFFFFFF' },
  });
  const font = (opts) => Object.assign({ name: FONT, family: 1, size: 20 }, opts || {});
  const bd = (style) => ({ style: style, color: { argb: BLACK } });
  const M = bd('medium'), T = bd('thin'), H = bd('hair'), D = bd('double');

  /* ---------- helpers ---------- */
  const colLetter = (n) => {
    let s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
    return s;
  };
  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(String(v).replace(/[,\s]/g, ''));
    return isFinite(n) ? n : null;
  };

  /* ---------- ผังคอลัมน์ ----------
     A=ที่  B..G=รายการ(merge)  H=ปริมาณ  I=หน่วย
     J.. = ผู้ขายรายละ 2 คอลัมน์ (ราคา/หน่วย, จำนวนเงิน) ปิดท้ายด้วย BOQ
     ต้นฉบับมี 2 เจ้า+BOQ => J,K / L,M / N,O   ถ้ามี 3 เจ้าก็ขยายเป็น P,Q ต่อ
  */
  const COL = { no: 1, item: 2, itemEnd: 7, qty: 8, unit: 9, firstPrice: 10 };

  function buildLayout(vendors, hasBOQ) {
    const cols = [];
    vendors.forEach((v, i) => {
      cols.push({
        name: v.name, isBOQ: false,
        price: COL.firstPrice + i * 2,
        total: COL.firstPrice + i * 2 + 1,
      });
    });
    if (hasBOQ) {
      const i = vendors.length;
      cols.push({
        name: 'BOQ', isBOQ: true,
        price: COL.firstPrice + i * 2,
        total: COL.firstPrice + i * 2 + 1,
      });
    }
    return cols;
  }

  /* ---------- ตกแต่งเซลล์ ---------- */
  function styleCell(cell, o) {
    cell.font = font({
      size: o.size || 20,
      bold: !!o.bold,
      italic: !!o.italic,
      color: { argb: o.red ? RED : BLACK },
    });
    if (o.fill) cell.fill = fill(o.fill);
    if (o.numFmt) cell.numFmt = NUMFMT;
    if (o.align) cell.alignment = o.align;
    if (o.border) cell.border = o.border;
  }

  // เส้นกรอบของเซลล์ตัวเลขในตาราง: ราคา/หน่วย = ซ้าย hair, จำนวนเงิน = ปิดขวา medium
  const priceBorder = { top: H, bottom: H };
  const totalBorder = { left: T, right: M, top: H, bottom: H };

  // เซลล์ตัวเลขในตารางต้องมีพื้นขาวจริง ไม่ใช่ปล่อย default (ต้นฉบับตั้ง theme0 = ขาว)
  const numCell = (o) => Object.assign({ size: 20, numFmt: true, fill: FILL.white }, o);

  /* ============================================================
     GENERATOR
     ============================================================ */
  function createWorkbook(data) {
    if (!ExcelJS) throw new Error('ไม่พบ ExcelJS — ตรวจสอบว่าโหลด vendor/exceljs.min.js แล้ว');

    const vendors = (data.vendors || []).filter(v => v && v.name);
    if (!vendors.length) throw new Error('ต้องมีผู้ขายอย่างน้อย 1 ราย');

    const hasBOQ = data.hasBOQ !== false;
    const layout = buildLayout(vendors, hasBOQ);
    const lastCol = layout[layout.length - 1].total;
    // ช่องลายเซ็นกว้าง 12 คอลัมน์เสมอ ต่อให้ตารางแคบกว่านั้น
    const sheetLastCol = Math.max(lastCol, COL.firstPrice + 11);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ระบบจัดซื้อ';
    wb.created = new Date();

    const ws = wb.addWorksheet(data.sheetName || 'เปรียบเทียบราคา', {
      pageSetup: {
        paperSize: 9, orientation: 'landscape', fitToPage: true,
        fitToWidth: 1, fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      },
      views: [{ state: 'frozen', ySplit: 5 }],
    });

    /* ---------- ความกว้างคอลัมน์ (ตามต้นฉบับ) ---------- */
    ws.getColumn(1).width = 5.91;
    ws.getColumn(2).width = 37.16;
    ws.getColumn(3).width = 5.91;
    ws.getColumn(4).width = 10.5;
    ws.getColumn(5).width = 10.5;
    ws.getColumn(6).width = 23;
    ws.getColumn(7).width = 23;
    ws.getColumn(8).width = 11.58;
    ws.getColumn(9).width = 8.91;
    for (let c = COL.firstPrice; c <= sheetLastCol; c++) ws.getColumn(c).width = 21;

    const ctx = { ws: ws, layout: layout, lastCol: lastCol, sheetLastCol: sheetLastCol, data: data };
    let row = writeTitle(ctx);
    row = writeTableHeader(ctx, row);
    const bodyInfo = writeBody(ctx, row);
    row = writeGrandTotals(ctx, bodyInfo);
    row = writeQuotationDetails(ctx, row);
    row = writeConclusion(ctx, row);
    writeSignatures(ctx, row);

    return wb;
  }

  /* ---------- R1-R3: หัวเรื่อง + โครงการ ---------- */
  function writeTitle(ctx) {
    const ws = ctx.ws, last = colLetter(ctx.sheetLastCol), d = ctx.data;

    ws.mergeCells(`A1:${last}1`);
    const t = ws.getCell('A1');
    t.value = {
      richText: [
        { font: { name: FONT, family: 1, size: 22, bold: true, underline: true }, text: 'ตารางเปรียบเทียบราคา' },
        {
          font: { name: FONT, family: 1, size: 22, bold: true },
          text: `  (${d.thresholdLabel || 'วงเงินเกิน 500,000 ขึ้นไป'}) หรือโดยวิธีประกวดราคา / สอบราคา  (กรณีจัดซื้อจัดจ้างโครงการ)`,
        },
      ],
    };
    t.font = font({ size: 22, bold: true });
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    t.fill = fill(FILL.white);
    ws.getRow(1).height = 38.4;

    ws.mergeCells(`A2:${last}2`);
    ws.getRow(2).height = 9.75;

    const r3 = ws.getRow(3);
    r3.height = 32.15;
    styleCell(ws.getCell('A3'), { size: 20, bold: true, align: { vertical: 'middle' } });
    ws.getCell('A3').value = `โครงการ ${d.projectName || ''}`.trim();
    styleCell(ws.getCell(`H3`), { size: 20, bold: true, align: { vertical: 'middle' } });
    ws.getCell('H3').value = d.workName || '';

    return 4;
  }

  /* ---------- R4-R5: หัวตาราง 2 ชั้น ---------- */
  function writeTableHeader(ctx, startRow) {
    const ws = ctx.ws;
    const r1 = startRow, r2 = startRow + 1;
    ws.getRow(r1).height = 29.15;
    ws.getRow(r2).height = 29.15;

    const hdrFixed = (addr, mergeTo, text, size) => {
      ws.mergeCells(addr + ':' + mergeTo);
      const c = ws.getCell(addr);
      c.value = text;
      styleCell(c, {
        size: size || 22, bold: true, italic: true, fill: FILL.header,
        align: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { left: M, right: M, top: M, bottom: M },
      });
    };

    hdrFixed(`A${r1}`, `A${r2}`, 'ที่', 22);
    hdrFixed(`B${r1}`, `${colLetter(COL.itemEnd)}${r2}`, 'รายการ', 26);
    hdrFixed(`H${r1}`, `H${r2}`, 'ปริมาณ', 22);
    hdrFixed(`I${r1}`, `I${r2}`, 'หน่วย', 22);

    ctx.layout.forEach((col) => {
      const pL = colLetter(col.price), tL = colLetter(col.total);
      const bg = col.isBOQ ? FILL.header : FILL.green;

      ws.mergeCells(`${pL}${r1}:${tL}${r1}`);
      const nameCell = ws.getCell(`${pL}${r1}`);
      nameCell.value = col.name;
      styleCell(nameCell, {
        size: 20, bold: true, italic: true, red: col.isBOQ, fill: bg,
        align: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { left: M, right: M, top: M, bottom: T },
      });

      [[pL, 'ราคา/หน่วย'], [tL, 'จำนวนเงิน']].forEach(([L, label]) => {
        const c = ws.getCell(`${L}${r2}`);
        c.value = label;
        styleCell(c, {
          size: 20, bold: true, italic: true, red: col.isBOQ, fill: bg,
          align: { horizontal: 'center', vertical: 'middle' },
          border: { left: L === pL ? M : T, right: M, top: T, bottom: M },
        });
      });
    });

    return r2 + 1;
  }

  /* ---------- BODY: กลุ่ม (TYPE) > หัวข้อย่อย (WD) > รายการ ----------
     โครงสร้าง data.groups:
     [{ title: 'สำหรับบ้านพักอาศัย TYPE S', qty: 36, unit: 'แปลง',
        sections: [{ no: '1.1', title: 'WD01 ห้องนอน 1,2,3',
                     items: [{ name, qty, unit, prices: [ต่อ layout] }] }] }]
  */
  function writeBody(ctx, startRow) {
    const ws = ctx.ws;
    let r = startRow;
    const groupSummaries = [];

    (ctx.data.groups || []).forEach((group) => {
      // แถวหัวกลุ่ม
      ws.getRow(r).height = 25.5;
      ws.mergeCells(`B${r}:${colLetter(COL.itemEnd)}${r}`);
      const gc = ws.getCell(`B${r}`);
      gc.value = group.title || '';
      styleCell(gc, {
        size: 20, bold: true, fill: FILL.white, align: { vertical: 'middle' },
        border: { top: H, bottom: H },
      });
      styleCell(ws.getCell(`A${r}`), {
        fill: FILL.white, border: { left: M, top: H, bottom: H },
      });
      ['H', 'I'].forEach((L) => {
        styleCell(ws.getCell(`${L}${r}`), {
          fill: FILL.white, border: { top: H, bottom: H },
        });
      });
      ctx.layout.forEach((col) => {
        styleCell(ws.getCell(`${colLetter(col.price)}${r}`), { fill: FILL.white, border: priceBorder });
        styleCell(ws.getCell(`${colLetter(col.total)}${r}`), { fill: FILL.white, border: totalBorder });
      });
      r++;

      // กำหนดก่อนเขียนส่วนใด ๆ ในกลุ่ม — แต่จะอัปเดตเป็น "แถวรายการแรกจริง" ด้านล่าง
      let firstDataRow = -1;

      (group.sections || []).forEach((section) => {
        // แถวหัวข้อย่อย WD
        ws.getRow(r).height = 25.5;
        styleCell(ws.getCell(`A${r}`), {
          size: 20, fill: FILL.white, align: { horizontal: 'center', vertical: 'middle' },
          border: { left: M, top: H, bottom: H },
        });
        ws.getCell(`A${r}`).value = section.no || '';
        ws.mergeCells(`B${r}:${colLetter(COL.itemEnd)}${r}`);
        const sc = ws.getCell(`B${r}`);
        sc.value = section.title || '';
        styleCell(sc, {
          size: 20, bold: true, fill: FILL.white, align: { vertical: 'middle' },
          border: { top: H, bottom: H },
        });
        ['H', 'I'].forEach((L) => {
          styleCell(ws.getCell(`${L}${r}`), {
            fill: FILL.white, border: { top: H, bottom: H },
          });
        });
        ctx.layout.forEach((col) => {
          const p = ws.getCell(`${colLetter(col.price)}${r}`);
          styleCell(p, { size: 20, fill: FILL.white, red: col.isBOQ, numFmt: true, border: priceBorder });
          const t = ws.getCell(`${colLetter(col.total)}${r}`);
          t.value = 0;
          styleCell(t, { size: 20, fill: FILL.white, red: col.isBOQ, numFmt: true, border: totalBorder });
        });
        r++;

        (section.items || []).forEach((item) => {
          ws.getRow(r).height = 25.5;
          if (firstDataRow < 0) firstDataRow = r;
          styleCell(ws.getCell(`A${r}`), {
            fill: FILL.white, border: { left: M, top: H, bottom: H },
          });

          ws.mergeCells(`B${r}:${colLetter(COL.itemEnd)}${r}`);
          const nc = ws.getCell(`B${r}`);
          nc.value = item.name || '';
          styleCell(nc, {
            size: 20, fill: FILL.white,
            align: { vertical: 'middle', wrapText: true }, border: { top: H, bottom: H },
          });

          const qty = num(item.qty);
          const qc = ws.getCell(`H${r}`);
          qc.value = qty === null ? '' : qty;
          styleCell(qc, numCell({
            align: { horizontal: 'center', vertical: 'middle' }, border: { top: H, bottom: H },
          }));

          const uc = ws.getCell(`I${r}`);
          uc.value = item.unit || '';
          styleCell(uc, {
            size: 20, fill: FILL.white,
            align: { horizontal: 'center', vertical: 'middle' }, border: { top: H, bottom: H },
          });

          ctx.layout.forEach((col, ci) => {
            const price = num((item.prices || [])[ci]);
            const pL = colLetter(col.price), tL = colLetter(col.total);

            const pc = ws.getCell(`${pL}${r}`);
            pc.value = price === null ? '' : price;
            styleCell(pc, numCell({ red: col.isBOQ, border: priceBorder }));

            // จำนวนเงิน = สูตร ราคา*ปริมาณ เพื่อให้ผู้อนุมัติกดดูที่มาของตัวเลขได้
            const tc = ws.getCell(`${tL}${r}`);
            tc.value = (price === null || qty === null) ? '' : { formula: `${pL}${r}*H${r}` };
            styleCell(tc, numCell({ red: col.isBOQ, border: totalBorder }));
          });
          r++;
        });
      });

      // แถวรวมย่อยของกลุ่ม (พื้นเทา) — SUM ตั้งแต่แถวแรกของกลุ่มถึงแถวก่อนหน้า
      ws.getRow(r).height = 25.5;
      styleCell(ws.getCell(`A${r}`), { fill: FILL.grey, border: { left: M, top: H, bottom: H } });
      ws.mergeCells(`B${r}:${colLetter(COL.itemEnd)}${r}`);
      styleCell(ws.getCell(`B${r}`), {
        size: 20, bold: true, fill: FILL.grey, border: { top: H, bottom: H },
      });
      ws.getCell(`B${r}`).value = `รวม ${group.title || ''}`.trim();
      ['H', 'I'].forEach((L) => styleCell(ws.getCell(`${L}${r}`), {
        fill: FILL.grey, border: { top: H, bottom: H },
      }));

      const subtotalRow = r;
      ctx.layout.forEach((col) => {
        const pL = colLetter(col.price), tL = colLetter(col.total);
        styleCell(ws.getCell(`${pL}${r}`), { fill: FILL.grey, border: priceBorder });
        const tc = ws.getCell(`${tL}${r}`);
        if (firstDataRow < 0) {
          // กลุ่มนี้ไม่มีรายการเลย — ใส่ 0 ไม่ใช่สูตร
          tc.value = 0;
        } else {
          tc.value = { formula: `SUM(${tL}${firstDataRow}:${tL}${r - 1})` };
        }
        styleCell(tc, {
          size: 20, bold: true, red: col.isBOQ, fill: FILL.grey, numFmt: true,
          align: { shrinkToFit: true }, border: totalBorder,
        });
      });
      r++;

      groupSummaries.push({
        title: group.title || '',
        qty: num(group.qty),
        unit: group.unit || 'แปลง',
        subtotalRow: subtotalRow,
      });
    });

    return { nextRow: r + 1, groupSummaries: groupSummaries };
  }

  /* ---------- ตารางสรุป (ราคาต่อหลัง × จำนวนแปลง) + รวม/VAT/สุทธิ ---------- */
  function writeGrandTotals(ctx, bodyInfo) {
    const ws = ctx.ws;
    let r = bodyInfo.nextRow;
    const summaryRows = [];

    bodyInfo.groupSummaries.forEach((g, i) => {
      ws.getRow(r).height = 25.5;
      const nc = ws.getCell(`A${r}`);
      nc.value = i + 1;
      styleCell(nc, { size: 20, align: { horizontal: 'center', vertical: 'middle' }, border: { left: M, top: H, bottom: H } });

      ws.mergeCells(`B${r}:${colLetter(COL.itemEnd)}${r}`);
      const tc = ws.getCell(`B${r}`);
      tc.value = g.title.replace(/^สำหรับ/, '');
      styleCell(tc, { size: 20, align: { vertical: 'middle' }, border: { top: H, bottom: H } });

      const qc = ws.getCell(`H${r}`);
      qc.value = g.qty === null ? '' : g.qty;
      styleCell(qc, { size: 20, numFmt: true, align: { horizontal: 'center', vertical: 'middle' }, border: { top: H, bottom: H } });
      const uc = ws.getCell(`I${r}`);
      uc.value = g.unit;
      styleCell(uc, { size: 20, align: { horizontal: 'center', vertical: 'middle' }, border: { top: H, bottom: H } });

      ctx.layout.forEach((col) => {
        const pL = colLetter(col.price), tL = colLetter(col.total);
        // ราคา/หน่วย ที่นี่ = ยอดรวมย่อยของกลุ่มนั้น (ราคาต่อ 1 แปลง)
        const pc = ws.getCell(`${pL}${r}`);
        pc.value = { formula: `${tL}${g.subtotalRow}` };
        styleCell(pc, { size: 20, red: col.isBOQ, numFmt: true, border: priceBorder });

        const amt = ws.getCell(`${tL}${r}`);
        amt.value = { formula: `${pL}${r}*H${r}` };
        styleCell(amt, { size: 20, red: col.isBOQ, numFmt: true, border: totalBorder });
      });

      summaryRows.push(r);
      r++;
    });

    // หมายเหตุใต้ตารางสรุป
    if (ctx.data.revisionNote) {
      ws.getRow(r).height = 25.5;
      ws.mergeCells(`B${r}:${colLetter(COL.itemEnd)}${r}`);
      const c = ws.getCell(`B${r}`);
      c.value = ctx.data.revisionNote;
      styleCell(c, { size: 18, align: { vertical: 'middle' } });
      styleCell(ws.getCell(`A${r}`), { border: { left: M } });
      r++;
    }
    r++;

    const sumFormula = (L) => summaryRows.length
      ? summaryRows.map(x => `${L}${x}`).join('+')
      : '0';

    /* แถว รวมราคาทั้งสิ้น / ส่วนลดพิเศษ / VAT / ราคาสุทธิ */
    const money = (label, rowIdx, formulaFn, opts) => {
      const o = opts || {};
      ws.getRow(rowIdx).height = 25.5;
      if (o.labelInA) {
        const c = ws.getCell(`A${rowIdx}`);
        ws.mergeCells(`A${rowIdx}:I${rowIdx}`);
        c.value = label;
        styleCell(c, {
          size: 20, bold: true, fill: FILL.green,
          align: { horizontal: 'center', vertical: 'middle' },
          border: { left: M, top: M, bottom: M },
        });
      } else {
        styleCell(ws.getCell(`A${rowIdx}`), {
          fill: FILL.green, border: { left: M, top: M, bottom: M },
        });
        ws.mergeCells(`B${rowIdx}:I${rowIdx}`);
        const c = ws.getCell(`B${rowIdx}`);
        c.value = label;
        styleCell(c, {
          size: 20, bold: !!o.bold, fill: FILL.green, align: { vertical: 'middle' },
          border: { top: M, bottom: M },
        });
      }

      ctx.layout.forEach((col) => {
        const pL = colLetter(col.price), tL = colLetter(col.total);
        styleCell(ws.getCell(`${pL}${rowIdx}`), { fill: FILL.green, border: o.borderP || { top: M, bottom: M } });
        const cell = ws.getCell(`${tL}${rowIdx}`);
        const f = formulaFn(tL);
        if (f !== null && f !== undefined) {
          cell.value = typeof f === 'object' ? f
            : (typeof f === 'number') ? f
            : { formula: String(f) };
        }
        styleCell(cell, {
          size: 20, bold: !!o.bold, red: col.isBOQ, fill: FILL.green, numFmt: true,
          align: { shrinkToFit: true }, border: o.borderT || { right: M, top: M, bottom: M },
        });
      });
    };

    const rTotal = r;
    money('รวมราคาทั้งสิ้น', rTotal, (L) => sumFormula(L), { labelInA: true });

    const rDiscount = r + 1;
    money('ส่วนลดพิเศษ', rDiscount, () => 0, {});

    const vatRate = ctx.data.vatRate === undefined ? 0.07 : ctx.data.vatRate;
    const rVat = r + 2;
    money(`ภาษีมูลค่าเพิ่ม ${(vatRate * 100).toFixed(0)}%`, rVat,
      (L) => `(${L}${rTotal}-${L}${rDiscount})*${vatRate}`, {});

    const rNet = r + 3;
    money('ราคาสุทธิ', rNet, (L) => `${L}${rTotal}-${L}${rDiscount}+${L}${rVat}`, {
      bold: true,
      borderT: { right: T, top: M, bottom: D },
      borderP: { top: M, bottom: D },
    });

    ctx.netRow = rNet;
    return rNet + 2;
  }

  /* ---------- รายละเอียดประกอบการเสนอราคา (6 หัวข้อ) ---------- */
  const DETAIL_ROWS = [
    { key: 'priceNote', label: 'ราคา และ ปริมาณ' },
    { key: 'validUntil', label: 'กำหนดระยะเวลายืนราคา' },
    { key: 'paymentTerm', label: 'เงื่อนไขชำระเงิน' },
    { key: 'delivery', label: 'กำหนดการส่งมอบ' },
    { key: 'warranty', label: 'กำหนดระยะเวลาการรับประกันและบริการ' },
    { key: 'contact', label: 'รายชื่อผู้ติดต่อ' },
  ];

  function writeQuotationDetails(ctx, startRow) {
    const ws = ctx.ws;
    let r = startRow;

    ws.getRow(r).height = 25.5;
    ws.mergeCells(`A${r}:I${r}`);
    const h = ws.getCell(`A${r}`);
    h.value = 'รายละเอียดประกอบการเสนอราคา';
    styleCell(h, { size: 20, bold: true, align: { vertical: 'middle' }, border: { left: M, top: M, bottom: M } });
    ctx.layout.forEach((col) => {
      styleCell(ws.getCell(`${colLetter(col.price)}${r}`), { border: { top: M, bottom: M } });
      styleCell(ws.getCell(`${colLetter(col.total)}${r}`), { border: { top: M, bottom: M, right: M } });
    });
    r++;

    DETAIL_ROWS.forEach((def, i) => {
      ws.getRow(r).height = 25.5;
      const nc = ws.getCell(`A${r}`);
      nc.value = i + 1;
      styleCell(nc, { size: 20, align: { horizontal: 'center', vertical: 'middle' }, border: { left: M, top: H, bottom: H } });

      ws.mergeCells(`B${r}:I${r}`);
      const lc = ws.getCell(`B${r}`);
      lc.value = def.label;
      styleCell(lc, { size: 20, align: { vertical: 'middle' }, border: { top: H, bottom: H } });

      ctx.layout.forEach((col, ci) => {
        const pL = colLetter(col.price), tL = colLetter(col.total);
        ws.mergeCells(`${pL}${r}:${tL}${r}`);
        const c = ws.getCell(`${pL}${r}`);
        // BOQ ไม่มีเงื่อนไขเสนอราคา — เว้นว่างตามต้นฉบับ
        c.value = col.isBOQ ? '' : String(((ctx.data.vendors[ci] || {}).terms || {})[def.key] || '');
        styleCell(c, {
          size: 20, align: { vertical: 'middle', wrapText: true },
          border: { left: T, right: M, top: H, bottom: H },
        });
      });
      r++;
    });

    return r;
  }

  /* ---------- หมายเหตุ + ข้อความสรุปผู้ชนะ ---------- */
  function writeConclusion(ctx, startRow) {
    const ws = ctx.ws;
    let r = startRow;

    ws.getRow(r).height = 25.5;
    ws.mergeCells(`A${r}:I${r}`);
    const h = ws.getCell(`A${r}`);
    h.value = 'หมายเหตุ:-';
    styleCell(h, { size: 20, bold: true, align: { vertical: 'middle' }, border: { left: M, top: M, bottom: M } });
    ctx.layout.forEach((col) => {
      styleCell(ws.getCell(`${colLetter(col.price)}${r}`), { border: { top: M, bottom: M } });
      styleCell(ws.getCell(`${colLetter(col.total)}${r}`), { border: { top: M, bottom: M, right: M } });
    });
    r++;

    ws.getRow(r).height = 25.5;
    ws.mergeCells(`B${r}:${colLetter(ctx.lastCol)}${r}`);
    const c = ws.getCell(`B${r}`);
    c.value = ctx.data.conclusionText || '';
    styleCell(c, {
      size: 20, bold: true, red: true, align: { vertical: 'middle' },
      border: { top: H, bottom: H, right: M },
    });
    styleCell(ws.getCell(`A${r}`), { border: { left: M, top: H, bottom: H } });
    r++;

    return r;
  }

  /* ---------- บล็อกลายเซ็น ----------
     3 ชั้นตามต้นฉบับ: ผู้จัดทำ | คณะทำงาน (เห็นชอบ) | คณะกรรมการ (อนุมัติ)
     แต่ละช่อง = 2 คอลัมน์ merge  แถวย่อย: ตำแหน่ง / เว้นเซ็น / เส้นประ / (ชื่อ) / วันที่
     data.signatures = {
       preparer:  [{ title, name }],
       reviewers: [{ title, name }],
       approvers: { label, people: [{title,name}] },
       executives: { label, people: [...] }   // optional
     }
  */
  function writeSignatures(ctx, startRow) {
    const ws = ctx.ws;
    const sig = ctx.data.signatures || {};
    const preparer = sig.preparer || [];
    const reviewers = sig.reviewers || [];
    const approvers = sig.approvers || {};
    const approverPeople = approvers.people || [];
    const executives = sig.executives || null;

    let r = startRow + 1;
    const groupHeaderRow = r;
    const boxRow = r + 1;

    // ตำแหน่งคอลัมน์เริ่มของแต่ละช่อง (ช่องละ 2 คอลัมน์)
    let cursor = 1;
    const slots = [];
    const alloc = (n, kind) => {
      const out = [];
      for (let i = 0; i < n; i++) { out.push(cursor); cursor += 2; }
      slots.push({ kind: kind, cols: out });
      return out;
    };
    const preparerCols = alloc(Math.max(preparer.length, 1), 'preparer');
    const reviewerCols = alloc(Math.max(reviewers.length, 1), 'reviewer');
    const approverCols = alloc(Math.max(approverPeople.length, 1), 'approver');
    const lastSigCol = cursor - 1;

    /* หัวกลุ่ม 3 ช่อง */
    const groupHeader = (cols, text) => {
      if (!cols.length) return;
      const from = colLetter(cols[0]) + groupHeaderRow;
      const to = colLetter(cols[cols.length - 1] + 1) + groupHeaderRow;
      ws.mergeCells(`${from}:${to}`);
      const c = ws.getCell(from);
      c.value = text;
      styleCell(c, {
        size: 18, bold: true, fill: FILL.grey,
        align: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { left: M, right: M, top: M, bottom: M },
      });
    };
    ws.getRow(groupHeaderRow).height = 25.5;
    groupHeader(preparerCols, 'ผู้จัดทำ');
    groupHeader(reviewerCols, 'คณะทำงานจัดซื้อจัดจ้าง (เห็นชอบ)');
    groupHeader(approverCols, approvers.label || 'คณะกรรมการจัดซื้อจัดจ้าง (อนุมัติ)');

    /* ช่องเซ็นแต่ละคน */
    const writeBox = (startCol, person, rowBase) => {
      const A = colLetter(startCol), B = colLetter(startCol + 1);
      const p = person || {};

      // แถวตำแหน่ง
      ws.mergeCells(`${A}${rowBase}:${B}${rowBase}`);
      const tc = ws.getCell(`${A}${rowBase}`);
      tc.value = p.title || '';
      styleCell(tc, {
        size: 18, bold: true, fill: FILL.grey,
        align: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { left: M, right: M, top: M, bottom: M },
      });
      ws.getRow(rowBase).height = 25.5;

      // เว้นที่เซ็น 2 แถว
      for (let k = 1; k <= 2; k++) {
        const rr = rowBase + k;
        ws.mergeCells(`${A}${rr}:${B}${rr}`);
        styleCell(ws.getCell(`${A}${rr}`), { border: { left: M, right: M } });
        ws.getRow(rr).height = 25.5;
      }

      // เส้นประลายเซ็น / ชื่อ / วันที่
      const lines = [
        '.......................................................',
        `( ${p.name || ''.padEnd(30)} )`,
        '................/....................../................',
      ];
      lines.forEach((text, k) => {
        const rr = rowBase + 3 + k;
        ws.mergeCells(`${A}${rr}:${B}${rr}`);
        const c = ws.getCell(`${A}${rr}`);
        c.value = text;
        styleCell(c, {
          size: 18,
          align: { horizontal: 'center', vertical: 'middle' },
          border: {
            left: M, right: M,
            top: M,
            bottom: k === 2 ? M : undefined,
          },
        });
        ws.getRow(rr).height = 25.5;
      });
    };

    preparerCols.forEach((c, i) => writeBox(c, preparer[i], boxRow));
    reviewerCols.forEach((c, i) => writeBox(c, reviewers[i], boxRow));
    approverCols.forEach((c, i) => writeBox(c, approverPeople[i], boxRow));

    let endRow = boxRow + 5;

    /* ชั้นที่ 4 (optional): คณะกรรมการบริหาร วงเงินเกิน 30 ล้าน */
    if (executives && (executives.people || []).length) {
      const hdrRow = endRow + 1;
      const exCols = [];
      let c0 = approverCols[0];
      for (let i = 0; i < executives.people.length; i++) { exCols.push(c0); c0 += 2; }

      ws.mergeCells(`${colLetter(exCols[0])}${hdrRow}:${colLetter(exCols[exCols.length - 1] + 1)}${hdrRow}`);
      const hc = ws.getCell(`${colLetter(exCols[0])}${hdrRow}`);
      hc.value = executives.label || 'คณะกรรมการบริหาร (อนุมัติ) (วงเงินเกิน 30,000,000 บาท)';
      styleCell(hc, {
        size: 18, bold: true, fill: FILL.grey,
        align: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { left: M, right: M, top: M, bottom: M },
      });
      ws.getRow(hdrRow).height = 25.5;

      exCols.forEach((c, i) => writeBox(c, executives.people[i], hdrRow + 1));
      endRow = hdrRow + 6;
    }

    ctx.lastSigCol = lastSigCol;
    return endRow;
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */

  /** สร้าง Buffer/ArrayBuffer ของไฟล์ .xlsx */
  async function toBuffer(data) {
    const wb = createWorkbook(data);
    return wb.xlsx.writeBuffer();
  }

  /** (browser) สร้างไฟล์แล้วสั่งดาวน์โหลด */
  async function download(data, filename) {
    const buf = await toBuffer(data);
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'ตารางเปรียบเทียบราคา.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** (node) เขียนลงไฟล์ */
  async function writeFile(data, path) {
    const wb = createWorkbook(data);
    return wb.xlsx.writeFile(path);
  }

  return {
    createWorkbook: createWorkbook,
    toBuffer: toBuffer,
    download: download,
    writeFile: writeFile,
    DETAIL_ROWS: DETAIL_ROWS,
  };
});
