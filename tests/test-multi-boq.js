// tests/test-multi-boq.js
// ทดสอบ pure functions ใน multi-boq.js
// โหลด FuzzyMatchSAP (UMD) แล้ว expose เป็น globalThis.FuzzyMatchSAP
// แล้ว require multi-boq.js (UMD)

const path = require('path');

// โหลด fuzzy-match-sap เป็น globalThis (UMD ตรวจ window แต่ใน node ไม่มี)
globalThis.window = globalThis;
require('../js/fuzzy-match-sap.js');
const MultiBOQ = require('../js/multi-boq.js');

let pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
}

// ========== unitClass ==========
console.log('\n[unitClass]');
{
  check("'ชุด' → 'count'",  MultiBOQ.unitClass('ชุด')  === 'count');
  check("'ตร.ม.' → 'area'", MultiBOQ.unitClass('ตร.ม.') === 'area');
  check("'ลบ.ม.' → 'volume'", MultiBOQ.unitClass('ลบ.ม.') === 'volume');
  check("'กก.' → 'weight'", MultiBOQ.unitClass('กก.') === 'weight');
  check("'' → 'unknown'",   MultiBOQ.unitClass('') === 'unknown');
  check("null → 'unknown'", MultiBOQ.unitClass(null) === 'unknown');
  check("'แผ่น' → 'piece'", MultiBOQ.unitClass('แผ่น') === 'piece');
  check("'ชิ้น' → 'count'", MultiBOQ.unitClass('ชิ้น') === 'count');
  check("'บาน' → 'count'",  MultiBOQ.unitClass('บาน') === 'count');
}

// ========== pickCanonicalName ==========
console.log('\n[pickCanonicalName]');
{
  const m1 = [{ name: 'วงกบ 80x200', _t: { normalized: 'วงกบ80x200' } }];
  const m2 = [
    { name: 'วงกบ 80x200', _t: { normalized: 'วงกบ80x200' } },
    { name: 'วงกบประตูไม้ 80x200cm', _t: { normalized: 'วงกบประตูไม้80x200cm' } },
  ];
  check('single member → its name', MultiBOQ.pickCanonicalName(m1) === 'วงกบ 80x200');
  check('longer name wins', MultiBOQ.pickCanonicalName(m2) === 'วงกบประตูไม้ 80x200cm');
  check('empty array → ""', MultiBOQ.pickCanonicalName([]) === '');
}

// ========== pickCommonUnit ==========
console.log('\n[pickCommonUnit]');
{
  const m1 = [{ unit: 'ชุด' }, { unit: 'ชุด' }, { unit: 'บาน' }];
  const r1 = MultiBOQ.pickCommonUnit(m1);
  check('majority = ชุด', r1.unit === 'ชุด');
  check('freq 2/3 = 0.67 → no warning', r1.warning === false);

  const m2 = [{ unit: 'ชุด' }, { unit: 'บาน' }, { unit: 'ตัว' }];
  const r2 = MultiBOQ.pickCommonUnit(m2);
  check('all different → warning', r2.warning === true);

  const m3 = [{ unit: '' }, { unit: '' }];
  const r3 = MultiBOQ.pickCommonUnit(m3);
  check('empty unit treated as ชุด', r3.unit === 'ชุด');
}

// ========== pickCommonQty ==========
console.log('\n[pickCommonQty]');
{
  const r1 = MultiBOQ.pickCommonQty([{ qty: 12 }, { qty: 12 }, { qty: 8 }]);
  check('majority qty = 12', r1.qty === 12);
  check('freq 2/3 → no warning', r1.warning === false);

  const r2 = MultiBOQ.pickCommonQty([{ qty: 12 }, { qty: 8 }, { qty: 6 }]);
  check('all different → warning', r2.warning === true);

  const r3 = MultiBOQ.pickCommonQty([{ qty: 0 }, { qty: 0 }]);
  check('qty 0 treated as 1', r3.qty === 1);
}

