// dashboardService.js
// Replaces mockData.dashboard in the existing Dashboard page.
// Usage:
//   const summary = await dashboardService.getSummary();
//   const recent = await dashboardService.getRecentTransactions();

import api from './api';

async function getSummary(params = {}) {
  const res = await api.get('/dashboard/summary', { params });
  return res.data.data?.summary || res.data.data;
}

async function getRecentTransactions(params = {}) {
  const res = await api.get('/dashboard/recent-transactions', { params });
  return res.data.data.transactions;
}

async function getCategoryExpenses(params = {}) {
  const res = await api.get('/dashboard/category-expenses', { params });
  return res.data.data.categoryExpenses;
}

async function getMonthlyTrends(params = {}) {
  const res = await api.get('/dashboard/monthly-trends', { params });
  return res.data.data.monthlyTrends;
}

async function getAssistantContext() {
  const res = await api.get('/dashboard/assistant-context');
  return res.data.data.context;
}

async function sendChatMessage(message, history = [], pendingTransaction = null) {
  const res = await api.post('/dashboard/chat', { message, history, pendingTransaction });
  return res.data.data;
}

async function confirmAiTransaction(pendingTransaction) {
  const res = await api.post('/dashboard/ai/confirm-transaction', { pendingTransaction });
  return res.data.data;
}

async function getInsights() {
  const res = await api.get('/dashboard/insights');
  return res.data.data.insights;
}

export default {
  getSummary,
  getRecentTransactions,
  getCategoryExpenses,
  getMonthlyTrends,
  getAssistantContext,
  sendChatMessage,
  confirmAiTransaction,
  getInsights,
};

