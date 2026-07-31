// tools/e2e-render-comparison-view.js
// ตรวจว่าหลัง runMatching แล้ว renderComparisonView คืน HTML ที่มี:
//   - KPI strip
//   - ตารางเปรียบเทียบราคา
//   - ผู้ถูกสุด highlight
//
// Trick: inject fakeState เข้า IIFE โดย replace `const state = {...}` ด้วย `const state = __INJECTED_STATE__`
// แล้ว expose renderComparisonView ออกมาผ่าน window.__renderComparisonView
//
// Run: node tools/e2e-render-comparison-view.js

const fs = require('fs');
const path = require('path');
const ExcelJS = require('../vendor/exceljs.min.js');

globalThis.window = globalThis;
globalThis.document = {
  getElementById: () => ({ style: {}, innerHTML: '', appendChild: () => {}, addEventListener: () => {} }),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} }, setAttribute: () => {}, appendChild: () => {} }),
};

require('../js/fuzzy-match-sap.js');
const MultiBOQ = require('../js/multi-boq.js');
globalThis.MultiBOQ = MultiBOQ;

// helper: อ่าน xlsx → AOA → parseSimpleBOQ
async function loadItems(filePath) {
  const buf = fs.readFileSync(filePath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  const aoa = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    aoa.push(row.values.slice(1).map(v => (v && typeof v === 'object' && v.text) ? v.text : v));
  });
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'supplier-comparison.js'), 'utf8');
  const exposed = src.replace(
    /\}\)\(\);?\s*$/,
    'window.SupplierCompareHelpers = window.SupplierCompareHelpers || {};\nwindow.SupplierCompareHelpers.parseSimpleBOQ = parseSimpleBOQ;\n})();'
  );
  const wrap = new Function('window', 'globalThis', exposed);
  wrap(globalThis, globalThis);
  const parsed = globalThis.SupplierCompareHelpers.parseSimpleBOQ(aoa, ws.name || 'BOQ');
  return (parsed.items || []).map(it => {
    const sup = (it.suppliers && it.suppliers[0]) || {};
    return { name: it.name, qty: it.qty || 1, unit: it.unit || 'ชุด', price: sup.price || 0, total: sup.total || 0 };
  }).filter(it => it.name);
}