// ========== buildGroups — smoke test ==========
console.log('\n[buildGroups] smoke: 2 files × 3 identical items');
{
  const files = [
    { supplierName: 'A', items: [
      { name: 'วงกบประตูไม้ 80x200cm', qty: 12, unit: 'ชุด', price: 4500, total: 54000 },
      { name: 'บานประตู HDF 80x200cm', qty: 12, unit: 'บาน', price: 2200, total: 26400 },
      { name: 'ลูกบิดประตู', qty: 12, unit: 'ชุด', price: 350, total: 4200 },
    ]},
    { supplierName: 'B', items: [
      { name: 'วงกบประตูไม้ 80x200cm', qty: 12, unit: 'ชุด', price: 4400, total: 52800 },
      { name: 'บานประตู HDF 80x200cm', qty: 12, unit: 'บาน', price: 2300, total: 27600 },
      { name: 'ลูกบิดประตู', qty: 12, unit: 'ชุด', price: 340, total: 4080 },
    ]},
  ];
  const groups = MultiBOQ.buildGroups(files, 0.62);
  check('3 groups', groups.length === 3, `got ${groups.length}`);
  check('all groups have 2 members', groups.every(g => g.members.length === 2));
  check('all members are from different files', groups.every(g =>
    g.members[0].fileIdx !== g.members[1].fileIdx
  ));
  check('all scores >= 0.62', groups.every(g => g.members.every(m => m.score >= 0.62)));
}

// ========== buildGroups — partial: file-A has unique item ==========
console.log('\n[buildGroups] partial: file-A has unique item');
{
  const files = [
    { supplierName: 'A', items: [
      { name: 'วงกบประตู', qty: 12, unit: 'ชุด', price: 4500, total: 54000 },
      { name: 'สีรองพื้นพิเศษ A', qty: 5, unit: 'ถัง', price: 800, total: 4000 },  // unique
    ]},
    { supplierName: 'B', items: [
      { name: 'วงกบประตู', qty: 12, unit: 'ชุด', price: 4400, total: 52800 },
    ]},
  ];
  const groups = MultiBOQ.buildGroups(files, 0.62);
  check('2 groups (1 cluster + 1 singleton)', groups.length === 2, `got ${groups.length}`);
  check('วงกบประตู cluster has 2 members', groups.find(g => g.canonicalName === 'วงกบประตู').members.length === 2);
  check('singleton group has 1 member', groups.find(g => g.members.length === 1).members.length === 1);
}

// ========== buildGroups — threshold sensitivity ==========
console.log('\n[buildGroups] threshold sensitivity');
{
  const files = [
    { supplierName: 'A', items: [{ name: 'วงกบประตูไม้ 80x200cm ชุด', qty: 12, unit: 'ชุด', price: 4500, total: 54000 }] },
    { supplierName: 'B', items: [{ name: 'วงกบประตูไม้ 80x200cm', qty: 12, unit: 'ชุด', price: 4400, total: 52800 }] },  // minor diff
  ];
  const low = MultiBOQ.buildGroups(files, 0.10);
  check('low threshold matches minor variation', low.length === 1 && low[0].members.length === 2,
    `low got ${low.length} groups, members=${low[0]?.members?.length}`);
  // high threshold likely fails (variations reduce score) — just ensure no error
  const high = MultiBOQ.buildGroups(files, 0.95);
  check('high threshold runs without error', Array.isArray(high));
}

// ========== buildGroups — unit pre-filter ==========
console.log('\n[buildGroups] unit pre-filter: ชุด vs ตร.ม.');
{
  const files = [
    { supplierName: 'A', items: [{ name: 'วงกบประตู', qty: 12, unit: 'ชุด', price: 4500, total: 54000 }] },
    { supplierName: 'B', items: [{ name: 'วงกบประตู', qty: 12, unit: 'ตร.ม.', price: 4400, total: 52800 }] },  // different unit class
  ];
  const groups = MultiBOQ.buildGroups(files, 0.10);  // very low threshold — only unit filter can save us
  check('not clustered (unit class mismatch)', groups.length === 2 || (groups.length === 1 && groups[0].members.length === 1),
    `got ${groups.length} groups`);
}

// ========== buildGroups — ≤1 per file ==========
console.log('\n[buildGroups] ≤1 per file in each group');
{
  const files = [
    { supplierName: 'A', items: [
      { name: 'วงกบประตู', qty: 12, unit: 'ชุด', price: 4500, total: 54000 },
      { name: 'วงกบประตู 80x200', qty: 10, unit: 'ชุด', price: 4400, total: 44000 },
    ]},
    { supplierName: 'B', items: [
      { name: 'วงกบประตู 80x200cm', qty: 12, unit: 'ชุด', price: 4400, total: 52800 },
    ]},
  ];
  const groups = MultiBOQ.buildGroups(files, 0.62);
  // ทั้ง 2 items ของ A + 1 item ของ B → น่าจะกลายเป็น 2 groups (longer A's items กับ B's item, plus shorter A's item เป็น singleton)
  check('no group has 2 items from same file', groups.every(g =>
    g.members.filter(m => m.fileIdx === 0).length <= 1
  ));
}

