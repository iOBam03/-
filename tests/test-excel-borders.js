// tests/test-excel-borders.js
// ทดสอบว่า export workbook มี border ครบทุก cell ในตารางเปรียบเทียบราคา
//
// สร้าง workbook จาก mock payload ที่ใกล้เคียง screenshot ของ user
// (3 groups, 2 vendors + BOQ, multiple sections, items, summary, money rows)
// แล้ว scan border ของทุก cell ในพื้นที่ตาราง (A..lastCol) ทุก row
// รายงาน cell ที่ขาด border อย่างใดอย่างหนึ่ง (top/bottom/left/right)

const path = require('path');
const ExcelJS = require('../vendor/exceljs.min.js');
// โหลด compare-excel-export ที่เป็น UMD module
const CompareExcelExport = require('../js/compare-excel-export.js');

// ---------- mock payload (เลียนแบบ screenshot) ----------
const payload = {
  sheetName: 'เปรียบเทียบราคา',
  projectName: 'อำเภอเมือง จ.สมุทรสงคราม (รหัสโครงการ 37/2568)',
  workName: 'งาน วงกบประตูไม้',
  thresholdLabel: 'วงเงินเกิน 500,000 ขึ้นไป หรือโดยวิธีประกวดราคา / สอบราคา กรณีจัดซื้อจัดจ้างโครงการ',
  vatRate: 0.07,
  hasBOQ: true,
  vendors: [
    { name: 'บริษัท ABC จำกัด', terms: { priceNote: '', validUntil: '30 วัน', paymentTerm: 'เครดิต 30 วัน', delivery: 'ภายใน 45 วัน', warranty: '1 ปี', contact: 'คุณสมชาย 081-111-2222' } },
    { name: 'บริษัท DEF จำกัด', terms: { priceNote: '', validUntil: '45 วัน', paymentTerm: 'เครดิต 30 วัน', delivery: 'ภายใน 60 วัน', warranty: '2 ปี', contact: 'คุณสมหญิง 081-333-4444' } },
  ],
  groups: [
    {
      title: 'สำหรับบ้านพักอาศัย TYPE S',
      qty: 36, unit: 'แปลง',
      sections: [
        {
          no: '1.1', title: 'WD01 ห้องนอน 1,2,3',
          items: [
            { name: 'วงกบประตูไม้ 80x200cm', qty: 12, unit: 'ชุด', prices: [4500, 4400, 4300] },
            { name: 'บานประตู HDF 80x200cm', qty: 12, unit: 'บาน', prices: [2200, 2300, 2100] },
            { name: 'ลูกบิดประตู', qty: 12, unit: 'ชุด', prices: [350, 340, 360] },
          ],
        },
      ],
    },
    {
      title: 'สำหรับบ้านพักอาศัย TYPE N',
      qty: 24, unit: 'แปลง',
      sections: [
        {
          no: '2.1', title: 'WD02 ห้องนั่งเล่น',
          items: [
            { name: 'วงกบประตูไม้ 90x200cm', qty: 8, unit: 'ชุด', prices: [4800, 4700, 4600] },
            { name: 'บานประตู HDF 90x200cm', qty: 8, unit: 'บาน', prices: [2400, 2500, 2300] },
          ],
        },
      ],
    },
    {
      title: 'สำหรับบ้านพักอาศัย TYPE U',
      qty: 12, unit: 'แปลง',
      sections: [
        {
          no: '3.1', title: 'WD03 ห้องครัว',
          items: [
            { name: 'วงกบประตู PVC 70x200cm', qty: 6, unit: 'ชุด', prices: [3200, 3100, 3000] },
            { name: 'บานประตู PVC 70x200cm', qty: 6, unit: 'บาน', prices: [1800, 1900, 1700] },
          ],
        },
      ],
    },
  ],
  conclusionText: 'สรุปให้ บริษัท ABC จำกัด เป็นผู้ดำเนินการ เนื่องจากคุณภาพและราคาเหมาะสม',
  signatures: {
    preparer: [{ title: 'เจ้าหน้าที่จัดซื้อ', name: 'นายทดสอบ ระบบ' }],
    reviewers: [{ title: 'หัวหน้าแผนก', name: 'นางสมศักดิ์ ใจดี' }],
    approvers: { label: 'คณะกรรมการจัดซื้อจัดจ้าง (อนุมัติ)', people: [{ title: 'ประธานกรรมการ', name: 'นายกรรมการ หนึ่ง' }, { title: 'กรรมการ', name: 'นายกรรมการ สอง' }] },
  },
};

