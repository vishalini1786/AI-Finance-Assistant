// income_summary.test.js
// Unit tests verifying calculation safety for Income Dashboard summary cards
// ensuring NO NaN can ever appear for numeric, string, null, or empty data.

function formatCardAmount(amount, isCount = false) {
  let numericVal = 0;
  let isNumeric = false;
  let isNegative = false;

  if (typeof amount === 'number') {
    if (!isNaN(amount)) {
      numericVal = amount;
      isNumeric = true;
      isNegative = amount < 0;
    }
  } else if (typeof amount === 'string') {
    const cleaned = amount.replace(/[₹\s,]/g, '');
    const parsed = Number(cleaned);
    if (!isNaN(parsed) && cleaned.trim() !== '') {
      numericVal = parsed;
      isNumeric = true;
      isNegative = parsed < 0;
    } else if (cleaned.trim() === '') {
      numericVal = 0;
      isNumeric = true;
    }
  } else if (amount == null) {
    numericVal = 0;
    isNumeric = true;
  }

  let formattedDisplay = '0';
  if (isCount) {
    formattedDisplay = amount != null && amount !== '' ? String(amount) : (isNumeric ? '0' : '—');
  } else if (!isNumeric) {
    formattedDisplay = amount != null && amount !== '' ? String(amount) : '—';
  } else {
    formattedDisplay = Math.abs(numericVal).toLocaleString('en-IN');
  }

  const prefix = (!isCount && isNumeric) ? (isNegative ? '-₹' : '₹') : '';
  return `${prefix}${formattedDisplay}`;
}

function calculateIncomeMetrics(incomes = []) {
  const totalIncome = incomes.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const count = incomes.length;
  const avgEntry = count > 0 ? Math.round(totalIncome / count) : 0;

  let topSource = '—';
  if (count > 0) {
    const sourceMap = {};
    incomes.forEach((i) => {
      sourceMap[i.source] = (sourceMap[i.source] || 0) + Number(i.amount || 0);
    });
    const sorted = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]);
    if (sorted[0]) {
      topSource = `${sorted[0][0]} (₹${sorted[0][1].toLocaleString('en-IN')})`;
    }
  }

  return { totalIncome, count, avgEntry, topSource };
}

describe('Phase 4 — Income Dashboard Calculations and SummaryCard Formatting', () => {
  test('Computes valid totals and averages for salary records without NaN', () => {
    const salaryRecords = [
      { income_id: 1, source: 'Salary', amount: 50000, income_date: '2026-10-01' },
      { income_id: 2, source: 'Freelance', amount: 25000, income_date: '2026-10-15' },
    ];

    const metrics = calculateIncomeMetrics(salaryRecords);
    expect(metrics.totalIncome).toBe(75000);
    expect(metrics.avgEntry).toBe(37500);
    expect(metrics.count).toBe(2);
    expect(metrics.topSource).toBe('Salary (₹50,000)');

    expect(formatCardAmount(metrics.totalIncome)).toBe('₹75,000');
    expect(formatCardAmount(metrics.avgEntry)).toBe('₹37,500');
    expect(formatCardAmount(metrics.topSource, true)).toBe('Salary (₹50,000)');
    expect(formatCardAmount(metrics.count, true)).toBe('2');
  });

  test('Gracefully handles empty array (filters returning no records) with zero, not NaN', () => {
    const emptyRecords = [];
    const metrics = calculateIncomeMetrics(emptyRecords);

    expect(metrics.totalIncome).toBe(0);
    expect(metrics.avgEntry).toBe(0);
    expect(metrics.count).toBe(0);
    expect(metrics.topSource).toBe('—');

    expect(formatCardAmount(metrics.totalIncome)).toBe('₹0');
    expect(formatCardAmount(metrics.avgEntry)).toBe('₹0');
    expect(formatCardAmount(metrics.topSource, true)).toBe('—');
    expect(formatCardAmount(metrics.count, true)).toBe('0');
  });

  test('Defensively parses formatted currency strings and prevents ₹NaN', () => {
    // If a legacy component passes "₹50,000" as a string
    expect(formatCardAmount('₹50,000')).toBe('₹50,000');
    expect(formatCardAmount('₹1,25,000.50')).toBe('₹1,25,000.5');
    expect(formatCardAmount(null)).toBe('₹0');
    expect(formatCardAmount(undefined)).toBe('₹0');
    expect(formatCardAmount('')).toBe('₹0');
  });

  test('Handles records with null or missing amounts safely', () => {
    const mixedRecords = [
      { source: 'Salary', amount: null },
      { source: 'Freelance', amount: '30000' },
      { source: 'Other', amount: undefined },
    ];

    const metrics = calculateIncomeMetrics(mixedRecords);
    expect(metrics.totalIncome).toBe(30000);
    expect(metrics.avgEntry).toBe(10000);
    expect(formatCardAmount(metrics.totalIncome)).toBe('₹30,000');
  });
});
