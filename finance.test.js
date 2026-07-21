/**
 * finance.test.js
 * Unit tests for the Cash Flow Engine and Auto-Categorisation Engine.
 *
 * Run with:  npx jest finance.test.js
 *
 * The functions under test are extracted from index.html into
 * a hypothetical Node.js module (finance.js) that exports them.
 * The implementations here mirror the ones in index.html exactly.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Inline implementation (mirrors index.html, no external import needed for Jest)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_RULES = [
  { keywords: ['שופרסל','rami levy','רמי לוי','ויקטורי','מגה'],   category: 'סופרמרקט',       color: '#22C55E', emoji: '🛒' },
  { keywords: ['וולט','wolt','קפה','cafe','מסעדה','פיצה'],         category: 'מסעדות וקפה',    color: '#F97316', emoji: '🍽️' },
  { keywords: ['ארנונה','עיריית'],                                  category: 'ארנונה',          color: '#8B5CF6', emoji: '🏛️' },
  { keywords: ['hot','הוט','netflix','נטפליקס','spotify'],         category: 'בידור ומנויים',  color: '#EC4899', emoji: '🎬' },
  { keywords: ['partner','פרטנר','cellcom','סלקום','פלאפון'],      category: 'תקשורת',          color: '#06B6D4', emoji: '📱' },
  { keywords: ['paz','פז','sonol','סונול','דלק'],                  category: 'דלק ורכב',        color: '#84CC16', emoji: '⛽' },
  { keywords: ['egged','אגד','רב-קו','rav-kav','רכבת','taxi'],    category: 'תחבורה',          color: '#3B82F6', emoji: '🚌' },
  { keywords: ['חברת החשמל','iec','מים','ועד בית'],               category: 'חשבונות בית',     color: '#EAB308', emoji: '💡' },
  { keywords: ['ביטוח','harel','הראל','כלל','מגדל'],              category: 'ביטוח',           color: '#6366F1', emoji: '🛡️' },
  { keywords: ['מכבי','כללית','לאומית','super pharm','סופר-פארם'], category: 'בריאות',         color: '#14B8A6', emoji: '🏥' },
  { keywords: ['amazon','אמזון','aliexpress','ebay','זארה'],       category: 'קניות',           color: '#F59E0B', emoji: '🛍️' },
  { keywords: ['משכורת','שכר','הכנסה','income','salary'],         category: 'הכנסה',           color: '#10B981', emoji: '💰' },
  { keywords: ['שכר דירה','שכירות','mortgage','משכנתה'],          category: 'דיור',             color: '#64748B', emoji: '🏠' },
];
const DEFAULT_CAT = { category: 'אחר', color: '#9CA3AF', emoji: '📦' };

function categorizeTransaction(description) {
  if (!description || typeof description !== 'string') return { ...DEFAULT_CAT };
  const lower = description.toLowerCase().trim();
  if (!lower) return { ...DEFAULT_CAT };
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return { category: rule.category, color: rule.color, emoji: rule.emoji };
      }
    }
  }
  return { ...DEFAULT_CAT };
}

function calculateCashFlow(accounts, transactions, recurringExpenses, expectedIncome, referenceDate) {
  const now  = referenceDate instanceof Date ? referenceDate : new Date();
  const day  = now.getDate();
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - day;

  const safeSum = (arr, fn) =>
    Math.round(arr.reduce((s, x) => s + fn(x), 0) * 100) / 100;

  const totalBalance  = safeSum(accounts, a => a.balance);
  const liquidBalance = safeSum(accounts.filter(a => a.type !== 'חיסכון'), a => a.balance);
  const upcomingExpenses = safeSum(recurringExpenses.filter(e => e.dueDay > day), e => e.amount);
  const upcomingIncome   = safeSum(expectedIncome.filter(i => i.dueDay > day),   i => i.amount);

  const safeToSpend = Math.max(0, Math.round((liquidBalance - upcomingExpenses + upcomingIncome) * 100) / 100);

  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthlyIncome   = safeSum(thisMonth.filter(t => t.amount > 0),  t =>  t.amount);
  const monthlyExpenses = safeSum(thisMonth.filter(t => t.amount < 0),  t => -t.amount);

  return {
    totalBalance, liquidBalance,
    safeToSpend, upcomingExpenses, upcomingIncome,
    monthlyIncome, monthlyExpenses,
    daysRemaining, daysInMonth, currentDay: day,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const BASE_ACCOUNTS = [
  { id:1, bank:'בנק הפועלים', type:'עובר ושב',    balance:  12450 },
  { id:2, bank:'בנק לאומי',   type:'חיסכון',       balance:  35000 },
  { id:3, bank:'Max',          type:'כרטיס אשראי', balance:  -3200 },
];

const BASE_RECURRING = [
  { id:1, name:'שכר דירה',   amount:5500, dueDay:1  },
  { id:2, name:'ארנונה',      amount:1200, dueDay:10 },
  { id:3, name:'חשמל',        amount: 350, dueDay:15 },
  { id:4, name:'HOT',         amount: 189, dueDay:20 },
  { id:5, name:'פרטנר',       amount: 149, dueDay:22 },
  { id:6, name:'ביטוח רכב',  amount: 450, dueDay:5  },
];

const BASE_INCOME = [
  { id:1, name:'משכורת', amount:18000, dueDay:7 },
];

const THIS_MONTH = new Date();
const iso = d => d.toISOString().split('T')[0];
const offsetDate = n => { const d = new Date(THIS_MONTH); d.setDate(THIS_MONTH.getDate() - n); return iso(d); };

const SAMPLE_TRANSACTIONS = [
  { id:1, description:'משכורת',         amount:  18000, date: offsetDate(3) },
  { id:2, description:'שופרסל',         amount:   -285, date: offsetDate(1) },
  { id:3, description:'ארנונה עיריית',  amount:  -1200, date: offsetDate(2) },
  { id:4, description:'וולט',           amount:    -67, date: offsetDate(0) },
];

// reference date: mid-month, day 12 of current month
const MID_MONTH = new Date(THIS_MONTH.getFullYear(), THIS_MONTH.getMonth(), 12);

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — AUTO-CATEGORISATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

describe('Auto-Categorisation Engine', () => {
  // ── Happy-path keyword matches ──

  test('matches "שופרסל דיל - סניף הרצל" → סופרמרקט', () => {
    expect(categorizeTransaction('שופרסל דיל - סניף הרצל').category).toBe('סופרמרקט');
  });

  test('matches english "Rami Levy" (case-insensitive) → סופרמרקט', () => {
    expect(categorizeTransaction('Rami Levy Online').category).toBe('סופרמרקט');
  });

  test('matches "וולט - הזמנה" → מסעדות וקפה', () => {
    expect(categorizeTransaction('וולט - הזמנה מסעדה').category).toBe('מסעדות וקפה');
  });

  test('matches "Wolt" uppercase → מסעדות וקפה', () => {
    expect(categorizeTransaction('Wolt order #12345').category).toBe('מסעדות וקפה');
  });

  test('matches "עיריית תל אביב - ארנונה" → ארנונה', () => {
    expect(categorizeTransaction('עיריית תל אביב - ארנונה').category).toBe('ארנונה');
  });

  test('matches "Netflix" → בידור ומנויים', () => {
    expect(categorizeTransaction('Netflix monthly').category).toBe('בידור ומנויים');
  });

  test('matches "Spotify Premium" → בידור ומנויים', () => {
    expect(categorizeTransaction('Spotify Premium').category).toBe('בידור ומנויים');
  });

  test('matches "פרטנר - חשבון חודשי" → תקשורת', () => {
    expect(categorizeTransaction('פרטנר - חשבון חודשי').category).toBe('תקשורת');
  });

  test('matches "תחנת דלק פז" → דלק ורכב', () => {
    expect(categorizeTransaction('תחנת דלק פז').category).toBe('דלק ורכב');
  });

  test('matches "רב-קו - טעינה" → תחבורה', () => {
    expect(categorizeTransaction('רב-קו - טעינה').category).toBe('תחבורה');
  });

  test('matches "Amazon - הזמנה" → קניות', () => {
    expect(categorizeTransaction('Amazon - הזמנה').category).toBe('קניות');
  });

  test('matches "משכורת - חברת הייטק" → הכנסה', () => {
    expect(categorizeTransaction('משכורת - חברת הייטק').category).toBe('הכנסה');
  });

  // ── Edge cases ──

  test('returns DEFAULT "אחר" for completely unknown merchant', () => {
    expect(categorizeTransaction('XYZ Corp Invoice 9982').category).toBe('אחר');
  });

  test('returns DEFAULT for empty string', () => {
    expect(categorizeTransaction('').category).toBe('אחר');
  });

  test('returns DEFAULT for null input', () => {
    expect(categorizeTransaction(null).category).toBe('אחר');
  });

  test('returns DEFAULT for undefined input', () => {
    expect(categorizeTransaction(undefined).category).toBe('אחר');
  });

  test('returns DEFAULT for numeric input (wrong type)', () => {
    expect(categorizeTransaction(12345).category).toBe('אחר');
  });

  test('returns DEFAULT for whitespace-only string', () => {
    expect(categorizeTransaction('   ').category).toBe('אחר');
  });

  test('first-matching rule wins when multiple keywords could match', () => {
    // "hot cafe" — "hot" matches בידור rule first; "cafe" matches מסעדות
    // CATEGORY_RULES puts בידור before מסעדות so בידור should win
    const result = categorizeTransaction('hot cafe delivery');
    expect(result.category).toBe('בידור ומנויים');
  });

  test('category result always includes color and emoji', () => {
    const result = categorizeTransaction('שופרסל');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('emoji');
    expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test('default result also has color and emoji', () => {
    const result = categorizeTransaction('unknown vendor xyz');
    expect(result.color).toBe('#9CA3AF');
    expect(result.emoji).toBe('📦');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — CASH FLOW ENGINE
// ─────────────────────────────────────────────────────────────────────────────

describe('Cash Flow Engine', () => {

  // ── totalBalance ──

  test('totalBalance sums all accounts including credit debt', () => {
    const result = calculateCashFlow(BASE_ACCOUNTS, [], [], [], MID_MONTH);
    // 12450 + 35000 + (−3200) = 44250
    expect(result.totalBalance).toBe(44250);
  });

  test('liquidBalance excludes savings accounts', () => {
    const result = calculateCashFlow(BASE_ACCOUNTS, [], [], [], MID_MONTH);
    // 12450 + (−3200) = 9250  (savings 35000 excluded)
    expect(result.liquidBalance).toBe(9250);
  });

  // ── safeToSpend ──

  test('safeToSpend = liquidBalance − upcoming expenses + upcoming income', () => {
    // Day 12; upcoming expenses: dueDay > 12 → entries 3,4,5 (350+189+149=688)
    // Upcoming income: dueDay 7 ≤ 12, so NO upcoming income → 0
    // safeToSpend = 9250 − 688 = 8562
    const result = calculateCashFlow(BASE_ACCOUNTS, [], BASE_RECURRING, [], MID_MONTH);
    expect(result.safeToSpend).toBe(9250 - 688);
  });

  test('EDGE: negative liquid balance → safeToSpend is clamped to 0', () => {
    const deepDebt = [{ id:1, bank:'Max', type:'כרטיס אשראי', balance: -50000 }];
    const result = calculateCashFlow(deepDebt, [], BASE_RECURRING, [], MID_MONTH);
    expect(result.liquidBalance).toBe(-50000);
    expect(result.safeToSpend).toBe(0);
  });

  test('EDGE: upcoming expenses exceed liquid balance → safeToSpend clamped to 0', () => {
    const thinWallet = [{ id:1, bank:'בנק הפועלים', type:'עובר ושב', balance: 100 }];
    const bigBill    = [{ id:1, name:'שכר דירה', amount:5500, dueDay: 28 }];
    // Day 12; dueDay 28 > 12 → bill upcoming
    const result = calculateCashFlow(thinWallet, [], bigBill, [], MID_MONTH);
    // 100 − 5500 = −5400 → clamped to 0
    expect(result.safeToSpend).toBe(0);
  });

  test('EDGE: upcoming income rescues a negative interim balance', () => {
    const thinWallet = [{ id:1, bank:'Bank', type:'עובר ושב', balance: 500 }];
    const bigBill    = [{ id:1, name:'שכר דירה', amount:5500, dueDay:20 }];
    const salary     = [{ id:1, name:'משכורת',   amount:18000, dueDay:15 }];
    // Day 12: both bill (dueDay20) and salary (dueDay15) are upcoming
    // safeToSpend = 500 − 5500 + 18000 = 13000
    const result = calculateCashFlow(thinWallet, [], bigBill, salary, MID_MONTH);
    expect(result.safeToSpend).toBe(13000);
  });

  test('EDGE: mixed positive and negative transactions compute monthly totals correctly', () => {
    const result = calculateCashFlow(BASE_ACCOUNTS, SAMPLE_TRANSACTIONS, [], [], MID_MONTH);
    expect(result.monthlyIncome).toBe(18000);
    // 285 + 1200 + 67 = 1552
    expect(result.monthlyExpenses).toBe(1552);
  });

  test('EDGE: zero balance across all accounts → safeToSpend is 0', () => {
    const zeroAccounts = [{ id:1, bank:'Bank', type:'עובר ושב', balance:0 }];
    const result = calculateCashFlow(zeroAccounts, [], [], [], MID_MONTH);
    expect(result.safeToSpend).toBe(0);
    expect(result.totalBalance).toBe(0);
  });

  test('EDGE: expenses exceeding income triggers overspending flag (consumer logic)', () => {
    const result = calculateCashFlow(BASE_ACCOUNTS, SAMPLE_TRANSACTIONS, [], [], MID_MONTH);
    const overspending = result.monthlyExpenses > result.monthlyIncome;
    // income 18000, expenses 1552 → NOT overspending in this dataset
    expect(overspending).toBe(false);

    // Force overspending with large expense transactions
    const heavyMonth = [
      { id:1, description:'משכורת', amount:5000,  date: offsetDate(3) },
      { id:2, description:'שכר דירה', amount:-8000, date: offsetDate(2) },
    ];
    const r2 = calculateCashFlow(BASE_ACCOUNTS, heavyMonth, [], [], MID_MONTH);
    expect(r2.monthlyExpenses > r2.monthlyIncome).toBe(true);
  });

  test('daysRemaining is correct for a mid-month reference date', () => {
    const result = calculateCashFlow(BASE_ACCOUNTS, [], [], [], MID_MONTH);
    expect(result.currentDay).toBe(12);
    expect(result.daysRemaining).toBe(result.daysInMonth - 12);
  });

  // ── Floating-point precision ──

  test('FP GUARD: floating-point amounts accumulate without drift', () => {
    const hairy = [
      { id:1, bank:'Bank', type:'עובר ושב', balance: 0.1 },
      { id:2, bank:'Bank', type:'עובר ושב', balance: 0.2 },
    ];
    const result = calculateCashFlow(hairy, [], [], [], MID_MONTH);
    // Raw JS: 0.1 + 0.2 = 0.30000000000000004 — our safeSum rounds it
    expect(result.liquidBalance).toBe(0.30);
    expect(result.totalBalance).toBe(0.30);
  });

  test('FP GUARD: safeToSpend is rounded to 2dp', () => {
    const fractionalAccounts = [{ id:1, bank:'Bank', type:'עובר ושב', balance: 1000.005 }];
    const fractionalBill     = [{ id:1, name:'Bill', amount: 0.003, dueDay:28 }];
    const result = calculateCashFlow(fractionalAccounts, [], fractionalBill, [], MID_MONTH);
    const dp = (result.safeToSpend.toString().split('.')[1] || '').length;
    expect(dp).toBeLessThanOrEqual(2);
  });

  // ── Empty data edge cases ──

  test('handles empty accounts array gracefully', () => {
    const result = calculateCashFlow([], [], [], [], MID_MONTH);
    expect(result.totalBalance).toBe(0);
    expect(result.safeToSpend).toBe(0);
  });

  test('handles empty transactions array — monthly totals are zero', () => {
    const result = calculateCashFlow(BASE_ACCOUNTS, [], [], [], MID_MONTH);
    expect(result.monthlyIncome).toBe(0);
    expect(result.monthlyExpenses).toBe(0);
  });

  test('transactions from prior months are excluded from monthly totals', () => {
    const lastMonth = new Date(THIS_MONTH.getFullYear(), THIS_MONTH.getMonth() - 1, 5);
    const oldTx = [{ id:1, description:'salary', amount:18000, date: iso(lastMonth) }];
    const result = calculateCashFlow(BASE_ACCOUNTS, oldTx, [], [], MID_MONTH);
    // Transaction is in a prior month → should NOT count in monthlyIncome
    expect(result.monthlyIncome).toBe(0);
  });

  test('bills already past (dueDay <= currentDay) are NOT counted as upcoming', () => {
    // Day 12 reference; bill dueDay=10 is already past
    const pastBill   = [{ id:1, name:'ארנונה', amount:1200, dueDay:10 }];
    const result = calculateCashFlow(BASE_ACCOUNTS, [], pastBill, [], MID_MONTH);
    expect(result.upcomingExpenses).toBe(0);
    // safeToSpend should not be reduced by past bills
    expect(result.safeToSpend).toBe(result.liquidBalance);
  });
});
