/* Lint Guard: ห้ามเพิ่ม time/analytics tracking ในระบบ
   ────────────────────────────────────────────────────────
   เหตุผล: user บอกไว้ว่า "พวกเวลาไม่ต้องไปเพิ่มลงในระบบเพราะผมต้องมาบันทึกเอง
   ในรูปเล่มรายงานครับ" — ห้ามมี:
   - elapsed time / duration
   - time tracking / track_time
   - analytics events
   - stopwatch / timer start-stop
   - savings tracker (ตัวเลขที่ประหยัดได้)
   - auto timestamps ที่อ้างอิงเวลาทำงาน

   วิธีใช้: node tools/lint-no-time.js
   Exit code 0 = clean, 1 = พบ forbidden patterns
*/
const fs = require('fs');
const path = require('path');

const ROOTS = ['js', 'css', 'tools', 'alerts.html'];
const EXTS = ['.js', '.html', '.css'];

/* Patterns ที่ห้าม (case-insensitive) — ยกเว้นใน comment บรรทัดเดียวที่ขึ้นต้นด้วย // หรือ /*  */
const FORBIDDEN = [
  // timer / analytics
  { re: /\btrack[_-]?time\b/i, name: 'track-time' },
  { re: /\btime[_-]?tracking\b/i, name: 'time-tracking' },
  { re: /\belapsed[_-]?time\b/i, name: 'elapsed-time' },
  { re: /\btime[_-]?elapsed\b/i, name: 'time-elapsed' },
  { re: /\banalytics?\b/i, name: 'analytics' },
  { re: /\bstopwatch\b/i, name: 'stopwatch' },
  { re: /\bga\s*\(\s*['"]/, name: 'google-analytics-call' },
  // workflow savings
  { re: /\bsavings?[_-]?tracker\b/i, name: 'savings-tracker' },
  { re: /\btime[_-]?saved\b/i, name: 'time-saved' },
  { re: /\bsaved[_-]?time\b/i, name: 'saved-time' },
  { re: /\bhours?[_-]?saved\b/i, name: 'hours-saved' },
  { re: /\bminutes?[_-]?saved\b/i, name: 'minutes-saved' },
  { re: /\bprocessing[_-]?time\b/i, name: 'processing-time' },
  // duration tracker (timer-running)
  { re: /\bDate\.now\(\)\s*[-+]\s*\w*[Ss]tart\b/, name: 'date-now-minus-start' },
];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (EXTS.includes(path.extname(entry.name))) out.push(p);
  }
  return out;
}

function stripComments(src) {
  // ลบ // line comments + /* block comments */
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

let violations = 0;

for (const root of ROOTS) {
  const absRoot = path.resolve(__dirname, '..', root);
  const files = fs.statSync(absRoot).isDirectory() ? walk(absRoot) : [absRoot];
  for (const f of files) {
    // ข้ามตัวเอง — ถ้าไม่ข้าม lint file จะ match กับ pattern string ของตัวเอง
    if (path.resolve(f) === __filename) continue;
    const raw = fs.readFileSync(f, 'utf8');
    const clean = stripComments(raw);
    for (const { re, name } of FORBIDDEN) {
      const m = clean.match(re);
      if (m) {
        const lines = raw.split('\n');
        let lineNo = 0;
        for (let i = 0; i < lines.length; i++) {
          if (re.test(stripComments(lines[i]))) {
            lineNo = i + 1;
            console.log(`✗ ${path.relative(__dirname, f)}:${lineNo} — forbidden pattern "${name}"`);
            console.log(`    ${lines[i].trim().substring(0, 90)}`);
            violations++;
            break;
          }
        }
      }
    }
  }
}

console.log();
if (violations > 0) {
  console.log(`✗✗✗ LINT FAILED: พบ ${violations} forbidden time-tracking pattern(s) ✗✗✗`);
  console.log(`  user rule: "พวกเวลาไม่ต้องไปเพิ่มลงในระบบเพราะผมต้องมาบันทึกเองในรูปเล่มรายงานครับ"`);
  process.exit(1);
} else {
  console.log(`✓ LINT PASSED: no time-tracking patterns found in js/, css/, tools/, alerts.html`);
  process.exit(0);
}