// ตรวจสูตรและสไตล์ในไฟล์ที่ generate ออกมา
const ExcelJS = require('exceljs');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(process.argv[2]);
  const ws = wb.worksheets[0];

  console.log('=== FORMULAS ===');
  ws.eachRow((row, r) => {
    row.eachCell((cell, c) => {
      if (cell.formula) {
        console.log(`${cell.address} = ${cell.formula}`);
      }
    });
  });

  console.log('\n=== STYLE SPOT CHECK ===');
  ['A1', 'A4', 'B4', 'J4', 'N4', 'J5', 'K8', 'N8', 'O8', 'K16', 'A45', 'A46', 'A49', 'A50'].forEach((a) => {
    const c = ws.getCell(a);
    console.log(`${a}: font=${JSON.stringify(c.font)} fill=${c.fill && c.fill.fgColor && c.fill.fgColor.argb} numFmt=${c.numFmt ? 'Y' : 'n'}`);
  });
})().catch(e => { console.error(e); process.exit(1); });
