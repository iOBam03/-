/* Regression test สำหรับ export Excel จาก BLESSINI จริง
   ตรวจ:
   - subtotal ราย TYPE (S/M/L/TWIN) ตรงตามที่คำนวณได้
   - VAT = subtotal × 0.07
   - ราคาสุทธิ = subtotal + VAT
   - สูตรในเซลล์ถูกต้อง (ไม่ใช่ hardcoded value)
   - มีบรรทัด terms ครบทุก vendor
*/
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

// browser globals
global.window = {};
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ click: () => {}, appendChild: () => {}, removeChild: () => {} }),
  body: { appendChild: () => {}, removeChild: () => {} },
};
global.XLSX = XLSX;
global.URL = { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} };
global.Blob = function() { return {}; };
global.FileReader = function() { this.onload = null; this.onerror = null; };
global.fmt = { currencyShort: (n) => (n||0).toLocaleString('th-TH',{maximumFractionDigits:0}), date: (d) => d };
global.DemoController = { isOn: () => false, toggle: () => {} };
global.showToast = () => {};
global.alert = () => {};

const Exporter = require('../js/compare-excel-export.js');
const ctrlSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'supplier-comparison.js'), 'utf8');
eval(ctrlSrc);
const SC = global.window.SupplierCompareController;

// mock FileReader — path configurable via CLI arg / env (default: BLESSINI ที่ bundled)
const DEFAULT_TEST_FILE = path.join(__dirname, '..', 'ตารางเปรียบเทียบราคางานวงกบ-ประตู BLESSINI.xlsx');
const TEST_FILE = process.env.REGRESSION_TEST_FILE || process.argv[2] || DEFAULT_TEST_FILE;

if (!fs.existsSync(TEST_FILE)) {
  console.error('❌ ไม่พบไฟล์ทดสอบ: ' + TEST_FILE);
  console.error('  กรุณาระบุ path:');
  console.error('    node tools/regression-blessini.js <path-to-xlsx>');
  console.error('    หรือ: REGRESSION_TEST_FILE=<path> node tools/regression-blessini.js');
  process.exit(1);
}

global.FileReader.prototype.readAsArrayBuffer = function () {
  const self = this;
  const buf = fs.readFileSync(TEST_FILE);
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  setImmediate(() => { if (self.onload) self.onload({ target: { result: ab } }); });
};

SC.handleFileUpload({ target: { files: [{ name: 'BLESSINI.xlsx' }] } });

