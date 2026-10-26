// reportService.js
// Comprehensive Financial Reports Service for FinMan
// Aggregates financial data, computes MoM & YoY comparisons,
// generates automated observations, and supports liability integration.

const db = require('../config/database');
const dashboardRepository = require('../repositories/dashboardRepository');

function formatCurrency(amount) {
  return `₹${Math.round(Number(amount || 0)).toLocaleString('en-IN')}`;
}

/**
 * Resolves standard date ranges based on period preset or explicit dates.
 */
function resolveDateRange({ period = 'this_month', startDate, endDate, month, year }) {
  const now = new Date();
  const curYear = year ? Number(year) : now.getFullYear();
  const curMonth = month ? Number(month) : now.getMonth() + 1;

  let currentStart;
  let currentEnd;
  let prevStart;
  let prevEnd;
  let yoyStart;
  let yoyEnd;
  let periodLabel = '';

  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (period) {
    case 'this_month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      currentStart = fmt(s);
      currentEnd = fmt(e);
      periodLabel = s.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

      // MoM: Previous calendar month
      const ps = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const pe = new Date(now.getFullYear(), now.getMonth(), 0);
      prevStart = fmt(ps);
      prevEnd = fmt(pe);

      // YoY: Same month last year
      const ys = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      const ye = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
      yoyStart = fmt(ys);
      yoyEnd = fmt(ye);
      break;
    }

    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      currentStart = fmt(s);
      currentEnd = fmt(e);
      periodLabel = s.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

      // MoM: 2 months ago
      const ps = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const pe = new Date(now.getFullYear(), now.getMonth() - 1, 0);
      prevStart = fmt(ps);
      prevEnd = fmt(pe);

      // YoY: Same month previous year
      const ys = new Date(now.getFullYear() - 1, now.getMonth() - 1, 1);
      const ye = new Date(now.getFullYear() - 1, now.getMonth(), 0);
      yoyStart = fmt(ys);
      yoyEnd = fmt(ye);
      break;
    }

    case 'selected_month': {
      const s = new Date(curYear, curMonth - 1, 1);
      const e = new Date(curYear, curMonth, 0);
      currentStart = fmt(s);
      currentEnd = fmt(e);
      periodLabel = s.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

      const ps = new Date(curYear, curMonth - 2, 1);
      const pe = new Date(curYear, curMonth - 1, 0);
      prevStart = fmt(ps);
      prevEnd = fmt(pe);

      const ys = new Date(curYear - 1, curMonth - 1, 1);
      const ye = new Date(curYear - 1, curMonth, 0);
      yoyStart = fmt(ys);
      yoyEnd = fmt(ye);
      break;
    }

    case 'last_3_months': {
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const s = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      currentStart = fmt(s);
      currentEnd = fmt(e);
      periodLabel = `Last 3 Months (${s.toLocaleString('en-IN', { month: 'short' })} – ${e.toLocaleString('en-IN', { month: 'short', year: 'numeric' })})`;

      // MoM equivalent: prior 3 months
      const pe = new Date(now.getFullYear(), now.getMonth() - 2, 0);
      const ps = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      prevStart = fmt(ps);
      prevEnd = fmt(pe);

      // YoY equivalent: same 3 months last year
      const ye = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
      const ys = new Date(now.getFullYear() - 1, now.getMonth() - 2, 1);
      yoyStart = fmt(ys);
      yoyEnd = fmt(ye);
      break;
    }

    case 'last_6_months': {
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const s = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      currentStart = fmt(s);
      currentEnd = fmt(e);
      periodLabel = `Last 6 Months (${s.toLocaleString('en-IN', { month: 'short' })} – ${e.toLocaleString('en-IN', { month: 'short', year: 'numeric' })})`;

      const pe = new Date(now.getFullYear(), now.getMonth() - 5, 0);
      const ps = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      prevStart = fmt(ps);
      prevEnd = fmt(pe);

      const ye = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
      const ys = new Date(now.getFullYear() - 1, now.getMonth() - 5, 1);
      yoyStart = fmt(ys);
      yoyEnd = fmt(ye);
      break;
    }

    case 'ytd': {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = now;
      currentStart = fmt(s);
      currentEnd = fmt(e);
      periodLabel = `Year to Date (${now.getFullYear()})`;

      // Previous Year (Full) or YTD equivalent
      const ys = new Date(now.getFullYear() - 1, 0, 1);
      const ye = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      yoyStart = fmt(ys);
      yoyEnd = fmt(ye);

      // MoM: previous month
      const ps = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const pe = new Date(now.getFullYear(), now.getMonth(), 0);
      prevStart = fmt(ps);
      prevEnd = fmt(pe);
      break;
    }

    case 'previous_year': {
      const y = curYear - 1;
      const s = new Date(y, 0, 1);
      const e = new Date(y, 11, 31);
      currentStart = fmt(s);
      currentEnd = fmt(e);
      periodLabel = `Full Year ${y}`;

      const ps = new Date(y - 1, 0, 1);
      const pe = new Date(y - 1, 11, 31);
      prevStart = fmt(ps);
      prevEnd = fmt(pe);
      yoyStart = fmt(ps);
      yoyEnd = fmt(pe);
      break;
    }

    case 'custom':
    default: {
      if (startDate && endDate) {
        currentStart = startDate;
        currentEnd = endDate;
        periodLabel = `${startDate} to ${endDate}`;

        // Calculate span in milliseconds to derive preceding period
        const startMs = new Date(startDate).getTime();
        const endMs = new Date(endDate).getTime();
        const spanMs = Math.max(1, endMs - startMs);

        const psDate = new Date(startMs - spanMs);
        const peDate = new Date(startMs - 24 * 60 * 60 * 1000);
        prevStart = fmt(psDate);
        prevEnd = fmt(peDate);

        // YoY: shifted 1 year back
        const ysDate = new Date(startDate);
        ysDate.setFullYear(ysDate.getFullYear() - 1);
        const yeDate = new Date(endDate);
        yeDate.setFullYear(yeDate.getFullYear() - 1);
        yoyStart = fmt(ysDate);
        yoyEnd = fmt(yeDate);
      } else {
        // Fallback to this month
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        currentStart = fmt(s);
        currentEnd = fmt(e);
        periodLabel = s.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      }
      break;
    }
  }

  return {
    current: { startDate: currentStart, endDate: currentEnd },
    previous: { startDate: prevStart, endDate: prevEnd },
    yoy: { startDate: yoyStart, endDate: yoyEnd },
    periodLabel,
    period,
  };
}

