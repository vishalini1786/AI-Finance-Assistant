// incomeController.js

const incomeService = require('../services/incomeService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getAllIncome = asyncHandler(async (req, res) => {
  const income = await incomeService.getAllIncome(req.userId);
  return sendSuccess(res, { message: 'Income records fetched successfully', data: { income } });
});

const getIncomeById = asyncHandler(async (req, res) => {
  const income = await incomeService.getIncomeById(req.params.id, req.userId);
  return sendSuccess(res, { message: 'Income record fetched successfully', data: { income } });
});

const createIncome = asyncHandler(async (req, res) => {
  const { source, amount, incomeDate, description } = req.body;
  const income = await incomeService.createIncome(req.userId, { source, amount, incomeDate, description });
  return sendSuccess(res, { statusCode: 201, message: 'Income created successfully', data: { income } });
});

const updateIncome = asyncHandler(async (req, res) => {
  const { source, amount, incomeDate, description } = req.body;
  const income = await incomeService.updateIncome(req.params.id, req.userId, { source, amount, incomeDate, description });
  return sendSuccess(res, { message: 'Income updated successfully', data: { income } });
});

const deleteIncome = asyncHandler(async (req, res) => {
  await incomeService.deleteIncome(req.params.id, req.userId);
  return sendSuccess(res, { message: 'Income deleted successfully', data: {} });
});

module.exports = { getAllIncome, getIncomeById, createIncome, updateIncome, deleteIncome };
