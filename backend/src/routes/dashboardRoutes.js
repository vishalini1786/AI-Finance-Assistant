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