/**
 * Calculates directional badge, absolute change, and safe percentage change.
 */
function calculateDelta(current, previous, metricName = 'metric') {
  const curr = Number(current || 0);
  const prev = Number(previous || 0);
  const diff = Number((curr - prev).toFixed(2));

  let pctChange = null;
  let status = 'No Change';

  if (prev === 0 && curr === 0) {
    status = 'No Change';
    pctChange = 0;
  } else if (prev === 0) {
    status = curr > 0 ? 'Increased' : 'Decreased';
    pctChange = null; // Cannot divide by zero
  } else {
    pctChange = Number((((curr - prev) / Math.abs(prev)) * 100).toFixed(1));
    if (diff > 0) status = 'Increased';
    else if (diff < 0) status = 'Decreased';
    else status = 'No Change';
  }

  return {
    current: curr,
    previous: prev,
    absoluteChange: diff,
    percentageChange: pctChange,
    status,
    hasPriorData: prev !== 0,
  };
}

/**
 * Get comprehensive reports dashboard payload.
 */
async function getComprehensiveReport(userId, queryParams = {}) {
  const dates = resolveDateRange(queryParams);
  const currentBounds = dates.current;
  const prevBounds = dates.previous;
  const yoyBounds = dates.yoy;

  // Run database queries concurrently
  const [
    // Current period metrics
    curIncome,
    curExpenses,
    curSavingsRes,
    curHoldings,
    curLiabilities,
    curCategoriesRes,
    curTrendsRes,
    curLoanPaymentsRes,

    // Previous period (MoM) metrics
    prevIncome,
    prevExpenses,
    prevSavingsRes,

    // YoY period metrics
    yoyIncome,
    yoyExpenses,
    yoySavingsRes,

    // Detailed assets & liabilities collections
    holdingsRes,
    liabilitiesRes,
    recurringPaymentsRes,
  ] = await Promise.all([
    dashboardRepository.getTotalIncome(userId, currentBounds),
    dashboardRepository.getTotalExpenses(userId, currentBounds),
    dashboardRepository.getTotalAllocatedSavings(userId, currentBounds),
    dashboardRepository.getTotalHoldings(userId, currentBounds),
    dashboardRepository.getTotalLiabilities(userId, currentBounds),

    // Unified category breakdown (expenses + project_expenses)
    db.query(
      `WITH combined_expenses AS (
         SELECT COALESCE(c.name, 'Other') AS category_name, e.amount, e.expense_date
         FROM expenses e
         LEFT JOIN categories c ON c.category_id = e.category_id
         WHERE e.user_id = $1 AND e.expense_date >= $2 AND e.expense_date <= $3
         UNION ALL
         SELECT COALESCE(pe.category, 'Project Expenses') AS category_name, pe.amount, pe.expense_date
         FROM project_expenses pe
         WHERE pe.user_id = $1 AND pe.expense_date >= $2 AND pe.expense_date <= $3
       )
       SELECT category_name,
              COALESCE(SUM(amount), 0) AS total_amount,
              COUNT(*)::int AS transaction_count
       FROM combined_expenses
       GROUP BY category_name
       ORDER BY total_amount DESC`,
      [userId, currentBounds.startDate, currentBounds.endDate]
    ),

    // Monthly trends in current period
    dashboardRepository.getMonthlyTrends(userId, currentBounds),

    // Loan repayments in period (expenses categorized under Loan/EMI or matching recurring liabilities)
    db.query(
      `SELECT COALESCE(SUM(e.amount), 0) AS total_loan_payments
       FROM expenses e
       LEFT JOIN categories c ON c.category_id = e.category_id
       WHERE e.user_id = $1
         AND e.expense_date >= $2 AND e.expense_date <= $3
         AND (c.name ILIKE '%loan%' OR c.name ILIKE '%emi%' OR e.description ILIKE '%emi%' OR e.merchant_name ILIKE '%loan%')`,
      [userId, currentBounds.startDate, currentBounds.endDate]
    ),

    // Prior period metrics for MoM comparison
    prevBounds.startDate
      ? dashboardRepository.getTotalIncome(userId, prevBounds)
      : Promise.resolve(0),
    prevBounds.startDate
      ? dashboardRepository.getTotalExpenses(userId, prevBounds)
      : Promise.resolve(0),
    prevBounds.startDate
      ? dashboardRepository.getTotalAllocatedSavings(userId, prevBounds)
      : Promise.resolve(0),

    // YoY period metrics
    yoyBounds.startDate
      ? dashboardRepository.getTotalIncome(userId, yoyBounds)
      : Promise.resolve(0),
    yoyBounds.startDate
      ? dashboardRepository.getTotalExpenses(userId, yoyBounds)
      : Promise.resolve(0),
    yoyBounds.startDate
      ? dashboardRepository.getTotalAllocatedSavings(userId, yoyBounds)
      : Promise.resolve(0),

    // Holdings list
    db.query(
      `SELECT holding_id, holding_type, name, quantity, current_value, purchase_value,
              TO_CHAR(purchase_date, 'YYYY-MM-DD') AS purchase_date
       FROM financial_holdings
       WHERE user_id = $1
       ORDER BY current_value DESC`,
      [userId]
    ),

    // Liabilities list
    db.query(
      `SELECT liability_id, liability_type, name, total_amount, remaining_amount, interest_rate,
              TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date
       FROM liabilities
       WHERE user_id = $1
       ORDER BY remaining_amount DESC`,
      [userId]
    ),

    // Recurring commitments
    db.query(
      `SELECT recurring_payment_id, name, amount, frequency,
              TO_CHAR(next_due_date, 'YYYY-MM-DD') AS next_due_date, is_active
       FROM recurring_payments
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY next_due_date ASC NULLS LAST`,
      [userId]
    ),
  ]);

  // Calculations
  const curNetCashFlow = curIncome - curExpenses;
  const curDeficit = curNetCashFlow < 0 ? Math.abs(curNetCashFlow) : 0;
  const curPeriodSavings = curNetCashFlow > 0
    ? (curSavingsRes > 0 ? Math.min(curSavingsRes, curNetCashFlow) : curNetCashFlow)
    : 0;
  const curNetWorth = curHoldings - curLiabilities;
  const curLoanRepayments = Number(curLoanPaymentsRes.rows[0]?.total_loan_payments || 0);

  // Prior period calculations
  const prevNetCashFlow = prevIncome - prevExpenses;
  const prevPeriodSavings = prevNetCashFlow > 0
    ? (prevSavingsRes > 0 ? Math.min(prevSavingsRes, prevNetCashFlow) : prevNetCashFlow)
    : 0;

  // YoY calculations
  const yoyNetCashFlow = yoyIncome - yoyExpenses;
  const yoyPeriodSavings = yoyNetCashFlow > 0
    ? (yoySavingsRes > 0 ? Math.min(yoySavingsRes, yoyNetCashFlow) : yoyNetCashFlow)
    : 0;

  // Format category spending with verified percentages (avoiding NaN or undefined)
  const categoryExpenses = curCategoriesRes.rows.map((r) => {
    const amount = Number(r.total_amount || 0);
    const pct = curExpenses > 0 ? Number(((amount / curExpenses) * 100).toFixed(1)) : 0;
    return {
      category_name: r.category_name,
      total_amount: amount,
      percentage: pct,
      transaction_count: Number(r.transaction_count || 0),
    };
  });

  // Assets by category
  const holdings = holdingsRes.rows;
  const assetCategoriesMap = {};
  holdings.forEach((h) => {
    const type = (h.holding_type || 'Other').replace('_', ' ');
    if (!assetCategoriesMap[type]) assetCategoriesMap[type] = 0;
    assetCategoriesMap[type] += Number(h.current_value || 0);
  });
  const assetCategories = Object.entries(assetCategoriesMap).map(([category, amount]) => ({
    category,
    amount: Number(amount.toFixed(2)),
    percentage: curHoldings > 0 ? Number(((amount / curHoldings) * 100).toFixed(1)) : 0,
  }));

  // Liabilities breakdown
  const liabilities = liabilitiesRes.rows;
  const liabilityCategoriesMap = {};
  liabilities.forEach((l) => {
    const type = (l.liability_type || 'Loan').replace('_', ' ');
    if (!liabilityCategoriesMap[type]) liabilityCategoriesMap[type] = 0;
    liabilityCategoriesMap[type] += Number(l.remaining_amount || 0);
  });
  const liabilityCategories = Object.entries(liabilityCategoriesMap).map(([category, amount]) => ({
    category,
    amount: Number(amount.toFixed(2)),
    percentage: curLiabilities > 0 ? Number(((amount / curLiabilities) * 100).toFixed(1)) : 0,
  }));

  // Month-over-Month (MoM) Comparisons
  const momComparison = {
    periodLabel: dates.previous.startDate ? `vs. Previous Period` : 'MoM Comparison',
    income: calculateDelta(curIncome, prevIncome, 'Income'),
    expenses: calculateDelta(curExpenses, prevExpenses, 'Expenses'),
    netCashFlow: calculateDelta(curNetCashFlow, prevNetCashFlow, 'Net Cash Flow'),
    savings: calculateDelta(curPeriodSavings, prevPeriodSavings, 'Savings'),
    assets: calculateDelta(curHoldings, curHoldings, 'Assets'), // Current balances
    liabilities: calculateDelta(curLiabilities, curLiabilities, 'Liabilities'),
    netWorth: calculateDelta(curNetWorth, curNetWorth, 'Net Worth'),
  };

  // Year-over-Year (YoY) Comparisons
  const yoyComparison = {
    periodLabel: dates.yoy.startDate ? `vs. Same Period Last Year` : 'YoY Comparison',
    income: calculateDelta(curIncome, yoyIncome, 'Income'),
    expenses: calculateDelta(curExpenses, yoyExpenses, 'Expenses'),
    netCashFlow: calculateDelta(curNetCashFlow, yoyNetCashFlow, 'Net Cash Flow'),
    savings: calculateDelta(curPeriodSavings, yoyPeriodSavings, 'Savings'),
  };

  // Automated Financial Observations generated from real records
  const observations = [];

  if (curIncome === 0 && curExpenses === 0) {
    observations.push({
      type: 'INFO',
      title: 'No Activity Recorded',
      text: `No income or expense records were found for ${dates.periodLabel}.`,
    });
  } else {
    // 1. Income vs Expenses Observation
    if (curNetCashFlow >= 0) {
      observations.push({
        type: 'POSITIVE',
        title: 'Positive Cash Flow',
        text: `Net cash flow for this period is ${formatCurrency(curNetCashFlow)}, retaining a surplus of ${formatCurrency(curPeriodSavings)}.`,
      });
    } else {
      observations.push({
        type: 'WARNING',
        title: 'Monthly Deficit',
        text: `Recorded expenses (${formatCurrency(curExpenses)}) exceed recorded income (${formatCurrency(curIncome)}) by ${formatCurrency(curDeficit)}.`,
      });
    }

    // 2. Top Spending Category
    if (categoryExpenses.length > 0) {
      const topCat = categoryExpenses[0];
      observations.push({
        type: 'INFO',
        title: 'Highest Spending Category',
        text: `${topCat.category_name} is your largest spending category at ${formatCurrency(topCat.total_amount)} (${topCat.percentage}% of period expenses).`,
      });
    }

    // 3. MoM Trend Insight
    if (prevIncome > 0 || prevExpenses > 0) {
      if (momComparison.expenses.percentageChange != null) {
        const expDelta = momComparison.expenses.absoluteChange;
        if (Math.abs(expDelta) > 100) {
          const dir = expDelta > 0 ? 'increased' : 'decreased';
          observations.push({
            type: expDelta > 0 ? 'NEUTRAL' : 'POSITIVE',
            title: 'Expense Shift',
            text: `Expenses ${dir} by ${formatCurrency(Math.abs(expDelta))} (${Math.abs(momComparison.expenses.percentageChange)}%) compared to the prior period.`,
          });
        }
      }
    }

    // 4. Net Worth & Liabilities Position
    if (curHoldings > 0 || curLiabilities > 0) {
      observations.push({
        type: curNetWorth >= 0 ? 'POSITIVE' : 'WARNING',
        title: 'Recorded Net Worth',
        text: `Total recorded assets stand at ${formatCurrency(curHoldings)} against liabilities of ${formatCurrency(curLiabilities)}, yielding a net worth of ${formatCurrency(curNetWorth)}.`,
      });
    }

    // 5. Loan Repayments
    if (curLoanRepayments > 0) {
      observations.push({
        type: 'INFO',
        title: 'Debt Obligations',
        text: `Recorded ${formatCurrency(curLoanRepayments)} in loan and EMI payments during this period.`,
      });
    }
  }

  return {
    period: dates.period,
    periodLabel: dates.periodLabel,
    startDate: currentBounds.startDate,
    endDate: currentBounds.endDate,
    summary: {
      totalIncome: curIncome,
      totalExpenses: curExpenses,
      netCashFlow: curNetCashFlow,
      periodSavings: curPeriodSavings,
      deficit: curDeficit,
      totalAssets: curHoldings,
      totalLiabilities: curLiabilities,
      netWorth: curNetWorth,
      loanRepayments: curLoanRepayments,
    },
    momComparison,
    yoyComparison,
    categoryExpenses,
    monthlyTrends: curTrendsRes || [],
    assets: {
      total: curHoldings,
      byCategory: assetCategories,
      items: holdings,
    },
    liabilities: {
      total: curLiabilities,
      byCategory: liabilityCategories,
      items: liabilities,
      recurringPayments: recurringPaymentsRes.rows || [],
    },
    observations,
    hasData: curIncome > 0 || curExpenses > 0 || curHoldings > 0 || curLiabilities > 0,
  };
}

module.exports = {
  getComprehensiveReport,
  resolveDateRange,
  calculateDelta,
};
