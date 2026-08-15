// budgetController.js

const budgetService = require('../services/budgetService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getAllBudgets = asyncHandler(async (req, res) => {
  const budgets = await budgetService.getAllBudgets(req.userId);
  return sendSuccess(res, { message: 'Budgets fetched successfully', data: { budgets } });
});

const getBudgetById = asyncHandler(async (req, res) => {
  const budget = await budgetService.getBudgetById(req.params.id, req.userId);
  return sendSuccess(res, { message: 'Budget fetched successfully', data: { budget } });
});

const createBudget = asyncHandler(async (req, res) => {
  const { categoryId, budgetAmount, month, year } = req.body;
  const budget = await budgetService.createBudget(req.userId, { categoryId, budgetAmount, month, year });
  return sendSuccess(res, { statusCode: 201, message: 'Budget created successfully', data: { budget } });
});

const updateBudget = asyncHandler(async (req, res) => {
  const { budgetAmount, month, year } = req.body;
  const budget = await budgetService.updateBudget(req.params.id, req.userId, { budgetAmount, month, year });
  return sendSuccess(res, { message: 'Budget updated successfully', data: { budget } });
});

const deleteBudget = asyncHandler(async (req, res) => {
  await budgetService.deleteBudget(req.params.id, req.userId);
  return sendSuccess(res, { message: 'Budget deleted successfully', data: {} });
});

module.exports = { getAllBudgets, getBudgetById, createBudget, updateBudget, deleteBudget };
