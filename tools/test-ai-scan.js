/* Test: AI scan logic (parseAiScanResponse + buildSheetsFromAiScan)
   ทดสอบ:
   1. parseAiScanResponse รับ response จาก Gemini หลายรูปแบบ (raw, ```json, มี prefix text)
   2. parseAiScanResponse throw error เมื่อ input ผิด
   3. buildSheetsFromAiScan คืน state.sheets structure ที่ valid
   4. Edge cases: qty ไม่ใช่ตัวเลข, supplier บางตัวไม่มีราคา, boqPrice null
*/
const path = require('path');
const fs = require('fs');

// Mock window.LOCAL_CONFIG (ไม่ได้ใช้ตรงๆ ใน parse/build แต่โหลด module ได้)
global.window = { LOCAL_CONFIG: {} };
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ classList: { add(){}, remove(){} }, style: {}, remove: () => {} }),
  body: { appendChild: () => {} },
};
global.XLSX = undefined;
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

// โหลด module เพื่อให้ฟังก์ชัน internal ติดมา (closure) — เราจะ invoke ผ่าน controller หรือ eval scope
// เนื่องจากฟังก์ชัน AI scan อยู่ใน IIFE ไม่ expose — ต้อง unwrap IIFE เพื่อ test
const src = fs.readFileSync(path.resolve(__dirname, '../js/supplier-comparison.js'), 'utf8');

// หา start/end ของ IIFE
const iifeStart = src.indexOf("(function () {");
const iifeEnd = src.lastIndexOf("})();");
if (iifeStart < 0 || iifeEnd < 0) {
  console.error('Cannot find IIFE wrapper');
  process.exit(1);
}
// เอาเนื้อหาข้างใน IIFE (หลัง "{", ก่อน "})();")
const innerStart = iifeStart + "(function () {".length;
const inner = src.slice(innerStart, iifeEnd);

// ห่อด้วย global assignment เพื่อ expose ฟังก์ชันที่ต้องการ
const exposed = `
  ${inner}
  globalThis.__test_exports = { parseAiScanResponse, buildSheetsFromAiScan, AI_SCAN_PROMPT };
`;

// run in isolated context
const vm = require('vm');
const ctx = {
  globalThis,
  window: global.window,
  document: global.document,
  XLSX: undefined,
  Blob: global.Blob,
  FileReader: global.FileReader,
  URL: global.URL,
  localStorage: global.localStorage,
  console,
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(exposed, ctx);

const { parseAiScanResponse, buildSheetsFromAiScan, AI_SCAN_PROMPT } = ctx.__test_exports;

let pass = 0, fail = 0;
function assert(cond, label) {
  if (cond) { console.log('  ✓', label); pass++; }
  else { console.log('  ✗ FAIL:', label); fail++; }
}

console.log('\n=== AI scan — parseAiScanResponse ===');

// Case 1: raw JSON (clean)
{
  const resp = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            projectName: 'โครงการ BLESSINI',
            workName: 'งานวงกบประตู',
            threshold: 'วงเงินเกิน 500,000 ขึ้นไป',
            suppliers: ['บริษัท A', 'บริษัท B'],
            boqPrice: 1200,
            items: [
              { wd: '1.1', name: 'วงกบ', qty: 36, unit: 'ชุด', prices: { 'บริษัท A': 1150, 'บริษัท B': 1180 } }
            ],
          }),
        }],
      },
    }],
  };
  const data = parseAiScanResponse(resp);
  assert(data.projectName === 'โครงการ BLESSINI', 'clean JSON → projectName');
  assert(data.items.length === 1, 'clean JSON → items.length=1');
  assert(data.suppliers.length === 2, 'clean JSON → suppliers.length=2');
}

// Case 2: ```json``` wrapped (Gemini ห่อ markdown)
{
  const resp = {
    candidates: [{
      content: { parts: [{ text: '```json\n' + JSON.stringify({
        projectName: 'X', workName: 'Y', suppliers: ['A'], items: [{ name: 'i', qty: 1, unit: 'ชุด', prices: { A: 100 } }],
      }) + '\n```' }] },
    }],
  };
  const data = parseAiScanResponse(resp);
  assert(data.workName === 'Y', '```json``` wrapped → workName');
}

// Case 3: มี prefix text ก่อน JSON (Gemini ตอบนำหน้าด้วยข้อความ)
{
  const resp = {
    candidates: [{
      content: { parts: [{ text: 'ผมวิเคราะห์เอกสารแล้ว พบว่า:\n\n' + JSON.stringify({
        projectName: 'X', workName: 'Y', suppliers: ['A'], items: [{ name: 'i', qty: 1, unit: 'ชุด', prices: { A: 100 } }],
      }) + '\n\nหวังว่าจะเป็นประโยชน์ครับ' }] },
    }],
  };
  const data = parseAiScanResponse(resp);
  assert(data.suppliers.length === 1, 'prefix text → extracts JSON correctly');
}

// Case 4: empty candidates
{
  const resp = { candidates: [] };
  let threw = false;
  try { parseAiScanResponse(resp); } catch (e) { threw = true; }
  assert(threw, 'empty candidates → throws');
}

