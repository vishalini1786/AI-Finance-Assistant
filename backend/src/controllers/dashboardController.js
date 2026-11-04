// dashboardController.js

const dashboardService = require('../services/dashboardService');
const aiChatService = require('../services/aiChatService');
const aiInsightService = require('../services/aiInsightService');
const geminiService = require('../services/geminiService');
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
  const { message, history, pendingTransaction, language } = req.body;
  const lang = language || req.headers['x-language'] || 'en';
  const result = await aiChatService.processChatMessage(req.userId, message, history, pendingTransaction, lang);
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
  const pageContext = req.query.pageContext || req.query.page_context || null;
  const { status, refresh } = req.query;
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
  const pageContext =
    req.body?.pageContext ||
    req.body?.page_context ||
    req.query?.pageContext ||
    req.query?.page_context ||
    null;
  const refreshRes = await aiInsightService.refreshInsightsForUser(req.userId, { pageContext });
  const activeInsights = await aiInsightService.getInsights(req.userId, {
    pageContext,
    status: 'ACTIVE',
  });
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

const getAiDiagnostics = asyncHandler(async (req, res) => {
  const diag = geminiService.getGeminiDiagnostics();
  return sendSuccess(res, {
    message: 'AI provider diagnostics fetched',
    data: diag,
  });
});

const testAiConnection = asyncHandler(async (req, res) => {
  const result = await geminiService.testConnection();
  return sendSuccess(res, {
    message: result.message || 'AI provider connection tested',
    data: result,
  });
});


const getExpenseForecast = asyncHandler(async (req, res) => {
  const forecast = await dashboardService.getExpenseForecast(req.userId);
  return sendSuccess(res, { message: 'Expense forecast generated successfully', data: { forecast } });
});

const getSpendingAnomalies = asyncHandler(async (req, res) => {
  const anomalies = await dashboardService.getSpendingAnomalies(req.userId);
  return sendSuccess(res, { message: 'Spending anomalies analyzed successfully', data: { anomalies } });
});

const getMlModelInfo = asyncHandler(async (req, res) => {
  const modelInfo = await dashboardService.getMlModelInfo();
  return sendSuccess(res, { message: 'ML model info retrieved successfully', data: { modelInfo } });
});

const dismissAnomaly = asyncHandler(async (req, res) => {
  const result = await dashboardService.dismissAnomaly(req.userId, req.params.id);
  return sendSuccess(res, { message: 'Anomaly dismissed successfully', data: result });
});

const predictCategory = asyncHandler(async (req, res) => {
  const result = await dashboardService.predictExpenseCategory(req.body);
  return sendSuccess(res, { message: 'Category predicted successfully', data: result });
});

module.exports = {
  getSummary,
  getExpenseForecast,
  getSpendingAnomalies,
  dismissAnomaly,
  getMlModelInfo,
  predictCategory,
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
  getAiDiagnostics,
  testAiConnection,
};
