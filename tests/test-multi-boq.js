// tests/test-multi-boq.js
// ทดสอบ pure functions ใน multi-boq.js
// โหลด FuzzyMatchSAP (UMD) แล้ว expose เป็น globalThis.FuzzyMatchSAP
// แล้ว require multi-boq.js (UMD)

const path = require('path');

// โหลด fuzzy-match-sap เป็น globalThis (UMD ตรวจ window แต่ใน node ไม่มี)
globalThis.window = globalThis;
require('../js/fuzzy-match-sap.js');
const MultiBOQ = require('../js/multi-boq.js');
// ใน browser MultiBOQ ถูก expose ผ่าน window.MultiBOQ — replicate ใน node เพื่อให้ test path
// resolution (SupplierCompareState → MultiBOQ._stateRef) ทำงานได้
globalThis.MultiBOQ = MultiBOQ;

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

// ========== Slots API — UI ordering layer (max MAX_SUPPLIERS=6) ==========
console.log('\n[MAX_SUPPLIERS constant]');
{
  check('MAX_SUPPLIERS = 6', MultiBOQ.MAX_SUPPLIERS === 6);
}

// helper: build minimal state for slot tests
function mkState(initial) {
  return {
    multiBOQ: Object.assign({
      workName: '', thresholdLabel: '',
      files: [], groups: [], fileOrder: [],
      matchThreshold: 0.62,
      conclusionSupplier: '', conclusionReason: '',
      terms: {}, extraTermsVendors: [],
      slots: [],
    }, initial || {}),
  };
}

console.log('\n[ensureSlots — from empty state]');
{
  const state = mkState();
  MultiBOQ.ensureSlots(state);
  check('เพิ่มให้ ≥2 slots ตอนเริ่มต้น', state.multiBOQ.slots.length === 2);
  check('slot ว่างมี id (s...)', state.multiBOQ.slots.every(s => /^s[a-z0-9]{4,}/i.test(s.id)));
  check('empty slot.fileId = null', state.multiBOQ.slots.every(s => s.fileId === null));
  check('empty slot.supplierName = ""', state.multiBOQ.slots.every(s => s.supplierName === ''));
}

console.log('\n[ensureSlots — migrate legacy files-only state]');
{
  // state เก่า: มี files แต่ไม่มี slots → ต้อง sync จาก files
  const state = mkState({
    files: [
      { id: 'f1', fileName: 'a.xlsx', supplierName: 'A เก่า', items: [{ name: 'x', qty: 1, unit: 'ชุด', price: 1, total: 1 }] },
      { id: 'f2', fileName: 'b.xlsx', supplierName: 'B เก่า', items: [] },
    ],
  });
  MultiBOQ.ensureSlots(state);
  check('migrated 2 slots', state.multiBOQ.slots.length === 2);
  check('slot[0] ผูก file f1', state.multiBOQ.slots[0].fileId === 'f1');
  check('slot[1] ผูก file f2', state.multiBOQ.slots[1].fileId === 'f2');
  check('slot[0].supplierName = "A เก่า"', state.multiBOQ.slots[0].supplierName === 'A เก่า');
}

console.log('\n[ensureSlots — prune orphan slots ที่ fileId หายไปแล้ว]');
{
  const state = mkState({
    files: [{ id: 'f1', fileName: 'a.xlsx', supplierName: 'A', items: [] }],
    slots: [
      { id: 's1', supplierName: 'A', fileId: 'f1' },
      { id: 's2', supplierName: 'ghost', fileId: 'fGHOST' },  // orphan
    ],
  });
  MultiBOQ.ensureSlots(state);
  check('orphan slot ถูก prune', !state.multiBOQ.slots.some(s => s.fileId === 'fGHOST'));
  check('filled slot ยังอยู่', state.multiBOQ.slots.some(s => s.fileId === 'f1'));
}

console.log('\n[ensureSlots — cap ที่ MAX_SUPPLIERS]');
{
  const files = [];
  for (let i = 1; i <= 8; i++) files.push({ id: 'f' + i, fileName: i + '.xlsx', supplierName: 'S' + i, items: [] });
  const slots = files.map(f => ({ id: 's' + f.id, supplierName: f.supplierName, fileId: f.id }));
  const state = mkState({ files, slots });
  MultiBOQ.ensureSlots(state);
  check('slots.slice(MAX_SUPPLIERS)', state.multiBOQ.slots.length === 6);
}

