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

const { buildFinancialProfile } = require('../services/financialProfileService');

const getInsights = asyncHandler(async (req, res) => {
  const { pageContext, status, refresh } = req.query;
  const result = await aiInsightService.getInsights(req.userId, {
    pageContext,
    status,
    refresh: refresh === 'true',
  });
  return sendSuccess(res, {
    message: 'Personalized financial insights fetched successfully',
    data: result,
  });
});

const getFinancialProfile = asyncHandler(async (req, res) => {
  const profile = await buildFinancialProfile(req.userId);
  return sendSuccess(res, {
    message: 'Personalized financial profile fetched successfully',
    data: { profile },
  });
});

const dismissInsight = asyncHandler(async (req, res) => {
  const updated = await aiInsightService.dismissInsight(req.params.id, req.userId);
  if (!updated) {
    return sendError(res, { statusCode: 404, message: 'Insight not found' });
  }
  return sendSuccess(res, { message: 'Insight dismissed', data: { insight: updated } });
});

const markInsightRead = asyncHandler(async (req, res) => {
  const updated = await aiInsightService.markRead(req.params.id, req.userId);
  if (!updated) {
    return sendError(res, { statusCode: 404, message: 'Insight not found' });
  }
  return sendSuccess(res, { message: 'Insight marked as read', data: { insight: updated } });
});

const recordFeedback = asyncHandler(async (req, res) => {
  const { feedback } = req.body;
  if (!['HELPFUL', 'UNHELPFUL'].includes(String(feedback).toUpperCase())) {
    return sendError(res, { statusCode: 400, message: 'Feedback must be HELPFUL or UNHELPFUL' });
  }
  const updated = await aiInsightService.recordFeedback(req.params.id, req.userId, feedback);
  if (!updated) {
    return sendError(res, { statusCode: 404, message: 'Insight not found' });
  }
  return sendSuccess(res, { message: 'Feedback recorded', data: { insight: updated } });
});

const refreshInsights = asyncHandler(async (req, res) => {
  const refreshRes = await aiInsightService.refreshInsightsForUser(req.userId);
  const activeInsights = await aiInsightService.getInsights(req.userId, { status: 'ACTIVE' });
  return sendSuccess(res, {
    message: 'Insights refreshed successfully',
    data: {
      success: refreshRes.success,
      count: refreshRes.count,
      insights: activeInsights.insights || [],
      profile: refreshRes.profile,
    },
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
  getFinancialProfile,
  dismissInsight,
  markInsightRead,
  recordFeedback,
  refreshInsights,
};

