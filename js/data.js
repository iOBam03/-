/* ==========================================================================
   Sample Data — ระบบจัดซื้อวัสดุก่อสร้าง (บริษัทอสังหาริมทรัพย์ แนวราบ)
   บริษัทไม่มีคลังสินค้า — วัสดุส่งตรงไปไซต์งานก่อสร้าง
   ========================================================================== */

window.SAMPLE_DATA = {

  /* ---------- โครงการก่อสร้าง ---------- */
  projects: [
    {
      id: 'PRJ-2569-001',
      name: 'หมู่บ้านกรีนวิลล์ 2',
      location: 'ต.บางรักพัฒนา อ.บางบัวทอง จ.นนทบุรี',
      type: 'บ้านเดี่ยว 2 ชั้น',
      landArea: '52 ตร.ว. / หลัง',
      totalUnits: 120,
      completedUnits: 42,
      inProgressUnits: 38,
      notStartedUnits: 40,
      startDate: '2568-09-01',
      expectedFinish: '2570-06-30',
      contractValue: 850000000,
      spent: 412500000,
      currentPhase: 'โครงสร้าง',
      phaseProgress: 65,
      status: 'in-progress',
      projectManager: 'คุณวิทยา จันทร์เพ็ญ',
      siteForeman: 'คุณสมศักดิ์ ใจกล้า',
      blocks: ['Block A', 'Block B', 'Block C']
    },
    {
      id: 'PRJ-2569-002',
      name: 'หมู่บ้านเดอะพาร์คเรสซิเดนซ์',
      location: 'อ.ลำลูกกา จ.ปทุมธานี',
      type: 'ทาวน์เฮ้าส์ 2 ชั้น',
      landArea: '18 ตร.ว. / หลัง',
      totalUnits: 80,
      completedUnits: 28,
      inProgressUnits: 22,
      notStartedUnits: 30,
      startDate: '2569-02-15',
      expectedFinish: '2570-12-31',
      contractValue: 480000000,
      spent: 198000000,
      currentPhase: 'ผนัง',
      phaseProgress: 42,
      status: 'in-progress',
      projectManager: 'คุณปรีชา มั่นคง',
      siteForeman: 'คุณมานพ เก่งงาน',
      blocks: ['Zone 1', 'Zone 2']
    },
    {
      id: 'PRJ-2568-008',
      name: 'โครงการบ้านริมธาร',
      location: 'อ.ปากเกร็ด จ.นนทบุรี',
      type: 'บ้านเดี่ยว 1 ชั้น',
      landArea: '60 ตร.ว. / หลัง',
      totalUnits: 45,
      completedUnits: 45,
      inProgressUnits: 0,
      notStartedUnits: 0,
      startDate: '2567-08-01',
      expectedFinish: '2569-03-31',
      contractValue: 285000000,
      spent: 278000000,
      currentPhase: 'ส่งมอบ',
      phaseProgress: 100,
      status: 'closing',
      projectManager: 'คุณสมหมาย สมบูรณ์',
      siteForeman: 'คุณสมชาย ขยัน',
      blocks: ['Block A']
    },
    {
      id: 'PRJ-2570-003',
      name: 'หมู่บ้านเดอะวัลเลย์',
      location: 'อ.คลองหลวง จ.ปทุมธานี',
      type: 'บ้านเดี่ยว 2 ชั้น',
      landArea: '55 ตร.ว. / หลัง',
      totalUnits: 60,
      completedUnits: 0,
      inProgressUnits: 8,
      notStartedUnits: 52,
      startDate: '2569-06-01',
      expectedFinish: '2571-04-30',
      contractValue: 420000000,
      spent: 56000000,
      currentPhase: 'ฐานราก',
      phaseProgress: 15,
      status: 'in-progress',
      projectManager: 'คุณอรุณ สว่างวงศ์',
      siteForeman: 'คุณชัยวัฒน์ แข็งแรง',
      blocks: ['Block A', 'Block B']
    },
    {
      id: 'PRJ-2566-OFC',
      name: 'ทิพยประกันภัย สาขาอุบลราชธานี',
      location: 'อ.เมืองอุบลราชธานี จ.อุบลราชธานี',
      type: 'ปรับปรุงอาคารสำนักงาน 2 ชั้น',
      landArea: 'อาคารสำนักงาน',
      totalUnits: 1,
      completedUnits: 0,
      inProgressUnits: 1,
      notStartedUnits: 0,
      startDate: '2566-05-23',
      expectedFinish: '2566-12-31',
      contractValue: 6300000,
      spent: 0,
      currentPhase: 'งานตกแต่งภายใน ชั้น 1',
      phaseProgress: 0,
      status: 'in-progress',
      projectManager: 'รอข้อมูลจาก พี่ตะวัน',
      siteForeman: 'รอข้อมูลจาก พี่ตะวัน',
      blocks: ['ชั้น 1', 'ชั้น 2']
    }
  ],

  /* ---------- งวดงานก่อสร้างมาตรฐาน ---------- */
  phases: [
    { id: 'foundation', name: 'งานฐานราก', duration: '30-45 วัน', keyMaterials: ['ปูนซีเมนต์', 'เหล็กเส้น', 'หินคลุก', 'ทราย'] },
    { id: 'structure', name: 'งานโครงสร้าง', duration: '60-90 วัน', keyMaterials: ['ปูนซีเมนต์', 'เหล็กเส้น', 'เหล็กแผ่น', 'แบบหล่อ'] },
    { id: 'walls', name: 'งานผนัง', duration: '30-45 วัน', keyMaterials: ['อิฐมอญ', 'อิฐบล็อก', 'ปูนซีเมนต์', 'ทราย'] },
    { id: 'roof', name: 'งานหลังคา', duration: '20-30 วัน', keyMaterials: ['กระเบื้องหลังคา', 'เหล็กตัวซี', 'ฉนวนกันความร้อน'] },
    { id: 'mep', name: 'งานระบบ (ไฟ/ประปา)', duration: '30-45 วัน', keyMaterials: ['สายไฟ', 'ท่อ PVC', 'สุขภัณฑ์', 'ประปา'] },
    { id: 'finishing', name: 'งานตกแต่ง', duration: '45-60 วัน', keyMaterials: ['สี', 'กระเบื้องพื้น', 'กระเบื้องผนัง', 'ประตู-หน้าต่าง'] },
    { id: 'handover', name: 'ส่งมอบ', duration: '15-30 วัน', keyMaterials: [] }
  ],

  /* ---------- Dashboard KPIs ---------- */
  kpi: {
    activeProjects: { value: 4, label: 'โครงการที่กำลังดำเนินการ', delta: '3 อยู่ระหว่างก่อสร้าง · 1 ปิดงาน', dir: 'neutral' },
    unitsInProgress: { value: 68, label: 'หลังที่กำลังก่อสร้าง', delta: '42 หลังเสร็จแล้ว · 40 หลังยังไม่เริ่ม', dir: 'up' },
    monthlySpend: { value: 38500000, label: 'มูลค่าการจัดซื้อเดือนนี้', delta: '+12.4% จากเดือนก่อน', dir: 'up' },
    priceAlerts: { value: 5, label: 'การแจ้งเตือนราคา', delta: '2 รายการระดับสูง', dir: 'down' }
  },

  /* ---------- งบประมาณ vs ใช้จ่ายจริงรายเดือน ---------- */
  monthlySpend: {
    labels: ['ม.ค. 2569', 'ก.พ. 2569', 'มี.ค. 2569', 'เม.ย. 2569', 'พ.ค. 2569', 'มิ.ย. 2569'],
    budget: [32000000, 35000000, 38000000, 36000000, 37000000, 42000000],
    actual: [28500000, 31200000, 36400000, 32800000, 35900000, 38500000]
  },

  /* ---------- สัดส่วนการจัดซื้อตามประเภทวัสดุ ---------- */
  materialSpend: {
    labels: ['ปูนซีเมนต์', 'เหล็กและโลหะ', 'วัสดุก่อสร้าง', 'กระเบื้อง/พื้น', 'สีและเคมีภัณฑ์', 'ไฟฟ้า/ประปา', 'ประตู-หน้าต่าง', 'สุขภัณฑ์'],
    values: [8500000, 12200000, 6800000, 4200000, 2800000, 3500000, 2900000, 1800000]
  },

  /* ---------- คำแนะนำจาก AI ---------- */
  aiRecommendations: [
    {
      type: 'success',
      title: 'แนะนำ: รอจังหวะสั่งปูนซีเมนต์ 800 ถุง — ราคากำลังลดลง',
      detail: 'โครงการ กรีนวิลล์ 2 กำลังจะเข้างวดผนัง Block A ใน 10 วัน ต้องใช้ปูน 800 ถุง ราคาตลาดมีแนวโน้มลดลง 6% ภายใน 2 สัปดาห์ — เลื่อนสั่ง 3-4 วันจะประหยัดได้ ~฿10,560 (ยังทันใช้งาน)',
      confidence: 84,
      action: 'เลื่อนสั่ง 3-4 วัน',
      project: 'PRJ-2569-001',
      amount: 132000
    },
    {
      type: 'warning',
      title: 'เฝ้าระวัง: เหล็กเส้น RB 12mm ราคาขึ้นต่อเนื่อง',
      detail: 'ราคาเหล็กเส้นปรับขึ้น 3 สัปดาห์ติด รวม +8.5% ส่งผลกระทบต่องบประมาณงวดโครงสร้างที่เหลือของโครงการ กรีนวิลล์ 2 และ เดอะพาร์ค รวมประมาณ ฿420,000',
      confidence: 76,
      action: 'เร่งสั่งเหล็กค้างสต็อกล่วงหน้า',
      project: 'PRJ-2569-001, PRJ-2569-002',
      amount: 420000
    },
    {
      type: 'danger',
      title: 'คำเตือน: กักตุนปูนซีเมนต์ 4 สัปดาห์ข้างหน้า',
      detail: 'จากสถานการณ์พลังงานโลกและภาวะภัยแล้งในฤดูร้อน ราคาปูนมีความเสี่ยงปรับขึ้น 12-18% แนะนำให้เร่งสั่งปูนสะสมล่วงหน้าสำหรับทุกโครงการที่กำลังจะเข้างวดโครงสร้าง',
      confidence: 71,
      action: 'อนุมัติงบกักตุน 1.2 ล้านบาท',
      project: 'ทุกโครงการ',
      amount: 1200000
    }
  ],

  /* ---------- ประวัติการซื้อจริง (ย้อนหลัง) — ใช้เปรียบเทียบกับการซื้อใหม่ ---------- */
  // แต่ละ record = การซื้อจริง 1 ครั้ง จากโครงการหนึ่ง
  // ระบบจะคำนวณ avg/min/max อัตโนมัติ เพื่อเทียบกับราคาที่เสนอใหม่
  // aliases = ชื่อเรียกอื่นๆ ที่อาจปรากฏใน BOQ โครงการใหม่ (ใช้กับ Fuzzy Matching)
  // unitConversions = ตารางแปลงหน่วย (1 sourceUnit = factor targetUnit) — ใช้เมื่อ BOQ ใช้หน่วยต่างจากประวัติ
  // records[i].freight = ค่าขนส่งรวมของ order นี้ (บาท)
  // records[i].creditDays = เครดิตที่ได้ (วัน)
  purchaseHistory: {
    'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.': {
      material: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.',
      aliases: ['ปูนปอร์ตแลนด์ ตราช้าง 50 กก.', 'ปูนซีเมนต์ 50kg', 'Portland Cement 50kg', 'ปูนถุง 50 กก.', 'ปูนตราช้าง 50กก'],
      category: 'ปูนซีเมนต์',
      unit: 'ถุง',
      records: [
        { project: 'โครงการดิออเนอร์', date: '2567-03-15', supplier: 'บริษัท ซีเมนต์ไทย จำกัด',     pricePerUnit: 165, quantity: 2400, freight: 3500, creditDays: 60 },
        { project: 'โครงการดิออเนอร์', date: '2567-08-22', supplier: 'บริษัท ซีเมนต์ไทย จำกัด',     pricePerUnit: 168, quantity: 1800, freight: 2800, creditDays: 60 },
        { project: 'บ้านริมธาร',       date: '2568-02-10', supplier: 'บริษัท ซีเมนต์ไทย จำกัด',     pricePerUnit: 167, quantity: 1500, freight: 2400, creditDays: 60 },
        { project: 'กรีนวิลล์ 2',       date: '2569-02-08', supplier: 'บริษัท ซีเมนต์ไทย จำกัด',     pricePerUnit: 165, quantity: 1850, freight: 2900, creditDays: 60 },
        { project: 'เดอะพาร์ค',         date: '2569-04-18', supplier: 'บริษัท ซีเมนต์ไทย จำกัด',     pricePerUnit: 170, quantity: 1500, freight: 2400, creditDays: 60 },
      ]
    },
    'เหล็กเส้น RB 12mm x 10m': {
      material: 'เหล็กเส้น RB 12mm x 10m',
      aliases: ['เหล็กข้ออ้อย RB 12mm', 'RB 12 มม. x 10ม.', 'เหล็กเส้นกลม 12mm', 'เหล็ก DB12 10ม.', 'เหล็กข้ออ้อย 12 มิล'],
      category: 'เหล็กและโลหะ',
      unit: 'เส้น',
      // 1 เส้น (~19 กก.) = X หน่วยเป้าหมาย — ใช้แปลงราคาเมื่อ BOQ ใช้หน่วยต่าง
      unitConversions: {
        'ตัน':         52.63,    // 1 ตัน = 52.63 เส้น → ราคา/ตัน = ราคา/เส้น × 52.63
        'กิโลกรัม':    0.0526,   // 1 กก. = 0.0526 เส้น
      },
      records: [
        { project: 'โครงการดิออเนอร์', date: '2567-04-02', supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', pricePerUnit: 258, quantity: 800,  freight: 4800, creditDays: 45 },
        { project: 'บ้านริมธาร',       date: '2568-03-15', supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', pricePerUnit: 245, quantity: 1200, freight: 6200, creditDays: 45 },
        { project: 'กรีนวิลล์ 2',       date: '2569-01-25', supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', pricePerUnit: 250, quantity: 2400, freight: 9800, creditDays: 45 },
        { project: 'เดอะพาร์ค',         date: '2569-05-12', supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', pricePerUnit: 240, quantity: 1800, freight: 8400, creditDays: 45 },
      ]
    },
    'กระเบื้องเซรามิก 60x60 ซม.': {
      material: 'กระเบื้องเซรามิก 60x60 ซม.',
      aliases: ['กระเบื้อง 60x60', 'กระเบื้องพื้น 60x60', 'เซรามิก 60x60 ซม.', 'Ceramic Tile 60x60'],
      category: 'กระเบื้อง/พื้น',
      unit: 'กล่อง',
      records: [
        { project: 'โครงการดิออเนอร์', date: '2567-05-20', supplier: 'บริษัท เซรามิคไทยแลนด์ จำกัด', pricePerUnit: 295, quantity: 600, freight: 2400, creditDays: 30 },
        { project: 'บ้านริมธาร',       date: '2568-06-05', supplier: 'บริษัท เซรามิคไทยแลนด์ จำกัด', pricePerUnit: 290, quantity: 800, freight: 2900, creditDays: 30 },
        { project: 'เดอะพาร์ค',         date: '2569-03-15', supplier: 'บริษัท เซรามิคไทยแลนด์ จำกัด', pricePerUnit: 280, quantity: 500, freight: 2100, creditDays: 30 },
      ]
    },
    'ทรายหยาบ (คิวบิกเมตร)': {
      material: 'ทรายหยาบ (คิวบิกเมตร)',
      aliases: ['ทรายหยาบ', 'ทรายก่อสร้าง', 'ทราย คิว', 'ทราย 1 คิว'],
      category: 'วัสดุก่อสร้าง',
      unit: 'คิว',
      records: [
        { project: 'โครงการดิออเนอร์', date: '2567-04-12', supplier: 'บริษัท วัสดุภัณฑ์ก่อสร้าง จำกัด', pricePerUnit: 820, quantity: 200, freight: 4200, creditDays: 30 },
        { project: 'บ้านริมธาร',       date: '2568-04-22', supplier: 'บริษัท วัสดุภัณฑ์ก่อสร้าง จำกัด', pricePerUnit: 850, quantity: 150, freight: 3500, creditDays: 30 },
        { project: 'กรีนวิลล์ 2',       date: '2569-02-15', supplier: 'บริษัท วัสดุภัณฑ์ก่อสร้าง จำกัด', pricePerUnit: 870, quantity: 180, freight: 3900, creditDays: 30 },
        { project: 'เดอะพาร์ค',         date: '2569-05-08', supplier: 'บริษัท วัสดุภัณฑ์ก่อสร้าง จำกัด', pricePerUnit: 890, quantity: 120, freight: 3100, creditDays: 30 },
      ]
    },
    'เหล็กแผ่น HR 5mm': {
      material: 'เหล็กแผ่น HR 5mm',
      aliases: ['เหล็กแผ่นดำ 5mm', 'HR Plate 5mm', 'เหล็กแผ่นรีดร้อน 5 มิล', 'แผ่นเหล็ก 5mm'],
      category: 'เหล็กและโลหะ',
      unit: 'แผ่น',
      records: [
        { project: 'โครงการดิออเนอร์', date: '2567-06-08', supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', pricePerUnit: 1620, quantity: 80,  freight: 2800, creditDays: 45 },
        { project: 'กรีนวิลล์ 2',       date: '2569-03-20', supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', pricePerUnit: 1680, quantity: 145, freight: 4200, creditDays: 45 },
      ]
    },
    'อิฐมอญ ขนาดมาตรฐาน': {
      material: 'อิฐมอญ ขนาดมาตรฐาน',
      aliases: ['อิฐแดง', 'อิฐก่อผนัง', 'อิฐมอญ', 'Brick มอญ'],
      category: 'วัสดุก่อสร้าง',
      unit: 'ก้อน',
      records: [
        { project: 'โครงการดิออเนอร์', date: '2567-05-15', supplier: 'บริษัท อิฐไทยอุตสาหกรรม จำกัด', pricePerUnit: 9.0, quantity: 30000, freight: 6500, creditDays: 30 },
        { project: 'บ้านริมธาร',       date: '2568-07-20', supplier: 'บริษัท อิฐไทยอุตสาหกรรม จำกัด', pricePerUnit: 9.2, quantity: 25000, freight: 5800, creditDays: 30 },
        { project: 'กรีนวิลล์ 2',       date: '2569-02-25', supplier: 'บริษัท อิฐไทยอุตสาหกรรม จำกัด', pricePerUnit: 9.3, quantity: 28000, freight: 6200, creditDays: 30 },
        { project: 'เดอะพาร์ค',         date: '2569-05-18', supplier: 'บริษัท อิฐไทยอุตสาหกรรม จำกัด', pricePerUnit: 9.5, quantity: 22000, freight: 5400, creditDays: 30 },
      ]
    },
  },

  /* ---------- รายการที่กำลังจะสั่งซื้อ (ต้องตัดสินใจ) ---------- */
  // proposedPrice จะถูกนำไปเทียบกับราคาเฉลี่ยใน purchaseHistory
  purchasePlans: [
    { id: 'PLAN-2569-008', material: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.',  project: 'เดอะวัลเลย์', forPhase: 'งานฐานราก',     supplier: 'บริษัท ซีเมนต์ไทย จำกัด',     proposedPrice: 215, quantity: 800,  proposedDate: '2569-07-25', requestedBy: 'คุณชัยวัฒน์ (หัวหน้าไซต์)',  status: 'pending' },
    { id: 'PLAN-2569-009', material: 'เหล็กเส้น RB 12mm x 10m',     project: 'เดอะวัลเลย์', forPhase: 'งานฐานราก',     supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', proposedPrice: 235, quantity: 1200, proposedDate: '2569-07-26', requestedBy: 'คุณชัยวัฒน์ (หัวหน้าไซต์)',  status: 'pending' },
    { id: 'PLAN-2569-010', material: 'กระเบื้องเซรามิก 60x60 ซม.', project: 'กรีนวิลล์ 2',  forPhase: 'งานตกแต่ง',     supplier: 'บริษัท เซรามิคไทยแลนด์ จำกัด', proposedPrice: 305, quantity: 350,  proposedDate: '2569-07-27', requestedBy: 'คุณวิทยา (PM กรีนวิลล์ 2)', status: 'pending' },
    { id: 'PLAN-2569-011', material: 'ทรายหยาบ (คิวบิกเมตร)',      project: 'เดอะพาร์ค',   forPhase: 'งานผนัง',       supplier: 'บริษัท วัสดุภัณฑ์ก่อสร้าง จำกัด', proposedPrice: 950, quantity: 100,  proposedDate: '2569-07-28', requestedBy: 'คุณปรีชา (PM เดอะพาร์ค)',   status: 'pending' },
    { id: 'PLAN-2569-012', material: 'เหล็กแผ่น HR 5mm',            project: 'กรีนวิลล์ 2',  forPhase: 'งานโครงสร้าง',   supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', proposedPrice: 1820, quantity: 60,  proposedDate: '2569-07-29', requestedBy: 'คุณวิทยา (PM กรีนวิลล์ 2)', status: 'pending' },
    { id: 'PLAN-2569-013', material: 'อิฐมอญ ขนาดมาตรฐาน',         project: 'เดอะพาร์ค',   forPhase: 'งานผนัง',       supplier: 'บริษัท อิฐไทยอุตสาหกรรม จำกัด', proposedPrice: 8.8, quantity: 8000, proposedDate: '2569-07-30', requestedBy: 'คุณปรีชา (PM เดอะพาร์ค)',   status: 'pending' },
    { id: 'PLAN-2569-014', material: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.',  project: 'กรีนวิลล์ 2',  forPhase: 'งานผนัง',       supplier: 'บริษัท ซีเมนต์ไทย จำกัด',     proposedPrice: 160, quantity: 600,  proposedDate: '2569-07-31', requestedBy: 'คุณวิทยา (PM กรีนวิลล์ 2)', status: 'pending' },
    { id: 'PLAN-2569-015', material: 'เหล็กแผ่น HR 5mm',            project: 'เดอะวัลเลย์', forPhase: 'งานฐานราก',     supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', proposedPrice: 1700, quantity: 40,  proposedDate: '2569-08-01', requestedBy: 'คุณชัยวัฒน์ (หัวหน้าไซต์)',  status: 'pending' },
  ],

  /* ---------- ผู้ขายวัสดุ + ผู้รับเหมา ---------- */
  suppliers: [
    // === ผู้ขายวัสดุ ===
    { id: 'SUP-001', name: 'บริษัท ซีเมนต์ไทย จำกัด', type: 'ผู้ขายวัสดุ', category: 'ปูนซีเมนต์', contact: 'คุณสมชาย ใจดี', phone: '02-123-4567', onTime: 95, quality: 92, leadTime: 7, totalOrders: 142, totalSpend: 4250000, status: 'active', tier: 'tier-1', rating: 94 },
    { id: 'SUP-002', name: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', type: 'ผู้ขายวัสดุ', category: 'เหล็กและโลหะ', contact: 'คุณวิไล พรหมมา', phone: '02-234-5678', onTime: 88, quality: 90, leadTime: 14, totalOrders: 98, totalSpend: 3680000, status: 'active', tier: 'tier-1', rating: 89 },
    { id: 'SUP-003', name: 'บริษัท วัสดุภัณฑ์ก่อสร้าง จำกัด', type: 'ผู้ขายวัสดุ', category: 'วัสดุก่อสร้าง', contact: 'คุณธีรภัทร ขยันยิ่ง', phone: '02-345-6789', onTime: 78, quality: 85, leadTime: 21, totalOrders: 76, totalSpend: 2120000, status: 'active', tier: 'tier-2', rating: 81 },
    { id: 'SUP-004', name: 'บริษัท สีโปรเฟสชั่นนัล จำกัด', type: 'ผู้ขายวัสดุ', category: 'สีและเคมีภัณฑ์', contact: 'คุณนภาพร สีสดใส', phone: '02-456-7890', onTime: 99, quality: 96, leadTime: 5, totalOrders: 54, totalSpend: 1480000, status: 'active', tier: 'tier-1', rating: 97 },
    { id: 'SUP-005', name: 'บริษัท เซรามิคไทยแลนด์ จำกัด', type: 'ผู้ขายวัสดุ', category: 'กระเบื้อง/พื้น', contact: 'คุณประเสริฐ มั่นคง', phone: '02-567-8901', onTime: 82, quality: 88, leadTime: 12, totalOrders: 63, totalSpend: 1850000, status: 'active', tier: 'tier-2', rating: 85 },
    { id: 'SUP-006', name: 'บริษัท สายไฟฟ้าไทย จำกัด', type: 'ผู้ขายวัสดุ', category: 'ไฟฟ้า/ประปา', contact: 'คุณจักรพงษ์ กระแสไฟ', phone: '02-678-9012', onTime: 91, quality: 93, leadTime: 8, totalOrders: 87, totalSpend: 2240000, status: 'active', tier: 'tier-1', rating: 92 },
    { id: 'SUP-007', name: 'ห้างหุ้นส่วน ไทยพลาสติก', type: 'ผู้ขายวัสดุ', category: 'ไฟฟ้า/ประปา', contact: 'คุณมานี พลาสติกแน่น', phone: '02-789-0123', onTime: 74, quality: 80, leadTime: 18, totalOrders: 42, totalSpend: 980000, status: 'review', tier: 'tier-3', rating: 77 },
    { id: 'SUP-008', name: 'บริษัท อิฐไทยอุตสาหกรรม จำกัด', type: 'ผู้ขายวัสดุ', category: 'วัสดุก่อสร้าง', contact: 'คุณสุทธิพงษ์ ช่างดี', phone: '02-890-1234', onTime: 96, quality: 94, leadTime: 6, totalOrders: 109, totalSpend: 1620000, status: 'active', tier: 'tier-1', rating: 95 },

    // === ผู้รับเหมา ===
    { id: 'CON-001', name: 'บริษัท ก่อสร้างไทยรวมพล จำกัด', type: 'ผู้รับเหมา', category: 'งานโครงสร้าง', contact: 'คุณวรพล เก่งกล้า', phone: '02-901-2345', onTime: 87, quality: 89, leadTime: 30, totalOrders: 31, totalSpend: 5640000, status: 'active', tier: 'tier-1', rating: 88, workingOn: 'PRJ-2569-001' },
    { id: 'CON-002', name: 'ห้างหุ้นส่วน สยามก่อสร้าง', type: 'ผู้รับเหมา', category: 'งานโครงสร้าง', contact: 'คุณพิมพ์ใจ สยาม', phone: '02-012-3456', onTime: 92, quality: 86, leadTime: 25, totalOrders: 24, totalSpend: 3920000, status: 'active', tier: 'tier-2', rating: 89, workingOn: 'PRJ-2569-002' },
    { id: 'CON-003', name: 'บริษัท ช่างไฟรวมใจ จำกัด', type: 'ผู้รับเหมา', category: 'งานระบบไฟฟ้า', contact: 'คุณไพศาล แสงสว่าง', phone: '02-345-6789', onTime: 94, quality: 91, leadTime: 20, totalOrders: 38, totalSpend: 1840000, status: 'active', tier: 'tier-1', rating: 92, workingOn: 'PRJ-2569-001' },
    { id: 'CON-004', name: 'ห้างหุ้นส่วน ประปาช่างมืออาชีพ', type: 'ผู้รับเหมา', category: 'งานระบบประปา', contact: 'คุณสมชาย น้ำใส', phone: '02-456-7890', onTime: 88, quality: 90, leadTime: 22, totalOrders: 29, totalSpend: 1450000, status: 'active', tier: 'tier-2', rating: 89, workingOn: 'PRJ-2569-002' },
    { id: 'CON-005', name: 'บริษัท สีตกแต่งบ้าน จำกัด', type: 'ผู้รับเหมา', category: 'งานสีและตกแต่ง', contact: 'คุณมาลี สีสัน', phone: '02-567-8901', onTime: 91, quality: 88, leadTime: 28, totalOrders: 22, totalSpend: 1280000, status: 'active', tier: 'tier-2', rating: 90, workingOn: 'PRJ-2568-008' },
  ],

  /* ---------- Supplier Enrichment (ตามหลัก procurement-optimizer) ---------- */
  // เพิ่มข้อมูลเชิงลึก: single-source risk, break-glass plan, วันต่อสัญญา
  // tier-1 = วัสดุ critical ถ้าผู้ขายหายจะหยุดงานทันที (ต้องมี break-glass plan)
  // tier-2 = สำคัญรอง หาผู้ขายทดแทนได้ภายใน 30 วัน
  // tier-3 = ทั่วไป หาง่าย
  supplierMeta: {
    'SUP-001': { singleSource: true,  breakGlassPlan: false, contractEnd: '2569-09-30', paymentTerms: 'เครดิต 60 วัน' },
    'SUP-002': { singleSource: false, breakGlassPlan: true,  contractEnd: '2569-09-15', paymentTerms: 'เครดิต 45 วัน' },
    'SUP-003': { singleSource: false, breakGlassPlan: true,  contractEnd: '2569-10-31', paymentTerms: 'เครดิต 30 วัน' },
    'SUP-004': { singleSource: true,  breakGlassPlan: true,  contractEnd: '2569-09-22', paymentTerms: 'เครดิต 30 วัน' },
    'SUP-005': { singleSource: false, breakGlassPlan: true,  contractEnd: '2570-02-28', paymentTerms: 'เครดิต 30 วัน' },
    'SUP-006': { singleSource: false, breakGlassPlan: true,  contractEnd: '2569-09-18', paymentTerms: 'เครดิต 45 วัน' },
    'SUP-007': { singleSource: false, breakGlassPlan: true,  contractEnd: '2569-12-15', paymentTerms: 'เงินสด' },
    'SUP-008': { singleSource: true,  breakGlassPlan: false, contractEnd: '2569-09-08', paymentTerms: 'เครดิต 30 วัน' },
    'CON-001': { singleSource: false, breakGlassPlan: true,  contractEnd: '2570-01-31', paymentTerms: 'งวดงาน' },
    'CON-002': { singleSource: false, breakGlassPlan: true,  contractEnd: '2570-03-31', paymentTerms: 'งวดงาน' },
    'CON-003': { singleSource: true,  breakGlassPlan: false, contractEnd: '2569-09-12', paymentTerms: 'งวดงาน' },
    'CON-004': { singleSource: false, breakGlassPlan: true,  contractEnd: '2570-04-30', paymentTerms: 'งวดงาน' },
    'CON-005': { singleSource: false, breakGlassPlan: true,  contractEnd: '2570-06-30', paymentTerms: 'งวดงาน' },
  },

  /* ---------- Pareto: top 20% ของหมวดวัสดุ ที่ใช้เงิน 80% ของงบ ---------- */
  pareto: {
    totalAnnualSpend: 42700000,
    // เรียงตามมูลค่าใช้จ่าย
    ranked: [
      { category: 'เหล็กและโลหะ', spend: 12200000, supplierCount: 1, sharePct: 28.6, cumulativePct: 28.6 },
      { category: 'ปูนซีเมนต์',     spend:  8500000, supplierCount: 1, sharePct: 19.9, cumulativePct: 48.5 },
      { category: 'วัสดุก่อสร้าง',   spend:  6800000, supplierCount: 2, sharePct: 15.9, cumulativePct: 64.4 },
      { category: 'กระเบื้อง/พื้น',  spend:  4200000, supplierCount: 1, sharePct:  9.8, cumulativePct: 74.2 },
      { category: 'ไฟฟ้า/ประปา',     spend:  3500000, supplierCount: 2, sharePct:  8.2, cumulativePct: 82.4 },
      { category: 'ประตู-หน้าต่าง',   spend:  2900000, supplierCount: 1, sharePct:  6.8, cumulativePct: 89.2 },
      { category: 'สีและเคมีภัณฑ์',  spend:  2800000, supplierCount: 1, sharePct:  6.6, cumulativePct: 95.8 },
      { category: 'สุขภัณฑ์',        spend:  1800000, supplierCount: 1, sharePct:  4.2, cumulativePct: 100.0 }
    ],
    insight: 'Top 3 หมวด (เหล็ก ปูน วัสดุก่อสร้าง) กิน 64.4% ของงบจัดซื้อวัสดุทั้งหมด'
  },

  /* ---------- YoY Growth ตามหมวดวัสดุ ---------- */
  yoyGrowth: {
    labels: ['เหล็กและโลหะ', 'ปูนซีเมนต์', 'วัสดุก่อสร้าง', 'กระเบื้อง/พื้น', 'ไฟฟ้า/ประปา', 'สีและเคมีภัณฑ์', 'ประตู-หน้าต่าง', 'สุขภัณฑ์'],
    thisYear: [12200000, 8500000, 6800000, 4200000, 3500000, 2800000, 2900000, 1800000],
    lastYear: [ 9480000, 8120000, 5950000, 3950000, 3220000, 2650000, 2780000, 1620000],
    growth: [28.7, 4.7, 14.3, 6.3, 8.7, 5.7, 4.3, 11.1]
  },

  /* ---------- Purchasing Cycle ต่อหมวด (Goldratt bottleneck) ---------- */
  // T-request → T-PO → T-receive → T-pay (median วัน)
  // หมวดที่ใช้เวลาเกิน 2 เท่าของ median = bottleneck
  purchasingCycle: {
    medianOverall: 18,
    categories: [
      { category: 'เหล็กและโลหะ',  requestToPO:  3, poToReceive: 16, receiveToPay: 45, totalDays: 64, bottleneck: true,  note: 'Lead Time ยาว + เครดิต 45 วัน' },
      { category: 'ปูนซีเมนต์',      requestToPO:  2, poToReceive:  8, receiveToPay: 60, totalDays: 70, bottleneck: true,  note: 'เครดิต 60 วัน + รอของจากโรงงาน' },
      { category: 'วัสดุก่อสร้าง',   requestToPO:  4, poToReceive: 21, receiveToPay: 30, totalDays: 55, bottleneck: true,  note: 'Lead Time ยาว หลายผู้ขายกระจาย' },
      { category: 'กระเบื้อง/พื้น',  requestToPO:  2, poToReceive: 13, receiveToPay: 30, totalDays: 45, bottleneck: false, note: 'ปกติ' },
      { category: 'ไฟฟ้า/ประปา',     requestToPO:  3, poToReceive:  9, receiveToPay: 45, totalDays: 57, bottleneck: true,  note: 'รอตรวจมาตรฐาน มอก.' },
      { category: 'สีและเคมีภัณฑ์',  requestToPO:  1, poToReceive:  5, receiveToPay: 30, totalDays: 36, bottleneck: false, note: 'เร็ว Lead Time สั้น' },
      { category: 'ประตู-หน้าต่าง',   requestToPO:  5, poToReceive: 14, receiveToPay: 30, totalDays: 49, bottleneck: false, note: 'รอ custom ขนาด' },
      { category: 'สุขภัณฑ์',        requestToPO:  3, poToReceive: 12, receiveToPay: 30, totalDays: 45, bottleneck: false, note: 'ปกติ' }
    ]
  },

  /* ---------- Renewal Date Clustering Analysis ---------- */
  // สัญญาที่หมดอายุในเดือนเดียวกัน ≥ 3 ฉบับ = สูญเสียอำนาจต่อรอง
  renewals: [
    { month: 'ก.ย. 2569', contracts: [
      { supplier: 'บริษัท อิฐไทยอุตสาหกรรม จำกัด', category: 'วัสดุก่อสร้าง', tier: 'tier-1', singleSource: true,  endDate: '2569-09-08' },
      { supplier: 'บริษัท ช่างไฟรวมใจ จำกัด',         category: 'งานระบบไฟฟ้า', tier: 'tier-1', singleSource: true,  endDate: '2569-09-12' },
      { supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า',   category: 'เหล็กและโลหะ',  tier: 'tier-1', singleSource: false, endDate: '2569-09-15' },
      { supplier: 'บริษัท สายไฟฟ้าไทย จำกัด',         category: 'ไฟฟ้า/ประปา',   tier: 'tier-1', singleSource: false, endDate: '2569-09-18' },
      { supplier: 'บริษัท สีโปรเฟสชั่นนัล จำกัด',    category: 'สีและเคมีภัณฑ์', tier: 'tier-1', singleSource: true,  endDate: '2569-09-22' },
      { supplier: 'บริษัท ซีเมนต์ไทย จำกัด',           category: 'ปูนซีเมนต์',     tier: 'tier-1', singleSource: true,  endDate: '2569-09-30' }
    ]},
    { month: 'ต.ค. 2569', contracts: [
      { supplier: 'บริษัท วัสดุภัณฑ์ก่อสร้าง จำกัด',  category: 'วัสดุก่อสร้าง',  tier: 'tier-2', singleSource: false, endDate: '2569-10-31' }
    ]},
    { month: 'ธ.ค. 2569', contracts: [
      { supplier: 'ห้างหุ้นส่วน ไทยพลาสติก',            category: 'ไฟฟ้า/ประปา',   tier: 'tier-3', singleSource: false, endDate: '2569-12-15' }
    ]}
  ],

  /* ---------- Spend Optimization Summary (สรุปเพื่อแสดงใน Dashboard) ---------- */
  spendOptimization: {
    tier1SingleSourceCount: 4,        // จำนวน tier-1 ที่มีผู้ขายเดียว
    tier1NoBreakGlassCount: 3,        // tier-1 single-source ที่ยังไม่มี break-glass plan
    renewalClusterAlerts: 1,           // เดือนที่มี tier-1 ≥ 3 ฉบับ
    bottleneckCategoryCount: 4,        // หมวดที่ใช้เวลาเกิน 2x median
    smallSpendManySuppliers: {         // หมวดที่ใช้เงินน้อยแต่ผู้ขายเยอะ (anti-pattern)
      count: 1,
      note: 'เครื่องมือช่าง — 12 ผู้ขาย แต่ใช้งบรวม 2.8 แสนบาท (เฉลี่ย 23,000/ราย)'
    }
  },

  /* ---------- วัสดุ ณ ไซต์งาน (แทน inventory) ---------- */
  siteMaterials: [
    { sku: 'CMT-POR-50', name: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.', project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', location: 'Block A / โซน 3', phase: 'โครงสร้าง', received: 1850, used: 1820, remaining: 30, expectedUse: 800, reorderLevel: 200, unit: 'ถุง', lastDelivery: '2569-07-15', status: 'critical' },
    { sku: 'STL-RB12', name: 'เหล็กเส้น RB 12mm x 10m', project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', location: 'Block B', phase: 'โครงสร้าง', received: 2400, used: 2150, remaining: 250, expectedUse: 1200, reorderLevel: 300, unit: 'เส้น', lastDelivery: '2569-07-12', status: 'low' },
    { sku: 'CMT-POR-50', name: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.', project: 'PRJ-2569-002', projectName: 'เดอะพาร์ค', location: 'Zone 1', phase: 'ผนัง', received: 320, used: 280, remaining: 40, expectedUse: 600, reorderLevel: 150, unit: 'ถุง', lastDelivery: '2569-07-16', status: 'critical' },
    { sku: 'STL-HR5', name: 'เหล็กแผ่น HR 5mm', project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', location: 'Block A', phase: 'โครงสร้าง', received: 145, used: 98, remaining: 47, expectedUse: 80, reorderLevel: 30, unit: 'แผ่น', lastDelivery: '2569-07-15', status: 'normal' },
    { sku: 'AGG-STN', name: 'หินคลุก', project: 'PRJ-2570-003', projectName: 'เดอะวัลเลย์', location: 'Block A', phase: 'ฐานราก', received: 320, used: 280, remaining: 40, expectedUse: 150, reorderLevel: 80, unit: 'คิว', lastDelivery: '2569-07-08', status: 'critical' },
    { sku: 'AGG-SND', name: 'ทรายหยาบ', project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', location: 'Block B', phase: 'โครงสร้าง', received: 180, used: 145, remaining: 35, expectedUse: 100, reorderLevel: 40, unit: 'คิว', lastDelivery: '2569-07-12', status: 'low' },
    { sku: 'TIL-CER', name: 'กระเบื้องเซรามิก 60x60', project: 'PRJ-2569-002', projectName: 'เดอะพาร์ค', location: 'Zone 1', phase: 'ตกแต่ง', received: 285, used: 120, remaining: 165, expectedUse: 180, reorderLevel: 80, unit: 'กล่อง', lastDelivery: '2569-07-14', status: 'normal' },
    { sku: 'BRK-MOONG', name: 'อิฐมอญ', project: 'PRJ-2569-002', projectName: 'เดอะพาร์ค', location: 'Zone 2', phase: 'ผนัง', received: 8500, used: 7200, remaining: 1300, expectedUse: 3000, reorderLevel: 800, unit: 'ก้อน', lastDelivery: '2569-07-10', status: 'normal' },
    { sku: 'PNT-ACR', name: 'สีน้ำอะครีลิก 5 แกลลอน', project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', location: 'Block C', phase: 'ตกแต่ง', received: 42, used: 18, remaining: 24, expectedUse: 25, reorderLevel: 12, unit: 'ถัง', lastDelivery: '2569-07-16', status: 'normal' },
    { sku: 'WIR-THW', name: 'สายไฟ THW 2.5 sq.mm', project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', location: 'Block A', phase: 'ระบบ (ไฟ/ประปา)', received: 67, used: 45, remaining: 22, expectedUse: 30, reorderLevel: 25, unit: 'ม้วน', lastDelivery: '2569-07-13', status: 'low' },
    { sku: 'PVC-4IN', name: 'ท่อ PVC 4 นิ้ว', project: 'PRJ-2569-002', projectName: 'เดอะพาร์ค', location: 'Zone 1', phase: 'ระบบ (ไฟ/ประปา)', received: 120, used: 95, remaining: 25, expectedUse: 80, reorderLevel: 30, unit: 'ท่อน', lastDelivery: '2569-07-02', status: 'low' },
    { sku: 'TIL-ROOF', name: 'กระเบื้องหลังคาคอนกรีต', project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', location: 'Block C', phase: 'หลังคา', received: 2400, used: 1800, remaining: 600, expectedUse: 800, reorderLevel: 400, unit: 'แผ่น', lastDelivery: '2569-07-14', status: 'normal' }
  ],

  /* ---------- Lead Time & Reorder Alerts ----------
     ระบบเตือนล่วงหน้าให้สั่งของก่อนวัสดุจะหมด เพื่อไม่ให้งานดีเลย์
     Logic: orderByDate = needByDate - supplierLeadTime - safetyBuffer
     Today = 2569-07-22 (อ้างอิงจากปฏิทินข้อมูลตัวอย่าง)
     daysFromNow = orderByDate - today (ถ้า < 0 = เลยกำหนดสั่ง)
     urgency: overdue(เลยกำหนด) | urgent(≤3วัน) | prepare(4-7วัน) | safe(>7วัน)
  */
  reorderAlerts: [
    // === 🔴 OVERDUE — เลยกำหนดสั่งแล้ว ===
    { id: 'RA-001', project: 'กรีนวิลล์ 2',     phase: 'โครงสร้าง', material: 'เหล็กเส้น RB 12mm x 10m',  unit: 'เส้น',  qty: 1500, supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', leadTime: 14, safety: 3, needBy: '2569-07-28', orderBy: '2569-07-11', daysFromNow: -11, urgency: 'overdue', poStatus: 'ยังไม่สั่ง',   onSite: 250,  poRef: null },
    { id: 'RA-002', project: 'เดอะพาร์ค',      phase: 'ผนัง',     material: 'ท่อ PVC 4 นิ้ว',               unit: 'ท่อน',  qty: 80,   supplier: 'ห้างหุ้นส่วน ไทยพลาสติก',       leadTime: 21, safety: 3, needBy: '2569-07-30', orderBy: '2569-07-06', daysFromNow: -16, urgency: 'overdue', poStatus: 'ล่าช้า',        onSite: 25,   poRef: 'PO-2569-0412' },
    { id: 'RA-003', project: 'เดอะวัลเลย์',    phase: 'ฐานราก',   material: 'หินคลุก',                       unit: 'คิว',   qty: 150,  supplier: 'บริษัท วัสดุภัณฑ์ก่อสร้าง จำกัด', leadTime: 7,  safety: 3, needBy: '2569-07-27', orderBy: '2569-07-17', daysFromNow: -5,  urgency: 'overdue', poStatus: 'ยังไม่สั่ง',   onSite: 40,   poRef: null },
    { id: 'RA-004', project: 'กรีนวิลล์ 2',     phase: 'ตกแต่ง',    material: 'กระเบื้องเซรามิก 60x60 ซม.',     unit: 'กล่อง', qty: 350,  supplier: 'บริษัท เซรามิคไทยแลนด์ จำกัด',     leadTime: 12, safety: 3, needBy: '2569-08-05', orderBy: '2569-07-21', daysFromNow: -1,  urgency: 'overdue', poStatus: 'ยังไม่สั่ง',   onSite: 165,  poRef: null },

    // === 🔥 URGENT — ต้องสั่งภายใน 3 วัน ===
    { id: 'RA-005', project: 'เดอะพาร์ค',      phase: 'ผนัง',     material: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.',   unit: 'ถุง',  qty: 600,  supplier: 'บริษัท ซีเมนต์ไทย จำกัด',         leadTime: 7,  safety: 3, needBy: '2569-08-02', orderBy: '2569-07-23', daysFromNow: 1,  urgency: 'urgent',  poStatus: 'ยังไม่สั่ง',   onSite: 40,   poRef: null },
    { id: 'RA-006', project: 'เดอะวัลเลย์',    phase: 'ฐานราก',   material: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.',   unit: 'ถุง',  qty: 800,  supplier: 'บริษัท ซีเมนต์ไทย จำกัด',         leadTime: 7,  safety: 3, needBy: '2569-08-01', orderBy: '2569-07-22', daysFromNow: 0,  urgency: 'urgent',  poStatus: 'ยังไม่สั่ง',   onSite: 0,    poRef: null },
    { id: 'RA-009', project: 'กรีนวิลล์ 2',     phase: 'โครงสร้าง', material: 'ทรายหยาบ',                      unit: 'คิว',   qty: 100,  supplier: 'บริษัท วัสดุภัณฑ์ก่อสร้าง จำกัด', leadTime: 21, safety: 3, needBy: '2569-08-15', orderBy: '2569-07-22', daysFromNow: 0,  urgency: 'urgent',  poStatus: 'สั่งแล้ว',     onSite: 35,   poRef: 'PO-2569-0419' },

    // === 🟡 PREPARE — เริ่มเตรียมการ (4-7 วัน) ===
    { id: 'RA-007', project: 'เดอะพาร์ค',      phase: 'ผนัง',     material: 'อิฐมอญ ขนาดมาตรฐาน',           unit: 'ก้อน', qty: 8000, supplier: 'บริษัท อิฐไทยอุตสาหกรรม จำกัด', leadTime: 6,  safety: 3, needBy: '2569-08-08', orderBy: '2569-07-30', daysFromNow: 8,  urgency: 'prepare', poStatus: 'ยังไม่สั่ง',   onSite: 1300, poRef: null },
    { id: 'RA-008', project: 'กรีนวิลล์ 2',     phase: 'โครงสร้าง', material: 'เหล็กแผ่น HR 5mm',               unit: 'แผ่น', qty: 60,   supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า',   leadTime: 14, safety: 3, needBy: '2569-08-12', orderBy: '2569-07-26', daysFromNow: 4,  urgency: 'prepare', poStatus: 'ยังไม่สั่ง',   onSite: 47,   poRef: null },
    { id: 'RA-010', project: 'กรีนวิลล์ 2',     phase: 'ระบบ',      material: 'สายไฟ THW 2.5 sq.mm',            unit: 'ม้วน', qty: 30,   supplier: 'บริษัท สายไฟฟ้าไทย จำกัด',         leadTime: 8,  safety: 3, needBy: '2569-08-10', orderBy: '2569-07-30', daysFromNow: 8,  urgency: 'prepare', poStatus: 'กำลังจัดส่ง', onSite: 22,   poRef: 'PO-2569-0417' },

    // === 🟢 SAFE — ยังมีเวลา (>7 วัน) ===
    { id: 'RA-011', project: 'กรีนวิลล์ 2',     phase: 'ตกแต่ง',    material: 'สีน้ำอะครีลิก 5 แกลลอน',         unit: 'ถัง',  qty: 25,   supplier: 'บริษัท สีโปรเฟสชั่นนัล จำกัด',     leadTime: 5,  safety: 3, needBy: '2569-08-20', orderBy: '2569-08-12', daysFromNow: 21, urgency: 'safe',    poStatus: 'ยังไม่สั่ง',   onSite: 24,   poRef: null },
    { id: 'RA-012', project: 'กรีนวิลล์ 2',     phase: 'หลังคา',    material: 'กระเบื้องหลังคาคอนกรีต',       unit: 'แผ่น', qty: 800,  supplier: 'บริษัท อิฐไทยอุตสาหกรรม จำกัด', leadTime: 7,  safety: 3, needBy: '2569-08-25', orderBy: '2569-08-15', daysFromNow: 24, urgency: 'safe',    poStatus: 'ยังไม่สั่ง',   onSite: 600,  poRef: null },
  ],

  /* ---------- BOQ (Bill of Quantities) ---------- */
  // ใช้เป็นจุดตั้งต้นของหน้าเปรียบเทียบราคา: ดูว่าโครงการต้องใช้อะไร → เทียบกับประวัติการซื้อจริง
  // estimatedPrice = ราคาที่บริษัทประมาณการไว้ใน BOQ (ก่อนทำการซื้อจริง)
  // sku = รหัสสินค้าคงที่ (ใช้แทนชื่อ material เพื่อให้จับคู่ระหว่าง BOQ ต่างโครงการได้แม้ชื่อเรียกต่างกัน)
  boq: [
    // === หมู่บ้านเดอะวัลเลย์ (ฐานราก) — BOQ ตัวอย่างที่ใช้สาธิต ===
    { sku: 'CMT-POR-50', project: 'PRJ-2570-003', projectName: 'เดอะวัลเลย์', phase: 'ฐานราก', material: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.', qtyPerUnit: 80,  totalRequired: 4800, ordered: 800,  delivered: 0,    unit: 'ถุง',  estimatedPrice: 180 },
    { sku: 'STL-RB12',   project: 'PRJ-2570-003', projectName: 'เดอะวัลเลย์', phase: 'ฐานราก', material: 'เหล็กเส้น RB 12mm x 10m',     qtyPerUnit: 24,  totalRequired: 1440, ordered: 1200, delivered: 0,    unit: 'เส้น', estimatedPrice: 260 },
    { sku: 'AGG-SND',    project: 'PRJ-2570-003', projectName: 'เดอะวัลเลย์', phase: 'ฐานราก', material: 'ทรายหยาบ (คิวบิกเมตร)',       qtyPerUnit: 8,   totalRequired: 480,  ordered: 100,  delivered: 0,    unit: 'คิว',  estimatedPrice: 900 },
    { sku: 'AGG-STN',    project: 'PRJ-2570-003', projectName: 'เดอะวัลเลย์', phase: 'ฐานราก', material: 'หินคลุก',                        qtyPerUnit: 8,   totalRequired: 480,  ordered: 480,  delivered: 320,  unit: 'คิว',  estimatedPrice: 0 },  // ไม่มีประวัติ
    { sku: 'STL-HR5',    project: 'PRJ-2570-003', projectName: 'เดอะวัลเลย์', phase: 'ฐานราก', material: 'เหล็กแผ่น HR 5mm',              qtyPerUnit: 2,   totalRequired: 120,  ordered: 40,   delivered: 0,    unit: 'แผ่น', estimatedPrice: 1750 },
    // === Fuzzy Name + Unit Mismatch demo ===
    // ชื่อใน BOQ ใหม่คนละชื่อกับประวัติ แต่ SKU เดียวกัน (STL-RB12) เพราะเป็นสินค้าตัวเดียวกัน
    // หน่วยใน BOQ เป็น "ตัน" ต่างจากประวัติที่ใช้ "เส้น" → ระบบต้องแปลงหน่วยอัตโนมัติ
    { sku: 'STL-RB12',   project: 'PRJ-2570-003', projectName: 'เดอะวัลเลย์', phase: 'ฐานราก', material: 'เหล็กข้ออ้อย DB 12mm (10m)',   qtyPerUnit: 0.024, totalRequired: 1.44, ordered: 0, delivered: 0, unit: 'ตัน', estimatedPrice: 13500 },

    // === หมู่บ้านกรีนวิลล์ 2 ===
    { sku: 'CMT-POR-50', project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', phase: 'โครงสร้าง', material: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.',     qtyPerUnit: 50,  totalRequired: 6000,  ordered: 5800, delivered: 5600, unit: 'ถุง',  estimatedPrice: 165 },
    { sku: 'STL-RB12',   project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', phase: 'โครงสร้าง', material: 'เหล็กเส้น RB 12mm x 10m',         qtyPerUnit: 24,  totalRequired: 2880,  ordered: 2880, delivered: 2400, unit: 'เส้น', estimatedPrice: 250 },
    { sku: 'STL-HR5',    project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', phase: 'โครงสร้าง', material: 'เหล็กแผ่น HR 5mm',                qtyPerUnit: 4,   totalRequired: 480,   ordered: 145,  delivered: 98,   unit: 'แผ่น', estimatedPrice: 1700 },
    { sku: 'BRK-MOONG',  project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', phase: 'ผนัง',       material: 'อิฐมอญ ขนาดมาตรฐาน',             qtyPerUnit: 2200, totalRequired: 264000, ordered: 260000, delivered: 250000, unit: 'ก้อน', estimatedPrice: 9.5 },
    { sku: 'CMT-POR-50', project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', phase: 'ผนัง',       material: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.',     qtyPerUnit: 12,  totalRequired: 1440,  ordered: 600,  delivered: 0,    unit: 'ถุง',  estimatedPrice: 165 },
    { sku: 'TIL-CER',    project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', phase: 'ตกแต่ง',     material: 'กระเบื้องเซรามิก 60x60 ซม.',      qtyPerUnit: 35,  totalRequired: 4200,  ordered: 350,  delivered: 0,    unit: 'กล่อง', estimatedPrice: 300 },
    { sku: 'TIL-ROOF',   project: 'PRJ-2569-001', projectName: 'กรีนวิลล์ 2', phase: 'หลังคา',     material: 'กระเบื้องหลังคาคอนกรีต',          qtyPerUnit: 20,  totalRequired: 2400,  ordered: 2400, delivered: 2400, unit: 'แผ่น', estimatedPrice: 0 },

    // === เดอะพาร์คเรสซิเดนซ์ ===
    { sku: 'BRK-MOONG',  project: 'PRJ-2569-002', projectName: 'เดอะพาร์ค', phase: 'ผนัง',       material: 'อิฐมอญ ขนาดมาตรฐาน',             qtyPerUnit: 1800, totalRequired: 144000, ordered: 140000, delivered: 132000, unit: 'ก้อน', estimatedPrice: 9.5 },
    { sku: 'CMT-POR-50', project: 'PRJ-2569-002', projectName: 'เดอะพาร์ค', phase: 'ผนัง',       material: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.',     qtyPerUnit: 40,  totalRequired: 3200,  ordered: 3000, delivered: 2500, unit: 'ถุง',  estimatedPrice: 170 },
    { sku: 'AGG-SND',    project: 'PRJ-2569-002', projectName: 'เดอะพาร์ค', phase: 'ผนัง',       material: 'ทรายหยาบ (คิวบิกเมตร)',          qtyPerUnit: 4,   totalRequired: 320,   ordered: 100,  delivered: 0,    unit: 'คิว',  estimatedPrice: 900 },
    { sku: 'STL-HR5',    project: 'PRJ-2569-002', projectName: 'เดอะพาร์ค', phase: 'โครงสร้าง',  material: 'เหล็กแผ่น HR 5mm',                qtyPerUnit: 5,   totalRequired: 400,   ordered: 0,    delivered: 0,    unit: 'แผ่น', estimatedPrice: 1700 },

    // === งานตกแต่ง/ระบบ อาคารสำนักงาน (BOQ จริงจากไฟล์ต้นฉบับ) ===
    // โครงการ: ทิพยประกันภัย สาขาอุบลราชธานี (ปรับปรุงอาคารสำนักงาน, พ.ค. 2566)
    // ราคา estimatedPrice = ราคาวัสดุจาก BOQ (ยังไม่รวมค่าติดตั้ง)
    // items ในหมวดนี้ส่วนใหญ่จะแสดง "ไม่มีประวัติ" ในหน้าเปรียบเทียบ เพราะ purchaseHistory เก็บเฉพาะวัสดุโครงสร้าง

    // -- งานตกแต่งภายใน ชั้น 1 (43 รายการ) --
    { sku: 'TIL-GRD-E7D7E2', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "TL01 พื้นกระเบื้องแกรนิตโต้ 600x600 มม.", qtyPerUnit: 263, totalRequired: 263, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 850 },
    { sku: 'TIL-GRD-017FDC', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "TL04 พื้นกระเบื้องห้องน้ำ 600x600 มม.", qtyPerUnit: 9, totalRequired: 9, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 450 },
    { sku: 'TIL-GRD-389315', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "TL06 พื้นกระเบื้องภายนอก (ทางเข้า) แกรนิตโต้ 300x600 มม.", qtyPerUnit: 31, totalRequired: 31, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 600 },
    { sku: 'WAL-PART-2CF972', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ผนังอาคารเดิมทาสีใหม่", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'CEIL-GYP-1ECE30', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ผนังยิปซั่มบอร์ดโครงซีลายฉาบเรียบทาสี 1 ด้าน", qtyPerUnit: 120, totalRequired: 120, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 700 },
    { sku: 'PNT-BA6B19', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ทาสี", qtyPerUnit: 120, totalRequired: 120, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 180 },
    { sku: 'CEIL-GYP-85F3D2', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ผนังยิปซั่มบอร์ดโครงซีลายฉาบเรียบทาสี 2 ด้าน", qtyPerUnit: 84, totalRequired: 84, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 1000 },
    { sku: 'PNT-BA6B19-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ทาสี", qtyPerUnit: 84, totalRequired: 84, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 180 },
    { sku: 'WAL-PART-03DB57', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ผนังก่ออิฐฉาบปูน ทาสี P2", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'CEIL-GYP-2EFB28', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ฝ้าเพดานโครงเคร่าโลหะกรุยิปซั่มบอร์ด 9 มม.ฉาบรอยต่อเรียบทาสีขาว", qtyPerUnit: 263, totalRequired: 263, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 400 },
    { sku: 'PNT-BA6B19-2', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ทาสี", qtyPerUnit: 263, totalRequired: 263, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 180 },
    { sku: 'CEIL-GYP-82215D', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ฝ้าหลุมโครงเคร่าโลหะกรุยิปซั่มบอร์ด 9 มม.ฉาบรอยต่อเรียบทาสีขาว ซ่อนไฟ", qtyPerUnit: 65, totalRequired: 65, ordered: 0, delivered: 0, unit: 'ม.', estimatedPrice: 800 },
    { sku: 'CEIL-GYP-F83F66', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ฝ้าเพดานโครงเคร่าโลหะกรุยิปซั่มบอร์ดกันชื้น 9 มม.ฉาบรอยต่อเรียบทาสีขาว (ห้องน้ำ)", qtyPerUnit: 31, totalRequired: 31, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 500 },
    { sku: 'PNT-BA6B19-3', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ทาสี", qtyPerUnit: 31, totalRequired: 31, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 180 },
    { sku: 'FUR-CAB-F8B17A', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "counter ลงประกันภัย", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'PNT-C0323E', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "โครงไม้เนื้อแข็งกรุไม้อัดทำสีพ่น หุ้มเสา ขนาด 1100x380x2650 มม.", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 32000 },
    { sku: 'WAL-PART-C3268F', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "Partition เตี้ยกั้นทำงานส่วนสินไหม", qtyPerUnit: 5, totalRequired: 5, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 25000 },
    { sku: 'MISC-625C04', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "B1-4.1", qtyPerUnit: 3, totalRequired: 3, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 14000 },
    { sku: 'MISC-9F7F2C', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "B1-4.2", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 7000 },
    { sku: 'FUR-CAB-0F1B79', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ตู้ห้องผู้จัดการสาขา ขนาด 2150x450x2650 มม.", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'FUR-CAB-E6D618', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ตู้เอกสารขนาด 3100x450x2650 มม.", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'FUR-CAB-E4AC85', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ตู้เอกสารขนาด ขนาด 4700x450x2650 มม.", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'FUR-CAB-270FC4', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ตู้ห้องผู้จัดการภาค ขนาด 2150x450x2600 มม.", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'FUR-CAB-C0B621', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "แท่นอคลีลิก Kios วางใบประกาศ", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'DOOR-119C73', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ประตูกระกระจก Temper ใส หนา 12 มม. ขนาด 3830x2400 มม.", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'DOOR-5D3347', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ประตูบานเปิดก ไม้อัดติดลามิเนต 900 x 2650 มม.", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'DOOR-D716D0', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ประตูวงกบไม้เต็ง บานไม้อัดยางติดลามิเนต ขนาด 900 x 2400 มม. พร้อมกระจก Temper ใส", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'DOOR-341EE2', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ประตูบานเปิด ไม้อัดติดลามิเนต 800 x 2400 มม.", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'DOOR-B26E39', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ประตูวงกบไม้เต็ง บานสำเร็จรูป ขนาด 700 x 2000 มม. (ประตูห้องน้ำ)", qtyPerUnit: 3, totalRequired: 3, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 12500 },
    { sku: 'DOOR-1D4B43', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ประตูไม้อัดกรุลามิเนต ขนาด 900 x 2400 มม. พร้อมกระจกใส Temper 10 มม.", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 61000 },
    { sku: 'GLS-4DC28D', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "กระจกTemper ใส หนา 10 มม.  ขนาด 3260 x 2400 มม.", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 22200 },
    { sku: 'PNT-C03CC9', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "กระจกลามิเนตติดฟิมล์ตรงกลางสีน้ำเงิน 6+6 มม. ขนาด 6470 x 2800 มม.", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'SAN-FIX-D049BA', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ชักโครก ของ AMERICAN STANDARD รุ่น TF-2407SC-WT-0 67T8", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 5700 },
    { sku: 'SAN-FIX-C3AA83', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "โถปัสวะชาย ของ AMERICAN STANDARD  รุ่น TF-412", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 1500 },
    { sku: 'SAN-FIX-EF18F6', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ฟลัชวาล์ว โถปัสวะชาย ของ AMERICAN STANDARD รุ่น FFAS9859", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 1200 },
    { sku: 'SAN-FIX-30F406', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "อ่างล้างหน้าแบบแขวนผนัง  ของ AMERICAN STANDARD รุ่น TF-0507W/0707-WT", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 3000 },
    { sku: 'SAN-FIX-EB244D', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ก๊อกอ่างล้างหน้า ของ AMERICAN STANDARD รุ่น A-J57-10", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 1080 },
    { sku: 'SAN-FIX-5AACDA', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "สายฉีดชำระ ของ AMERICAN STANDARD รุ่น A-4900-ST", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 700 },
    { sku: 'SAN-FIX-2ED0D9', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "สะดืออ่างล้างหน้าแบบกด ของ AMERICAN STANDARD รุ่น A-8016-A", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 650 },
    { sku: 'SAN-FIX-40C841', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "วาล์วเปิด-ปิดน้ำ ของ AMERICAN STANDARD รุ่น", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 450 },
    { sku: 'SAN-FIX-02AC79', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ก็อกล้างพื้น ของ AMERICAN STANDARD รุ่น FFAST702-0T0500BT0", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 650 },
    { sku: 'SAN-FIX-B84E20', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ที่ใส่กระดาษชำระแบบติดผนัง ของ AMERICAN STANDARD รุ่น K-2501-56-N", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 750 },
    { sku: 'SAN-FIX-9197A8', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 1', material: "ตะแกรงกันกลิ่นสแตนเลส ของ AMERICAN STANDARD รุ่น F78220-CHADYST", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 450 },

    // -- งานตกแต่งภายใน ชั้น 2 (9 รายการ) --
    { sku: 'MISC-FE0950', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 2', material: "พื้นเดิม ขัดทำความสะอาด", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'WAL-PART-2CF972-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 2', material: "ผนังอาคารเดิมทาสีใหม่", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'CEIL-GYP-85F3D2-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 2', material: "ผนังยิปซั่มบอร์ดโครงซีลายฉาบเรียบทาสี 2 ด้าน", qtyPerUnit: 42, totalRequired: 42, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 1000 },
    { sku: 'PNT-BA6B19-4', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 2', material: "ทาสี", qtyPerUnit: 84, totalRequired: 84, ordered: 0, delivered: 0, unit: 'ตรม.', estimatedPrice: 180 },
    { sku: 'CEIL-GYP-1D7AC0', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 2', material: "ซ่อมแซมฝ้าเพดานเดิม ทาสีใหม่ (ห้องประชุม)", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'CEIL-GYP-2591A2', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 2', material: "งานดร็อปฝ้าซ่อนไฟ ยาวตลอดแนว (ห้องประชุม)", qtyPerUnit: 13, totalRequired: 13, ordered: 0, delivered: 0, unit: 'ม.', estimatedPrice: 1000 },
    { sku: 'CEIL-GYP-EA1FB9', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 2', material: "ฝ้าเพดานเดิมทาสีใหม่", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'WAL-PART-CF9EC3', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 2', material: "ผนังกระจกติดทีวี ขนาด 3775 x2600 มม.", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 0 },
    { sku: 'PNT-43C8BF', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานตกแต่งภายใน ชั้น 2', material: "ประตูเดิมทำสีใหม่", qtyPerUnit: 5, totalRequired: 5, ordered: 0, delivered: 0, unit: 'ชุด', estimatedPrice: 5000 },

    // -- งานระบบ ชั้น 1 (79 รายการ) --
    { sku: 'MISC-6967C0', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "งานรื้องานระบบไฟฟ้าเดิม", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'MISC-A2AF14', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "งานระบบไฟฟ้า และ สื่อสารชั่วคราวขณะดำเนินการปรับปรุง", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 10000 },
    { sku: 'ELC-MDB-2E920C', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "MDB Panal Cabinate Main 100 AT", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 68000 },
    { sku: 'ELC-MCB-5C8CF7', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Main Circuit breaker 100A ( EZD100H3100 )", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 12500 },
    { sku: 'ELC-MCB-5F62EF', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "- Circuit Breaker 1 PH 16AT ( Schneider )", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 58000 },
    { sku: 'ELC-MCB-7531E3', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "- Circuit Breaker 1 PH 63AT ( Schneider ) UPS", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 3200 },
    { sku: 'ELC-CBL-49B354', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "IEC01 Cable 50Sqmm", qtyPerUnit: 200, totalRequired: 200, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 180 },
    { sku: 'ELC-CBL-4E5B4E', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "IEC01 Cable 25Sqmm", qtyPerUnit: 60, totalRequired: 60, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 120 },
    { sku: 'ELC-CONDUIT-ABDA31', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Steel Wireway 100X100 mm", qtyPerUnit: 50, totalRequired: 50, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 250 },
    { sku: 'ELC-CONDUIT-EFF0C8', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Fitting For Wireway", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 3000 },
    { sku: 'ELC-UPS-495AA8', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Load Center 3P24CKT 30 AT Main ( UPS )", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 18000 },
    { sku: 'ELC-CBL-286CDA', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "IEC01 Cable 10Sqmm  ( UPS )", qtyPerUnit: 170, totalRequired: 170, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 45 },
    { sku: 'ELC-CBL-4AFCCF', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "IEC01 Cable 4Sqmm Main Recepted Plug  ( UPS )", qtyPerUnit: 1000, totalRequired: 1000, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 20 },
    { sku: 'ELC-CBL-EC6CE4', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "IEC01 Cable 4Sqmm Main Recepted Plug  ( Norm )", qtyPerUnit: 1000, totalRequired: 1000, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 20 },
    { sku: 'ELC-CONDUIT-E6D823', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Conduit & Rack Way", qtyPerUnit: 300, totalRequired: 300, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 150 },
    { sku: 'ELC-CONDUIT-ABDA31-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Steel Wireway 100X100 mm", qtyPerUnit: 50, totalRequired: 50, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 280 },
    { sku: 'ELC-CONDUIT-EFF0C8-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Fitting For Wireway", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 2500 },
    { sku: 'ELC-NET-305AF6', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "SNMP", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 10000 },
    { sku: 'ELC-UPS-DCF593', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Recepted Plug ( WEG R 15929 ) ( UPS )", qtyPerUnit: 44, totalRequired: 44, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 1250 },
    { sku: 'ELC-RECEP-D0BBF7', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Recepted Plug ( WEG 15929 ) ( Norm )", qtyPerUnit: 34, totalRequired: 34, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 1250 },
    { sku: 'ELC-RECEP-4F292F', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Recepted RG6  For TV", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 1500 },
    { sku: 'ELC-LIGHT-824F64', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "RD01", qtyPerUnit: 91, totalRequired: 91, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 1550 },
    { sku: 'MISC-BFE1FC', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "F01", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 2800 },
    { sku: 'MISC-83CF73', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "P02", qtyPerUnit: 11, totalRequired: 11, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 2850 },
    { sku: 'ELC-LIGHT-30B0FE', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "LED 01,02,03,04,05,06", qtyPerUnit: 180, totalRequired: 180, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 450 },
    { sku: 'MISC-EBA59A', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Switching Power Supply", qtyPerUnit: 10, totalRequired: 10, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 2700 },
    { sku: 'ELC-CBL-31991C', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "THW Cable 1.5 Sq.mm", qtyPerUnit: 1000, totalRequired: 1000, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 15 },
    { sku: 'ELC-CBL-2F3296', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "THW Cable 2.5 Sq.mm", qtyPerUnit: 2000, totalRequired: 2000, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 15 },
    { sku: 'ELC-CONDUIT-E6D823-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Conduit & Rack Way", qtyPerUnit: 680, totalRequired: 680, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 140 },
    { sku: 'MISC-2D8495', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "1- Way Switch", qtyPerUnit: 20, totalRequired: 20, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 150 },
    { sku: 'ELC-CONDUIT-662F12', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Fitting For Conduit", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 5000 },
    { sku: 'ELC-MDB-5E8AE9', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Normi \" Fire Alarm Control Panal", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 22500 },
    { sku: 'ELC-FIRE-06F3B7', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Strobe Horn", qtyPerUnit: 4, totalRequired: 4, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 3900 },
    { sku: 'ELC-FIRE-73C710', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Photoelectric Smoke Detector", qtyPerUnit: 20, totalRequired: 20, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 2500 },
    { sku: 'MISC-9E6D53', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Head Detector", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 800 },
    { sku: 'ELC-FIRE-47ADBC', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Manual Pull Sttion", qtyPerUnit: 4, totalRequired: 4, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 2500 },
    { sku: 'ELC-FIRE-1C3F69', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Fire extinguisher Low-Pressure Water Mist :Vapor15 Pb ( Green 6A20B )", qtyPerUnit: 8, totalRequired: 8, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 3600 },
    { sku: 'SIGN-549C4E', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "ป้ายแสดงตำแหน่งถังดับเพลิง ขนาด 50CmX30Cm", qtyPerUnit: 8, totalRequired: 8, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 460 },
    { sku: 'MISC-CDADCC', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "E mergency Lighting 2X9 W 12V-5Ah Battery Back-Up 4 Hours", qtyPerUnit: 6, totalRequired: 6, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 2400 },
    { sku: 'ELC-LIGHT-174EEA', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "EXIT Sign Light LED Slimline Stripe 1X10W 3.6V ni-mh Battery Back-Up 2 Hours", qtyPerUnit: 8, totalRequired: 8, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 2450 },
    { sku: 'ELC-RECEP-8D2EC9', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Recepted Plug ( WEG 15929 ) ( For E mergency , Exit Fire )", qtyPerUnit: 14, totalRequired: 14, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 2000 },
    { sku: 'MISC-EFF233', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "IEC 01 2.5 Sqmm", qtyPerUnit: 800, totalRequired: 800, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 15 },
    { sku: 'ELC-CONDUIT-BCFDDF', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "UPVC Conduit", qtyPerUnit: 400, totalRequired: 400, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 48 },
    { sku: 'ELC-CONDUIT-ADC933', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Flexible Conduit", qtyPerUnit: 100, totalRequired: 100, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 13 },
    { sku: 'MISC-66F01C', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Fitting & Accessories", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 5000 },
    { sku: 'ELC-NET-B379BB', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "UTP Cat6 Installation For DATA Com , AP  ( Blue )", qtyPerUnit: 36, totalRequired: 36, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 2100 },
    { sku: 'ELC-NET-B3018E', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "UTP Cat6 Installation For IP Phone  ( RED )", qtyPerUnit: 28, totalRequired: 28, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 2100 },
    { sku: 'ELC-NET-59A244', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "UTP Cat6 Installation For TV Monitor  ( Blue )", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 2100 },
    { sku: 'ELC-MDB-309EBF', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "UTP Cat6 PatchPanal 24 Port", qtyPerUnit: 3, totalRequired: 3, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 3800 },
    { sku: 'ELC-NET-13C13C', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "UTP Patch Corcad Cable 3M", qtyPerUnit: 64, totalRequired: 64, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 200 },
    { sku: 'ELC-CBL-888EB3', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Cable Managreement", qtyPerUnit: 4, totalRequired: 4, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 500 },
    { sku: 'MISC-A82185', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Renovation Cabinetnetwork Rack Managreement", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 0 },
    { sku: 'ELC-NET-39010B', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Fiber optic Sm 12 Core", qtyPerUnit: 40, totalRequired: 40, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 40 },
    { sku: 'ELC-NET-A696AB', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "ODF Wallmount 12 Port kit Outdoor", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 7000 },
    { sku: 'ELC-NET-15CD9B', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "FDU Rack Mount 12 Fiber", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 3500 },
    { sku: 'ELC-NET-E57EC9', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Fiber Optic Spliching Termination", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 1500 },
    { sku: 'ELC-NET-95CF9D', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Fiber Optic Patch Cord Cable FC LC 3M", qtyPerUnit: 6, totalRequired: 6, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 1200 },
    { sku: 'MISC-943D99', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "DTV Outlet", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 1500 },
    { sku: 'MISC-66F01C-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Fitting & Accessories", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 5000 },
    { sku: 'ELC-AC-6BEF1D', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "FCU 1-1 Classetle Type \"Daikin Inverter\"  CT 36,000 บีทียู  ส่วนสำนักงานต้อนรับลูกค้า", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 85000 },
    { sku: 'ELC-AC-361AC5', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "FCU 1-2 Classetle Type \"Daikin Inverter\"  CT 36,000 บีทียู ส่วนสำนักงานต้อนรับลูกค้า", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 85000 },
    { sku: 'ELC-AC-CACA4C', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "FCU 1-3 Classetle Type \"Daikin Inverter\"  CT 36,000 บีทียู ส่วนสำนักงานต้อนรับลูกค้า", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 85000 },
    { sku: 'ELC-AC-7EBC51', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "FCU 1-4 Classetle Type \"Daikin Inverter\"  CT 36,000 บีทียู ส่วนสำนักงานต้อนรับลูกค้า", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 85000 },
    { sku: 'ELC-AC-CD303E', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "FCU 1-5 Classetle Type \"Daikin Inverter\"  CT 36,000 บีทียู ส่วนสำนักงานต้อนรับลูกค้า", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 85000 },
    { sku: 'ELC-AC-DB1759', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "FCU 1-6 Wall Type \"Daikin Inverter\"  24200 บีทียู ส่วนห้องผู้จัดการ", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 59500 },
    { sku: 'ELC-AC-1670EC', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "FCU 1-6 Wall Type \"Daikin Inverter\"  24200 บีทียู ส่วนห้องพนักงานภาค   *** ใช้แอร์เดิม", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'ELC-AC-479A64', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "ปั้มน้ำสำหรับเครื่องปรับอากาศ", qtyPerUnit: 3, totalRequired: 3, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 2500 },
    { sku: 'ELC-VENT-8A2D1B', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Ventilation Fan 190 Cfm Duct Type", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 5400 },
    { sku: 'ELC-VENT-D700B8', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Ventilation Fan 90 Cfm Duct Type ( Toilet )", qtyPerUnit: 3, totalRequired: 3, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 3800 },
    { sku: 'ELC-VENT-40EA43', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Alumenuime Flex For Ventilation", qtyPerUnit: 15, totalRequired: 15, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 150 },
    { sku: 'MISC-427ED1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Fitting & Support", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 9000 },
    { sku: 'ELC-CCTV-2C123C', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "IP Camera  2 MP", qtyPerUnit: 6, totalRequired: 6, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 0 },
    { sku: 'ELC-CCTV-DF1FE1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "NVR 8 CH + 2 HDD 3 TB", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 0 },
    { sku: 'ELC-CCTV-0017E7', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Poe Switch 8 Port For CCTV System", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 0 },
    { sku: 'ELC-NET-78288C', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "UTP Cat6 Installation For IP  CCTV ( GRAY )", qtyPerUnit: 6, totalRequired: 6, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 2100 },
    { sku: 'ELC-MDB-309EBF-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "UTP Cat6 PatchPanal 24 Port", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 3800 },
    { sku: 'ELC-NET-13C13C-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "UTP Patch Corcad Cable 3M", qtyPerUnit: 6, totalRequired: 6, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 200 },
    { sku: 'ELC-BILL-B4C685', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Billboard Lights Front Control Cabinet", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 6800 },
    { sku: 'ELC-BILL-74772A', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 1', material: "Main Power For  Billboard Lights", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 3250 },

    // -- งานระบบ ชั้น 2 (28 รายการ) --
    { sku: 'ELC-CBL-4AFCCF-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "IEC01 Cable 4Sqmm Main Recepted Plug  ( UPS )", qtyPerUnit: 500, totalRequired: 500, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 15 },
    { sku: 'ELC-CBL-EC6CE4-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "IEC01 Cable 4Sqmm Main Recepted Plug  ( Norm )", qtyPerUnit: 1200, totalRequired: 1200, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 15 },
    { sku: 'ELC-CONDUIT-E6D823-2', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Conduit & Rack Way", qtyPerUnit: 200, totalRequired: 200, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 150 },
    { sku: 'ELC-CONDUIT-EFF0C8-2', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Fitting For Wireway", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 2000 },
    { sku: 'ELC-UPS-DCF593-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Recepted Plug ( WEG R 15929 ) ( UPS )", qtyPerUnit: 4, totalRequired: 4, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 1250 },
    { sku: 'ELC-RECEP-D0BBF7-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Recepted Plug ( WEG 15929 ) ( Norm )", qtyPerUnit: 10, totalRequired: 10, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 1250 },
    { sku: 'ELC-LIGHT-824F64-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "RD01", qtyPerUnit: 16, totalRequired: 16, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 1550 },
    { sku: 'MISC-BFE1FC-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "F01", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 2800 },
    { sku: 'MISC-83CF73-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "P02", qtyPerUnit: 7, totalRequired: 7, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 2850 },
    { sku: 'ELC-LIGHT-E1C5E8', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "LED 06", qtyPerUnit: 20, totalRequired: 20, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 420 },
    { sku: 'ELC-CBL-31991C-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "THW Cable 1.5 Sq.mm", qtyPerUnit: 500, totalRequired: 500, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 15 },
    { sku: 'ELC-CBL-2F3296-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "THW Cable 2.5 Sq.mm", qtyPerUnit: 1000, totalRequired: 1000, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 15 },
    { sku: 'ELC-CONDUIT-E6D823-3', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Conduit & Rack Way", qtyPerUnit: 160, totalRequired: 160, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 140 },
    { sku: 'MISC-2D8495-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "1- Way Switch", qtyPerUnit: 10, totalRequired: 10, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 150 },
    { sku: 'ELC-CONDUIT-662F12-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Fitting For Conduit", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 4000 },
    { sku: 'ELC-NET-B379BB-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "UTP Cat6 Installation For DATA Com , AP  ( Blue )", qtyPerUnit: 8, totalRequired: 8, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 2100 },
    { sku: 'ELC-NET-B3018E-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "UTP Cat6 Installation For IP Phone  ( RED )", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'port', estimatedPrice: 2100 },
    { sku: 'ELC-NET-13C13C-2', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "UTP Patch Corcad Cable 3M", qtyPerUnit: 10, totalRequired: 10, ordered: 0, delivered: 0, unit: 'ea', estimatedPrice: 200 },
    { sku: 'MISC-66F01C-2', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Fitting & Accessories", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 5000 },
    { sku: 'ELC-AC-4DA6D4', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "FCU 2-1 Wall Type ส่วนห้องSERVER    *** ใช้แอร์เดิม", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'ELC-AC-906A03', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "FCU 2-2 Wall Type ส่วนห้อง ประชุม      *** ใช้แอร์เดิม", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'ELC-AC-1A2798', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "FCU 2-3 Wall Type  ส่วนห้อง ประชุม      *** ใช้แอร์เดิม", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'ELC-AC-D9AC8C', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "FCU 2-4 Wall Type  ส่วนห้อง ประชุม      *** ใช้แอร์เดิม", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'เหมา', estimatedPrice: 0 },
    { sku: 'MISC-628A15', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Main Power For Air", qtyPerUnit: 4, totalRequired: 4, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 6000 },
    { sku: 'ELC-AC-479A64-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "ปั้มน้ำสำหรับเครื่องปรับอากาศ", qtyPerUnit: 3, totalRequired: 3, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 2500 },
    { sku: 'ELC-VENT-EF74A1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Ventilation Fan 90 Cfm Duct Type ( ประชุม )", qtyPerUnit: 2, totalRequired: 2, ordered: 0, delivered: 0, unit: 'set', estimatedPrice: 3800 },
    { sku: 'ELC-VENT-40EA43-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Alumenuime Flex For Ventilation", qtyPerUnit: 20, totalRequired: 20, ordered: 0, delivered: 0, unit: 'm', estimatedPrice: 150 },
    { sku: 'MISC-427ED1-1', project: 'PRJ-2566-OFC', projectName: 'ทิพยประกันภัย สาขาอุบลราชธานี', phase: 'งานระบบ ชั้น 2', material: "Fitting & Support", qtyPerUnit: 1, totalRequired: 1, ordered: 0, delivered: 0, unit: 'lot', estimatedPrice: 6000 },
  ],

  /* ---------- ใบสั่งซื้อล่าสุด (ส่งตรงไซต์งาน) ---------- */
  recentPOs: [
    { poNo: 'PO-2569-0418', supplier: 'บริษัท สีโปรเฟสชั่นนัล จำกัด', deliverTo: 'กรีนวิลล์ 2 / Block C', items: 3, total: 145000, orderDate: '2569-07-18', deliveryDate: '2569-07-23', status: 'in-transit' },
    { poNo: 'PO-2569-0417', supplier: 'บริษัท เครื่องมือช่างโปร จำกัด', deliverTo: 'กรีนวิลล์ 2 / Block A', items: 12, total: 89400, orderDate: '2569-07-17', deliveryDate: '2569-07-22', status: 'in-transit' },
    { poNo: 'PO-2569-0416', supplier: 'บริษัท ซีเมนต์ไทย จำกัด', deliverTo: 'เดอะพาร์ค / Zone 1', items: 5, total: 528000, orderDate: '2569-07-15', deliveryDate: '2569-07-22', status: 'confirmed' },
    { poNo: 'PO-2569-0415', supplier: 'ห้างหุ้นส่วน เหล็กไทยก้าวหน้า', deliverTo: 'กรีนวิลล์ 2 / Block B', items: 8, total: 1240000, orderDate: '2569-07-12', deliveryDate: '2569-07-26', status: 'confirmed' },
    { poNo: 'PO-2569-0414', supplier: 'บริษัท สายไฟฟ้าไทย จำกัด', deliverTo: 'กรีนวิลล์ 2 / Block A', items: 4, total: 218000, orderDate: '2569-07-10', deliveryDate: '2569-07-18', status: 'received' },
    { poNo: 'PO-2569-0413', supplier: 'บริษัท ก่อสร้างไทยรวมพล จำกัด', deliverTo: 'กรีนวิลล์ 2 / ทั้งโครงการ', items: 1, total: 2450000, orderDate: '2569-07-08', deliveryDate: '2569-08-07', status: 'in-progress' },
    { poNo: 'PO-2569-0412', supplier: 'ห้างหุ้นส่วน ไทยพลาสติก', deliverTo: 'เดอะพาร์ค / Zone 1', items: 6, total: 78400, orderDate: '2569-07-05', deliveryDate: '2569-07-19', status: 'delayed' },
    { poNo: 'PO-2569-0411', supplier: 'บริษัท เซรามิคไทยแลนด์ จำกัด', deliverTo: 'เดอะพาร์ค / Zone 1', items: 15, total: 320500, orderDate: '2569-07-03', deliveryDate: '2569-07-15', status: 'received' },
  ],

  /* ---------- Lead Time ตามหมวดวัสดุ ---------- */
  leadTimeData: {
    labels: ['ปูนซีเมนต์', 'เหล็กและโลหะ', 'วัสดุก่อสร้าง', 'กระเบื้อง/พื้น', 'สีและเคมีภัณฑ์', 'ไฟฟ้า/ประปา'],
    promised: [7, 14, 21, 12, 5, 8],
    actual: [8, 16, 24, 13, 5, 9]
  },

  /* ---------- AI Price Forecast (ตัวอย่างสินค้า) ---------- */
  priceForecast: {
    material: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.',
    category: 'ปูนซีเมนต์',
    currentPrice: 215,
    predictedPrice: 198,
    change: -7.9,
    confidence: 81,
    days: 30,
    historical: {
      labels: Array.from({length: 30}, (_, i) => {
        const d = new Date(2026, 5, 21 + i);
        const months = ['มิ.ย.', 'ก.ค.'];
        return d.getDate() + ' ' + months[d.getMonth() - 5];
      }),
      actual: [165, 165, 165, 165, 168, 168, 168, 170, 170, 172, 172, 175, 175, 178, 180, 180, 182, 185, 185, 188, 190, 192, 195, 198, 200, 202, 205, 208, 212, 215],
      predicted: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 204, 201, 198]
    },
    factors: [
      { label: 'ราคาทองคำ (โลก)', value: '+0.5%', impact: 'neutral', note: 'ทองคำตลาด COMEX ปรับขึ้นเล็กน้อย สะท้อนความเชื่อมั่นทางเศรษฐกิจ' },
      { label: 'ราคาแร่มีค่า', value: '-2%', impact: 'down', note: 'แร่เหล็ก/นิกเกิลในตลาด LME ปรับลดลง ลดต้นทุนวัตถุดิบ' },
      { label: 'ราคาตลาดโลก', value: '-8%', impact: 'down', note: 'ราคาปูนในตลาดอาเซียนปรับลดลงต่อเนื่อง' },
      { label: 'ราคาน้ำมัน (Brent)', value: '+4%', impact: 'up', note: 'น้ำมันดิบ Brent ปรับขึ้น กระทบต้นทุนขนส่ง' },
      { label: 'อัตราดอกเบี้ย MLR — ธนาคารกรุงเทพ (BBL)', value: '3.50%', impact: 'neutral', note: 'อ้างอิง MLR ธนาคารกรุงเทพ · แนะนำกักตุนไม่เกิน 60 วัน' }
    ]
  },

  categories: ['ปูนซีเมนต์', 'เหล็กและโลหะ', 'วัสดุก่อสร้าง', 'กระเบื้อง/พื้น', 'สีและเคมีภัณฑ์', 'ไฟฟ้า/ประปา', 'เครื่องมือช่าง', 'ประตู-หน้าต่าง', 'สุขภัณฑ์'],

  /* ---------- สำหรับหน้ารายงาน ---------- */
  projectPerformance: {
    labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.'],
    onTime: [82, 84, 85, 86, 88, 87, 89],
    budgetControl: [95, 93, 96, 94, 92, 97, 96]
  },

  topMaterials: [
    { name: 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.', amount: 8500000, orders: 48, projects: 3 },
    { name: 'เหล็กเส้น RB 12mm x 10m', amount: 6800000, orders: 36, projects: 4 },
    { name: 'เหล็กแผ่น HR 5mm', amount: 4200000, orders: 28, projects: 3 },
    { name: 'อิฐมอญ', amount: 3650000, orders: 22, projects: 2 },
    { name: 'กระเบื้องเซรามิก 60x60', amount: 2850000, orders: 18, projects: 2 },
    { name: 'ทรายหยาบ', amount: 2150000, orders: 32, projects: 4 },
    { name: 'หินคลุก', amount: 1980000, orders: 24, projects: 3 },
    { name: 'สีน้ำอะครีลิก 5 แกลลอน', amount: 1640000, orders: 28, projects: 3 },
    { name: 'กระเบื้องหลังคาคอนกรีต', amount: 1480000, orders: 12, projects: 2 },
    { name: 'สายไฟ THW 2.5 sq.mm', amount: 1320000, orders: 18, projects: 3 },
  ]
};

/* ---------- Formatters ---------- */
window.fmt = {
  currency: (n) => '฿' + Number(n).toLocaleString('th-TH', { maximumFractionDigits: 0 }),
  currencyShort: (n) => {
    if (n >= 1e9) return (n/1e9).toFixed(1) + ' พันล้าน';
    if (n >= 1e6) return (n/1e6).toFixed(1) + ' ล้าน';
    if (n >= 1e3) return (n/1e3).toFixed(0) + ' พัน';
    return Number(n).toLocaleString('th-TH');
  },
  num: (n) => Number(n).toLocaleString('th-TH'),
  date: (s) => {
    if (!s) return '-';
    // แปลง พ.ศ. เป็น ค.ศ. ถ้าจำเป็น (รองรับทั้ง 2 แบบ)
    let dateStr = s;
    if (s.match(/^25\d{2}-/)) {
      const y = parseInt(s.substring(0, 4)) - 543;
      dateStr = y + s.substring(4);
    }
    const d = new Date(dateStr);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + (d.getFullYear() + 543);
  },
  percent: (n) => Number(n).toFixed(1) + '%',
  statusPill: (status) => {
    const map = {
      'active': { cls: 'success', label: 'ใช้งาน' },
      'review': { cls: 'warning', label: 'ทบทวน' },
      'inactive': { cls: 'neutral', label: 'ยกเลิก' },
      'normal': { cls: 'success', label: 'ปกติ' },
      'low': { cls: 'warning', label: 'ใกล้หมด' },
      'critical': { cls: 'danger', label: 'วิกฤต' },
      'pending': { cls: 'warning', label: 'รอตรวจสอบ' },
      'investigating': { cls: 'accent', label: 'กำลังตรวจสอบ' },
      'resolved': { cls: 'success', label: 'แก้ไขแล้ว' },
      'confirmed': { cls: 'accent', label: 'ยืนยันแล้ว' },
      'in-transit': { cls: 'info', label: 'กำลังจัดส่ง' },
      'in-progress': { cls: 'info', label: 'กำลังดำเนินการ' },
      'received': { cls: 'success', label: 'รับแล้ว' },
      'delayed': { cls: 'danger', label: 'ล่าช้า' },
      'tier-1': { cls: 'danger', label: 'Tier 1' },
      'tier-2': { cls: 'warning', label: 'Tier 2' },
      'tier-3': { cls: 'neutral', label: 'Tier 3' },
      'in-progress': { cls: 'info', label: 'กำลังดำเนินการ' },
      'closing': { cls: 'success', label: 'ปิดงาน' },
    };
    const cfg = map[status] || { cls: 'neutral', label: status };
    return `<span class="pill ${cfg.cls}">${cfg.label}</span>`;
  }
};
