// dashboardService.js
// Combines several repository calls into the shapes the React
// Dashboard page expects. No dashboard table - everything computed
// on read.

const dashboardRepository = require('../repositories/dashboardRepository');

async function getSummary(userId) {
  const [totalIncome, totalExpenses, totalHoldings, totalLiabilities, budgetUtil] = await Promise.all([
    dashboardRepository.getTotalIncome(userId),
    dashboardRepository.getTotalExpenses(userId),
    dashboardRepository.getTotalHoldings(userId),
    dashboardRepository.getTotalLiabilities(userId),
    dashboardRepository.getOverallBudgetUtilization(userId),
  ]);

  const totalSavings = totalIncome - totalExpenses;
  const netWorth = totalHoldings - totalLiabilities;

  const totalBudget = Number(budgetUtil.total_budget || 0);
  const totalSpent = Number(budgetUtil.total_spent || 0);
  const budgetUtilizationPercent = totalBudget > 0
    ? Number(((totalSpent / totalBudget) * 100).toFixed(2))
    : 0;

  return {
    totalIncome,
    totalExpenses,
    totalSavings,
    // totalInvestments is a subset of holdings in later phases;
    // for Phase 1 we report total holdings as both fields so the
    // existing frontend cards don't break.
    totalInvestments: totalHoldings,
    totalAssets: totalHoldings,
    totalLiabilities,
    netWorth,
    budgetUtilizationPercent,
    // Financial health score arrives in a later phase (AI service).
    financialHealthScore: null,
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

module.exports = { getSummary, getRecentTransactions, getCategoryExpenses, getMonthlyTrends };
