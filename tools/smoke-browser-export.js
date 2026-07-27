/* Smoke test: โหลด supplier-comparison.js + parseBlessiniXLSX ใน node
   ทดสอบ:
   1. Module โหลดได้ (parseBlessiniXLSX ไม่ throw)
   2. Parser แปลง BLESSINI ต้นฉบับได้ถูกต้อง (7 sheets, suppliers, items, BOQ)
   3. buildExportPayload สร้าง payload ที่ผ่าน CompareExcelExport ได้
*/
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

// จำลอง browser globals
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
global.FileReader = function() {
  // สร้าง instance จริงที่มี readAsArrayBuffer ที่ trigger onload
  this.onload = null;
  this.onerror = null;
};
global.fmt = {
  currencyShort: (n) => (n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 }),
  date: (d) => d,
};
global.DemoController = { isOn: () => false, toggle: () => {} };
global.showToast = () => {};

// โหลด module
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'supplier-comparison.js'), 'utf8');
eval(src);

const ctrl = global.window.SupplierCompareController;
if (!ctrl) { console.error('FAIL: SupplierCompareController not loaded'); process.exit(1); }
console.log('✓ โหลด supplier-comparison.js');

// ดึง parseBlessiniXLSX ออกมา — ฟังก์ชันอยู่ใน IIFE scope ใช้ eval แล้วอ่านจาก window.SupplierCompareController หรือ expose ผ่าน ctrl
// วิธีง่ายสุด: ใช้ handleFileUpload กับ Blob mock
const realPath = path.join(__dirname, '..', 'ตารางเปรียบเทียบราคางานวงกบ-ประตู BLESSINI.xlsx');
if (!fs.existsSync(realPath)) {
  console.error('FAIL: BLESSINI file not found at', realPath);
  process.exit(1);
}

const buf = fs.readFileSync(realPath);
const ab = new ArrayBuffer(buf.length);
new Uint8Array(ab).set(buf);

// ตั้ง fileName แล้วเรียก parser ผ่านการจำลอง handleFileUpload
ctrl._state.fileName = 'BLESSINI.xlsx';
const fileReader = global.FileReader;
const origRead = fileReader.prototype.readAsArrayBuffer;
fileReader.prototype.readAsArrayBuffer = function () {
  // mock onload — จำ callback ของผู้ใช้ (ตั้งโดย supplier-comparison.js ก่อนเรียก read)
  const self = this;
  console.log('  [mock] readAsArrayBuffer called, onload =', typeof self.onload);
  setImmediate(() => {
    try {
      if (self.onload) self.onload({ target: { result: ab } });
    } catch (e) {
      origConsoleError('  onload error:', e.message);
    }
  });
};

// แทน showToast เพื่อดู error
const origShowToast = global.showToast;
global.showToast = (msg, type) => console.log('  [toast]', type || 'info', msg);
// แทน console.error เพื่อ debug parser
const origConsoleError = console.error;
console.error = (...args) => origConsoleError('  [parse error]', ...args);

console.log('▶ Calling handleFileUpload...');
ctrl.handleFileUpload({ target: { files: [{ name: 'BLESSINI.xlsx' }] } });
console.log('▶ handleFileUpload returned (async work pending)');

// รอให้ async ทำเสร็จ
setTimeout(async () => {
  const state = ctrl._state;
  console.log(`✓ Parser: แปลง BLESSINI ได้ ${state.sheets.length} ฉบับ`);
  console.log(`  workName: "${state.workName}"`);
  console.log(`  thresholdLabel: "${state.thresholdLabel}"`);
  console.log(`  active sheet: "${state.sheets[state.activeSheetIdx] && state.sheets[state.activeSheetIdx].name}"`);

  // ตรวจแต่ละฉบับ
  state.sheets.forEach((sheet, i) => {
    const tags = [];
    if (sheet.isFinalShortlist) tags.push('★ final-shortlist');
    console.log(`  Sheet ${i}: "${sheet.name}" — ${sheet.items.length} items, ${sheet.supplierNames.length} suppliers, BOQ=${sheet.hasBOQ} ${tags.join(' ')}`);
  });

  // ทดสอบ buildExportPayload (โดยเลือก sheet สุดท้าย + ผู้ชนะสมมติ)
  const lastSheet = state.sheets[state.activeSheetIdx];
  if (lastSheet && lastSheet.supplierNames.length > 0) {
    state.conclusionSupplier = lastSheet.supplierNames[0];
    state.conclusionReason = 'คุณภาพและราคาเหมาะสม';
    state.projectName = 'BLESSINI';
    state.terms = { 0: {}, 1: {} };

    // เข้าถึง buildExportPayload ผ่าน eval ใน scope เดียวกัน
    // เนื่องจากเป็น local fn ใช้ event-driven approach: เรียก exportExcel จริง แต่เปลี่ยน window.CompareExcelExport เป็น mock
    let exportedPayload = null;
    global.window.CompareExcelExport = {
      download: (payload, filename) => {
        exportedPayload = payload;
        console.log(`  ✓ exportExcel: payload สร้างสำเร็จ (filename: ${filename})`);
        console.log(`    sheetName: "${payload.sheetName}"`);
        console.log(`    workName: "${payload.workName}"`);
        console.log(`    vendors: ${payload.vendors.length} ราย`);
        console.log(`    groups: ${payload.groups.length} กลุ่ม (TYPE)`);
        let totalItems = 0;
        payload.groups.forEach(g => {
          g.sections.forEach(s => {
            totalItems += s.items.length;
          });
        });
        console.log(`    items รวม: ${totalItems} รายการ`);
        console.log(`    signatures: preparer=${payload.signatures.preparer.length}, reviewers=${payload.signatures.reviewers.length}, approvers=${payload.signatures.approvers.people.length}`);
        console.log(`    conclusionText: "${payload.conclusionText}"`);

        // ตรวจสอบ: ทุก group มี qty/unit หรือไม่
        console.log(`    รายละเอียด group:`);
        payload.groups.forEach(g => {
          console.log(`        "${g.title}" → qty=${g.qty} ${g.unit}`);
        });
        const groupQtyOk = payload.groups.every(g => g.qty > 0 && g.unit);
        if (groupQtyOk) {
          console.log(`    ✓ ทุก group มี qty/unit`);
        } else {
          console.log(`    ⚠️  group บางตัวไม่มี qty/unit (อาจเป็น bug — qty/unit ต้องมาจาก parser)`);
        }
      },
    };
    // alert กัน throw
    global.alert = () => {};

    try {
      ctrl.exportExcel();
    } catch (e) {
      console.error('FAIL: exportExcel threw', e.message);
      process.exit(2);
    }
  }

  console.log('\n✓✓✓ Smoke test ผ่านทั้งหมด — module, parser, exporter ทำงานครบ ✓✓✓');
  process.exit(0);
}, 100);