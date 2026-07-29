# ระบบจัดซื้อวัสดุก่อสร้าง — Prototype

ต้นแบบ UI สำหรับโปรเจคฝึกงาน บริษัทอสังหาริมทรัพย์ (แนวราบ / บ้านจัดสรร) ที่ไม่มีคลังสินค้า — วัสดุจัดส่งตรงเข้าไซต์งานก่อสร้าง

> ต้นแบบสำหรับนำเสนอแนวคิดหน้าตาของระบบ — มีทั้ง mock data และส่วนที่เชื่อมต่อ API จริงผ่าน Vercel Serverless

## วิธีเปิดใช้งาน

1. เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ (ดับเบิลคลิก)
2. หรือใช้ Live Server ใน VS Code (แนะนำ)
3. หรือรัน `python -m http.server` ในโฟลเดอร์นี้
4. หรือ Deploy บน Vercel: `vercel deploy` (auto-detect static + /api functions)

## โครงสร้างไฟล์

```
procurement-system/
├── index.html              → หน้า Login
├── dashboard.html          → ภาพรวมโปรเจค + ใบสั่งซื้อ
├── ai-analysis.html        → วิเคราะห์แนวโน้มราคาวัสดุ + คาดการณ์ + ปัจจัยภายนอก
├── site-materials.html     → วัสดุ & การสั่งซื้อ (Lead Time & Reorder Control)
├── alerts.html             → เปรียบเทียบราคาผู้ขาย (จัดทำใบเสนอราคา · terms + signatures + export Excel)
├── reports.html            → รายงาน + Pareto + YoY + Bottleneck Analysis
├── api/
│   └── factors.js          → Vercel Serverless: ปัจจัยภายนอก (ทอง/น้ำมัน/แร่/ดอกเบี้ย)
├── css/
│   └── style.css           → Design System หลัก
├── js/
│   ├── data.js             → ข้อมูลตัวอย่าง (โปรเจค วัสดุ ผู้ขาย ราคา)
│   ├── demo.js             → ตัวควบคุมโหมดตัวอย่าง + กราฟ
│   ├── compare-excel-export.js → Export ตารางเปรียบเทียบเป็น .xlsx (ExcelJS)
│   └── supplier-comparison.js  → ตารางเปรียบเทียบผู้ขาย + terms + signatures
├── tools/
│   ├── lint-no-time.js     → Guard: ห้ามเพิ่ม time-tracking features
│   ├── regression-blessini.js  → E2E test: parse BLESSINI → export → verify formulas
│   ├── smoke-browser-export.js → Module/parser/exporter smoke test
│   └── integration-blessini.js → Integration test
└── vendor/
    └── exceljs.min.js      → Excel library (vendored, ไม่ผ่าน CDN)
```

## ฟีเจอร์หลัก

### ปุ่ม "ดูตัวอย่างข้อมูล" ที่มุมขวาบนของทุกหน้า

- **สถานะปิด (default)** — ทุกหน้าจะแสดงสถานะ "ว่าง" (Empty State)
- **กดเปิด** — หน้าจะเติมข้อมูลตัวอย่างทั้งหมด (ตาราง กราฟ KPI คำแนะนำ)
- **กดอีกครั้ง** — กลับสู่สถานะว่าง

เหมาะสำหรับ:
- เปรียบเทียบ UI ตอนว่าง vs ตอนมีข้อมูล
- นำเสนออาจารย์/ที่ปรึกษา
- ทดสอบ Layout กับข้อมูลจริง

### State persistence (localStorage)

- ข้อมูล BOQ ที่ upload, การเลือกผู้ชนะ, terms ที่กรอก — **เก็บใน localStorage อัตโนมัติ**
- เมื่อสลับหน้าแล้วกลับมา ข้อมูลยังอยู่ (ไม่ต้อง upload ใหม่)
- ถ้า state > 4MB → save metadata only + toast แจ้งให้ upload ใหม่
- keys: `procurement:uploaded-boq:v2`, `procurement:supplier-compare:v2`

### External Factors API (`/api/factors`)

Vercel Serverless Function ดึงข้อมูล 4 ปัจจัยที่กระทบราคาวัสดุก่อสร้าง:

| ปัจจัย | แหล่งข้อมูล | สถานะ |
|---|---|---|
| ทองคำ (Gold Spot) | metals.live API | 🟢 Live |
| น้ำมัน (WTI) | EIA STEO public | 🟢 Live (scrape) |
| แร่มีค่า (LME Index) | BOT Commodity Watch | 🟢 Live (scrape) |
| ดอกเบี้ย BBL | BOT MLR proxy | 🟢 Live (scrape) |

Cache 1 ชม. · fallback เป็น admin snapshot ถ้า upstream fail · CORS allow-all

ใช้งาน:
```bash
curl https://<your-domain>.vercel.app/api/factors
```

## จุดเด่นของต้นแบบ