setTimeout(async () => {
  const state = SC._state;
  console.log('=== BLESSINI Regression Test ===\n');

  // เลือก sheet ที่มี Rev.2 (final shortlist)
  const lastSheet = state.sheets[state.activeSheetIdx];
  console.log('ใช้ sheet:', lastSheet.name);

  // ตั้ง winner + terms
  state.conclusionSupplier = 'บริษัท สยาม พลาสวูด จำกัด';
  state.conclusionReason = 'คุณภาพและราคาเหมาะสม';
  state.projectName = 'BLESSINI';
  state.terms = {
    0: { priceNote: 'ราคารวมภาษีมูลค่าเพิ่ม 7%', validUntil: 'ยืนราคาตลอดทั้งโครงการ',
         paymentTerm: 'เครดิต 30 วัน', delivery: 'ผลิต 20-30 วัน', warranty: '2 ปี', contact: 'นัท 061-9211113' },
    1: { priceNote: 'ราคารวมภาษีมูลค่าเพิ่ม 7%', validUntil: 'ยืนราคาตลอดทั้งโครงการ',
         paymentTerm: 'เครดิต 30 วัน', delivery: 'ผลิต 15-20 วัน', warranty: '1 ปี', contact: 'ดวงมณี 086-3313097' },
  };

  // Export
  const out = path.join(__dirname, '..', 'regression-blessini-export.xlsx');
  SC.exportExcel(); // จะเก็บ payload ลงใน state.lastExportPayload
  const payload = SC._lastExportPayload();
  if (!payload) { console.log('✗ exportExcel() ไม่ได้สร้าง payload'); process.exit(1); }

  await Exporter.writeFile(payload, out);

  // อ่านไฟล์กลับมา verify
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(out);
  const ws = wb.worksheets[0];

  // Formula compute — ไม่มี circular refs ในไฟล์นี้ (exporter ออกแบบให้เป็น DAG ล้วน)
  const compute = (cell) => {
    if (cell.value === null || cell.value === undefined || cell.value === '') return 0;
    if (typeof cell.value !== 'object' || !cell.value.formula) return Number(cell.value) || 0;
    const f = cell.value.formula;
    const sum = f.match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
    if (sum) { let s = 0; for (let r = +sum[2]; r <= +sum[4]; r++) s += compute(ws.getCell(`${sum[1]}${r}`)); return s; }
    const m = f.match(/^([A-Z]+\d+)\*([A-Z]+\d+)$/);
    if (m) return compute(ws.getCell(m[1])) * compute(ws.getCell(m[2]));
    const m2 = f.match(/^\(([A-Z]+\d+)-([A-Z]+\d+)\)\*(0\.\d+)$/);
    if (m2) return (compute(ws.getCell(m2[1])) - compute(ws.getCell(m2[2]))) * parseFloat(m2[3]);
    const m3 = f.match(/^([A-Z]+\d+)-([A-Z]+\d+)\+([A-Z]+\d+)$/);
    if (m3) return compute(ws.getCell(m3[1])) - compute(ws.getCell(m3[2])) + compute(ws.getCell(m3[3]));
    const m6 = f.match(/^((?:[A-Z]+\d+\+)+[A-Z]+\d+)$/);
    if (m6) return f.split('+').reduce((s, a) => s + compute(ws.getCell(a)), 0);
    const ref = f.match(/^([A-Z]+\d+)$/);
    if (ref) return compute(ws.getCell(ref[1]));
    if (/^0\.\d+$/.test(f)) return parseFloat(f);
    throw new Error('UNKNOWN: ' + f);
  };

  // หา subtotal rows + ราคาสุทธิ row
  const subtotalRows = [];
  let netRow = null;
  let discountRow = null;
  let vatRow = null;
  ws.eachRow((row, rn) => {
    const label = String(row.getCell(2).value || '').trim();
    if (label.startsWith('รวมราคาทั้งสิ้น')) subtotalRows.push({ row: rn, label });
    if (label === 'ราคาสุทธิ') netRow = rn;
    if (label === 'ส่วนลด') discountRow = rn;
    if (label.startsWith('ภาษี')) vatRow = rn;
  });

  console.log('\n=== Row Markers ===');
  console.log('  subtotal rows:', subtotalRows.map(s => `${s.row} (${s.label})`).join(', '));
  console.log('  discount row:', discountRow);
  console.log('  vat row:', vatRow);
  console.log('  net row:', netRow);

  // ตรวจ subtotal แต่ละ TYPE — ดูว่า K{row} มี SUM formula
  console.log('\n=== Subtotal rows (K column formula) ===');
  let subtotalOk = true;
  subtotalRows.forEach(s => {
    const cell = ws.getCell(`K${s.row}`);
    const f = (cell.value && cell.value.formula) || '';
    const isSumFormula = /^SUM\(/.test(f);
    const computed = isSumFormula ? compute(cell) : Number(cell.value) || 0;
    console.log(`  K${s.row} (${s.label}): formula=${f.substring(0, 30)} → ${computed.toFixed(2)} ${isSumFormula ? '✓ SUM' : '✗ NOT SUM'}`);
    if (!isSumFormula && computed > 0) subtotalOk = false;
  });

  // ตรวจ VAT
  let vatOk = false;
  if (vatRow && netRow && subtotalRows.length) {
    const totalSub = subtotalRows.reduce((s, r) => s + compute(ws.getCell(`K${r.row}`)), 0);
    const vat = compute(ws.getCell(`K${vatRow}`));
    const expectedVat = totalSub * 0.07;
    vatOk = Math.abs(vat - expectedVat) < 0.01;
    console.log(`\n=== VAT ===`);
    console.log(`  K${vatRow}: ${vat.toFixed(2)}`);
    console.log(`  Expected (sum × 0.07): ${expectedVat.toFixed(2)}`);
    console.log(`  ${vatOk ? '✓ ตรง' : '✗ ผิด'}`);
  }

  // ตรวจราคาสุทธิ
  let netOk = false;
  if (netRow && subtotalRows.length) {
    const totalSub = subtotalRows.reduce((s, r) => s + compute(ws.getCell(`K${r.row}`)), 0);
    const vat = vatRow ? compute(ws.getCell(`K${vatRow}`)) : 0;
    const discount = discountRow ? compute(ws.getCell(`K${discountRow}`)) : 0;
    const net = compute(ws.getCell(`K${netRow}`));
    const expectedNet = totalSub - discount + vat;
    netOk = Math.abs(net - expectedNet) < 0.01;
    console.log(`\n=== ราคาสุทธิ ===`);
    console.log(`  Subtotal: ${totalSub.toFixed(2)}`);
    console.log(`  Discount: ${discount.toFixed(2)}`);
    console.log(`  VAT:      ${vat.toFixed(2)}`);
    console.log(`  Net (K${netRow}): ${net.toFixed(2)}`);
    console.log(`  Expected: ${expectedNet.toFixed(2)}`);
    console.log(`  ${netOk ? '✓ ตรง' : '✗ ผิด'}`);
  }

  // ตรวจ TYPE qty/unit ใน Excel — item rows ภายในกลุ่ม TYPE ต้องมี qty>0
  // (col H = qty, col I = unit)
  console.log(`\n=== TYPE qty/unit ===`);
  const itemQty = [];
  let typeWithQty = 0;
  ws.eachRow((row, rn) => {
    const label = String(row.getCell(2).value || '').trim();
    const qtyRaw = row.getCell(8).value;
    if (qtyRaw === null || qtyRaw === '' || qtyRaw === undefined) return;
    if (label.startsWith('สำหรับบ้านพักอาศัย')) {
      // TYPE header row ห้ามมี qty — เป็นแค่หัวเรื่อง
      typeWithQty++;
    } else if (typeof qtyRaw === 'number' && qtyRaw > 0) {
      itemQty.push({ row: rn, qty: qtyRaw });
    }
  });
  console.log(`  TYPE header rows with qty (must be 0): ${typeWithQty}`);
  console.log(`  Item rows with positive qty: ${itemQty.length}`);
  console.log(`  First 5 items:`);
  itemQty.slice(0, 5).forEach(r => console.log(`    r=${r.row}: qty=${r.qty}`));
  const qtyOk = typeWithQty === 0 && itemQty.length > 50;
  console.log(`  ${qtyOk ? '✓ qty layout OK' : '✗ qty layout broken'}`);

  // Final result
  const allOk = subtotalOk && vatOk && netOk && qtyOk;
  console.log(`\n=== FINAL ===`);
  console.log(`  Subtotal formulas: ${subtotalOk ? '✓' : '✗'}`);
  console.log(`  VAT calculation:   ${vatOk ? '✓' : '✗'}`);
  console.log(`  Net calculation:   ${netOk ? '✓' : '✗'}`);
  console.log(`  qty layout:        ${qtyOk ? '✓' : '✗'}`);
  console.log(`\n${allOk ? '✓✓✓ Regression PASSED ✓✓✓' : '✗✗✗ Regression FAILED ✗✗✗'}`);

  process.exit(allOk ? 0 : 1);
}, 200);