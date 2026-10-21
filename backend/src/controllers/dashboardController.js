// dashboardController.js

const dashboardService = require('../services/dashboardService');
const aiChatService = require('../services/aiChatService');
const aiInsightService = require('../services/aiInsightService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess, sendError } = require('../utils/response');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getSummary(req.userId, req.query);
  // Expose summary both at the top level and under the `summary` key so
  // existing frontend code (summaryData?.summary || summaryData) works in
  // either shape. The nested key is the canonical access path.
  return sendSuccess(res, {
    message: 'Dashboard summary fetched successfully',
    data: { summary },
  });
});

const getRecentTransactions = asyncHandler(async (req, res) => {
  const transactions = await dashboardService.getRecentTransactions(req.userId, req.query);
  return sendSuccess(res, { message: 'Recent transactions fetched successfully', data: { transactions } });
});

const getCategoryExpenses = asyncHandler(async (req, res) => {
  const categoryExpenses = await dashboardService.getCategoryExpenses(req.userId, req.query);
  return sendSuccess(res, { message: 'Category-wise expenses fetched successfully', data: { categoryExpenses } });
});

const getMonthlyTrends = asyncHandler(async (req, res) => {
  const monthlyTrends = await dashboardService.getMonthlyTrends(req.userId, req.query);
  return sendSuccess(res, {
    message: 'Monthly trends fetched successfully',
    data: { monthlyTrends, trends: monthlyTrends },
  });
});

const getAssistantContext = asyncHandler(async (req, res) => {
  const context = await dashboardService.getAssistantContext(req.userId);
  return sendSuccess(res, {
    message: 'Authenticated financial context fetched successfully',
    data: { context },
  });
});

const chat = asyncHandler(async (req, res) => {
  const { message, history, pendingTransaction } = req.body;
  const result = await aiChatService.processChatMessage(req.userId, message, history, pendingTransaction);
  return sendSuccess(res, {
    message: 'Chat response generated successfully',
    data: result,
  });
});

const confirmAiTransaction = asyncHandler(async (req, res) => {
  const { pendingTransaction } = req.body;
  if (!pendingTransaction) {
    return sendError(res, { statusCode: 400, message: 'Pending transaction data is required' });
  }
  const result = await aiChatService.executeConfirmTransaction(req.userId, pendingTransaction);
  return sendSuccess(res, {
    message: result.message,
    data: result,
  });
});

const getInsights = asyncHandler(async (req, res) => {
  const insights = await aiInsightService.getInsights(req.userId);
  return sendSuccess(res, {
    message: 'Financial insights fetched successfully',
    data: { insights },
  });
});

module.exports = {
  getSummary,
  getRecentTransactions,
  getCategoryExpenses,
  getMonthlyTrends,
  getAssistantContext,
  chat,
  confirmAiTransaction,
  getInsights,
};

