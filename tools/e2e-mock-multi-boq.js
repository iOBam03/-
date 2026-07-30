// tools/e2e-mock-multi-boq.js
// End-to-end: parse mock .xlsx ด้วย parseSimpleBOQ → runMatching → ดู vendorPrice matrix
// เพื่อยืนยันว่าระบบ multi-BOQ เปรียบเทียบราคาข้าม BOQ ต่าง supplier ได้จริง
//
// Run: node tools/e2e-mock-multi-boq.js

const fs = require('fs');
const path = require('path');
const ExcelJS = require('../vendor/exceljs.min.js');

globalThis.window = globalThis;

// โหลด multi-boq.js + fuzzy-match-sap ผ่าน require
require('../js/fuzzy-match-sap.js');
const MultiBOQ = require('../js/multi-boq.js');

// expose helpers (multi-boq.js ต้องการ SupplierCompareHelpers.parseSimpleBOQ)
globalThis.SupplierCompareHelpers = globalThis.SupplierCompareHelpers || {};

// ── supplier-comparison.js อ่าน IIFE — extract parseSimpleBOQ ออกมา
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'supplier-comparison.js'), 'utf8');
const srcExposed = src.replace(
  /\}\)\(\);?\s*$/,
  'window.__parseSimpleBOQ = parseSimpleBOQ;\n})();'
);
const wrap = new Function('window', 'globalThis', srcExposed + '\nreturn window.__parseSimpleBOQ;');
const parseSimpleBOQ = wrap(globalThis, globalThis);

if (typeof parseSimpleBOQ !== 'function') {
  console.error('FAIL: ไม่สามารถ extract parseSimpleBOQ');
  process.exit(1);
}

globalThis.SupplierCompareHelpers.parseSimpleBOQ = parseSimpleBOQ;

// ── อ่าน mock files แล้ว parse ผ่าน parseSimpleBOQ
async function loadAndParse(filePath) {
  const buf = fs.readFileSync(filePath);
  // vendor ExcelJS อ่าน .xlsx เป็น workbook
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  const aoa = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values.slice(1);
    aoa.push(values.map(v => (v && typeof v === 'object' && v.text) ? v.text : v));
  });
  const sheetName = ws.name || 'BOQ';
  const parsed = parseSimpleBOQ(aoa, sheetName);
  if (!parsed) throw new Error(`parseSimpleBOQ คืน null สำหรับ ${filePath}`);
  return parsed;
}

(async () => {
  const dir = path.join(__dirname, '..', 'tests', 'fixtures');
  const fileA = path.join(dir, 'BOQ_บริษัท_เอบีวี_ก่อสร้าง.xlsx');
  const fileB = path.join(dir, 'BOQ_บริษัท_ซีดีอี_เทรดดิ้ง.xlsx');

  const fileAName = 'BOQ_บริษัท_เอบีวี_ก่อสร้าง.xlsx';
  const fileBName = 'BOQ_บริษัท_ซีดีอี_เทรดดิ้ง.xlsx';

  // 1) parse ทั้ง 2 ไฟล์ด้วย parseSimpleBOQ
  const sheetA = await loadAndParse(fileA);
  const sheetB = await loadAndParse(fileB);

  // 2) แปลงเป็น shape ที่ parseSupplierFile คืน (multi-boq.js file format)
  const itemsFromSheet = (s) => (s.items || []).map(it => {
    const sup = (it.suppliers && it.suppliers[0]) || {};
    return {
      name: it.name,
      qty: it.qty || 1,
      unit: it.unit || 'ชุด',
      price: sup.price || 0,
      total: sup.total || 0,
    };
  }).filter(it => it.name);

  // derive supplier name จาก filename
  const stem = (f) => f.replace(/^BOQ_/, '').replace(/_/g, ' ').replace(/\.xlsx$/, '');

  const fileObjA = {
    id: 'fA', fileName: fileAName,
    supplierName: stem(fileAName),
    items: itemsFromSheet(sheetA),
  };
  const fileObjB = {
    id: 'fB', fileName: fileBName,
    supplierName: stem(fileBName),
    items: itemsFromSheet(sheetB),
  };

  console.log(`\nFile A: ${fileObjA.supplierName} — ${fileObjA.items.length} items`);
  console.log(`File B: ${fileObjB.supplierName} — ${fileObjB.items.length} items`);

  // 3) สร้าง fake state ผ่าน MultiBOQ.runMatching
  const fakeState = {
    multiBOQ: {
      files: [fileObjA, fileObjB],
      matchThreshold: 0.62,
    },
  };
  MultiBOQ.runMatching(fakeState);

  const groups = fakeState.multiBOQ.groups;
  const fileOrder = fakeState.multiBOQ.fileOrder;

  console.log(`\nMatched groups: ${groups.length}\n`);
  console.log('คอลัมน์: ' + fileOrder.join(' | '));
  console.log('─'.repeat(90));
  console.log('รายการ                  ' + fileOrder.map(n => n.padEnd(20)).join(' '));
  console.log('─'.repeat(90));

  let pass = 0, fail = 0;
  const check = (label, cond, detail) => {
    if (cond) { pass++; console.log(`  ✓ ${label}`); }
    else      { fail++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
  };

  check('match 5 กลุ่ม (เท่ากับจำนวน item ในแต่ละไฟล์)', groups.length === 5);

  for (const g of groups) {
    const nameShort = (g.canonicalName || '').slice(0, 22);
    const prices = g.vendorPrices.map(vp => String(vp.price || '—').padEnd(20));
    console.log(nameShort.padEnd(25) + ' ' + prices.join(' '));
  }

  // ตรวจราคา: ค้นหา group วงกบประตู (อาจไม่ใช่ groups[0] เพราะ buildGroups เรียงตามความยาวชื่อ)
  const gDoor = groups.find(g => /วงกบประตูไม้/.test(g.canonicalName));
  check('พบ G "วงกบประตูไม้"', !!gDoor);
  if (gDoor) {
    check('G "วงกบ" A=4500', gDoor.vendorPrices[0] && gDoor.vendorPrices[0].price === 4500);
    check('G "วงกบ" B=4400', gDoor.vendorPrices[1] && gDoor.vendorPrices[1].price === 4400);
    check('G "วงกบ" winnerIdx = 1 (B ถูกกว่า)', gDoor.winnerIdx === 1);
    check('G "วงกบ" winnerName = บริษัท ซีดีอี', gDoor.vendorPrices[gDoor.winnerIdx].vendorName.includes('ซีดีอี'));
  }

  // G ลูกบิดประตู: A=350, B=380 → winnerIdx = 0 (A ถูกกว่า)
  const gHandle = groups.find(g => /ลูกบิด/.test(g.canonicalName));
  check('พบ G "ลูกบิดประตู"', !!gHandle);
  if (gHandle) {
    check('G "ลูกบิด" A=350', gHandle.vendorPrices[0].price === 350);
    check('G "ลูกบิด" B=380', gHandle.vendorPrices[1].price === 380);
    check('G "ลูกบิด" winnerIdx = 0 (A ถูกกว่า)', gHandle.winnerIdx === 0);
    check('G "ลูกบิด" winnerName = บริษัท เอบีวี', gHandle.vendorPrices[gHandle.winnerIdx].vendorName.includes('เอบีวี'));
  }

  // กระจกใส: A=850, B=800 → winnerIdx = 1
  const gGlass = groups.find(g => /กระจกใส/.test(g.canonicalName));
  if (gGlass) {
    check('G "กระจกใส" winnerIdx = 1 (B ถูกกว่า)', gGlass.winnerIdx === 1);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Result: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
