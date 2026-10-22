const goalService = require('../services/goalService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getGoals = asyncHandler(async (req, res) => sendSuccess(res, { data: { goals: await goalService.getGoals(req.userId) } }));
const getGoal = asyncHandler(async (req, res) => sendSuccess(res, { data: { goal: await goalService.getGoal(req.params.id, req.userId) } }));
const createGoal = asyncHandler(async (req, res) => sendSuccess(res, { statusCode: 201, message: 'Savings goal created successfully', data: { goal: await goalService.createGoal(req.userId, req.body) } }));
const updateGoal = asyncHandler(async (req, res) => sendSuccess(res, { message: 'Savings goal updated successfully', data: { goal: await goalService.updateGoal(req.params.id, req.userId, req.body) } }));
const deleteGoal = asyncHandler(async (req, res) => { await goalService.deleteGoal(req.params.id, req.userId); return sendSuccess(res, { message: 'Savings goal deleted successfully' }); });
const recordContribution = asyncHandler(async (req, res) => {
  const result = await goalService.recordContribution(req.params.id, req.userId, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Contribution recorded successfully',
    data: result,
  });
});

const getContributions = asyncHandler(async (req, res) => {
  const contributions = await goalService.getContributions(req.params.id, req.userId);
  return sendSuccess(res, {
    data: { contributions },
  });
});

module.exports = { getGoals, getGoal, createGoal, updateGoal, deleteGoal, recordContribution, getContributions };

