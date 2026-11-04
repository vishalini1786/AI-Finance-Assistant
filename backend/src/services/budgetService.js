// budgetService.js
// Owns the "budget utilization" business rule:
//   utilization % = (actual spent / budget amount) * 100
//   remaining     = budget amount - actual spent
//   isExceeded    = actual spent > budget amount
// These are calculated here, not stored in the database.

const budgetRepository = require('../repositories/budgetRepository');
const categoryRepository = require('../repositories/categoryRepository');
const notificationService = require('./notificationService');

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
  const calculated = budgets.map(withCalculatedFields);
  await Promise.all(calculated.map((budget) => notificationService.notifyBudgetStatus(userId, budget)));
  return calculated;
}

async function getBudgetById(budgetId, userId) {
  const budget = await budgetRepository.findByIdAndUser(budgetId, userId);
  if (!budget) throw notFoundError();
  const spent = await budgetRepository.findAllByUser(userId);
  const calculated = spent.find((item) => item.budget_id === Number(budgetId));
  return withCalculatedFields(calculated || budget);
}

async function createBudget(userId, { categoryId, budgetAmount, month, year, priority }) {
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw badRequestError('categoryId does not match an existing category');

  const created = await budgetRepository.create({ userId, categoryId, budgetAmount, month, year, priority });
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId, { pageContext: ['BUDGET', 'DASHBOARD'] }).catch(() => null);
  return getBudgetById(created.budget_id, userId);
}

async function updateBudget(budgetId, userId, { budgetAmount, month, year, priority }) {
  const updated = await budgetRepository.update(budgetId, userId, { budgetAmount, month, year, priority });
  if (!updated) throw notFoundError();
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId, { pageContext: ['BUDGET', 'DASHBOARD'] }).catch(() => null);
  return getBudgetById(updated.budget_id, userId);
}

async function deleteBudget(budgetId, userId) {
  const deleted = await budgetRepository.remove(budgetId, userId);
  if (!deleted) throw notFoundError();
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId, { pageContext: ['BUDGET', 'DASHBOARD'] }).catch(() => null);
}

async function reallocateBudget(userId, { fromCategoryId, toCategoryId, amount, month, year }) {
  const numAmount = Number(amount);
  if (!fromCategoryId || !toCategoryId || !numAmount || numAmount <= 0) {
    throw badRequestError('fromCategoryId, toCategoryId, and a valid amount are required');
  }

  const allBudgets = await getAllBudgets(userId);
  const fromBudget = allBudgets.find(b => Number(b.category_id) === Number(fromCategoryId) && Number(b.month) === Number(month) && Number(b.year) === Number(year));
  const toBudget = allBudgets.find(b => Number(b.category_id) === Number(toCategoryId) && Number(b.month) === Number(month) && Number(b.year) === Number(year));

  if (!fromBudget) throw badRequestError('Source category budget not found for this month');
  if (!toBudget) throw badRequestError('Destination category budget not found for this month');

  // Priority validation: Critical (5) and Essential (4) cannot be reduced to fund lower priority categories
  const getWeight = (p) => {
    switch (String(p || '').toUpperCase()) {
      case 'CRITICAL': return 5;
      case 'ESSENTIAL': return 4;
      case 'IMPORTANT': return 3;
      case 'FLEXIBLE': return 2;
      case 'DISCRETIONARY': return 1;
      default: return 2;
    }
  };

  const fromWeight = getWeight(fromBudget.priority);
  const toWeight = getWeight(toBudget.priority);

  if (fromWeight >= 4 && fromWeight > toWeight) {
    throw badRequestError(`Cannot reallocate from ${fromBudget.category_name} (${fromBudget.priority}): Critical and Essential budgets cannot be reduced to fund lower-priority categories.`);
  }

  // Available surplus validation: cannot reallocate more than unspent remaining balance
  const remainingSurplus = Number(fromBudget.budget_amount) - Number(fromBudget.actual_spent);
  if (remainingSurplus < numAmount) {
    throw badRequestError(`Cannot reallocate ₹${numAmount.toLocaleString('en-IN')}: ${fromBudget.category_name} only has ₹${Math.max(0, remainingSurplus).toLocaleString('en-IN')} unspent surplus available.`);
  }

  const newFromAmount = Number(fromBudget.budget_amount) - numAmount;
  const newToAmount = Number(toBudget.budget_amount) + numAmount;

  if (newFromAmount < 0) {
    throw badRequestError('Reallocation would result in a negative budget amount.');
  }

  // Transaction-safe atomic execution: ensures total budget preservation and no concurrent update corruption
  const db = require('../config/database');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE budgets SET budget_amount = $1, updated_at = NOW() WHERE budget_id = $2 AND user_id = $3',
      [newFromAmount, fromBudget.budget_id, userId]
    );
    await client.query(
      'UPDATE budgets SET budget_amount = $1, updated_at = NOW() WHERE budget_id = $2 AND user_id = $3',
      [newToAmount, toBudget.budget_id, userId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Create audit notification
  const notificationRepository = require('../repositories/notificationRepository');
  await notificationRepository.createIfMissing({
    userId,
    title: 'Budget Reallocated',
    message: `Reallocated ₹${numAmount.toLocaleString('en-IN')} from ${fromBudget.category_name} to ${toBudget.category_name}.`,
    notificationType: 'BUDGET_REALLOCATION',
    link: '/budget'
  });

  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId, { pageContext: ['BUDGET', 'DASHBOARD'] }).catch(() => null);

  return {
    success: true,
    message: `Reallocated ₹${numAmount.toLocaleString('en-IN')} from ${fromBudget.category_name} to ${toBudget.category_name}.`,
    totalBudgetPreserved: true,
    fromBudget: { ...fromBudget, budget_amount: newFromAmount },
    toBudget: { ...toBudget, budget_amount: newToAmount }
  };
}

module.exports = { getAllBudgets, getBudgetById, createBudget, updateBudget, deleteBudget, reallocateBudget };