(async () => {
  let pass = 0, fail = 0;
  const check = (label, cond, detail) => {
    if (cond) { pass++; console.log(`  ✓ ${label}`); }
    else      { fail++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
  };

  const dir = path.join(__dirname, '..', 'tests', 'fixtures');
  const fileA = path.join(dir, 'BOQ_บริษัท_เอบีวี_ก่อสร้าง.xlsx');
  const fileB = path.join(dir, 'BOQ_บริษัท_ซีดีอี_เทรดดิ้ง.xlsx');

  const itemsA = await loadItems(fileA);
  const itemsB = await loadItems(fileB);

  const stem = (f) => f.replace(/^BOQ_/, '').replace(/_/g, ' ').replace(/\.xlsx$/, '');
  const fileAName = path.basename(fileA);
  const fileBName = path.basename(fileB);

  const fakeState = {
    fileName: '',
    workName: 'งานประตู-หน้าต่าง',
    thresholdLabel: '',
    sheets: [],
    activeSheetIdx: 0,
    winnerByItem: {},
    conclusionSupplier: '',
    conclusionReason: '',
    signatures: [],
    terms: {},
    selectedTermsVendorIdx: null,
    extraTermsVendors: [],
    sortByCheapest: false,
    mode: 'multi-boq',
    multiBOQ: {
      workName: 'งานประตู-หน้าต่าง',
      thresholdLabel: '',
      files: [
        { id: 'fA', fileName: fileAName, supplierName: stem(fileAName), items: itemsA },
        { id: 'fB', fileName: fileBName, supplierName: stem(fileBName), items: itemsB },
      ],
      groups: [],
      fileOrder: [],
      matchThreshold: 0.62,
      conclusionSupplier: '',
      conclusionReason: '',
      terms: {},
      extraTermsVendors: [],
    },
  };

  // run matching
  MultiBOQ.runMatching(fakeState);

  // inject state เข้า IIFE — append override + expose renderComparisonView
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'supplier-comparison.js'), 'utf8');
  const injected = src
    .replace(
      /const state = \{[\s\S]*?\n  \};/,
      `const state = {
      fileName: '', workName: '', thresholdLabel: '', sheets: [],
      activeSheetIdx: 0, winnerByItem: {}, conclusionSupplier: '',
      conclusionReason: '', signatures: [], terms: {},
      selectedTermsVendorIdx: null, extraTermsVendors: [],
      sortByCheapest: false, mode: 'single',
      multiBOQ: { workName: '', thresholdLabel: '', files: [], groups: [],
        fileOrder: [], matchThreshold: 0.62, conclusionSupplier: '',
        conclusionReason: '', terms: {}, extraTermsVendors: [], slots: [] },
    };
    // FAKE_STATE_OVERRIDE_HERE
    Object.assign(state, window.__FAKE_STATE__);`
    )
    .replace(
      /\}\)\(\);?\s*$/,
      '\nwindow.__renderComparisonView = renderComparisonView;\nwindow.__state = state;\n})();'
    );

  // debug: dump injected src
  fs.writeFileSync(path.join(__dirname, '..', 'tests', 'fixtures', '_injected.js'), injected);

  globalThis.__FAKE_STATE__ = fakeState;
  const wrap2 = new Function('window', 'globalThis', injected);
  wrap2(globalThis, globalThis);

  // debug: ตรวจ state ที่ถูก inject
  console.log('\n[debug: state หลัง inject]');
  console.log(`  state.mode = ${globalThis.__state?.mode}`);
  console.log(`  state.multiBOQ.groups.length = ${globalThis.__state?.multiBOQ?.groups?.length}`);
  console.log(`  state.multiBOQ.fileOrder = ${JSON.stringify(globalThis.__state?.multiBOQ?.fileOrder)}`);
  console.log(`  state.sheets.length = ${globalThis.__state?.sheets?.length}`);

  // mock DOM
  const mockSection = { style: {}, innerHTML: '' };
  globalThis.document.getElementById = (id) => id === 'supplierComparisonSection' ? mockSection : null;

  // เรียก renderComparisonView
  globalThis.__renderComparisonView();

  const html = mockSection.innerHTML;
  console.log(`\n[renderComparisonView actual HTML]`);
  console.log(`  innerHTML length: ${html.length} chars`);

  check('renderComparisonView คืน HTML ไม่ว่าง (multi-BOQ mode)', html.length > 100);
  check('มี "ตารางเปรียบเทียบราคา"', /ตารางเปรียบเทียบราคา/.test(html));
  check('มี KPI strip (kpi-grid)', /kpi-grid/.test(html));
  check('มี "สรุปผลการเปรียบเทียบราคา"', /สรุปผลการเปรียบเทียบราคา/.test(html));
  check('มี "ผู้ขาย" header', /ผู้ขาย/.test(html));
  check('มี "ถูกสุด" highlight', /ถูกสุด/.test(html));
  check('มี "วงกบประตูไม้" item (จาก mock)', /วงกบประตูไม้/.test(html));
  check('มี supplier name "บริษัท เอบีวี"', /บริษัท เอบีวี/.test(html));
  check('มี supplier name "บริษัท ซีดีอี"', /บริษัท ซีดีอี/.test(html));

  // ตรวจ: ราคา 4500 vs 4400 ปรากฏในตาราง
  check('ราคา 4,500 (A วงกบ) ปรากฏใน HTML', /4,500/.test(html));
  check('ราคา 4,400 (B วงกบ) ปรากฏใน HTML', /4,400/.test(html));

  console.log(`\n  HTML excerpt (first 400 chars):\n  ${html.slice(0, 400).replace(/\s+/g, ' ')}`);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });