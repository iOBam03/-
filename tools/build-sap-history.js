/* ==========================================================================
   Build SAP Purchase History JS
   ==========================================================================
   แปลง SAP EXPORT 4000 XLSX → js/purchase-history-sap.js
   ใช้สำหรับ import PO history จริงเข้า alerts.html

   วิธีใช้งาน:
   1. แตกไฟล์ XLSX เป็น ZIP ไปยัง folder (เช่น ./sap_work/)
      PowerShell: Copy-Item "EXPORT 4000 24-07-2569.XLSX" ./sap.zip; Expand-Archive ./sap.zip -DestinationPath ./sap_work
   2. แก้ path ด้านล่างให้ชี้ไปยัง folder ที่แตกไฟล์
   3. node tools/build-sap-history.js
   4. ไฟล์ js/purchase-history-sap.js จะถูก generate ใหม่

   Output ประมาณ 7-8 MB (51,071 records → 19,177 distinct materials)
   ========================================================================== */

const fs = require('fs');
const path = 'C:/Users/usEr/AppData/Local/Temp/sap_work';   // ← แก้ตรงนี้ถ้าย้าย folder

console.log('=== STEP 1: Load shared strings ===');
const t0 = Date.now();
const ssXml = fs.readFileSync(path + '/sharedStrings.xml', 'utf8');
const ss = [];
const siRe = /<si>([\s\S]*?)<\/si>/g;
let m;
while ((m = siRe.exec(ssXml)) !== null) {
  const inner = m[1];
  const textParts = [];
  const tRe = /<t[^>]*>([^<]*)<\/t>/g;
  let tm;
  while ((tm = tRe.exec(inner)) !== null) textParts.push(tm[1]);
  ss.push(textParts.join(''));
}
console.log(`  ${ss.length} shared strings in ${Date.now() - t0}ms`);

console.log('=== STEP 2: Parse sheet1.xml ===');
const sheet1 = fs.readFileSync(path + '/sheet1.xml', 'utf8');
const rowRe = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;

function cleanSupplier(raw) {
  if (!raw) return '';
  let s = raw.replace(/^\d+\s+/, '').trim().replace(/\s+/g, ' ');
  if (s.endsWith('จ')) s = s + 'ำกัด';
  else if (s.endsWith('จำกั')) s = s + 'ด';
  return s;
}