console.log('\n[ensureSlots — pad empty จน ≥2 slots]');
{
  const state = mkState({
    files: [{ id: 'f1', fileName: 'a.xlsx', supplierName: 'A', items: [] }],
    slots: [{ id: 's1', supplierName: 'A', fileId: 'f1' }],
  });
  MultiBOQ.ensureSlots(state);
  check('เพิ่ม empty slot จนครบ 2', state.multiBOQ.slots.length === 2);
  check('slot[0] filled', state.multiBOQ.slots[0].fileId === 'f1');
  check('slot[1] empty', state.multiBOQ.slots[1].fileId === null);
}

console.log('\n[addSlot]');
{
  const state = mkState();
  MultiBOQ.ensureSlots(state);
  const before = state.multiBOQ.slots.length;
  const ok = MultiBOQ.addSlot(state);
  check('addSlot คืน true', ok === true);
  check('slots +1', state.multiBOQ.slots.length === before + 1);
  check('slot ใหม่มี id', !!state.multiBOQ.slots[before].id);
  check('slot ใหม่ empty', state.multiBOQ.slots[before].fileId === null);
}

console.log('\n[addSlot — cap]');
{
  // สร้าง state 6 slots เต็ม
  const slots = [];
  for (let i = 0; i < 6; i++) slots.push({ id: 's' + i, supplierName: 'S' + i, fileId: null });
  const state = mkState({ slots });
  const ok = MultiBOQ.addSlot(state);
  check('addSlot คืน false เมื่อครบ MAX', ok === false);
  check('slots ไม่เพิ่ม', state.multiBOQ.slots.length === 6);
}

console.log('\n[removeSlot — empty]');
{
  const state = mkState();
  MultiBOQ.ensureSlots(state);
  const before = state.multiBOQ.slots.length;
  MultiBOQ.removeSlot(state, 0);  // ลบ empty slot
  // หลังลบ empty + ensureSlots pad ถึง ≥2 → ผลลัพธ์ควรยังเป็น ≥2
  check('slots ยังมีอย่างน้อย 2 หลังลบ empty', state.multiBOQ.slots.length >= 2);
}

console.log('\n[removeSlot — filled (ลบ file ที่ผูกด้วย)]');
{
  const state = mkState({
    files: [
      { id: 'f1', fileName: 'a.xlsx', supplierName: 'A', items: [{ name: 'x', qty: 1, unit: 'ชุด', price: 1, total: 1 }] },
      { id: 'f2', fileName: 'b.xlsx', supplierName: 'B', items: [] },
    ],
    slots: [
      { id: 's1', supplierName: 'A', fileId: 'f1' },
      { id: 's2', supplierName: 'B', fileId: 'f2' },
    ],
  });
  MultiBOQ.removeSlot(state, 0);
  check('files เหลือ 1', state.multiBOQ.files.length === 1);
  check('file ที่เหลือ = f2', state.multiBOQ.files[0].id === 'f2');
  check('fileOrder ลบ A ออก', !state.multiBOQ.fileOrder.includes('A'));
  check('fileOrder ยังมี B', state.multiBOQ.fileOrder.includes('B'));
  check('groups ถูก reset', state.multiBOQ.groups.length === 0);
}

console.log('\n[removeSlot — clear conclusionSupplier ที่ชี้ไป supplier ที่เพิ่งลบ]');
{
  const state = mkState({
    files: [{ id: 'f1', fileName: 'a.xlsx', supplierName: 'บริษัท A', items: [] }],
    fileOrder: ['บริษัท A'],
    conclusionSupplier: 'บริษัท A',
    slots: [{ id: 's1', supplierName: 'บริษัท A', fileId: 'f1' }],
  });
  MultiBOQ.removeSlot(state, 0);
  check('conclusionSupplier ถูก clear', state.multiBOQ.conclusionSupplier === '');
}

console.log('\n[setSlotSupplierName — filled slot]');
{
  const state = mkState({
    files: [{ id: 'f1', fileName: 'a.xlsx', supplierName: 'A เก่า', items: [] }],
    fileOrder: ['A เก่า'],
    conclusionSupplier: 'A เก่า',
    slots: [{ id: 's1', supplierName: 'A เก่า', fileId: 'f1' }],
  });
  MultiBOQ.setSlotSupplierName(state, 0, 'A ใหม่');
  check('slot.supplierName updated', state.multiBOQ.slots[0].supplierName === 'A ใหม่');
  check('file.supplierName updated', state.multiBOQ.files[0].supplierName === 'A ใหม่');
  check('fileOrder updated', state.multiBOQ.fileOrder[0] === 'A ใหม่');
  check('conclusionSupplier updated', state.multiBOQ.conclusionSupplier === 'A ใหม่');
}