async function main() {
  const wb = await CompareExcelExport.toBuffer(payload).then(buf => {
    // toBuffer returns Buffer; reload via ExcelJS
    const newWb = new ExcelJS.Workbook();
    return newWb.xlsx.load(buf).then(() => newWb);
  });

  const ws = wb.worksheets[0];
  const colLetter = (n) => {
    let s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
    return s;
  };

  // หา lastCol (จากข้อมูล 2 vendors + BOQ = 6 cols ของราคา, เริ่ม J=10)
  // COL.firstPrice = 10, vendors = 2, BOQ = 1 → lastCol = 10 + 3*2 - 1 = 15
  const vendorCount = payload.vendors.length + (payload.hasBOQ ? 1 : 0);
  const lastPriceCol = 10 + vendorCount * 2 - 1;
  console.log(`workbook: ${ws.rowCount} rows × ${ws.columnCount} cols (lastPriceCol=${lastPriceCol} = ${colLetter(lastPriceCol)})`);

  // scan rows 1..min(ws.rowCount, 60) — ครอบคลุมถึง writeGrandTotals
  const scanLimit = Math.min(ws.rowCount, 60);
  const missing = [];

  for (let r = 1; r <= scanLimit; r++) {
    const row = ws.getRow(r);
    // detect row type by content
    const a = row.getCell(1).value;
    const b = row.getCell(2).value;
    let rowType = 'unknown';
    if (r <= 3) rowType = 'header';          // R1-R3: title rows (outside table grid — intentional no-border)
    else if (r <= 5) rowType = 'table-header';
    else if (typeof b === 'string' && b.startsWith('สำหรับ') && !b.startsWith('รวม')) rowType = 'group-header';
    else if (typeof b === 'string' && b.startsWith('รวม ')) rowType = 'subtotal';
    else if (typeof b === 'string' && (b.includes('รวมราคาทั้งสิ้น') || b.includes('ส่วนลดพิเศษ') || b.includes('ภาษีมูลค่าเพิ่ม') || b.includes('ราคาสุทธิ'))) rowType = 'money';
    else if (typeof b === 'string' && b === 'รายละเอียดประกอบการเสนอราคา') rowType = 'detail-header';
    else if (typeof a === 'number' && typeof b === 'string' && b.length && !b.includes('หมายเหตุ')) rowType = 'detail-row';
    else if (typeof b === 'string' && b.includes('หมายเหตุ')) rowType = 'note-header';
    else if (a || b) rowType = 'data';

    // ข้าม R1-R3 (title rows) — อยู่นอก table grid โดย design
    if (r <= 3) continue;

    // ข้าม separator/blank rows — ไม่มี value เลย (blank row ระหว่าง section โดย design)
    let hasContent = false;
    for (let c = 1; c <= lastPriceCol && !hasContent; c++) {
      const v = row.getCell(c).value;
      if (v !== null && v !== undefined && v !== '') hasContent = true;
    }
    if (!hasContent) continue;

    // ข้าม signature rows — design มี border เฉพาะซ้าย/ขวา+top/bottom ตามต้นฉบับ
    // signature block เริ่มเมื่อเจอ row ที่มี "ผู้จัดทำ" / "คณะทำงาน" / "คณะกรรมการ" หรือ "เจ้าหน้าที่จัดซื้อ"
    const isSigStart = (a === 'ผู้จัดทำ' || b === 'ผู้จัดทำ'
      || (typeof b === 'string' && (b.includes('คณะทำงาน') || b.includes('คณะกรรมการ')))
      || a === 'เจ้าหน้าที่จัดซื้อ' || (typeof b === 'string' && b.includes('เจ้าหน้าที่จัดซื้อ'))
      || (typeof a === 'string' && /^\.+\.{2,}/.test(a))                    // dotted line
      || (typeof a === 'string' && /^\.\.\.+\/\.\.\./.test(a))               // date dotted line
      || (typeof a === 'string' && /^\(\s*.*\s*\)$/.test(a)));               // ( name )
    if (isSigStart) continue;

    for (let c = 1; c <= lastPriceCol; c++) {
      const cell = row.getCell(c);
      const addr = colLetter(c) + r;
      const b1 = cell.border || {};
      const hasTop = b1.top && b1.top.style;
      const hasBot = b1.bottom && b1.bottom.style;
      const hasL = b1.left && b1.left.style;
      const hasR = b1.right && b1.right.style;
      const isEdgeLeft = (c === 1);
      const isEdgeRight = (c === lastPriceCol);

      // ไม่นับ: inner cells (ไม่ใช่ edge ซ้าย/ขวา) ที่ขาด left/right (เป็น design — edge columns ให้ border)
      // นับ: cell ที่ขาด top/bottom (row boundary broken) หรือ edge cell ที่ขาด edge border
      const issues = [];
      if (!hasTop) issues.push('no-top');
      if (!hasBot) issues.push('no-bottom');
      if (isEdgeLeft && !hasL) issues.push('edge-left-missing');
      if (isEdgeRight && !hasR) issues.push('edge-right-missing');

      if (issues.length) {
        missing.push({ row: r, addr, type: rowType, issue: issues.join(',') });
      }
    }
  }

  // สรุปผล
  console.log(`\nScan complete: ${scanLimit} rows × ${lastPriceCol} cols`);
  console.log(`Border issues found: ${missing.length}`);
  if (missing.length) {
    console.log('\n--- DETAIL ---');
    const byRow = {};
    missing.forEach(m => {
      const key = `R${m.row} (${m.type})`;
      if (!byRow[key]) byRow[key] = [];
      byRow[key].push(`${m.addr}: ${m.issue}`);
    });
    Object.entries(byRow).forEach(([row, issues]) => {
      console.log(`  ${row}:`);
      issues.forEach(i => console.log(`    ${i}`));
    });
  }

  // skip workbook save (vendor ExcelJS is browser build — lacks createWriteStream)
  console.log(`\n(skipping file save — vendor ExcelJS lacks createWriteStream)`);

  process.exit(missing.length > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });