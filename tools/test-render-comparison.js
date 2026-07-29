/* Test: renderComparisonView() with real BLESSINI data
   กัน regression: ถ้า module ขาด helper ที่จำเป็น (เช่น fmt.currencyShort) → render จะ throw
*/
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

global.window = { LOCAL_CONFIG: {}, SupplierCompareController: {} };
global.document = {
  getElementById: (id) => ({
    id,
    innerHTML: '',
    style: {},
    textContent: '',
    appendChild: () => {},
  }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ classList: { add(){}, remove(){}, toggle(){} }, style: {}, remove: () => {}, appendChild: () => {} }),
  body: { appendChild: () => {} },
};
global.XLSX = XLSX;
global.URL = { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} };
global.Blob = function() { return {}; };
global.localStorage = (() => {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) || null,
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    key: (i) => Array.from(m.keys())[i] || null,
    get length() { return m.size; },
  };
})();
global.FileReader = function() { this.onload = null; this.onerror = null; };

// Load the bundle file
const bundlePath = path.resolve(__dirname, '../ตารางเปรียบเทียบราคางานวงกบ-ประตู BLESSINI.xlsx');
if (!fs.existsSync(bundlePath)) {
  console.error('Bundle file not found:', bundlePath);
  process.exit(1);
}

const wb = XLSX.read(fs.readFileSync(bundlePath), { type: 'buffer' });
console.log('Sheets:', wb.SheetNames);

// โหลด supplier-comparison.js + ลอง invoke renderComparisonView โดยตรง
const src = fs.readFileSync(path.resolve(__dirname, '../js/supplier-comparison.js'), 'utf8');
const iifeStart = src.indexOf("(function () {");
const iifeEnd = src.lastIndexOf("})();");
const inner = src.slice(iifeStart + "(function () {".length, iifeEnd);

const vm = require('vm');
const ctx = {
  globalThis: null,
  window: global.window,
  document: global.document,
  XLSX: global.XLSX,
  Blob: global.Blob,
  FileReader: global.FileReader,
  URL: global.URL,
  localStorage: global.localStorage,
  console,
  ExcelJS: require('exceljs'),
  CompareExcelExport: {},
};
ctx.globalThis = ctx;
vm.createContext(ctx);

// expose render functions for testing
const exposed = `
  ${inner}
  globalThis.__renderComparisonView = renderComparisonView;
  globalThis.__getActiveItems = getActiveItems;
  globalThis.__getActiveSuppliers = getActiveSuppliers;
  globalThis.__state = state;
`;
vm.runInContext(exposed, ctx);

// Parse BLESSINI like real flow
const parseFn = vm.runInContext('parseBlessiniXLSX', ctx);
const arrBufs = wb.SheetNames.map(name => {
  // Need to create an arrayBuffer from the workbook - mock by re-reading
  return XLSX.read(fs.readFileSync(bundlePath), { type: 'buffer' });
});
// Parse each sheet by passing aoa directly
const parseSheetFn = vm.runInContext('parseSheet', ctx);
const sheets = wb.SheetNames.map(name => {
  const ws = wb.Sheets[name];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  return parseSheetFn(aoa, name);
}).filter(Boolean);

console.log('Parsed sheets:', sheets.length);
sheets.forEach((s, i) => {
  console.log(`  Sheet ${i}: ${s.name} - ${s.items.length} items, ${s.supplierNames ? s.supplierNames.length : '?'} suppliers`);
});

// Set state directly
vm.runInContext(`
  state.fileName = 'test.xlsx';
  state.workName = 'งานวงกบประตู';
  state.thresholdLabel = 'วงเงินเกิน 500,000 ขึ้นไป';
  state.sheets = ${JSON.stringify(sheets)};
  state.activeSheetIdx = state.sheets.length - 1;
`, ctx);

console.log('\n--- activeSheetIdx:', vm.runInContext('state.activeSheetIdx', ctx));
console.log('--- active items length:', vm.runInContext('getActiveItems().length', ctx));