// Case 5: no items
{
  const resp = {
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      projectName: 'X', workName: 'Y', suppliers: ['A'], items: [],
    }) }] } }],
  };
  let threw = false;
  try { parseAiScanResponse(resp); } catch (e) {
    threw = true;
    assert(/ไม่พบรายการ/.test(e.message), 'empty items → error message mentions "ไม่พบรายการ"');
  }
  assert(threw, 'empty items → throws');
}

// Case 6: no suppliers
{
  const resp = {
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      projectName: 'X', workName: 'Y', suppliers: [], items: [{ name: 'i', qty: 1, prices: {} }],
    }) }] } }],
  };
  let threw = false;
  try { parseAiScanResponse(resp); } catch (e) { threw = true; }
  assert(threw, 'empty suppliers → throws');
}

// Case 7: invalid JSON
{
  const resp = {
    candidates: [{ content: { parts: [{ text: '```json\n{ invalid json\n```' }] } }],
  };
  let threw = false;
  try { parseAiScanResponse(resp); } catch (e) { threw = true; }
  assert(threw, 'invalid JSON → throws');
}

console.log('\n=== AI scan — buildSheetsFromAiScan ===');

// Case 1: happy path
{
  const data = {
    projectName: 'โครงการ BLESSINI',
    workName: 'งานวงกบประตู',
    threshold: 'วงเงินเกิน 500,000 ขึ้นไป',
    suppliers: ['บริษัท A', 'บริษัท B'],
    boqPrice: 1200,
    items: [
      { wd: '1.1', name: 'วงกบ', qty: 36, unit: 'ชุด', prices: { 'บริษัท A': 1150, 'บริษัท B': 1180 } },
      { wd: '1.2', name: 'บานประตู', qty: 36, unit: 'บาน', prices: { 'บริษัท A': 850, 'บริษัท B': 880 } },
    ],
  };
  const sheets = buildSheetsFromAiScan(data, 'scan.pdf');
  assert(sheets.length === 1, 'happy path → sheets.length=1');
  const s = sheets[0];
  assert(s.workLine === 'งานวงกบประตู', 'workLine from data');
  assert(s.projectLine === 'โครงการ BLESSINI', 'projectLine from data');
  assert(s.supplierNames.length === 2, 'supplierNames=2');
  assert(s.items.length === 2, 'items=2');
  assert(s.items[0].qty === 36, 'item qty=36');
  assert(s.items[0].unit === 'ชุด', 'item unit=ชุด');
  assert(s.items[0].suppliers[0].price === 1150, 'item[0] supplier[0] price=1150');
  assert(s.items[0].suppliers[0].total === 1150 * 36, 'item[0] supplier[0] total=price*qty');
  assert(s.items[0].boq === 1200, 'boq from data');
  assert(s.isFinalShortlist === true, 'isFinalShortlist=true (2 suppliers ≤ 2)');
}

// Case 2: missing price for some supplier → fill 0
{
  const data = {
    projectName: 'X', workName: 'Y', suppliers: ['A', 'B'],
    boqPrice: null,
    items: [{ name: 'i', qty: 5, unit: 'ชุด', prices: { A: 100 } }], // B ไม่มี
  };
  const sheets = buildSheetsFromAiScan(data, 'x.pdf');
  const supB = sheets[0].items[0].suppliers.find(s => s.name === 'B');
  assert(supB.price === 0, 'missing supplier price → 0');
  assert(sheets[0].hasBOQ === false, 'boqPrice=null → hasBOQ=false');
}

// Case 3: qty ไม่ใช่ตัวเลข → fallback 1
{
  const data = {
    projectName: 'X', workName: 'Y', suppliers: ['A'],
    boqPrice: 100,
    items: [{ name: 'i', qty: 'ไม่ระบุ', unit: 'ชุด', prices: { A: 50 } }],
  };
  const sheets = buildSheetsFromAiScan(data, 'x.pdf');
  assert(sheets[0].items[0].qty === 1, 'qty non-number → fallback 1');
}

// Case 4: unit missing → default "ชุด"
{
  const data = {
    projectName: 'X', workName: 'Y', suppliers: ['A'],
    boqPrice: 100,
    items: [{ name: 'i', qty: 1, prices: { A: 50 } }],
  };
  const sheets = buildSheetsFromAiScan(data, 'x.pdf');
  assert(sheets[0].items[0].unit === 'ชุด', 'unit missing → default ชุด');
}

// Case 5: isFinalShortlist = true เมื่อ suppliers <= 2
{
  const data = {
    projectName: 'X', workName: 'Y', suppliers: ['A', 'B'],
    boqPrice: 100,
    items: [{ name: 'i', qty: 1, prices: { A: 50, B: 60 } }],
  };
  const sheets = buildSheetsFromAiScan(data, 'x.pdf');
  assert(sheets[0].isFinalShortlist === true, 'suppliers=2 → isFinalShortlist=true');
}

// Case 6: prompt contains required keys
{
  assert(AI_SCAN_PROMPT.includes('projectName'), 'prompt mentions projectName');
  assert(AI_SCAN_PROMPT.includes('suppliers'), 'prompt mentions suppliers');
  assert(AI_SCAN_PROMPT.includes('items'), 'prompt mentions items');
  assert(AI_SCAN_PROMPT.includes('boqPrice'), 'prompt mentions boqPrice');
  assert(AI_SCAN_PROMPT.includes('wd'), 'prompt mentions wd');
}

console.log('\n=== FINAL ===');
console.log(`✓ ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
