// tests/test-pdf-price-extract.js
// ทดสอบ buildSheetsFromPdfRows — ตรวจว่าระบบดึงราคา (price/total) จาก PDF rows ออกมา
//
// ปัญหาเดิม: buildSheetsFromPdfRows ตั้ง item.boq = 0 + suppliers = [] hardcode
// ทำให้ renderComparisonTable แสดง "—" ในทุกคอลัมน์แม้ PDF มีราคา
//
// Fix: สร้าง suppliers row จาก PDF (supplierName = "[PDF] <file>")
//      + คำนวณ total = qty × price ถ้า PDF ไม่มี total field
//
// Run: node tests/test-pdf-price-extract.js

const fs = require('fs');
const path = require('path');

globalThis.window = globalThis;
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'supplier-comparison.js'), 'utf8');

// wrap IIFE เพื่อเรียก buildSheetsFromPdfRows ผ่าน window
// supplier-comparison.js ไม่ expose ผ่าน window — เราต้อง eval แล้ว extract
// วิธีที่ง่ายที่สุด: ใช้ wrap() แล้วตามหา return value ของ function

// Trick: เพิ่มบรรทัด "window.__buildSheetsFromPdfRows = buildSheetsFromPdfRows;"
// ที่ท้าย IIFE แล้วเรียกผ่าน globalThis
const wrap = new Function('window', 'globalThis', src + '\nreturn window.__buildSheetsFromPdfRows;');
// inject expose line ก่อน return
let exposureAdded = false;
const srcWithExposure = src.replace(
  /\}\)\(\);?\s*$/,
  'window.__buildSheetsFromPdfRows = buildSheetsFromPdfRows;\n})();'
);
const wrap2 = new Function('window', 'globalThis', srcWithExposure + '\nreturn window.__buildSheetsFromPdfRows;');
window.__buildSheetsFromPdfRows = null;
const buildSheetsFromPdfRows = wrap2(globalThis, globalThis);
if (typeof buildSheetsFromPdfRows !== 'function') {
  console.error('FAIL: ไม่สามารถ access buildSheetsFromPdfRows — ตรวจสอบ expose line');
  process.exit(1);
}

let pass = 0, fail = 0;
const check = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
};

// ──────────────────────────────────────────────────────
// 1) PDF มี price + total → suppliers 1 ราย, มี price/total ครบ
// ──────────────────────────────────────────────────────
console.log('\n[case 1] PDF rows มี price + total ครบ');
{
  const rows = [
    { no: 1, name: 'ตู้เย็น Inverter', qty: 2, unit: 'ชุด', price: 15900, total: 31800 },
    { no: 2, name: 'ELE-REF เครื่องพร้อมส่ง', qty: 1, unit: 'ชุด', price: 25000, total: 25000 },
  ];
  const sheets = buildSheetsFromPdfRows(rows, 'BOQ_Electrical.pdf', { score: 0.92 });
  const items = sheets[0].items;
  check('sheet[0] มี 2 items', items.length === 2);

  const it0 = items[0];
  check('item[0] มี supplier 1 ราย', it0.suppliers.length === 1);
  check('item[0].supplier.name = "[PDF] BOQ_Electrical.pdf"',
    it0.suppliers[0].name === '[PDF] BOQ_Electrical.pdf');
  check('item[0].supplier.price = 15900',
    it0.suppliers[0].price === 15900);
  check('item[0].supplier.total = 31800',
    it0.suppliers[0].total === 31800);
  check('item[0].supplier._fromPDF = true',
    it0.suppliers[0]._fromPDF === true);

  // supplierNames มี 1 รายการเพื่อ render header ในตาราง
  check('sheet[0].supplierNames มี 1 supplier',
    sheets[0].supplierNames.length === 1 && sheets[0].supplierNames[0] === '[PDF] BOQ_Electrical.pdf');
}