console.log('\n[setSlotSupplierName — empty slot (กรณีตั้งชื่อล่วงหน้า)]');
{
  const state = mkState({
    slots: [{ id: 's1', supplierName: '', fileId: null }],
  });
  MultiBOQ.setSlotSupplierName(state, 0, 'บริษัท X');
  check('slot.supplierName = "บริษัท X"', state.multiBOQ.slots[0].supplierName === 'บริษัท X');
  check('fileOrder push "บริษัท X"', state.multiBOQ.fileOrder.includes('บริษัท X'));
}

console.log('\n[syncSlotsToFiles — reorder files ตาม slot]');
{
  const state = mkState({
    // files มาก่อน slot (ลำดับสลับ)
    files: [
      { id: 'fB', fileName: 'b.xlsx', supplierName: 'B', items: [] },
      { id: 'fA', fileName: 'a.xlsx', supplierName: 'A', items: [] },
    ],
    slots: [
      { id: 's1', supplierName: 'A', fileId: 'fA' },
      { id: 's2', supplierName: 'B', fileId: 'fB' },
    ],
  });
  MultiBOQ.syncSlotsToFiles(state);
  check('files[0] = fA ตาม slot order', state.multiBOQ.files[0].id === 'fA');
  check('files[1] = fB', state.multiBOQ.files[1].id === 'fB');
  check('fileOrder = [A, B]', JSON.stringify(state.multiBOQ.fileOrder) === '["A","B"]');
}

// ========== renderSlotGrid markup — ตรวจ HTML output ==========
console.log('\n[renderSlotGrid markup — empty state]');
{
  const state = mkState();
  MultiBOQ.ensureSlots(state);
  // renderSlotGrid อ่านจาก window.__multiBOQState ในโหมด legacy หรือ window.SupplierCompareState
  // ใน node environment — เลียนแบบโดยส่ง state ผ่าน window.SupplierCompareState
  globalThis.SupplierCompareState = state;
  const html = MultiBOQ.renderSlotGrid();
  check('มี .supplier-slot-grid', /class="supplier-slot-grid"/.test(html));
  check('มี 2 empty drop zones', (html.match(/supplier-slot-empty/g) || []).length === 2);
  check('มีปุ่มเพิ่มช่อง', /slot-add-card/.test(html));
  check('มี drop zone text', /ลากไฟล์/.test(html));
  check('มี hint ตอน empty ทั้งหมด', /ลากไฟล์ BOQ/.test(html));
  // ปุ่ม × ลบช่องว่าง (เพิ่มให้ undo เผื่อกด "+" เกิน)
  check('มีปุ่ม × ลบช่อง (slot-remove-empty) ใน empty drop zone',
    /class="slot-remove slot-remove-empty"/.test(html));
  check('ปุ่ม × ลบช่องมี title="ลบช่องว่างนี้"',
    /title="ลบช่องว่างนี้"/.test(html));
  check('empty slot ทั้ง 2 ช่องต่างก็มีปุ่ม × ลบ',
    (html.match(/slot-remove-empty/g) || []).length === 2);
  check('ปุ่ม × ลบช่องเรียก removeSupplierSlot handler',
    /removeSupplierSlot\(0\)[\s\S]*slot-remove-empty[\s\S]*removeSupplierSlot\(1\)|removeSupplierSlot\(1\)[\s\S]*slot-remove-empty[\s\S]*removeSupplierSlot\(0\)/.test(html));
}

