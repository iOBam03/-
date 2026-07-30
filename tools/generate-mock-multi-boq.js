// tools/generate-mock-multi-boq.js
// สร้าง 2 ไฟล์ .xlsx จำลอง BOQ ที่มีรายการเดียวกันแต่ราคาต่างกัน
// เพื่อทดสอบ multi-BOQ comparison mode
//
// Output:
//   - prototype/tests/fixtures/BOQ_บริษัท_เอบีวี_ก่อสร้าง.xlsx  (ราคา A)
//   - prototype/tests/fixtures/BOQ_บริษัท_ซีดีอี_เทรดดิ้ง.xlsx  (ราคา B)
//
// Run: node tools/generate-mock-multi-boq.js

const path = require('path');
const fs = require('fs');
const ExcelJS = require('../vendor/exceljs.min.js');

const OUT_DIR = path.join(__dirname, '..', 'tests', 'fixtures');
fs.mkdirSync(OUT_DIR, { recursive: true });

// รายการเดียวกัน 5 อย่าง — ชื่อคล้ายๆ กัน (fuzzy match ต้องจัดได้)
const items = [
  { name: 'วงกบประตูไม้ 80x200cm พร้อมชุดวงลบ WPC',  qty: 12, unit: 'ชุด' },
  { name: 'บานประตู HDF ขนาด 70x200cm หนา 3.5mm',   qty: 12, unit: 'บาน' },
  { name: 'ลูกบิดประตูทองเหลือง รุ่น Standard',          qty: 12, unit: 'ชุด' },
  { name: 'บานหน้าต่างอลูมิเนียม ขนาด 1.2x1.5m',         qty: 8,  unit: 'บาน' },
  { name: 'กระจกใส หนา 5mm ขนาด 1.2x1.5m',                 qty: 8,  unit: 'แผ่น' },
];

// supplier 2 ราย — ราคาต่างกัน (A ถูก, B แพงกว่า บางอย่าง)
const suppliers = [
  {
    fileName: 'BOQ_บริษัท_เอบีวี_ก่อสร้าง.xlsx',
    supplierName: 'บริษัท เอบีวี ก่อสร้าง จำกัด',
    projectLine: 'โปรเจค: งานตกแต่งภายในอาคาร A',
    workLine: 'งานประตู-หน้าต่าง ชั้น 1-3',
    prices: [4500, 2200, 350, 3200, 850],   // ราคาต่อหน่วย
  },
  {
    fileName: 'BOQ_บริษัท_ซีดีอี_เทรดดิ้ง.xlsx',
    supplierName: 'บริษัท ซีดีอี เทรดดิ้ง จำกัด',
    projectLine: 'โปรเจค: งานตกแต่งภายในอาคาร A',
    workLine: 'งานประตู-หน้าต่าง ชั้น 1-3',
    prices: [4400, 2300, 380, 3500, 800],   // คนละราคา
  },
];

async function buildWorkbook(supplier) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'procurement-system mock';
  wb.created = new Date();
  const ws = wb.addWorksheet('BOQ');

  // Title rows (parseSimpleBOQ จะใช้แถว project/work)
  ws.addRow([supplier.projectLine]);
  ws.addRow([supplier.workLine]);
  ws.addRow([]);

  // Header row (parseSimpleBOQ ค้นหา: ลำดับ/รายการ/จำนวน/หน่วย/ราคา/จำนวนเงิน)
  const headerRow = ws.addRow(['ลำดับ', 'รายการ', 'จำนวน', 'หน่วย', 'ราคาต่อหน่วย', 'จำนวนเงิน']);
  headerRow.font = { bold: true };
  headerRow.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3E8EF' } };
    c.border = {
      top:    { style: 'thin' },
      bottom: { style: 'thin' },
      left:   { style: 'thin' },
      right:  { style: 'thin' },
    };
  });

  // Data rows
  items.forEach((it, i) => {
    const qty = it.qty;
    const unitPrice = supplier.prices[i];
    const total = qty * unitPrice;
    ws.addRow([i + 1, it.name, qty, it.unit, unitPrice, total]);
  });

  // Total row
  const grandTotal = items.reduce((s, it, i) => s + it.qty * supplier.prices[i], 0);
  const totalRow = ws.addRow(['', 'รวมทั้งสิ้น', '', '', '', grandTotal]);
  totalRow.font = { bold: true };
  totalRow.getCell(6).numFmt = '#,##0.00';

  // Column widths
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 50;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 15;
  ws.getColumn(6).width = 15;
  ws.getColumn(5).numFmt = '#,##0.00';
  ws.getColumn(6).numFmt = '#,##0.00';

  return wb;
}

async function main() {
  for (const supplier of suppliers) {
    const wb = await buildWorkbook(supplier);
    const outPath = path.join(OUT_DIR, supplier.fileName);
    // vendor ExcelJS lacks createWriteStream → ใช้ writeBuffer + fs.writeFileSync
    const buf = await wb.xlsx.writeBuffer();
    fs.writeFileSync(outPath, Buffer.from(buf));
    const size = fs.statSync(outPath).size;
    console.log(`✓ ${supplier.fileName} — ${size} bytes`);
  }
  console.log(`\nOutput: ${OUT_DIR}`);
  console.log('\nวิธีทดสอบ:');
  console.log('1. เปิด alerts.html ในโหมด "หลาย BOQ"');
  console.log('2. ลากไฟล์ทั้ง 2 ลงในช่อง (หรือคลิกเลือก)');
  console.log('3. ระบบจะตั้งชื่อ supplier ให้อัตโนมัติ (จาก filename)');
  console.log('4. กด "ทำการเปรียบเทียบราคา" → ดูตารางเปรียบเทียบราคาที่ highlight ผู้ถูกสุด');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
