// tests/test-multi-boq-export.js
// Integration test — จับคู่ multi-BOQ → build payload → ExcelJS → ตรวจสอบ output
//
// สร้าง state จำลอง 2 suppliers, จับคู่ → export → load กลับมาเช็ค:
// - hasBOQ = false → ไม่มี BOQ column
// - จำนวน vendor columns ตรง
// - ราคา align กับ vendor name
// - มี conclusion + signatures
//
// Mirror test-excel-borders.js style

const path = require('path');
globalThis.window = globalThis;
require('../js/fuzzy-match-sap.js');
const MultiBOQ = require('../js/multi-boq.js');
const ExcelJS = require('../vendor/exceljs.min.js');
const CompareExcelExport = require('../js/compare-excel-export.js');

async function main() {
  // ── synthesize 2 supplier files ──
  const files = [
    { supplierName: 'บริษัท A', items: [
      { name: 'วงกบประตูไม้ 80x200cm', qty: 12, unit: 'ชุด', price: 4500, total: 54000 },
      { name: 'บานประตู HDF 80x200cm', qty: 12, unit: 'บาน', price: 2200, total: 26400 },
      { name: 'ลูกบิดประตู', qty: 12, unit: 'ชุด', price: 350, total: 4200 },
    ]},
    { supplierName: 'บริษัท B', items: [
      { name: 'วงกบประตูไม้ 80x200cm', qty: 12, unit: 'ชุด', price: 4400, total: 52800 },
      { name: 'บานประตู HDF 80x200cm', qty: 12, unit: 'บาน', price: 2300, total: 27600 },
      // supplier B ไม่มี ลูกบิด → missing
    ]},
  ];

  // ── run matching ──
  const groups = MultiBOQ.buildGroups(files, 0.62);
  const groupsWithPrices = MultiBOQ.buildVendorPriceMatrix(groups, files, files.map(f => f.supplierName));

  console.log(`groups: ${groupsWithPrices.length}`);
  groupsWithPrices.forEach((g, i) => {
    console.log(`  G${i}: "${g.canonicalName}" unit=${g.unit} members=${g.members.length} prices=${g.vendorPrices.map(vp => vp.price).join(',')} winnerIdx=${g.winnerIdx}`);
  });

  // ── build state + payload ──
  const fakeState = {
    multiBOQ: {
      workName: 'งานวงกบประตู',
      thresholdLabel: '',
      fileOrder: files.map(f => f.supplierName),
      files: files,
      groups: groupsWithPrices,
      conclusionSupplier: 'บริษัท B',
      conclusionReason: 'ถูกกว่า',
      terms: {},
      extraTermsVendors: [],
    },
    signatures: {
      preparer: [{ title: 'เจ้าหน้าที่จัดซื้อ', name: 'นายทดสอบ' }],
      reviewers: [{ title: 'หัวหน้าแผนก', name: 'นางสมศักดิ์' }],
      approvers: { label: 'คณะกรรมการ', people: [{ title: 'ประธาน', name: 'นายก' }] },
    },
  };
  const payload = MultiBOQ.buildExportPayload(fakeState);

  // ── generate xlsx ──
  const buf = await CompareExcelExport.toBuffer(payload);
  console.log(`xlsx generated: ${buf.length} bytes`);

  // ── reload + inspect ──
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  console.log(`workbook: ${ws.rowCount} rows × ${ws.columnCount} cols`);

  // assertions
  let pass = 0, fail = 0;
  const check = (label, cond, detail) => {
    if (cond) { pass++; console.log(`  ✓ ${label}`); }
    else      { fail++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
  };

  // 1. payload เบื้องต้น
  check('payload hasBOQ = false', payload.hasBOQ === false);
  check('payload has 2 vendors', payload.vendors.length === 2);
  check('vendors[0].name = บริษัท A', payload.vendors[0].name === 'บริษัท A');
  check('payload has 3 groups', payload.groups.length === 3);

  // 2. groups ใน payload — ราคา align กับ vendor
  const g0 = payload.groups[0];  // วงกบ
  check('G0 title is วงกบ', /วงกบ/.test(g0.title));
  check('G0 has 1 item', g0.sections[0].items.length === 1);
  check('G0 prices = [4500, 4400] (A then B)',
    JSON.stringify(g0.sections[0].items[0].prices) === '[4500,4400]');

  const g2 = payload.groups[2];  // ลูกบิด
  check('G2 title is ลูกบิด', /ลูกบิด/.test(g2.title));
  check('G2 prices = [350, null] (B ไม่มี)',
    JSON.stringify(g2.sections[0].items[0].prices) === '[350,null]');

  // 3. conclusion
  check('conclusionText mentions B', /บริษัท B/.test(payload.conclusionText));

  // 4. inspect workbook — vendor columns ต้องตรง
  //    layout: A=ที่, B..G=item, H=qty, I=unit, J,K = vendor0, L,M = vendor1, ...
  //    hasBOQ=false → ไม่มี N,O (BOQ column)
  // หาเซลล์ "BOQ" — ถ้าไม่มี = pass
  let hasBOQCell = false;
  ws.eachRow((row, r) => {
    row.eachCell((cell, c) => {
      if (cell.value === 'BOQ' || (cell.value && String(cell.value).includes('BOQ'))) hasBOQCell = true;
    });
  });
  check('workbook ไม่มี "BOQ" column (hasBOQ=false)', !hasBOQCell);

  // 5. signatures + conclusion rows present
  let hasConclusion = false;
  ws.eachRow((row, r) => {
    row.eachCell((cell, c) => {
      if (cell.value && String(cell.value).includes('สรุปให้')) hasConclusion = true;
    });
  });
  check('workbook มี conclusion row', hasConclusion);

  // 6. winner highlight — คอลัมน์ J (vendor A) มีพื้นเขียวสำหรับแถวที่ A ถูกกว่า
  // (เช็คแบบคร่าว ๆ — มี fill เขียวที่เซลล์ J)
  let hasGreenFill = false;
  ws.eachRow((row, r) => {
    const j = row.getCell(10);
    if (j.fill && j.fill.fgColor && j.fill.fgColor.argb === 'FFE2EFDA') hasGreenFill = true;
  });
  check('workbook มี green fill (highlight)', hasGreenFill);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Result: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
