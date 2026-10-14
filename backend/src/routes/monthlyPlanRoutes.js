// monthlyPlanRoutes.js
const express = require('express');
const router = express.Router();

const monthlyPlanController = require('../controllers/monthlyPlanController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/:year/:month', monthlyPlanController.getMonthlyPlan);
router.post('/:year/:month', monthlyPlanController.saveMonthlyPlan);

module.exports = router;
