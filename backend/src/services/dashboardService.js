// dashboardService.js
// Combines several repository calls into the shapes the React
// Dashboard page expects. No dashboard table - everything computed
// on read.

const dashboardRepository = require('../repositories/dashboardRepository');
const projectService = require('./projectService');
const userService = require('./userService');

function calculateFinancialHealthScore({
  totalIncome,
  totalExpenses,
  totalHoldings,
  totalLiabilities,
  budgetUtilizationPercent,
}) {
  if (totalIncome <= 0 && totalExpenses <= 0 && totalHoldings <= 0 && totalLiabilities <= 0) {
    return null;
  }

  const savingsRate = totalIncome > 0
    ? Math.max(0, Math.min(1, (totalIncome - totalExpenses) / totalIncome))
    : 0;
  const savingsScore = savingsRate * 35;

  const budgetScore = budgetUtilizationPercent <= 0
    ? 15
    : Math.max(0, (1 - Math.min(budgetUtilizationPercent, 150) / 150) * 25);

  const debtRatio = totalIncome > 0 ? totalLiabilities / totalIncome : (totalLiabilities > 0 ? 1 : 0);
  const debtScore = Math.max(0, (1 - Math.min(debtRatio, 1)) * 25);

  const assetScore = totalHoldings > 0 ? 15 : 0;

  return Math.round(Math.min(100, savingsScore + budgetScore + debtScore + assetScore));
}