// ──────────────────────────────────────────────────────
// 2) PDF มี price แต่ไม่มี total → total = qty × price
// ──────────────────────────────────────────────────────
console.log('\n[case 2] PDF มี price แต่ไม่มี total → คำนวณ total = qty × price');
{
  const rows = [
    { no: 1, name: 'ตู้เย็น', qty: 2, unit: 'ชุด', price: 15900 },
  ];
  const sheets = buildSheetsFromPdfRows(rows, 'a.pdf', {});
  const it = sheets[0].items[0];
  check('price = 15900', it.suppliers[0].price === 15900);
  check('total computed = 31800 (= 2 × 15900)',
    it.suppliers[0].total === 31800);
  check('total rounding OK', Number.isInteger(it.suppliers[0].total));
}

// ──────────────────────────────────────────────────────
// 3) PDF ไม่มี price (parse ไม่สำเร็จ row นี้) → suppliers = []
// ──────────────────────────────────────────────────────
console.log('\n[case 3] PDF ไม่มี price → suppliers = [] (ไม่ push empty supplier)');
{
  const rows = [
    { no: 1, name: 'รายการที่หา price ไม่ได้', qty: 1, unit: 'ชุด', price: null },
    { no: 2, name: 'อีกรายการที่มี price', qty: 1, unit: 'ชุด', price: 5000 },
  ];
  const sheets = buildSheetsFromPdfRows(rows, 'a.pdf', {});
  check('item[0] ไม่มี supplier', sheets[0].items[0].suppliers.length === 0);
  check('item[1] มี supplier 1 ราย', sheets[0].items[1].suppliers.length === 1);
}

// ──────────────────────────────────────────────────────
// 4) ทุก row ไม่มี price → supplierNames ว่าง
// ──────────────────────────────────────────────────────
console.log('\n[case 4] ทุก row ไม่มี price → supplierNames = [] (ไม่ render header column)');
{
  const rows = [
    { name: 'รายการ', qty: 1, unit: 'ชุด' },
    { name: 'อีกรายการ', qty: 2, unit: 'ชุด' },
  ];
  const sheets = buildSheetsFromPdfRows(rows, 'a.pdf', {});
  check('supplierNames = []', sheets[0].supplierNames.length === 0);
}

// ──────────────────────────────────────────────────────
// 5) Number parsing — ราคาที่มี comma, decimal, format ไทย
// ──────────────────────────────────────────────────────
console.log('\n[case 5] Number parsing — comma, decimal');
{
  const rows = [
    { name: 'ตู้เย็น', qty: 2, unit: 'ชุด', price: '15,900.50' },
    { name: 'อีก', qty: 1, unit: 'ชุด', price: '8500' },
  ];
  const sheets = buildSheetsFromPdfRows(rows, 'a.pdf', {});
  const it0 = sheets[0].items[0];
  const it1 = sheets[0].items[1];
  check('price parsed from "15,900.50" = 15900.5', it0.suppliers[0].price === 15900.5);
  check('total computed from decimal = 2 × 15900.5 = 31801',
    it0.suppliers[0].total === 31801);
  check('price parsed from "8500" = 8500', it1.suppliers[0].price === 8500);
}

// ──────────────────────────────────────────────────────
// 6) ทุก row มี price → supplierNames มี 1 รายการพร้อม render header
// ──────────────────────────────────────────────────────
console.log('\n[case 6] sheet structure ready for render');
{
  const rows = [{ name: 'x', qty: 1, unit: 'ชุด', price: 100, total: 100 }];
  const sheets = buildSheetsFromPdfRows(rows, 'a.pdf', {});
  check('sheet[0].name = "ฉบับจาก PDF"', sheets[0].name === 'ฉบับจาก PDF');
  check('sheet[0].workLine มี [PDF] prefix', /^\[PDF\] a\.pdf$/.test(sheets[0].workLine));
  check('sheet[0].hasBOQ = false', sheets[0].hasBOQ === false);
  check('sheet[0].isFinalShortlist = true', sheets[0].isFinalShortlist === true);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Result: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
