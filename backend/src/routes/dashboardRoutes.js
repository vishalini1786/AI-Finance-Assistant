// dashboardRoutes.js

const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/summary', dashboardController.getSummary);
router.get('/recent-transactions', dashboardController.getRecentTransactions);
router.get('/category-expenses', dashboardController.getCategoryExpenses);
router.get('/monthly-trends', dashboardController.getMonthlyTrends);
router.get('/ml/forecast', dashboardController.getExpenseForecast);
router.get('/ml/anomalies', dashboardController.getSpendingAnomalies);
router.post('/ml/anomalies/:id/dismiss', dashboardController.dismissAnomaly);
router.get('/ml/models', dashboardController.getMlModelInfo);
router.post('/ml/predict-category', dashboardController.predictCategory);
router.post('/predict-category', dashboardController.predictCategory);
router.get('/assistant-context', dashboardController.getAssistantContext);
router.post('/chat', dashboardController.chat);
router.post('/ai/confirm-transaction', dashboardController.confirmAiTransaction);
router.post('/confirm-transaction', dashboardController.confirmAiTransaction);
router.get('/insights', dashboardController.getInsights);
router.post('/insights/refresh', dashboardController.refreshInsights);
router.patch('/insights/:id/dismiss', dashboardController.dismissInsight);
router.patch('/insights/:id/read', dashboardController.markInsightRead);
router.post('/insights/:id/feedback', dashboardController.recordFeedback);
router.get('/financial-profile', dashboardController.getFinancialProfile);
router.get('/ai/diagnostics', dashboardController.getAiDiagnostics);
router.post('/ai/test-connection', dashboardController.testAiConnection);

module.exports = router;

