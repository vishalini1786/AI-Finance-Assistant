// expenseController.js

const expenseService = require('../services/expenseService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

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

module.exports = { getAllExpenses, getExpenseById, createExpense, updateExpense, deleteExpense };
