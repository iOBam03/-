// tests/test-responsive.js
// ทดสอบ responsive: simulate viewport ที่ 1280 / 1440 / 1920 px
// ตรวจ CSS เพื่อยืนยันว่า table ไม่ overflow viewport

const fs = require('fs');
const path = require('path');

// อ่าน style.css
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
// อ่าน supplier-comparison.js เพื่อตรวจ inline styles ใน renderComparisonTable
const sc = fs.readFileSync(path.join(__dirname, '..', 'js', 'supplier-comparison.js'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
};

console.log('\n[CSS] fluid font-size on body');
check('body uses clamp() for fluid font',
  /html,\s*body\s*\{[^}]*font-size:\s*clamp\([^)]+\)/.test(css));

console.log('\n[CSS] responsive breakpoints exist');
check('@media (max-width: 1440px) exists', /@media \(max-width:\s*1440px\)/.test(css));
check('@media (max-width: 1100px) exists', /@media \(max-width:\s*1100px\)/.test(css));
check('@media (max-width: 800px) exists', /@media \(max-width:\s*800px\)/.test(css));
check('@media (min-width: 1920px) exists', /@media \(min-width:\s*1920px\)/.test(css));

console.log('\n[CSS] supplier-compare-table not fixed at 1100px');
const oldFixed = /\.supplier-compare-table\s*\{[^}]*min-width:\s*1100px/m.test(css);
check('no min-width: 1100px (ลดลงเพื่อรองรับ notebook)', !oldFixed);
const hasReduced = /\.supplier-compare-table\s*\{[^}]*min-width:\s*[6-7]\d{2}px/m.test(css);
check('min-width ≤ 760px (compact — พอดีจอ 1280px กับ 2-3 suppliers)', hasReduced);

console.log('\n[CSS] fluid column widths (ใช้ %)');
check('table column widths fluid (% not fixed px)',
  /supplier-compare-table\s+th\.(?:wd|name|qty|boq|sap|winner)-col[^}]*\{[^}]*width:\s*\d+%/m.test(css));

console.log('\n[CSS] supplier-compare-scroll has shadow hint');
check('scroll wrapper has shadow gradient hint',
  /\.supplier-compare-scroll[\s\S]*?linear-gradient/.test(css));

console.log('\n[CSS] sidebar collapses on mobile');
check('@media (max-width: 800px) hides .sidebar',
  /@media \(max-width:\s*800px\)[\s\S]*?\.sidebar\s*\{\s*display:\s*none/.test(css));

console.log('\n[JS] renderComparisonTable ใช้ class แทน inline width');
check('class="wd-col" present', /class="wd-col"/.test(sc));
check('class="name-col" present', /class="name-col"/.test(sc));
check('class="num boq-col" present', /class="num boq-col"/.test(sc));
check('class="num qty-col" present', /class="num qty-col"/.test(sc));
check('class="sap-col" present', /class="sap-col"/.test(sc));
check('class="winner-col" present', /class="winner-col"/.test(sc));
check('ไม่มี inline style="width:64px" (WD)', !sc.includes('style="width:64px;"'));
check('ไม่มี inline style="width:160px" (SAP)', !sc.includes('style="width:160px'));

console.log('\n[JS] supplier-comparison.js syntax OK');
try {
  new Function(sc);
  check('parseable as JavaScript', true);
} catch (e) {
  check('parseable as JavaScript', false, e.message);
}

// ── Simulate viewport width calculation ──
// Notebook 1280: sidebar 240 + content padding 28*2 = 296 → content area = 984px
// PC 1920: content area = 1920 - 240 - 56 = 1624px
// PC 1440: content area = 1440 - 240 - 56 = 1144px
console.log('\n[viewport simulation] content area width');
const calcArea = (vp) => vp - 240 - 56;
console.log(`  1280px viewport → content area = ${calcArea(1280)}px`);
console.log(`  1440px viewport → content area = ${calcArea(1440)}px`);
console.log(`  1920px viewport → content area = ${calcArea(1920)}px`);

const TABLE_MIN_WIDTH = 760;  // จาก CSS
const SUPPLIER_CELL_MIN = 110; // จาก .supplier-col min-width
const OTHER_COLS_MIN = 56 + 180 + 70 + 80 + 130 + 120; // wd+name+qty+boq+sap+winner = 636
// ถ้า supplier 6 ราย × 110 = 660 + 636 = 1296px (overflows ทุกจอ)
// ถ้า supplier 3 ราย × 110 = 330 + 636 = 966px → 1280 fits, 1920 fits
// ถ้า supplier 2 ราย × 110 = 220 + 636 = 856px → 1280 fits

console.log('\n[viewport] min content needed at various supplier counts:');
[2, 3, 6].forEach(n => {
  const minNeeded = OTHER_COLS_MIN + (n * SUPPLIER_CELL_MIN);
  const fits1280 = minNeeded <= calcArea(1280);
  console.log(`  ${n} suppliers → need ${minNeeded}px, fits 1280px content: ${fits1280}`);
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Result: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
