// expenseController.js

const expenseService = require('../services/expenseService');
const expenseRepository = require('../repositories/expenseRepository');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess, sendError } = require('../utils/response');

function pickExpenseFields(body) {
  return {
    categoryId: body.categoryId,
    amount: body.amount,
    expenseDate: body.expenseDate,
    merchantName: body.merchantName,
    paymentMode: body.paymentMode,
    description: body.description,
    sourceType: body.sourceType,
    documentTransactionId: body.documentTransactionId,
    recurringPaymentId: body.recurringPaymentId,
  };
}

const getAllExpenses = asyncHandler(async (req, res) => {
  const expenses = await expenseService.getAllExpenses(req.userId);
  return sendSuccess(res, { message: 'Expenses fetched successfully', data: { expenses } });
});

const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(req.params.id, req.userId);
  return sendSuccess(res, { message: 'Expense fetched successfully', data: { expense } });
});

const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.userId, pickExpenseFields(req.body));
  return sendSuccess(res, { statusCode: 201, message: 'Expense created successfully', data: { expense } });
});

const updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(req.params.id, req.userId, pickExpenseFields(req.body));
  return sendSuccess(res, { message: 'Expense updated successfully', data: { expense } });
});

const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.params.id, req.userId);
  return sendSuccess(res, { message: 'Expense deleted successfully', data: {} });
});

const incomeRepository = require('../repositories/incomeRepository');

// Daily report: get expenses and incomes for a specific date
const getDailyReport = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendError(res, { statusCode: 400, message: 'A valid date (YYYY-MM-DD) is required' });
  }
  const [expenses, incomes, summary] = await Promise.all([
    expenseRepository.findByDate(req.userId, date),
    incomeRepository.findByDate(req.userId, date),
    expenseRepository.getDailySummary(req.userId, date),
  ]);
  return sendSuccess(res, { message: 'Daily report fetched', data: { date, expenses, incomes, summary } });
});

// Quick expense: get frequent expenses for suggestions
const getFrequentExpenses = asyncHandler(async (req, res) => {
  const frequent = await expenseRepository.getFrequentExpenses(req.userId);
  return sendSuccess(res, { message: 'Frequent expenses fetched', data: { frequent } });
});

// Quick expense: get yesterday's expenses for repeat feature
const getYesterdaysExpenses = asyncHandler(async (req, res) => {
  const expenses = await expenseRepository.getYesterdaysExpenses(req.userId);
  return sendSuccess(res, { message: "Yesterday's expenses fetched", data: { expenses } });
});

module.exports = { getAllExpenses, getExpenseById, createExpense, updateExpense, deleteExpense, getDailyReport, getFrequentExpenses, getYesterdaysExpenses };
