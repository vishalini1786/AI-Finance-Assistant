// dashboardController.js

const dashboardService = require('../services/dashboardService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getSummary(req.userId);
  return sendSuccess(res, { message: 'Dashboard summary fetched successfully', data: summary });
});

const getRecentTransactions = asyncHandler(async (req, res) => {
  const transactions = await dashboardService.getRecentTransactions(req.userId);
  return sendSuccess(res, { message: 'Recent transactions fetched successfully', data: { transactions } });
});

const getCategoryExpenses = asyncHandler(async (req, res) => {
  const categoryExpenses = await dashboardService.getCategoryExpenses(req.userId);
  return sendSuccess(res, { message: 'Category-wise expenses fetched successfully', data: { categoryExpenses } });
});

const getMonthlyTrends = asyncHandler(async (req, res) => {
  const monthlyTrends = await dashboardService.getMonthlyTrends(req.userId);
  return sendSuccess(res, { message: 'Monthly trends fetched successfully', data: { monthlyTrends } });
});

module.exports = { getSummary, getRecentTransactions, getCategoryExpenses, getMonthlyTrends };
