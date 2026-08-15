// budgetService.js
// Owns the "budget utilization" business rule:
//   utilization % = (actual spent / budget amount) * 100
//   remaining     = budget amount - actual spent
//   isExceeded    = actual spent > budget amount
// These are calculated here, not stored in the database.

const budgetRepository = require('../repositories/budgetRepository');
const categoryRepository = require('../repositories/categoryRepository');

function notFoundError() {
  const err = new Error('Budget record not found');
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

function withCalculatedFields(budgetRow) {
  const budgetAmount = Number(budgetRow.budget_amount);
  const actualSpent = Number(budgetRow.actual_spent || 0);

  return {
    ...budgetRow,
    actual_spent: actualSpent,
    remaining_amount: budgetAmount - actualSpent,
    utilization_percent: budgetAmount > 0 ? Number(((actualSpent / budgetAmount) * 100).toFixed(2)) : 0,
    is_exceeded: actualSpent > budgetAmount,
  };
}

async function getAllBudgets(userId) {
  const budgets = await budgetRepository.findAllByUser(userId);
  return budgets.map(withCalculatedFields);
}

async function getBudgetById(budgetId, userId) {
  const budget = await budgetRepository.findByIdAndUser(budgetId, userId);
  if (!budget) throw notFoundError();
  return budget;
}

async function createBudget(userId, { categoryId, budgetAmount, month, year }) {
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw badRequestError('categoryId does not match an existing category');

  return budgetRepository.create({ userId, categoryId, budgetAmount, month, year });
}

async function updateBudget(budgetId, userId, { budgetAmount, month, year }) {
  const updated = await budgetRepository.update(budgetId, userId, { budgetAmount, month, year });
  if (!updated) throw notFoundError();
  return updated;
}

async function deleteBudget(budgetId, userId) {
  const deleted = await budgetRepository.remove(budgetId, userId);
  if (!deleted) throw notFoundError();
}

module.exports = { getAllBudgets, getBudgetById, createBudget, updateBudget, deleteBudget };
