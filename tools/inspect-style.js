// ตรวจ style / merge / column width ของ sheet สุดท้ายในแม่แบบ
const ExcelJS = require('exceljs');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(process.argv[2]);
  const ws = wb.worksheets[wb.worksheets.length - 1];
  console.log('SHEET:', ws.name, 'rows:', ws.rowCount, 'cols:', ws.columnCount);

  console.log('\n=== COLUMN WIDTHS ===');
  for (let c = 1; c <= 30; c++) {
    const w = ws.getColumn(c).width;
    if (w) console.log(`  col ${c} (${ws.getColumn(c).letter}) = ${w}`);
  }

  console.log('\n=== MERGES ===');
  const merges = ws.model.merges || [];
  console.log(merges.join('  '));

  console.log('\n=== ROW HEIGHTS (1-30) ===');
  for (let r = 1; r <= 30; r++) {
    const h = ws.getRow(r).height;
    if (h) console.log(`  row ${r} = ${h}`);
  }

  const probes = (process.argv[3] || 'A1,A4,B4,J4,J5,K5,B8,H8,I8,J8,K8,K25,A90,K96,B98,K100,A101,B102,J102,B110,A112,A115,A116,A117').split(',');
  console.log('\n=== CELL STYLES ===');
  probes.forEach((addr) => {
    const cell = ws.getCell(addr);
    console.log(`\n-- ${addr}  value=${JSON.stringify(cell.value)}  numFmt=${cell.numFmt}`);
    console.log('   font:', JSON.stringify(cell.font));
    console.log('   align:', JSON.stringify(cell.alignment));
    console.log('   fill:', JSON.stringify(cell.fill));
    console.log('   border:', JSON.stringify(cell.border));
  });
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
