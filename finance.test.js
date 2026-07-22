'use strict';
// -*- coding: utf-8 -*-
/**
 * finance.test.js — FinanceIL unit tests
 * Run: node finance.test.js   (no Jest or external deps needed)
 *
 * Tests parseAmount() and the Excel column auto-detector
 * extracted from ExcelImport in index.html.
 */
const assert = require('assert');

// ─────────────────────────────────────────────────────────────────────────────
// Functions under test (copied verbatim from index.html ExcelImport)
// ─────────────────────────────────────────────────────────────────────────────

function parseAmount(cell) {
  if (cell === null || cell === undefined || cell === '') return 0;
  if (typeof cell === 'number') return cell;          // XLSX already parsed as number
  let s = String(cell).trim();
  const negative = s.startsWith('(') && s.endsWith(')'); // accounting format (1,234)
  s = s.replace(/[()]/g, '').replace(/,(?=\d{3})/g, ''); // remove parens + thousand-sep commas
  // Handle European decimal comma: 1.234,56 → swap dot/comma
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  s = s.replace(/[^\d.-]/g, '');                     // strip currency symbols etc.
  const n = parseFloat(s) || 0;
  return negative ? -Math.abs(n) : n;
}

/**
 * Mirrors the `find` closure in ExcelImport.handleFile:
 *   const hdr = clean[0].map(c => String(c).toLowerCase().trim().replace(/\s+/g,' '));
 *   const find = (...terms) => hdr.findIndex(h => terms.some(t => h.includes(t)));
 */
function makeFind(headers) {
  const hdr = headers.map(c => String(c).toLowerCase().trim().replace(/\s+/g, ' '));
  return (...terms) => hdr.findIndex(h => terms.some(t => h.includes(t)));
}

/** Replicates the setCols({...}) call in handleFile — must stay in sync with index.html */
function detectCols(headers) {
  const find = makeFind(headers);
  return {
    date:   find('תאריך ביצוע', 'תאריך עסקה', 'תאריך פעולה', 'תאריך', 'date', 'transaction date'),
    desc:   find('שם בית עסק', 'שם בעסק', 'שם מקור', 'פירוט', 'תיאור', 'אסמכתא', 'description', 'merchant', 'details'),
    debit:  find('חיוב בש"ח', 'סכום חיוב', 'חיוב', 'חובה', 'הוצאה', 'debit', 'withdrawal', 'minus'),
    credit: find('זכות בש"ח', 'סכום זכות', 'זכות', 'זכאות', 'הכנסה', 'credit', 'deposit', 'plus'),
    amount: find('סכום עסקה', 'סכום בש"ח', 'סכום', 'amount', 'transaction amount'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal test runner (no external deps)
// ─────────────────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    const msg = e.message || String(e);
    console.error(`  ✗ ${name}`);
    console.error(`      ${msg}`);
    failures.push({ name, msg });
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests 1-10: parseAmount
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== parseAmount ===');

test('1. XLSX numeric cell (already a number) -> returned as-is', () => {
  assert.strictEqual(parseAmount(1234.5), 1234.5);
});

test('2. Hebrew string "1,234.50" -> 1234.5', () => {
  assert.strictEqual(parseAmount('1,234.50'), 1234.5);
});

test('3. Accounting format "(1,234)" -> -1234', () => {
  assert.strictEqual(parseAmount('(1,234)'), -1234);
});

test('4. European format "1.234,56" -> 1234.56', () => {
  assert.strictEqual(parseAmount('1.234,56'), 1234.56);
});

test('5. Shekel symbol "₪1,234" -> 1234', () => {
  assert.strictEqual(parseAmount('₪1,234'), 1234);
});

test('6. Empty string -> 0', () => {
  assert.strictEqual(parseAmount(''), 0);
});

test('7. Negative string "-567.89" -> -567.89', () => {
  assert.strictEqual(parseAmount('-567.89'), -567.89);
});

test('8. Zero string "0.00" -> 0', () => {
  assert.strictEqual(parseAmount('0.00'), 0);
});

test('9. Large number "1,234,567" -> 1234567', () => {
  assert.strictEqual(parseAmount('1,234,567'), 1234567);
});

test('10. Already-negative XLSX number -500 -> -500', () => {
  assert.strictEqual(parseAmount(-500), -500);
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests 11-13: column auto-detection with real Israeli bank headers
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== Column detection ===');

test('11. Hapoalim: [תאריך ביצוע, שם מקור, חיוב, זכות, יתרה] -> correct cols', () => {
  const cols = detectCols(['תאריך ביצוע', 'שם מקור', 'חיוב', 'זכות', 'יתרה']);
  assert.strictEqual(cols.date,    0, 'date col should be 0');
  assert.strictEqual(cols.desc,    1, 'desc col should be 1');
  assert.strictEqual(cols.debit,   2, 'debit col should be 2');
  assert.strictEqual(cols.credit,  3, 'credit col should be 3');
  assert.strictEqual(cols.amount, -1, 'amount col should be -1 (use debit/credit)');
});

test('12. Leumi: [תאריך, פירוט, חובה, זכות, יתרה] -> correct cols', () => {
  const cols = detectCols(['תאריך', 'פירוט', 'חובה', 'זכות', 'יתרה']);
  assert.strictEqual(cols.date,    0, 'date col should be 0');
  assert.strictEqual(cols.desc,    1, 'desc col should be 1');
  assert.strictEqual(cols.debit,   2, 'debit col should be 2');
  assert.strictEqual(cols.credit,  3, 'credit col should be 3');
  assert.strictEqual(cols.amount, -1, 'amount col should be -1 (use debit/credit)');
});

test('13. Max: [תאריך עסקה, שם בית עסק, סכום עסקה, מטבע] -> correct cols', () => {
  const cols = detectCols(['תאריך עסקה', 'שם בית עסק', 'סכום עסקה', 'מטבע']);
  assert.strictEqual(cols.date,    0, 'date col should be 0');
  assert.strictEqual(cols.desc,    1, 'desc col should be 1');
  assert.strictEqual(cols.debit,  -1, 'debit col should be -1');
  assert.strictEqual(cols.credit, -1, 'credit col should be -1');
  assert.strictEqual(cols.amount,  2, 'amount col should be 2 (single-amount col)');
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed${failed > 0 ? ' ⚠' : ' ✓'}`);
if (failures.length) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  - ${f.name}`));
  process.exit(1);
}
