// dashboardService.js
// Replaces mockData.dashboard in the existing Dashboard page.
// Usage:
//   const summary = await dashboardService.getSummary();
//   const recent = await dashboardService.getRecentTransactions();

import api from './api';

async function getSummary() {
  const res = await api.get('/dashboard/summary');
  return res.data.data;
  // Shape: { totalIncome, totalExpenses, totalSavings, totalInvestments,
  //          totalAssets, totalLiabilities, netWorth,
  //          budgetUtilizationPercent, financialHealthScore }
}

async function getRecentTransactions() {
  const res = await api.get('/dashboard/recent-transactions');
  return res.data.data.transactions;
}

async function getCategoryExpenses() {
  const res = await api.get('/dashboard/category-expenses');
  return res.data.data.categoryExpenses;
}

async function getMonthlyTrends() {
  const res = await api.get('/dashboard/monthly-trends');
  return res.data.data.monthlyTrends;
}

export default { getSummary, getRecentTransactions, getCategoryExpenses, getMonthlyTrends };