async function getSummary(userId, queryParams = {}) {
  const goalService = require('./goalService');

  const [
    totalIncome,
    totalExpenses,
    totalHoldings,
    totalLiabilities,
    budgetUtil,
    projectSummary,
    projects,
    goals,
    monthlyTrends,
  ] = await Promise.all([
    dashboardRepository.getTotalIncome(userId, queryParams),
    dashboardRepository.getTotalExpenses(userId, queryParams),
    dashboardRepository.getTotalHoldings(userId, queryParams),
    dashboardRepository.getTotalLiabilities(userId, queryParams),
    dashboardRepository.getOverallBudgetUtilization(userId, queryParams),
    projectService.getProjectSummary(userId),
    projectService.getProjects(userId),
    goalService.getGoals(userId),
    dashboardRepository.getMonthlyTrends(userId, queryParams),
  ]);

  const netCashFlow = totalIncome - totalExpenses;
  const periodSavings = Math.max(netCashFlow, 0);
  const deficit = Math.max(-netCashFlow, 0);
  const netWorth = totalHoldings - totalLiabilities;

  const totalBudget = Number(budgetUtil.total_budget || 0);
  const totalSpent = Number(budgetUtil.total_spent || 0);
  const budgetUtilizationPercent = totalBudget > 0
    ? Number(((totalSpent / totalBudget) * 100).toFixed(2))
    : 0;

  // New Goal logic: average progress of all goals, max 15 points
  let goalScore = 0;
  if (goals.length > 0) {
    const avgProgress = goals.reduce((acc, g) => acc + (g.progress_percent || 0), 0) / goals.length;
    goalScore = Math.round((avgProgress / 100) * 15);
  } else {
    goalScore = 5; // default 5 points if no goals
  }

  // Savings score out of 30, budget out of 25, debt out of 20, assets out of 10, goals out of 15
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.min(1, (totalIncome - totalExpenses) / totalIncome)) : 0;
  const savingsScore = savingsRate * 30;
  
  const budgetScore = budgetUtilizationPercent <= 0 ? 15 : Math.max(0, (1 - Math.min(budgetUtilizationPercent, 150) / 150) * 25);
  const debtRatio = totalIncome > 0 ? totalLiabilities / totalIncome : (totalLiabilities > 0 ? 1 : 0);
  const debtScore = Math.max(0, (1 - Math.min(debtRatio, 1)) * 20);
  const assetScore = totalHoldings > 0 ? 10 : 0;

  let financialHealthScore = null;
  if (totalIncome > 0 || totalExpenses > 0 || totalHoldings > 0 || totalLiabilities > 0 || goals.length > 0) {
    financialHealthScore = Math.round(Math.min(100, savingsScore + budgetScore + debtScore + assetScore + goalScore));
  }

  let predictedExpense = 0;
  let predictionMessage = null;

  try {
    const env = require('../config/env');
    // The SQL alias from dashboardRepository.getMonthlyTrends is `total_expenses` (plural).
    // Filter months that have at least some recorded activity.
    const validTrends = (monthlyTrends || []).filter(
      t => Number(t.total_income) > 0 || Number(t.total_expenses) > 0
    );

    if (validTrends.length < 3) {
      predictionMessage = 'Not enough transaction history to make a reliable prediction.';
    } else if (env.aiServiceUrl) {
      // monthlyTrends is ORDER BY month_series ASC (oldest → newest).
      // The last row is the current (possibly incomplete) month.
      // previous_1 = one full month ago, previous_2 = two months ago, etc.
      const len = monthlyTrends.length;
      const prev1 = monthlyTrends[len - 2] || {};
      const prev2 = monthlyTrends[len - 3] || {};
      const prev3 = monthlyTrends[len - 4] || {};

      const p1e = Number(prev1.total_expenses || 0);
      const p2e = Number(prev2.total_expenses || 0);
      const p3e = Number(prev3.total_expenses || 0);
      const mean3 = (p1e + p2e + p3e) / 3;
      // Rolling std deviation of last 3 months' expenses
      const std3 = Math.sqrt(
        ((p1e - mean3) ** 2 + (p2e - mean3) ** 2 + (p3e - mean3) ** 2) / 3
      );

      const p1i = Number(prev1.total_income || 0);

      // Derive approximate counts from how many months have data vs total months fetched
      const expenseMonthsWithData = monthlyTrends.filter(t => Number(t.total_expenses) > 0).length;
      const incomeMonthsWithData  = monthlyTrends.filter(t => Number(t.total_income)   > 0).length;

      const response = await fetch(`${env.aiServiceUrl}/predict/expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_dict: {
            expense_total:           totalExpenses,
            expense_count:           expenseMonthsWithData || 1,
            expense_average:         expenseMonthsWithData > 0 ? totalExpenses / expenseMonthsWithData : totalExpenses,
            income_total:            totalIncome,
            income_count:            incomeMonthsWithData  || 1,
            previous_expense_1:      p1e,
            previous_expense_2:      p2e,
            previous_expense_3:      p3e,
            previous_income_1:       p1i,
            rolling_expense_mean_3:  mean3,
            rolling_expense_std_3:   std3,
            savings_current:         totalHoldings,
            expense_income_ratio:    totalIncome > 0 ? totalExpenses / totalIncome : 0,
            month_number:            new Date().getMonth() + 1,
            quarter:                 Math.floor(new Date().getMonth() / 3) + 1,
            month_sin:               Math.sin(2 * Math.PI * (new Date().getMonth() + 1) / 12),
            month_cos:               Math.cos(2 * Math.PI * (new Date().getMonth() + 1) / 12),
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        predictedExpense = data.prediction || 0;
      } else {
        predictionMessage = 'Prediction service returned an error.';
      }
    } else {
      predictionMessage = 'ML service is not configured (AI_SERVICE_URL missing).';
    }
  } catch (error) {
    predictionMessage = 'Prediction service is temporarily unavailable.';
  }

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    periodSavings,
    deficit,
    totalSavings: periodSavings,
    totalInvestments: totalHoldings,
    totalAssets: totalHoldings,
    totalLiabilities,
    netWorth,
    budgetUtilizationPercent,
    budget: {
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      utilizationPercent: budgetUtilizationPercent,
      isOverBudget: totalBudget > 0 && totalSpent > totalBudget,
    },
    financialHealthScore,
    predictedExpense,
    predictionMessage,
    goals, // included so the AI assistant can list and describe savings goals
    projects: {
      ...projectSummary,
      projects: projects.slice(0, 3),
    },
  };
}

async function getRecentTransactions(userId, queryParams = {}) {
  return dashboardRepository.getRecentTransactions(userId, 10, queryParams);
}

async function getCategoryExpenses(userId, queryParams = {}) {
  return dashboardRepository.getCategoryWiseExpenses(userId, queryParams);
}

async function getMonthlyTrends(userId, queryParams = {}) {
  return dashboardRepository.getMonthlyTrends(userId, queryParams);
}

async function getAssistantContext(userId) {
  const [user, summary, currentMonth, transactions, categoryExpenses, monthlyTrends] = await Promise.all([
    userService.getProfile(userId),
    getSummary(userId),
    dashboardRepository.getCurrentMonthTotals(userId),
    getRecentTransactions(userId),
    getCategoryExpenses(userId),
    getMonthlyTrends(userId),
  ]);

  return {
    user: {
      name: user.name,
      preferredLanguage: user.preferred_language,
    },
    summary,
    currentMonth,
    recentTransactions: transactions,
    categoryExpenses,
    monthlyTrends,
  };
}

module.exports = {
  getSummary,
  getRecentTransactions,
  getCategoryExpenses,
  getMonthlyTrends,
  getAssistantContext,
};
