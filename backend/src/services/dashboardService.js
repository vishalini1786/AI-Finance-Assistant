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

async function getSummary(userId) {
  const [
    totalIncome,
    totalExpenses,
    totalHoldings,
    totalLiabilities,
    budgetUtil,
    projectSummary,
    projects,
  ] = await Promise.all([
    dashboardRepository.getTotalIncome(userId),
    dashboardRepository.getTotalExpenses(userId),
    dashboardRepository.getTotalHoldings(userId),
    dashboardRepository.getTotalLiabilities(userId),
    dashboardRepository.getOverallBudgetUtilization(userId),
    projectService.getProjectSummary(userId),
    projectService.getProjects(userId),
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
  const financialHealthScore = calculateFinancialHealthScore({
    totalIncome,
    totalExpenses,
    totalHoldings,
    totalLiabilities,
    budgetUtilizationPercent,
  });

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    periodSavings,
    deficit,
    // Kept as a compatibility alias for existing consumers. It is never negative.
    totalSavings: periodSavings,
    // totalInvestments is a subset of holdings in later phases;
    // for Phase 1 we report total holdings as both fields so the
    // existing frontend cards don't break.
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
    projects: {
      ...projectSummary,
      projects: projects.slice(0, 3),
    },
  };
}

async function getRecentTransactions(userId) {
  return dashboardRepository.getRecentTransactions(userId, 10);
}

async function getCategoryExpenses(userId) {
  return dashboardRepository.getCategoryWiseExpenses(userId);
}

async function getMonthlyTrends(userId) {
  return dashboardRepository.getMonthlyTrends(userId);
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