function excelDate(serial) {
  if (!serial || serial < 36500) return '';
  const ms = (serial - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().substring(0, 10);
}

function toBE(iso) {
  if (!iso) return '';
  const y = parseInt(iso.substring(0, 4));
  return `${y + 543}${iso.substring(4)}`;
}

const records = [];
let rowCount = 0;
let skippedNoPrice = 0;
let skippedNoName = 0;
const startParse = Date.now();

let rm;
while ((rm = rowRe.exec(sheet1)) !== null) {
  rowCount++;
  if (rowCount === 1) continue;
  const body = rm[2];
  const cells = {};
  const cre = /<c r="([A-Z]+)(\d+)"(?:\s+s="\d+")?(?:\s+t="(\w+)")?>(?:<v>([^<]*)<\/v>|<is>([\s\S]*?)<\/is>)?/g;
  let cm;
  while ((cm = cre.exec(body)) !== null) {
    const col = cm[1];
    const type = cm[3] || '';
    let val;
    if (cm[5] !== undefined) val = cm[5].replace(/<[^>]+>/g, '');
    else if (cm[4] !== undefined) val = type === 's' ? (ss[parseInt(cm[4])] || '') : cm[4];
    cells[col] = val;
  }

  const materialCode = (cells.AH || '').trim();
  const shortText = (cells.I || '').trim().replace(/\s+/g, ' ');
  const unit = (cells.L || '').trim();
  const qty = parseFloat(cells.K) || 0;
  const pricePerUnit = parseFloat(cells.M) || 0;
  const project = (cells.AA || '').trim();
  const supplier = cleanSupplier(cells.T);
  const dateISO = excelDate(parseFloat(cells.R));
  const poNumber = (cells.A || '').trim();
  const category = (cells.BC || '').trim();

  if (!pricePerUnit) { skippedNoPrice++; continue; }
  if (!shortText) { skippedNoName++; continue; }

  const key = `${category}::${shortText}`;

  records.push({
    key,
    materialCode,
    shortText,
    category,
    unit,
    qty,
    pricePerUnit,
    project,
    supplier,
    dateISO,
    poNumber,
  });
}
console.log(`  Parsed ${rowCount} rows -> ${records.length} valid (skipped ${skippedNoPrice} no-price, ${skippedNoName} no-name) in ${Date.now() - startParse}ms`);

console.log('=== STEP 3: Aggregate + slim records ===');
const byKey = new Map();
for (const r of records) {
  if (!byKey.has(r.key)) {
    byKey.set(r.key, {
      materialCode: r.materialCode,
      displayName: r.shortText,
      category: r.category,
      unit: r.unit,
      records: [],
    });
  }
  const e = byKey.get(r.key);
  // Keep only 5 most recent records per material to stay compact
  e.records.push([r.poNumber, toBE(r.dateISO), r.supplier, r.project, r.pricePerUnit, r.qty]);
}

console.log('=== STEP 4: Trim to 5 records per entry, compute stats ===');
const finalEntries = [];
for (const e of byKey.values()) {
  if (e.records.length === 0) continue;
  // Sort by date desc (date is at index 1)
  e.records.sort((a, b) => (b[1] || '').localeCompare(a[1] || ''));
  const trimmed = e.records.slice(0, 5);
  const prices = e.records.map(r => r[4]).filter(p => p > 0);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const lastPrice = trimmed[0][4];
  finalEntries.push({
    m: e.displayName,
    c: e.category || 'อื่นๆ',
    u: e.unit || '',
    n: e.records.length,
    a: Math.round(avg * 100) / 100,
    min: min,
    max: max,
    lp: lastPrice,
    ld: trimmed[0][1],
    r: trimmed,
  });
}
finalEntries.sort((a, b) => b.n - a.n);
console.log(`  Final entries: ${finalEntries.length}`);
console.log(`  Total records kept (capped 5/entry): ${finalEntries.reduce((s, e) => s + e.r.length, 0)}`);

console.log('\n=== Top 10 entries by record count ===');
finalEntries.slice(0, 10).forEach((e, i) => {
  console.log(`  ${i+1}. [${e.c}] ${e.m.substring(0, 50)} | ${e.n} records | unit=${e.u}`);
});

console.log('\n=== STEP 5: Generate js/purchase-history-sap.js ===');
const projectName = 'EXPORT_4000_24-07-2569';
const exportDate = '2569-07-24';
const totalRecords = records.length;
const totalPOs = new Set(records.map(r => r.poNumber)).size;
const totalSuppliers = new Set(records.map(r => r.supplier)).size;
const totalProjects = new Set(records.map(r => r.project).filter(Boolean)).size;

// Build lookup tables from entries in a separate slug-friendly way
// Then minify JSON output (no indentation)
const entriesJson = JSON.stringify(finalEntries);

const jsContent = `// Auto-generated from SAP EXPORT 4000 XLSX (24-07-2569)
// Source: ${projectName}.XLSX
// Generated: ${new Date().toISOString()}
// DO NOT EDIT — regenerate via tools/build-sap-history.js
// Each entry: m=material, c=category, u=unit, n=recordCount, a=avgPrice, min/max=priceRange, lp=lastPrice, ld=lastDate, r=[[po,date,supplier,project,price,qty],...]

(function(global){'use strict';
const SAP_EXPORT={sourceFile:'${projectName}',exportDate:'${exportDate}',totalRows:${rowCount},totalRecords:${totalRecords},totalPOs:${totalPOs},totalSuppliers:${totalSuppliers},totalProjects:${totalProjects},distinctMaterials:${finalEntries.length}};
const ENTRIES=${entriesJson};
const BY_NAME={};const BY_NAME_LOOSE={};
ENTRIES.forEach(function(e){BY_NAME[e.m]=e;BY_NAME_LOOSE[e.m.toLowerCase().replace(/\\s+/g,'')]=e;});
function lookupByMaterial(n){if(!n)return null;const t=n.trim();if(BY_NAME[t])return BY_NAME[t];const l=t.toLowerCase().replace(/\\s+/g,'');if(BY_NAME_LOOSE[l])return BY_NAME_LOOSE[l];for(let i=0;i<ENTRIES.length;i++){if(ENTRIES[i].m&&ENTRIES[i].m.indexOf(t)>=0)return ENTRIES[i];}return null;}
function lookupByExactName(n){if(!n)return null;return BY_NAME[n.trim()]||null;}
function searchByMaterial(fragment,limit){if(!fragment)return[];const t=fragment.trim().toLowerCase();const r=[];for(let i=0;i<ENTRIES.length;i++){if(ENTRIES[i].m&&ENTRIES[i].m.toLowerCase().indexOf(t)>=0)r.push(ENTRIES[i]);if(r.length>=(limit||20))break;}return r;}
global.SAP_PURCHASE_HISTORY={meta:SAP_EXPORT,entries:ENTRIES,lookupByMaterial:lookupByMaterial,lookupByExactName:lookupByExactName,searchByMaterial:searchByMaterial};
})(typeof window!=='undefined'?window:globalThis);
`;

const outPath = 'c:/Users/usEr/Desktop/ใหม่ๆ/procurement-system/js/purchase-history-sap.js';
fs.writeFileSync(outPath, jsContent, 'utf8');
const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
console.log(`  Wrote ${outPath} (${sizeKB} KB)`);
console.log('\n=== DONE ===');
