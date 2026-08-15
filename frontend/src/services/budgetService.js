// budgetService.js
// Replaces mockData.budgets in the existing Budget page.
// Usage: const budgets = await budgetService.getBudgets();
// Each returned budget already includes actual_spent, remaining_amount,
// utilization_percent, and is_exceeded - no need to recalculate in the UI.

import api from './api';

async function getBudgets() {
  const res = await api.get('/budgets');
  return res.data.data.budgets;
}

async function getBudgetById(id) {
  const res = await api.get(`/budgets/${id}`);
  return res.data.data.budget;
}

async function createBudget({ categoryId, budgetAmount, month, year }) {
  const res = await api.post('/budgets', { categoryId, budgetAmount, month, year });
  return res.data.data.budget;
}

async function updateBudget(id, { budgetAmount, month, year }) {
  const res = await api.put(`/budgets/${id}`, { budgetAmount, month, year });
  return res.data.data.budget;
}

async function deleteBudget(id) {
  await api.delete(`/budgets/${id}`);
}

export default { getBudgets, getBudgetById, createBudget, updateBudget, deleteBudget };
