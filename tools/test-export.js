// ทดสอบสร้างไฟล์เปรียบเทียบราคา — ใช้ข้อมูลชุดเดียวกับ BLESSINI ต้นฉบับ
const path = require('path');
const Exporter = require('../js/compare-excel-export.js');

const wd = (no, title, items) => ({ no: no, title: title, items: items });
// prices เรียงตาม vendors แล้วปิดท้ายด้วย BOQ
const it = (name, qty, unit, a, b, boq) => ({ name, qty, unit, prices: [a, b, boq] });

const typeS = {
  title: 'สำหรับบ้านพักอาศัย TYPE S', qty: 36, unit: 'แปลง',
  sections: [
    wd('1.1', 'WD01 ห้องนอน 1,2,3', [
      it('วงกบ WPC ขนาด 2"x4" ขนาด 80x200 ซม. พร้อมซับวงกบ', 3, 'ชิ้น', 700, 920, 850),
      it('บานประตู HDF ลายเสี้ยนไม้ ขนาด 80x200 ซม. เซาะร่อง', 3, 'ชิ้น', 850, 1850, 2500),
    ]),
    wd('1.2', 'WD02 ห้องน้ำ 1,2,3,4', [
      it('วงกบ WPC ขนาด 2"x5" ขนาด 70x200 ซม. พร้อมซับวงกบ', 4, 'ชิ้น', 700, 910, 1000),
      it('บานประตู UPVC ผิวขาวเคลือบด้าน ขนาด 70x200 ซม.', 4, 'ชิ้น', 1000, 1350, 800),
    ]),
    wd('1.3', 'WD03 ห้องเก็บของใต้บันไดภายนอก', [
      it('วงกบ WPC ขนาด 2"x4" ขนาด 70x95 ซม. พร้อมซับวงกบ', 1, 'ชิ้น', 700, 700, 1000),
      it('บานประตู UPVC ผิวลายไม้ชนิดกันชื้น ขนาด 70x95 ซม.', 1, 'ชิ้น', 1300, 900, 800),
    ]),
  ],
};

const typeTwin = {
  title: 'สำหรับบ้านพักอาศัย TYPE TWIN', qty: 76, unit: 'แปลง',
  sections: [
    wd('2.1', 'WD01 ห้องนอน 1,2', [
      it('วงกบ WPC ขนาด 2"x4" ขนาด 80x200 ซม. พร้อมซับวงกบ', 2, 'ชิ้น', 700, 920, 850),
      it('บานประตู HDF ลายเสี้ยนไม้ ขนาด 80x200 ซม. เซาะร่อง', 2, 'ชิ้น', 850, 1850, 2500),
    ]),
    wd('2.2', 'WD02 ห้องน้ำ 1,2,3', [
      it('วงกบ WPC ขนาด 2"x5" ขนาด 70x200 ซม. พร้อมซับวงกบ', 3, 'ชิ้น', 700, 910, 1000),
      it('บานประตู UPVC ผิวขาวเคลือบด้าน ขนาด 70x200 ซม.', 3, 'ชิ้น', 1000, 1350, 800),
    ]),
  ],
};

const data = {
  sheetName: 'ฉบับแก้ไขวันที่ 18-6-2569',
  projectName: 'BLESSINI',
  workName: 'งาน วงกบประตู',
  thresholdLabel: 'วงเงินเกิน 500,000 ขึ้นไป',
  revisionNote: 'ฉบับแก้ไข ขนาดวงกบและเปลี่ยนหน้าบานเป็น HDF อ้างอิงใบเสนอราคา ฉบับ ลงวันที่ 8/06/2569',
  vatRate: 0.07,
  hasBOQ: true,
  vendors: [
    {
      name: 'บริษัท สยาม พลาสวูด จำกัด',
      terms: {
        priceNote: 'ราคารวมภาษีมูลค่าเพิ่ม 7%',
        validUntil: 'ยืนราคาถึง 31 ธันวาคม 2569',
        paymentTerm: 'เครดิต 30 วัน นับจากวันวางบิล',
        delivery: 'ผลิต 20-30 วัน นับจากได้รับใบสั่งซื้อ',
        warranty: 'รับประกันสินค้า 2 ปี',
        contact: 'นัท 061-9211113',
      },
    },
    {
      name: 'บริษัท ซื้อฮะฮวด อุตสาหกรรม จำกัด',
      terms: {
        priceNote: 'ราคารวมภาษีมูลค่าเพิ่ม 7%',
        validUntil: 'ยืนราคาตลอดทั้งโครงการ',
        paymentTerm: 'เครดิต 30 วัน นับจากวันวางบิล',
        delivery: 'ผลิต 15-20 วัน นับจากได้รับใบสั่งซื้อ',
        warranty: 'รับประกันสินค้า 1 ปี',
        contact: 'ดวงมณี ตั้งสุขศรี 086-3313097',
      },
    },
  ],
  groups: [typeS, typeTwin],
  conclusionText: 'สรุปให้ บริษัท สยาม พลาสวูด จำกัด เป็นผู้ดำเนินการ สำหรับงานวงกบประตู เนื่องจากคุณภาพและราคาเหมาะสม',
  signatures: {
    preparer: [{ title: 'Section Manager', name: 'คุณวิมลรัตน์  สิทธิโคตร' }],
    reviewers: [{ title: 'Vice President #2', name: 'คุณอัศวิน  รองหานาม' }],
    approvers: {
      label: 'คณะกรรมการจัดซื้อจัดจ้าง (อนุมัติ) (วงเงินเกิน 500,000-30,000,000 บาท)',
      people: [
        { title: 'Assistant Vice President #1', name: 'คุณกิตติพจน์  พันธ์ประจิตร' },
        { title: 'Assistant Vice President #1', name: 'คุณทศพร  ยุทธศักดิ์' },
        { title: 'Senior Vice President #2', name: 'คุณศิริรัตน์  โรจนวิภาต' },
        { title: 'Senior Managing Director', name: 'คุณเกรียงศักดิ์  เหี้ยมโท้' },
      ],
    },
    executives: {
      label: 'คณะกรรมการบริหาร (อนุมัติ) (วงเงินเกิน 30,000,000 บาท)',
      people: [
        { title: 'Deputy Chief Executive Officer', name: 'คุณวราภรณ์ จาวโกนันท์' },
        { title: 'Chief Executive Officer', name: '' },
      ],
    },
  },
};

const out = path.join(__dirname, '..', 'ทดสอบ-ตารางเปรียบเทียบราคา.xlsx');
Exporter.writeFile(data, out)
  .then(() => console.log('OK ->', out))
  .catch((e) => { console.error('FAIL', e); process.exit(1); });
