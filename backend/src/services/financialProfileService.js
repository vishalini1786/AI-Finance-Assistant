// financialProfileService.js
// Module 8A: Builds a unified, verified personal financial profile
// combining onboarding answers, user preferences, actual PostgreSQL transactions,
// budgets, goals, obligations, and data maturity indicators.

const db = require('../config/database');
const userRepository = require('../repositories/userRepository');

function parseJsonArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Builds the complete financial profile for an authenticated user.
 * Guaranteed to be scoped exclusively to userId.
 */
async function buildFinancialProfile(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Prior month calculation
  const priorDate = new Date(currentYear, currentMonth - 2, 1);
  const priorMonth = priorDate.getMonth() + 1;
  const priorYear = priorDate.getFullYear();

  // Run isolated queries concurrently
  const [
    currentMonthIncomeRes,
    priorMonthIncomeRes,
    currentMonthExpenseRes,
    priorMonthExpenseRes,
    allExpensesCountRes,
    categorySpendingRes,
    budgetsRes,
    goalsRes,
    recurringRes,
    holdingsRes,
    liabilitiesRes,
  ] = await Promise.all([
    // Current month verified income
    db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count
       FROM incomes
       WHERE user_id = $1 AND EXTRACT(MONTH FROM income_date) = $2 AND EXTRACT(YEAR FROM income_date) = $3`,
      [userId, currentMonth, currentYear]
    ),
    // Prior month verified income
    db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count
       FROM incomes
       WHERE user_id = $1 AND EXTRACT(MONTH FROM income_date) = $2 AND EXTRACT(YEAR FROM income_date) = $3`,
      [userId, priorMonth, priorYear]
    ),
    // Current month verified expenses
    db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count
       FROM expenses
       WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3`,
      [userId, currentMonth, currentYear]
    ),
    // Prior month verified expenses
    db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count
       FROM expenses
       WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3`,
      [userId, priorMonth, priorYear]
    ),
    // Total expense transactions recorded all time
    db.query(
      `SELECT COUNT(*)::int AS total_count, MIN(expense_date) AS earliest_date
       FROM expenses
       WHERE user_id = $1`,
      [userId]
    ),
    // Current month category-wise spending
    db.query(
      `SELECT c.category_id, COALESCE(c.name, 'Uncategorized') AS category_name,
              COALESCE(SUM(e.amount), 0) AS total_amount,
              COUNT(e.expense_id)::int AS transaction_count
       FROM expenses e
       LEFT JOIN categories c ON c.category_id = e.category_id
       WHERE e.user_id = $1
         AND EXTRACT(MONTH FROM e.expense_date) = $2
         AND EXTRACT(YEAR FROM e.expense_date) = $3
       GROUP BY c.category_id, c.name
       ORDER BY total_amount DESC`,
      [userId, currentMonth, currentYear]
    ),
    // Active budgets for current month
    db.query(
      `SELECT b.budget_id, b.category_id, c.name AS category_name,
              b.budget_amount, b.priority,
              COALESCE(SUM(e.amount), 0) AS actual_spent
       FROM budgets b
       LEFT JOIN categories c ON c.category_id = b.category_id
       LEFT JOIN expenses e ON e.category_id = b.category_id
                            AND e.user_id = b.user_id
                            AND EXTRACT(MONTH FROM e.expense_date) = b.month
                            AND EXTRACT(YEAR FROM e.expense_date) = b.year
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
       GROUP BY b.budget_id, b.category_id, c.name, b.budget_amount, b.priority`,
      [userId, currentMonth, currentYear]
    ),
    // Financial Goals
    db.query(
      `SELECT goal_id, goal_name, target_amount, current_amount, target_date, status
       FROM financial_goals
       WHERE user_id = $1 AND status != 'CANCELLED'
       ORDER BY target_date ASC NULLS LAST, created_at DESC`,
      [userId]
    ),
    // Recurring commitments
    db.query(
      `SELECT recurring_payment_id, name, amount, frequency, next_due_date, is_active
       FROM recurring_payments
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY next_due_date ASC NULLS LAST`,
      [userId]
    ),
    // Holdings / Assets
    db.query(
      `SELECT holding_id, holding_type, name, current_value, purchase_value
       FROM financial_holdings
       WHERE user_id = $1`,
      [userId]
    ),
    // Liabilities / Debts
    db.query(
      `SELECT liability_id, liability_type, name, total_amount, remaining_amount, interest_rate, due_date
       FROM liabilities
       WHERE user_id = $1`,
      [userId]
    ),
  ]);

  // Calculations
  const verifiedCurrentIncome = Number(currentMonthIncomeRes.rows[0]?.total || 0);
  const incomeTxCount = Number(currentMonthIncomeRes.rows[0]?.count || 0);
  const priorIncome = Number(priorMonthIncomeRes.rows[0]?.total || 0);

  const verifiedCurrentExpense = Number(currentMonthExpenseRes.rows[0]?.total || 0);
  const expenseTxCount = Number(currentMonthExpenseRes.rows[0]?.count || 0);
  const priorExpense = Number(priorMonthExpenseRes.rows[0]?.total || 0);

  const allTimeTxCount = Number(allExpensesCountRes.rows[0]?.total_count || 0);
  const earliestDate = allExpensesCountRes.rows[0]?.earliest_date;

  const statedMonthlyIncome = Number(user.monthly_income || 0);
  const statedOccupation = user.occupation || 'Personal finance user';
  const financialInterests = parseJsonArray(user.financial_interests);
  const statedSpendingCategories = parseJsonArray(user.spending_categories);
  const statedFinancialGoals = parseJsonArray(user.financial_goals);
  const financialExperience = user.financial_experience || 'Beginner';
  const savingsHabit = user.savings_habit || 'none';
  const investmentPreference = user.investment_preference || 'balanced';
  const aiPreferences = parseJsonArray(user.ai_preferences);

  // Net Cash Flow: verified income - verified expenses
  const netCashFlow = verifiedCurrentIncome - verifiedCurrentExpense;

  // Actual Savings Rate (only meaningful when income > 0 and netCashFlow > 0)
  // CRITICAL (8A.7): Never label negative net cash flow as positive savings!
  let actualSavingsRate = 0;
  if (verifiedCurrentIncome > 0) {
    actualSavingsRate = netCashFlow > 0
      ? Number(((netCashFlow / verifiedCurrentIncome) * 100).toFixed(1))
      : 0;
  }

  // Holdings and Liquid Reserves
  const holdings = holdingsRes.rows;
  const totalHoldings = holdings.reduce((acc, h) => acc + Number(h.current_value || 0), 0);
  const liquidAssets = holdings
    .filter((h) => ['CASH', 'SAVINGS', 'EMERGENCY_FUND', 'MUTUAL_FUND', 'GOLD'].includes(String(h.holding_type || '').toUpperCase()))
    .reduce((acc, h) => acc + Number(h.current_value || 0), 0);

  // Liabilities
  const liabilities = liabilitiesRes.rows;
  const totalLiabilities = liabilities.reduce((acc, l) => acc + Number(l.remaining_amount || l.total_amount || 0), 0);
  const netWorth = totalHoldings - totalLiabilities;

  // Monthly Recurring Commitment
  const recurringPayments = recurringRes.rows;
  const monthlyRecurringTotal = recurringPayments.reduce((acc, r) => {
    const amt = Number(r.amount || 0);
    const freq = String(r.frequency || 'MONTHLY').toUpperCase();
    if (freq === 'DAILY') return acc + amt * 30;
    if (freq === 'WEEKLY') return acc + amt * 4.33;
    if (freq === 'YEARLY') return acc + amt / 12;
    return acc + amt;
  }, 0);

  // Upcoming bills in next 7 days
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingBills = recurringPayments.filter((r) => {
    if (!r.next_due_date) return false;
    const dueDate = new Date(r.next_due_date);
    return dueDate >= now && dueDate <= sevenDaysFromNow;
  });

  // Category spending details
  const categorySpending = categorySpendingRes.rows.map((r) => {
    const amount = Number(r.total_amount || 0);
    const pct = verifiedCurrentExpense > 0 ? Number(((amount / verifiedCurrentExpense) * 100).toFixed(1)) : 0;
    return {
      categoryId: r.category_id,
      categoryName: r.category_name,
      amount,
      percentage: pct,
      transactionCount: r.transaction_count,
    };
  });

  // Budget utilization
  const budgets = budgetsRes.rows.map((b) => {
    const limit = Number(b.budget_amount || 0);
    const spent = Number(b.actual_spent || 0);
    const utilPct = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;
    return {
      budgetId: b.budget_id,
      categoryId: b.category_id,
      categoryName: b.category_name,
      budgetAmount: limit,
      actualSpent: spent,
      remaining: limit - spent,
      utilizationPercent: utilPct,
      isOverBudget: limit > 0 && spent > limit,
      priority: b.priority,
    };
  });

  const totalBudgeted = budgets.reduce((acc, b) => acc + b.budgetAmount, 0);
  const totalBudgetSpent = budgets.reduce((acc, b) => acc + b.actualSpent, 0);
  const overallBudgetUtilization = totalBudgeted > 0
    ? Number(((totalBudgetSpent / totalBudgeted) * 100).toFixed(1))
    : 0;

  // Goals analysis with required monthly contributions
  const goals = goalsRes.rows.map((g) => {
    const target = Number(g.target_amount || 0);
    const current = Number(g.current_amount || 0);
    const remaining = Math.max(0, target - current);
    const progressPct = target > 0 ? Number(((current / target) * 100).toFixed(1)) : 0;

    let monthsRemaining = null;
    let requiredMonthly = null;
    let isLagging = false;

    if (g.target_date) {
      const targetDate = new Date(g.target_date);
      const diffMs = targetDate - now;
      monthsRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.4)));
      if (remaining > 0 && monthsRemaining > 0) {
        requiredMonthly = Math.ceil(remaining / monthsRemaining);
        // Lagging if less than 60 days remaining and progress is under 50%
        if (monthsRemaining <= 2 && progressPct < 50) {
          isLagging = true;
        }
      }
    }

    return {
      id: g.goal_id,
      goalId: g.goal_id,
      name: g.goal_name,
      goalName: g.goal_name,
      goal_name: g.goal_name,
      targetAmount: target,
      target_amount: target,
      currentAmount: current,
      current_amount: current,
      remainingAmount: remaining,
      remaining_amount: remaining,
      progressPercent: progressPct,
      progress_percent: progressPct,
      targetDate: g.target_date,
      target_date: g.target_date,
      status: g.status,
      monthsRemaining,
      requiredMonthlyContribution: requiredMonthly,
      isLagging,
    };
  });

  // Emergency Fund Runway (Months of living expenses covered by liquid assets)
  // Uses verified current expense, fallback to stated monthly income / 2 if no expenses recorded yet
  const monthlyBurnRate = verifiedCurrentExpense > 0
    ? verifiedCurrentExpense
    : (statedMonthlyIncome > 0 ? statedMonthlyIncome * 0.6 : 25000);
  const emergencyFundRunwayMonths = monthlyBurnRate > 0
    ? Number((liquidAssets / monthlyBurnRate).toFixed(1))
    : 0;

  // -----------------------------------------------------------------
  // DISCREPANCY DETECTION (Requirement 8A.2)
  // -----------------------------------------------------------------
  const discrepancies = [];

  // Income Discrepancy: Onboarding vs Actual
  if (statedMonthlyIncome > 0 && verifiedCurrentIncome > 0) {
    const diff = Math.abs(statedMonthlyIncome - verifiedCurrentIncome);
    const diffPct = (diff / statedMonthlyIncome) * 100;
    if (diffPct >= 25) {
      discrepancies.push({
        type: 'INCOME_DISCREPANCY',
        message: `Stated onboarding income (₹${statedMonthlyIncome.toLocaleString('en-IN')}) differs by ${Math.round(diffPct)}% from recorded current month income (₹${verifiedCurrentIncome.toLocaleString('en-IN')}).`,
        statedIncome: statedMonthlyIncome,
        recordedIncome: verifiedCurrentIncome,
        recommendedSource: verifiedCurrentIncome > 0 ? 'RECORDED' : 'STATED',
      });
    }
  } else if (statedMonthlyIncome > 0 && verifiedCurrentIncome === 0) {
    discrepancies.push({
      type: 'INCOME_UNRECORDED',
      message: `You reported ₹${statedMonthlyIncome.toLocaleString('en-IN')} monthly income during onboarding, but haven't recorded any income entries yet this month.`,
      statedIncome: statedMonthlyIncome,
      recordedIncome: 0,
      recommendedSource: 'STATED_ESTIMATE',
    });
  }

  // Spending Category Discrepancy: Top actual category not in onboarding priorities
  if (categorySpending.length > 0 && statedSpendingCategories.length > 0) {
    const topActual = categorySpending[0].categoryName;
    const isTopCategoryTracked = statedSpendingCategories.some(
      (c) => c.toLowerCase().includes(topActual.toLowerCase()) || topActual.toLowerCase().includes(c.toLowerCase())
    );
    if (!isTopCategoryTracked && categorySpending[0].percentage >= 30) {
      discrepancies.push({
        type: 'UNEXPECTED_SPENDING_CATEGORY',
        message: `${topActual} accounts for ${categorySpending[0].percentage}% of this month's spending, but was not selected as a major category in your onboarding profile.`,
        category: topActual,
        percentage: categorySpending[0].percentage,
      });
    }
  }

  // Savings Habit Discrepancy
  if (savingsHabit && verifiedCurrentIncome > 0) {
    const targetMap = {
      none: 0,
      less_10: 5,
      '10_20': 15,
      '20_30': 25,
      more_30: 35,
    };
    const expectedRate = targetMap[savingsHabit] ?? 10;
    if (expectedRate > 0 && actualSavingsRate < expectedRate / 2) {
      discrepancies.push({
        type: 'SAVINGS_RATE_DEFICIT',
        message: `Your actual savings rate this month is ${actualSavingsRate}%, below your stated habit target of ${savingsHabit.replace('_', '–')}% of income.`,
        actualSavingsRate,
        targetHabit: savingsHabit,
      });
    }
  }

  // -----------------------------------------------------------------
  // DATA MATURITY & QUALITY ASSESSMENT (Requirement 8A.7)
  // -----------------------------------------------------------------
  let dataMaturity = 'PRELIMINARY';
  if (allTimeTxCount >= 15 && incomeTxCount >= 1) {
    dataMaturity = 'RICH';
  } else if (allTimeTxCount >= 5) {
    dataMaturity = 'MODERATE';
  }

  const maturityObj = {
    status: dataMaturity,
    hasOnboarded: Boolean(user.is_onboarded),
    hasTransactions: allTimeTxCount > 0,
    hasBudgets: budgets.length > 0,
    hasGoals: goals.length > 0,
    score: allTimeTxCount >= 15 ? 100 : (allTimeTxCount >= 5 ? 70 : 30),
  };

  const statedData = {
    occupation: statedOccupation,
    monthlyIncome: statedMonthlyIncome,
    financialInterests,
    spendingCategories: statedSpendingCategories,
    financialGoals: statedFinancialGoals,
    financialExperience,
    savingsHabit,
    investmentPreference,
    aiPreferences,
    isOnboarded: Boolean(user.is_onboarded),
  };

  return {
    userId,
    user: {
      id: userId,
      name: user.name,
      email: user.email,
    },
    userName: user.name,
    userEmail: user.email,
    preferredLanguage: user.preferred_language || 'en',
    isOnboarded: Boolean(user.is_onboarded),
    dataMaturity: maturityObj,
    isPreliminary: dataMaturity === 'PRELIMINARY',
    assessmentDate: now.toISOString(),
    period: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,

    // User-provided facts (Onboarding + Profile)
    onboarding: statedData,
    statedProfile: statedData,

    // Verified calculations from raw database records
    verifiedRecords: {
      currentMonthIncome: verifiedCurrentIncome,
      currentMonthExpenses: verifiedCurrentExpense,
      netCashFlow,
      isDeficit: netCashFlow < 0,
      deficitAmount: netCashFlow < 0 ? Math.abs(netCashFlow) : 0,
      surplusAmount: netCashFlow > 0 ? netCashFlow : 0,
      actualSavingsRate,
      incomeTransactionCount: incomeTxCount,
      expenseTransactionCount: expenseTxCount,
      allTimeExpenseCount: allTimeTxCount,
      earliestRecordedDate: earliestDate,
      priorMonthIncome: priorIncome,
      priorMonthExpenses: priorExpense,
      liquidAssets,
      totalAssets: totalHoldings,
      totalLiabilities,
      netWorth,
      monthlyRecurringCommitment: Math.round(monthlyRecurringTotal),
      emergencyFundRunwayMonths,
    },

    // Breakdown collections
    categorySpending,
    budgets: {
      items: budgets,
      totalBudgeted,
      totalSpent: totalBudgetSpent,
      overallUtilization: overallBudgetUtilization,
      hasOverruns: budgets.some((b) => b.isOverBudget),
    },
    goals: {
      items: goals,
      activeCount: goals.length,
      hasLaggingGoals: goals.some((g) => g.isLagging),
    },
    upcomingObligations: {
      items: upcomingBills,
      count: upcomingBills.length,
      totalDueNext7Days: upcomingBills.reduce((acc, b) => acc + Number(b.amount || 0), 0),
    },

    // Discrepancy analysis
    discrepancies,
  };
}

module.exports = { buildFinancialProfile };