// ========== buildVendorPriceMatrix ==========
console.log('\n[buildVendorPriceMatrix]');
{
  const groups = [
    { id: 'g1', canonicalName: 'วงกบ', unit: 'ชุด', qty: 12, members: [
      { fileIdx: 0, itemIdx: 0, score: 0.95 },
    ]},
  ];
  const files = [
    { items: [{ name: 'วงกบ', qty: 12, unit: 'ชุด', price: 4500, total: 54000 }] },
    // file 1 ไม่มี item ที่ match
  ];
  const fileOrder = ['A', 'B'];
  const matrix = MultiBOQ.buildVendorPriceMatrix(groups, files, fileOrder);
  check('A price = 4500', matrix[0].vendorPrices[0].price === 4500);
  check('B price = null (missing)', matrix[0].vendorPrices[1].price === null);
  check('B source = "none"', matrix[0].vendorPrices[1].source === 'none');
  check('winnerIdx = 0 (A เป็น winner)', matrix[0].winnerIdx === 0);
}

// ========== buildExportPayload ==========
console.log('\n[buildExportPayload]');
{
  const fakeState = {
    multiBOQ: {
      workName: 'งานวงกบประตู',
      thresholdLabel: '',
      fileOrder: ['บริษัท A', 'บริษัท B'],
      groups: [{
        canonicalName: 'วงกบประตู', unit: 'ชุด', qty: 12,
        vendorPrices: [
          { vendorName: 'บริษัท A', price: 4500, total: 54000 },
          { vendorName: 'บริษัท B', price: 4400, total: 52800 },
        ],
      }],
      terms: {},
      extraTermsVendors: [],
    },
    signatures: { preparer: [], reviewers: [], approvers: { label: '', people: [] } },
  };
  const payload = MultiBOQ.buildExportPayload(fakeState);
  check('hasBOQ = false (multi-boq)', payload.hasBOQ === false);
  check('2 vendors', payload.vendors.length === 2);
  check('vendors[0].name = บริษัท A', payload.vendors[0].name === 'บริษัท A');
  check('1 group', payload.groups.length === 1);
  check('group title includes unit', /ชุด/.test(payload.groups[0].title));
  check('group items[0].prices = [4500, 4400]',
    JSON.stringify(payload.groups[0].sections[0].items[0].prices) === '[4500,4400]');
  check('conclusionText mentions winner', /บริษัท A/.test(payload.conclusionText) || /บริษัท B/.test(payload.conclusionText));
  check('workName in payload', payload.workName === 'งานวงกบประตู');
}

// ========== buildExportPayload — with conclusionSupplier override ==========
console.log('\n[buildExportPayload] conclusion override');
{
  const fakeState = {
    multiBOQ: {
      workName: '', thresholdLabel: '', fileOrder: ['A', 'B'],
      groups: [{
        canonicalName: 'X', unit: 'ชุด', qty: 1,
        vendorPrices: [{ vendorName: 'A', price: 100 }, { vendorName: 'B', price: 90 }],
      }],
      conclusionSupplier: 'บริษัท B (เลือกเอง)',
      conclusionReason: 'คุณภาพดีกว่า',
      terms: {}, extraTermsVendors: [],
    },
    signatures: { preparer: [], reviewers: [], approvers: { label: '', people: [] } },
  };
  const payload = MultiBOQ.buildExportPayload(fakeState);
  check('conclusionText uses chosen supplier', payload.conclusionText.includes('บริษัท B'));
  check('conclusionText uses custom reason', payload.conclusionText.includes('คุณภาพดีกว่า'));
}

// ========== Performance smoke ==========
console.log('\n[performance] 6 files × 30 items');
{
  const files = [];
  for (let f = 0; f < 6; f++) {
    const items = [];
    for (let i = 0; i < 30; i++) {
      items.push({
        name: `รายการที่ ${i} แบบ ${f} 80x200cm`,
        qty: 10 + i, unit: i % 2 ? 'ชุด' : 'บาน',
        price: 1000 + (f * 100) + i,
        total: (1000 + f * 100 + i) * (10 + i),
      });
    }
    files.push({ supplierName: 'S' + f, items });
  }
  const t0 = Date.now();
  const groups = MultiBOQ.buildGroups(files, 0.62);
  const ms = Date.now() - t0;
  check('completed in < 1s', ms < 1000, `${ms} ms`);
  check('produced groups', groups.length > 0, `got ${groups.length} groups`);
  console.log(`  → ${groups.length} groups in ${ms} ms`);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Result: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
