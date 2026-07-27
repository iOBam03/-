// อ่านโครงสร้างไฟล์เปรียบเทียบราคาต้นฉบับ เพื่อใช้เป็นแม่แบบ
const XLSX = require('xlsx');
const file = process.argv[2];
const wb = XLSX.readFile(file, { cellStyles: true });

console.log('=== SHEETS ===');
wb.SheetNames.forEach((n, i) => {
  const ws = wb.Sheets[n];
  console.log(`[${i}] "${n}"  range=${ws['!ref']}  merges=${(ws['!merges'] || []).length}`);
});

const target = process.argv[3] || wb.SheetNames[wb.SheetNames.length - 1];
const ws = wb.Sheets[target];
console.log(`\n=== DUMP: "${target}" ===`);
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
rows.forEach((r, i) => {
  const cells = r.map((c, j) => (String(c).trim() ? `${XLSX.utils.encode_col(j)}:${c}` : null))
    .filter(Boolean);
  if (cells.length) console.log(`R${i + 1} | ${cells.join(' | ')}`);
});
