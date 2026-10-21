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

module.exports = router;

