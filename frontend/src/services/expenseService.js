// expenseService.js
// Replaces mockData.expenses in the existing Expenses page.
// Usage: const expenses = await expenseService.getExpenses();

import api from './api';

async function getExpenses() {
  const res = await api.get('/expenses');
  return res.data.data.expenses;
}

async function getExpenseById(id) {
  const res = await api.get(`/expenses/${id}`);
  return res.data.data.expense;
}

async function createExpense(payload) {
  // payload: { categoryId, amount, expenseDate, merchantName, paymentMode, description }
  const res = await api.post('/expenses', payload);
  return res.data.data.expense;
}

async function updateExpense(id, payload) {
  const res = await api.put(`/expenses/${id}`, payload);
  return res.data.data.expense;
}

async function deleteExpense(id) {
  await api.delete(`/expenses/${id}`);
}

async function getDailyReport(date) {
  // date: YYYY-MM-DD string
  const res = await api.get('/expenses/daily', { params: { date } });
  return res.data.data;
}

async function getFrequentExpenses() {
  const res = await api.get('/expenses/frequent');
  return res.data.data.frequent;
}

async function getYesterdaysExpenses() {
  const res = await api.get('/expenses/yesterday');
  return res.data.data.expenses;
}

export default { getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense, getDailyReport, getFrequentExpenses, getYesterdaysExpenses };
