// ทดสอบกรณี 3 ผู้ขาย + BOQ (ยืนยันว่าคอลัมน์ขยายได้ ไม่ fix แค่ 2 เจ้า)
// และกรณีไม่มี BOQ
const path = require('path');
const Exporter = require('../js/compare-excel-export.js');

const mkVendor = (name, i) => ({
  name: name,
  terms: {
    priceNote: 'ราคารวมภาษีมูลค่าเพิ่ม 7%',
    validUntil: `ยืนราคา ${30 + i * 15} วัน`,
    paymentTerm: 'เครดิต 30 วัน',
    delivery: `ผลิต ${15 + i * 5} วัน`,
    warranty: `รับประกัน ${i + 1} ปี`,
    contact: `ผู้ติดต่อ ${i + 1} 08x-xxxxxxx`,
  },
});

function makeData(vendorNames, hasBOQ) {
  const n = vendorNames.length + (hasBOQ ? 1 : 0);
  const priceRow = (base) => Array.from({ length: n }, (_, k) => base + k * 100);
  return {
    sheetName: `ทดสอบ ${vendorNames.length} เจ้า`,
    projectName: 'ทดสอบโครงการ',
    workName: 'งานทดสอบ',
    hasBOQ: hasBOQ,
    vendors: vendorNames.map(mkVendor),
    groups: [
      {
        title: 'สำหรับบ้านพักอาศัย TYPE A', qty: 10, unit: 'แปลง',
        sections: [
          {
            no: '1.1', title: 'WD01 ห้องนอน',
            items: [
              { name: 'วงกบ WPC 80x200', qty: 2, unit: 'ชิ้น', prices: priceRow(700) },
              { name: 'บานประตู HDF 80x200', qty: 2, unit: 'ชิ้น', prices: priceRow(850) },
            ],
          },
        ],
      },
    ],
    conclusionText: `สรุปให้ ${vendorNames[0]} เป็นผู้ดำเนินการ`,
    signatures: {
      preparer: [{ title: 'Section Manager', name: 'ก' }],
      reviewers: [{ title: 'Vice President #2', name: 'ข' }],
      approvers: { label: 'คณะกรรมการจัดซื้อจัดจ้าง (อนุมัติ)', people: [{ title: 'AVP #1', name: 'ค' }] },
    },
  };
}

(async () => {
  const cases = [
    { file: 'ทดสอบ-3เจ้า.xlsx', data: makeData(['ผู้ขาย A', 'ผู้ขาย B', 'ผู้ขาย C'], true) },
    { file: 'ทดสอบ-ไม่มีBOQ.xlsx', data: makeData(['ผู้ขาย A', 'ผู้ขาย B'], false) },
    { file: 'ทดสอบ-1เจ้า.xlsx', data: makeData(['ผู้ขาย เดียว'], true) },
  ];
  for (const c of cases) {
    const out = path.join(__dirname, '..', c.file);
    await Exporter.writeFile(c.data, out);
    console.log('OK ->', c.file);
  }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