console.log('\n[renderSlotGrid markup — filled state]');
{
  const state = mkState({
    files: [
      { id: 'f1', fileName: 'a.xlsx', supplierName: 'บริษัท A', items: [{ name: 'x', qty: 1, unit: 'ชุด', price: 1, total: 1 }] },
      { id: 'f2', fileName: 'b.xlsx', supplierName: 'บริษัท B', items: [] },
    ],
    slots: [
      { id: 's1', supplierName: 'บริษัท A', fileId: 'f1' },
      { id: 's2', supplierName: 'บริษัท B', fileId: 'f2' },
    ],
  });
  globalThis.SupplierCompareState = state;
  const html = MultiBOQ.renderSlotGrid();
  check('มี 2 filled slots', (html.match(/supplier-slot-filled/g) || []).length === 2);
  check('ไม่มี empty drop zone (filled ครบ)', !/supplier-slot-empty/.test(html));
  check('มี compare button', /ทำการเปรียบเทียบราคา/.test(html));
  check('มี threshold slider', /type="range"/.test(html));
  check('count 2/2 ใน compare button', /compare-count"[^>]*>2\/2/.test(html));
  check('มี runMatching handler ใน compare button', /runMatching\(\)/.test(html));
}

console.log('\n[renderSlotGrid markup — partial (1 filled, 1 empty)]');
{
  const state = mkState({
    files: [{ id: 'f1', fileName: 'a.xlsx', supplierName: 'บริษัท A', items: [{ name: 'x', qty: 1, unit: 'ชุด', price: 1, total: 1 }] }],
    slots: [
      { id: 's1', supplierName: 'บริษัท A', fileId: 'f1' },
      { id: 's2', supplierName: '', fileId: null },
    ],
  });
  globalThis.SupplierCompareState = state;
  const html = MultiBOQ.renderSlotGrid();
  check('1 filled', (html.match(/supplier-slot-filled/g) || []).length === 1);
  check('1 empty', (html.match(/supplier-slot-empty/g) || []).length === 1);
  check('hint แทน compare button (เพราะ < 2 filled)', /อัปโหลดอีกอย่างน้อย 1/.test(html));
  check('ไม่มีปุ่ม ทำการเปรียบเทียบราคา (disabled)', !/ทำการเปรียบเทียบราคา/.test(html));
}

console.log('\n[renderSlotGrid markup — cap ที่ MAX_SUPPLIERS = 6]');
{
  const slots = [];
  for (let i = 0; i < 6; i++) slots.push({ id: 's' + i, supplierName: 'S' + i, fileId: null });
  const state = mkState({ slots });
  globalThis.SupplierCompareState = state;
  const html = MultiBOQ.renderSlotGrid();
  check('6 empty slots', (html.match(/supplier-slot-empty/g) || []).length === 6);
  check('ไม่มีปุ่มเพิ่มช่อง (ครบ MAX)', !/slot-add-card/.test(html));
}

console.log('\n[renderSlotGrid markup — has click handlers ผูก controller methods]');
{
  const state = mkState({
    files: [{ id: 'f1', fileName: 'a.xlsx', supplierName: 'A', items: [] }],
    slots: [
      { id: 's1', supplierName: 'A', fileId: 'f1' },
      { id: 's2', supplierName: '', fileId: null },
    ],
  });
  globalThis.SupplierCompareState = state;
  const html = MultiBOQ.renderSlotGrid();
  check('removeSupplierSlot(0) handler', /removeSupplierSlot\(0\)/.test(html));
  check('openSlotFilePicker(1) handler', /openSlotFilePicker\(1\)/.test(html));
  check('updateSlotSupplierName(0, ...) handler', /updateSlotSupplierName\(0, this\.value\)/.test(html));
  check('addSupplierSlot handler', /addSupplierSlot\(\)/.test(html));
}

// ========== compatibility: legacy renderFileList still works ==========
console.log('\n[renderFileList = renderSlotGrid (alias)]');
{
  // renderFileList ถูกเก็บเป็น alias เพื่อ back-compat — ต้อง return ผลเดียวกัน
  // ทดสอบโดยเรียกทั้ง 2 ตัวด้วย state เดียวกัน
  globalThis.SupplierCompareState = mkState();
  MultiBOQ.ensureSlots(globalThis.SupplierCompareState);
  const a = MultiBOQ.renderFileList();
  const b = MultiBOQ.renderSlotGrid();
  check('renderFileList === renderSlotGrid', a === b);
}

console.log('\n[renderSlotGrid — fallback resolution ลำดับสำคัญ]');
{
  // 1) SupplierCompareState (legacy alias)
  if (globalThis.MultiBOQ) globalThis.MultiBOQ._stateRef = null;
  globalThis.SupplierCompareState = mkState();
  MultiBOQ.ensureSlots(globalThis.SupplierCompareState);
  const htmlViaSCS = MultiBOQ.renderSlotGrid();
  check('path 1: SupplierCompareState → มี grid', /supplier-slot-grid/.test(htmlViaSCS));

  // 2) ลบ SupplierCompareState → fallback ผ่าน MultiBOQ._stateRef
  globalThis.SupplierCompareState = null;
  if (globalThis.MultiBOQ) {
    globalThis.MultiBOQ._stateRef = mkState();
    MultiBOQ.ensureSlots(globalThis.MultiBOQ._stateRef);
  }
  const htmlViaSR = MultiBOQ.renderSlotGrid();
  check('path 2: MultiBOQ._stateRef → มี grid', /supplier-slot-grid/.test(htmlViaSR));

  // 3) ไม่มี state → fallback ไป renderUploadPrompt (ไม่ crash)
  if (globalThis.MultiBOQ) globalThis.MultiBOQ._stateRef = null;
  globalThis.SupplierCompareState = null;
  const htmlFallback = MultiBOQ.renderSlotGrid();
  check('path 3: ไม่มี state → fallback upload prompt (ไม่ crash)',
    /อัปโหลด BOQ จากผู้ขาย 2-6/.test(htmlFallback));

  // cleanup
  globalThis.SupplierCompareState = undefined;
  if (globalThis.MultiBOQ) globalThis.MultiBOQ._stateRef = undefined;
}

// ========== parseSupplierFile — parseSimpleBOQ lookup ==========
// ตรวจว่า resolve parseSimpleBOQ ได้จากทั้ง 2 แหล่ง (multi-boq.js โหลดก่อน supplier-comparison.js)
console.log('\n[parseSupplierFile] resolve parseSimpleBOQ fallback ลำดับสำคัญ');
{
  // mock XLSX ให้ผ่าน check sheet แล้วไปถึง parseSimpleBOQ
  const XLSXmock = {
    read: () => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } }),
    utils: { sheet_to_json: () => [[]] },
  };

  // helper: assert error matches
  const expectError = (label, fn, pattern) => {
    let err = null;
    try { fn(); } catch (e) { err = e; }
    check(label, !!err && pattern.test(err.message),
      err ? `got: ${err.message}` : 'no error thrown');
  };

  // 1) ไม่มี parseSimpleBOQ ทั้ง 2 path → throw "parseSimpleBOQ ไม่พร้อมใช้งาน"
  globalThis.SupplierCompareHelpers = undefined;
  globalThis.parseSimpleBOQ = undefined;
  globalThis.XLSX = XLSXmock;
  expectError('ไม่มี parseSimpleBOQ → throw error ที่ชัดเจน',
    () => MultiBOQ.parseSupplierFile(new ArrayBuffer(0), { fileName: 't.xlsx' }),
    /parseSimpleBOQ ไม่พร้อมใช้งาน/);

  // 2) มีแค่ window.SupplierCompareHelpers.parseSimpleBOQ → resolve ได้
  globalThis.SupplierCompareHelpers = {
    parseSimpleBOQ: () => { throw new Error('mock parse reached via Helpers'); },
  };
  globalThis.parseSimpleBOQ = undefined;
  expectError('SupplierCompareHelpers.parseSimpleBOQ ถูกเรียก (mock throw ตอน parse)',
    () => MultiBOQ.parseSupplierFile(new ArrayBuffer(0), { fileName: 't.xlsx' }),
    /mock parse reached via Helpers/);

  // 3) มีแค่ globalThis.parseSimpleBOQ → ก็ resolve ได้
  globalThis.SupplierCompareHelpers = {};
  globalThis.parseSimpleBOQ = () => { throw new Error('via bare global'); };
  expectError('bare globalThis.parseSimpleBOQ ก็ถูก resolve',
    () => MultiBOQ.parseSupplierFile(new ArrayBuffer(0), { fileName: 't.xlsx' }),
    /via bare global/);

  // 4) XLSX ไม่โหลด → throw "XLSX library"
  globalThis.XLSX = undefined;
  expectError('XLSX ไม่โหลด → throw',
    () => MultiBOQ.parseSupplierFile(new ArrayBuffer(0), { fileName: 't.xlsx' }),
    /XLSX library/);

  // cleanup
  globalThis.SupplierCompareHelpers = undefined;
  globalThis.parseSimpleBOQ = undefined;
  globalThis.XLSX = XLSX;
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Result: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
