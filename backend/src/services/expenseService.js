// expenseService.js

const expenseRepository = require('../repositories/expenseRepository');
const categoryRepository = require('../repositories/categoryRepository');

function notFoundError(message = 'Expense record not found') {
  const err = new Error(message);
  err.statusCode = 404;
  err.expose = true;
  return err;
}

function badRequestError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.expose = true;
  return err;
}

async function assertCategoryExists(categoryId) {
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    throw badRequestError('categoryId does not match an existing category');
  }
}

async function getAllExpenses(userId) {
  return expenseRepository.findAllByUser(userId);
}

async function getExpenseById(expenseId, userId) {
  const expense = await expenseRepository.findByIdAndUser(expenseId, userId);
  if (!expense) throw notFoundError();
  return expense;
}

async function createExpense(userId, payload) {
  await assertCategoryExists(payload.categoryId);
  return expenseRepository.create({ userId, ...payload });
}

async function updateExpense(expenseId, userId, payload) {
  await assertCategoryExists(payload.categoryId);
  const updated = await expenseRepository.update(expenseId, userId, payload);
  if (!updated) throw notFoundError();
  return updated;
}

async function deleteExpense(expenseId, userId) {
  const deleted = await expenseRepository.remove(expenseId, userId);
  if (!deleted) throw notFoundError();
}

module.exports = { getAllExpenses, getExpenseById, createExpense, updateExpense, deleteExpense };