### 1. ออกแบบเฉพาะธุรกิจอสังหาริมทรัพย์
- **ไม่มีคลังสินค้า** — ใช้แนวคิด "วัสดุ ณ ไซต์งาน" แทน (Block A/B/C, งวดงาน, รับแล้ว/ใช้ไป/คงเหลือ)
- แยกประเภทคู่ค้า: **ผู้ขายวัสดุ** vs **ผู้รับเหมา**
- ติดตามตามโปรเจคบ้านจัดสรร (หมู่บ้านกรีนวิลล์ 2 / เดอะพาร์ค / บ้านริมธาร / เดอะวัลเลย์)

### 2. การวิเคราะห์ตามหลัก Spend Optimization
- **Pareto 80/20** — ระบุ Top 20% หมวดวัสดุที่กิน 80% งบ
- **Risk-balanced consolidation** — ปฏิเสธรวมผู้ขาย tier-1 ถ้าไม่มี break-glass plan
- **Theory of Constraints (Goldratt)** — ระบุ bottleneck category ของ purchasing cycle
- **Renewal date clustering** — กระจายวันต่อสัญญา tier-1 ออกจากเดือนเดียวกัน

### 3. AI Price Forecast + External Factors
- กราฟเปรียบเทียบราคาจริง vs คาดการณ์ 30 วัน (statistical forecast บน historical data)
- ปัจจัยที่กระทบราคา:
  - **ภายใน**: Lead Time, ฤดูกาล, ปริมาณงวดงาน
  - **ภายนอก (live)**: ทองคำ, น้ำมัน, แร่มีค่า, ดอกเบี้ย BBL — ดึงจาก /api/factors
- คำแนะนำจังหวะการสั่งซื้อที่เหมาะสมกับงวดงาน (qualitative insight — ไม่ใช่ตัวเลข saving)

## ข้อจำกัดที่สำคัญ (Constraints)

### ❌ ห้ามมี time-tracking features
- ระบบ **ไม่** คำนวณ/บันทึกเวลาที่ประหยัดได้
- ระบบ **ไม่** มี KPI เชิงเวลา (timer, stopwatch, time saved)
- ผู้ใช้บันทึกข้อมูลเวลา/saving ด้วยตัวเองใน "รูปเล่มรายงาน" (เอกสารภายนอก)
- **เหตุผล**: ตัวเลข saving เป็น qualitative insight ที่ผู้บริหารตัดสินใจเอง ไม่ใช่สิ่งที่ระบบ generate
- **Enforcement**: `tools/lint-no-time.js` block patterns เชิง time-tracking ใน js/css/tools/html

### 📦 localStorage quota
- Default limit 5-10MB ต่อ browser
- ระบบมี safety: ถ้า state > 4MB → save metadata only + toast แจ้ง
- ตัวอย่าง: BOQ 50 รายการ + 5 suppliers ≈ 100KB (ปลอดภัย)

## เทคโนโลยี

- HTML5 / CSS3 / Vanilla JavaScript (ไม่มี Build Step)
- Chart.js (ผ่าน CDN)
- Google Fonts: Sarabun (รองรับภาษาไทย)
- SheetJS (XLSX parse, ผ่าน CDN)
- ExcelJS (export XLSX, vendored)
- Vercel Serverless Functions (Node.js) สำหรับ /api/factors

## หน้าจอที่ออกแบบ

1. **Login** — หน้าเข้าสู่ระบบสไตล์ Enterprise
2. **Dashboard** — ภาพรวมโปรเจค + ใบสั่งซื้อ
3. **วิเคราะห์แนวโน้มราคาวัสดุ** — กราฟคาดการณ์ + ปัจจัยภายใน + ปัจจัยภายนอก (live API) + คำแนะนำ
4. **วัสดุ & การสั่งซื้อ** — Lead Time & Reorder Control: ระบบเตือนล่วงหน้าให้สั่งของถูกจังหวะ (ต้องสั่งภายใน = วันที่ต้องใช้ − Lead Time − Safety Buffer 3 วัน) + สต็อกวัสดุตาม Block/งวด + เลือก Supplier เปรียบเทียบ 2 เจ้า
5. **เปรียบเทียบราคาผู้ขาย** — แนบ BOQ (Excel/CSV) → เทียบราคาผู้ขายแบบ Apple-to-Apple → กรอก terms + เลือกผู้ชนะ → ลง signatures (preparer/reviewer/approver) → export ใบเสนอราคา .xlsx (ExcelJS)
6. **รายงาน** — Pareto + YoY + Bottleneck + Top 10 + สรุปผู้บริหาร

## Testing & Quality

```bash
# Lint guard — block time-tracking features
node tools/lint-no-time.js

# Regression test — verify Excel export formulas (subtotal/VAT/net)
node tools/regression-blessini.js

# Smoke test — module/parser/exporter
node tools/smoke-browser-export.js
```

## หมายเหตุ

- ข้อมูลส่วนใหญ่เป็น Mock Data ใช้เพื่อสาธิต
- ปัจจัยภายนอก (ทอง/น้ำมัน/แร่/ดอกเบี้ย) ดึงจาก API จริง + admin snapshot fallback
- สามารถนำไปต่อยอดเป็น Backend จริงได้ (Vercel Serverless + KV/Postgres)

## ผู้พัฒนา

โปรเจคฝึกงาน ฝ่ายจัดซื้อแนวราบ — บริษัทอสังหาริมทรัพย์