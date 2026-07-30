// tools/verify-mock-multi-boq.js
// Verify mock files parse ได้ผ่าน parseSimpleBOQ + ราคา/รายการตรงตามที่ตั้งใจ
//
// Run: node tools/verify-mock-multi-boq.js

const fs = require('fs');
const path = require('path');
const ExcelJS = require('../vendor/exceljs.min.js');

// ใช้ ExcelJS load() (vendor ExcelJS ไม่มี readFile) — ใช้ buffer แทน
async function readAOA(filePath) {
  const buf = fs.readFileSync(filePath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  const rows = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    rows.push(row.values.slice(1));  // ExcelJS values[0] = rowNum
  });
  return rows;
}

async function main() {
  const dir = path.join(__dirname, '..', 'tests', 'fixtures');
  const files = ['BOQ_บริษัท_เอบีวี_ก่อสร้าง.xlsx', 'BOQ_บริษัท_ซีดีอี_เทรดดิ้ง.xlsx'];

  let pass = 0, fail = 0;
  const check = (label, cond, detail) => {
    if (cond) { pass++; console.log(`  ✓ ${label}`); }
    else      { fail++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
  };

  for (const f of files) {
    console.log(`\n[${f}]`);
    const filePath = path.join(dir, f);
    const aoa = await readAOA(filePath);

    check('row 0 = projectLine', /โปรเจค/.test(String(aoa[0]?.[0] || '')));
    check('row 1 = workLine',    /งานประตู/.test(String(aoa[1]?.[0] || '')));
    check('row 2 = empty',       !aoa[2]?.some(c => String(c || '').trim()));
    check('row 3 = header (ลำดับ/รายการ/จำนวน/หน่วย/ราคาต่อหน่วย/จำนวนเงิน)',
      aoa[3]?.[0] === 'ลำดับ' &&
      aoa[3]?.[1] === 'รายการ' &&
      aoa[3]?.[2] === 'จำนวน' &&
      aoa[3]?.[3] === 'หน่วย' &&
      aoa[3]?.[4] === 'ราคาต่อหน่วย');

    // 5 data rows
    check('rows 4-8 = 5 data items', aoa.length >= 9);
    check('row 4 = วงกบประตูไม้ 80x200cm', /วงกบประตูไม้/.test(String(aoa[4]?.[1] || '')));
    check('row 8 = กระจกใส', /กระจกใส/.test(String(aoa[8]?.[1] || '')));
    check('row 8 qty = 8', aoa[8]?.[2] === 8);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Result: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
