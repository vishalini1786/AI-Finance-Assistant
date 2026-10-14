// monthlyPlanController.js
const monthlyPlanService = require('../services/monthlyPlanService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess, sendError } = require('../utils/response');

const getMonthlyPlan = asyncHandler(async (req, res) => {
  const { year, month } = req.params;
  if (!year || !month || isNaN(month) || isNaN(year)) {
    return sendError(res, { statusCode: 400, message: 'Invalid year or month' });
  }

  const plan = await monthlyPlanService.getMonthlyPlan(req.userId, month, year);
  return sendSuccess(res, { message: 'Monthly plan fetched successfully', data: { plan } });
});

const saveMonthlyPlan = asyncHandler(async (req, res) => {
  const { year, month } = req.params;
  if (!year || !month || isNaN(month) || isNaN(year)) {
    return sendError(res, { statusCode: 400, message: 'Invalid year or month' });
  }

  const { plannedIncome, emergencyReserve, allocations } = req.body;
  
  const plan = await monthlyPlanService.saveMonthlyPlan(req.userId, month, year, {
    plannedIncome,
    emergencyReserve,
    allocations
  });

  return sendSuccess(res, { statusCode: 200, message: 'Monthly plan saved successfully', data: { plan } });
});

module.exports = { getMonthlyPlan, saveMonthlyPlan };
