// incomeService.js
// Replaces mockData.income in the existing Expenses/Income UI.
// Usage: const income = await incomeService.getIncome();

import api from './api';

async function getIncome() {
  const res = await api.get('/income');
  return res.data.data.income;
}

async function getIncomeById(id) {
  const res = await api.get(`/income/${id}`);
  return res.data.data.income;
}

async function createIncome({ source, amount, incomeDate, description }) {
  const res = await api.post('/income', { source, amount, incomeDate, description });
  return res.data.data.income;
}

async function updateIncome(id, { source, amount, incomeDate, description }) {
  const res = await api.put(`/income/${id}`, { source, amount, incomeDate, description });
  return res.data.data.income;
}

async function deleteIncome(id) {
  await api.delete(`/income/${id}`);
}

export default { getIncome, getIncomeById, createIncome, updateIncome, deleteIncome };