// Now call renderComparisonView - capture HTML output
const fakeDoc = ctx.document;
const htmlOutputs = [];
const fakeDoc2 = {
  getElementById: (id) => ({
    id, innerHTML: '', style: {}, textContent: '', appendChild: () => {},
    set innerHTML(v) { htmlOutputs.push({ id, html: v }); this._innerHTML = v; },
    get innerHTML() { return this._innerHTML || ''; },
  }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ classList: { add(){}, remove(){}, toggle(){}, contains(){} }, style: {}, appendChild: () => {} }),
  body: { appendChild: () => {} },
};
ctx.document = fakeDoc2;

try {
  vm.runInContext('renderComparisonView()', ctx);
  console.log('\n✓ renderComparisonView completed');
  const totalLen = htmlOutputs.reduce((s, o) => s + o.html.length, 0);
  console.log('Total HTML output:', totalLen, 'chars');
  htmlOutputs.forEach(o => {
    console.log(`  #${o.id}: ${o.html.length} chars`);
    if (o.html.length < 100) console.log(`    [${o.html}]`);
  });

  // Assertions — กัน regression
  let pass = 0, fail = 0;
  function assert(cond, label) {
    if (cond) { console.log('  ✓', label); pass++; }
    else { console.log('  ✗ FAIL:', label); fail++; }
  }
  console.log('\n=== REGRESSION ASSERTIONS ===');
  const mainOutput = htmlOutputs.find(o => o.id === 'supplierComparisonSection');
  assert(!!mainOutput, 'supplierComparisonSection got rendered');
  assert(mainOutput && mainOutput.html.length > 10000, 'main output > 10KB (real table)');
  assert(mainOutput && mainOutput.html.includes('supplier-compare-table'), 'contains table class');
  assert(mainOutput && mainOutput.html.includes('signature-block'), 'contains signature block');
  assert(mainOutput && mainOutput.html.includes('terms-card'), 'contains terms card');
  assert(mainOutput && mainOutput.html.includes('action-bar'), 'contains action bar');
  // กัน fmt is not defined — เคย throw ตรงนี้
  assert(mainOutput && /[\d,]+/.test(mainOutput.html), 'contains formatted numbers (with comma)');
  // User feedback 2026-07-29: ไม่ต้องการ "พัน/ล้าน/พันล้าน" suffix ในตัวเลข
  // (false-positive guard: ห้ามจับ "พันธ์ประจิตร" ซึ่งเป็นชื่อคน)
  assert(!/\d\s*พัน(?!\w)/.test(mainOutput.html), 'NO "N พัน" suffix (false-positive safe for พันธ์...)');
  assert(!/\d\s*ล้าน(?!\w)/.test(mainOutput.html), 'NO "N ล้าน" suffix');
  assert(!/\d\s*พันล้าน(?!\w)/.test(mainOutput.html), 'NO "N พันล้าน" suffix');
  // User feedback 2026-07-29: qty cell ไม่ต้องมี × หรือ = (just total number)
  assert(!/qty-mult|qty-eq/.test(mainOutput.html), 'qty cell has NO calculation symbols (× / =)');
  // BLESSINI TYPE S = 36 — ต้องเจอเลข 36 ใน qty cell
  assert(mainOutput && /<strong[^>]*>\s*36\s*<\/strong>/.test(mainOutput.html), 'contains <strong>36</strong> (TYPE S total)');
  // BOQ cell ต้องมี comma (เช่น 1,000 ไม่ใช่ 1 พัน)
  assert(mainOutput && /boq-cell[^>]*>\s*[\d,]+/.test(mainOutput.html), 'BOQ cell shows comma-separated number');

  if (fail === 0) {
    console.log(`\n✓✓✓ ALL PASSED (${pass}/${pass}) ✓✓✓`);
    process.exit(0);
  } else {
    console.error(`\n✗ ${fail} failed`);
    process.exit(1);
  }
} catch (e) {
  console.error('\n✗ renderComparisonView threw:', e.message);
  console.error(e.stack);
  process.exit(1);
}
