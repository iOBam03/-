// tests/test-parse-simple-boq.js
// ทดสอบ shouldSkipBoqRow + parseSimpleBOQ — กรอง section header / สรุป / ลายเซ็น / VAT
//
// โหลด supplier-comparison.js เป็น globalThis + ดึง SupplierCompareHelpers.shouldSkipBoqRow
// run: node tests/test-parse-simple-boq.js

const fs = require('fs');
const path = require('path');

globalThis.window = globalThis;
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'supplier-comparison.js'), 'utf8');

// โหลดเป็น IIFE — ต้อง eval ใน context ที่ expose window.*
const wrap = new Function('window', 'globalThis', src + '\nreturn window.SupplierCompareHelpers;');
const helpers = wrap(globalThis, globalThis);
if (!helpers || !helpers.shouldSkipBoqRow) {
  console.error('FAIL: shouldSkipBoqRow ไม่ถูก expose ผ่าน window.SupplierCompareHelpers');
  process.exit(1);
}
const shouldSkip = helpers.shouldSkipBoqRow;

let pass = 0, fail = 0;
const check = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
};

// ========== shouldSkipBoqRow — pattern coverage ==========
console.log('\n[section headers / หมวด]');
check('"หมวดที่ 1" ถูกข้าม', shouldSkip('หมวดที่ 1', 1, 0, 0));
check('"หมวด 2: วงกบประตู" ถูกข้าม', shouldSkip('หมวด 2: วงกบประตู', 1, 0, 0));
check('"หัวข้อ: รายการสินค้า" ถูกข้าม', shouldSkip('หัวข้อ: รายการสินค้า', 1, 0, 0));

console.log('\n[สรุป / sign-off]');
check('"สรุปให้ __ เป็นผู้ดำเนินการ" ถูกข้าม', shouldSkip('สรุปให้ __ เป็นผู้ดำเนินการ', 1, 0, 0));
check('"สรุปให้ บริษัท A" ถูกข้าม', shouldSkip('สรุปให้ บริษัท A เป็นผู้ชนะ', 1, 0, 0));
check('"ผู้อนุมัติ: __________" ถูกข้าม', shouldSkip('ผู้อนุมัติ: __________', 1, 0, 0));
check('"ลงชื่อ ___________" ถูกข้าม', shouldSkip('ลงชื่อ ___________', 1, 0, 0));
check('"ลายเซ็นผู้จัดทำ" ถูกข้าม', shouldSkip('ลายเซ็นผู้จัดทำ', 1, 0, 0));

console.log('\n[รวม / totals]');
check('"รวมทั้งสิ้น" ถูกข้าม', shouldSkip('รวมทั้งสิ้น', 1, 0, 0));
check('"รวมเงิน 125,000 บาท" ถูกข้าม', shouldSkip('รวมเงิน 125,000 บาท', 1, 0, 0));
check('"ราคารวม" ถูกข้าม', shouldSkip('ราคารวม', 1, 0, 0));
check('"Subtotal" ถูกข้าม', shouldSkip('Subtotal', 1, 0, 0));
check('"Grand Total" ถูกข้าม', shouldSkip('Grand Total', 1, 0, 0));

console.log('\n[VAT / ภาษี]');
check('"VAT 7%" ถูกข้าม', shouldSkip('VAT 7%', 1, 0, 0));
check('"ภาษีมูลค่าเพิ่ม" ถูกข้าม', shouldSkip('ภาษีมูลค่าเพิ่ม', 1, 0, 0));
check('"รวมภาษี" ถูกข้าม', shouldSkip('รวมภาษี', 1, 0, 0));
check('"ส่วนลด" ถูกข้าม', shouldSkip('ส่วนลด 5%', 1, 0, 0));

console.log('\n[หมายเหตุ / remark]');
check('"หมายเหตุ ราคายังไม่รวม VAT" ถูกข้าม', shouldSkip('หมายเหตุ ราคายังไม่รวม VAT', 1, 0, 0));
check('"หมายเหตุเพิ่มเติม" ถูกข้าม', shouldSkip('หมายเหตุเพิ่มเติม', 1, 0, 0));

console.log('\n[ghost row — แถวที่ไม่มีตัวเลข]');
check('"สรุปรายการ" (qty=1, price=0) → ghost', shouldSkip('สรุปรายการ', 1, 0, 0));
check('"footer" (qty=null, price=null) → ghost', shouldSkip('footer', null, null, null));
check('เครื่องหมาย "_" ล้วน → skip', shouldSkip('____________', 1, 0, 0));
check('"---" → skip', shouldSkip('----------', 1, 0, 0));
check('"..." → skip', shouldSkip('...', 1, 0, 0));
check('"…" → skip', shouldSkip('…', 1, 0, 0));

console.log('\n[negative — items ปกติต้องไม่ถูกข้าม]');
check('"วงกบประตูไม้ 80x200cm" (qty=12, price=4500) → KEEP',
  !shouldSkip('วงกบประตูไม้ 80x200cm', 12, 4500, 54000));
check('"บานประตู HDF" (qty=1 ก็ตาม + price=2200) → KEEP',
  !shouldSkip('บานประตู HDF', 1, 2200, 2200));
check('"ลูกบิดประตู" (qty=12, price=350, total=4200) → KEEP',
  !shouldSkip('ลูกบิดประตู', 12, 350, 4200));
check('qty=10, price=0, total=0 → KEEP (มี qty + name → น่าจะเป็นของแถม)',
  !shouldSkip('ของแถม', 10, 0, 0));  // qty != 1 → ไม่ใช่ ghost
check('qty=null, price=1500, total=1500 → KEEP',
  !shouldSkip('ไม่ระบุจำนวน', null, 1500, 1500));

// ========== parseSimpleBOQ — integration ==========
// เราทดสอบ shouldSkipBoqRow ตรงๆ ผ่าน window.SupplierCompareHelpers
// ฟังก์ชัน parseSimpleBOQ เป็น IIFE-internal (ใช้ closure `num`) ไม่สามารถ
// eval แยกใน Node ได้ — แต่ shouldSkipBoqRow ถูกใช้ใน parseSimpleBOQ loop จริง
// (บรรทัดที่ผูกใน supplier-comparison.js) — pattern coverage ด้านบนพอแล้ว
//
// ถ้าอยาก integration test จริง: load supplier-comparison.js ผ่าน <script> ใน browser
// หรือ expose parseSimpleBOQ เพิ่มใน window.SupplierCompareHelpers ภายหลัง
console.log('\n[parseSimpleBOQ integration — ใช้ pattern coverage ด้านบนแทน]');
check('shouldSkipBoqRow ถูกเรียกใน parseSimpleBOQ loop',
  src.includes('shouldSkipBoqRow(name, qtyRaw, priceRaw, totalRaw)'));
check('regex เก่า "/^รวม|ราคารวม|รวมทั้งสิ้น|^Sub.?total/i" ถูกลบทิ้ง',
  !/if \(\/\^รวม\|ราคารวม\|รวมทั้งสิ้น\|\^Sub\.\?total\/i\.test\(name\)\)/.test(src));
check('helper ถูกประกาศก่อน parseSimpleBOQ',
  src.indexOf('function shouldSkipBoqRow(') < src.indexOf('function parseSimpleBOQ('));
check('helper ถูก expose ผ่าน window.SupplierCompareHelpers',
  src.includes('window.SupplierCompareHelpers.shouldSkipBoqRow = shouldSkipBoqRow'));

console.log(`\n${'='.repeat(50)}`);
console.log(`Result: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
