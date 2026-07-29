#!/usr/bin/env node
/**
 * tools/update-factors-snapshot.js
 *
 * Update admin snapshot values in api/factors.js — ใช้แทนการ scrape เมื่อต้องการ
 * อัปเดตค่าน้ำมัน/แร่/ดอกเบี้ย ที่ scrape ไม่ได้หรือไม่น่าเชื่อถือ
 *
 * Usage:
 *   node tools/update-factors-snapshot.js --key oil --value 78.50 --asOf 2026-07-29
 *   node tools/update-factors-snapshot.js --key minerals --value 4250.30 --asOf 2026-07-29
 *   node tools/update-factors-snapshot.js --key bblInterest --value 6.50 --asOf 2026-07-15
 *
 *   # List current snapshot:
 *   node tools/update-factors-snapshot.js --list
 */

const fs = require('fs');
const path = require('path');

const args = require('minimist')(process.argv.slice(2));

const FACTORS_PATH = path.join(__dirname, '..', 'api', 'factors.js');
const VALID_KEYS = ['oil', 'minerals', 'bblInterest'];
const UNIT_MAP = {
  oil: 'USD/barrel',
  minerals: 'index',
  bblInterest: '% ต่อปี'
};
const NOTE_MAP = {
  oil: 'EIA STEO snapshot — admin updated',
  minerals: 'BOT Commodity Watch aggregate — admin updated',
  bblInterest: 'BOT MLR proxy (BBL loan rate อิง BOT MLR) — admin updated'
};

function readSnapshot() {
  const src = fs.readFileSync(FACTORS_PATH, 'utf8');
  const m = src.match(/const SNAPSHOT = \{([\s\S]*?)\n\};/);
  if (!m) throw new Error('ไม่พบ SNAPSHOT block ใน ' + FACTORS_PATH);
  const block = m[1];
  const out = {};
  VALID_KEYS.forEach(k => {
    const re = new RegExp(`\\s*${k}:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`);
    const km = block.match(re);
    if (km) {
      const cur = km[1].match(/current:\s*([\d.]+)/);
      const asOf = km[1].match(/asOf:\s*'([^']+)'/);
      out[k] = {
        current: cur ? Number(cur[1]) : null,
        asOf: asOf ? asOf[1] : null
      };
    }
  });
  return out;
}

function updateSnapshot(key, value, asOf) {
  if (!VALID_KEYS.includes(key)) {
    console.error('key ไม่ถูกต้อง: ' + key + ' (ใช้ได้: ' + VALID_KEYS.join(', ') + ')');
    process.exit(1);
  }
  if (!isFinite(value)) {
    console.error('value ไม่ถูกต้อง: ' + value);
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    console.error('asOf format ต้องเป็น YYYY-MM-DD: ' + asOf);
    process.exit(1);
  }

  const src = fs.readFileSync(FACTORS_PATH, 'utf8');
  // หา block ของ key
  const keyRe = new RegExp(`(\\s*${key}:\\s*\\{)([\\s\\S]*?)(\\n\\s*\\})`);
  const m = src.match(keyRe);
  if (!m) {
    console.error('ไม่พบ block สำหรับ ' + key);
    process.exit(1);
  }

  // สร้าง replacement
  const newInner = `
    current: ${value},
    currency: '${UNIT_MAP[key]}',
    asOf: '${asOf}',
    note: '${NOTE_MAP[key]}'
  `;
  const newSrc = src.replace(keyRe, '$1' + newInner + '$3');

  // backup
  const backupPath = FACTORS_PATH + '.bak';
  fs.writeFileSync(backupPath, src);
  fs.writeFileSync(FACTORS_PATH, newSrc);
  console.log('✓ อัปเดต ' + key + ' = ' + value + ' (as of ' + asOf + ')');
  console.log('  backup: ' + backupPath);
  console.log('  → ต้อง redeploy ถึงจะเห็นผลบน Vercel');
}

function listSnapshot() {
  const snap = readSnapshot();
  console.log('SNAPSHOT ปัจจุบัน:');
  VALID_KEYS.forEach(k => {
    const v = snap[k];
    if (v) {
      console.log('  ' + k.padEnd(15) + ' = ' + (v.current != null ? v.current : '?') + ' ' + UNIT_MAP[k].padEnd(12) + ' (as of ' + (v.asOf || '?') + ')');
    }
  });
}

if (args.list) {
  listSnapshot();
} else if (args.key && args.value && args.asOf) {
  updateSnapshot(args.key, Number(args.value), args.asOf);
} else {
  console.log('Usage:');
  console.log('  node tools/update-factors-snapshot.js --key <oil|minerals|bblInterest> --value <num> --asOf <YYYY-MM-DD>');
  console.log('  node tools/update-factors-snapshot.js --list');
  process.exit(1);
}