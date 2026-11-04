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

async function sendChatMessage(message, history = [], pendingTransaction = null, language = null) {
  const lang = language || localStorage.getItem('finman_lang') || 'en';
  const res = await api.post('/dashboard/chat', { message, history, pendingTransaction, language: lang });
  return res.data.data;
}

async function confirmAiTransaction(pendingTransaction) {
  const res = await api.post('/dashboard/ai/confirm-transaction', { pendingTransaction });
  return res.data.data;
}

async function getInsights(params = {}) {
  const res = await api.get('/dashboard/insights', { params });
  return res.data.data?.insights || [];
}

async function refreshInsights(data = {}) {
  const res = await api.post('/dashboard/insights/refresh', data);
  return res.data.data?.insights || [];
}

async function dismissInsight(id) {
  const res = await api.patch(`/dashboard/insights/${id}/dismiss`);
  return res.data.data;
}

async function markInsightRead(id) {
  const res = await api.patch(`/dashboard/insights/${id}/read`);
  return res.data.data;
}

async function submitInsightFeedback(id, feedback) {
  const res = await api.post(`/dashboard/insights/${id}/feedback`, { feedback });
  return res.data.data;
}

async function getFinancialProfile() {
  const res = await api.get('/dashboard/financial-profile');
  return res.data.data?.profile || null;
}

async function getExpenseForecast() {
  const res = await api.get('/dashboard/ml/forecast');
  return res.data.data?.forecast;
}

async function dismissAnomaly(id) {
  const res = await api.post(`/dashboard/ml/anomalies/${id}/dismiss`);
  return res.data;
}

async function getSpendingAnomalies() {
  const res = await api.get('/dashboard/ml/anomalies');
  return res.data.data?.anomalies || [];
}

async function getMlModelInfo() {
  const res = await api.get('/dashboard/ml/models');
  return res.data.data?.modelInfo;
}

async function predictCategory(payload) {
  const res = await api.post('/dashboard/ml/predict-category', payload);
  return res.data.data;
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
  refreshInsights,
  dismissInsight,
  markInsightRead,
  submitInsightFeedback,
  getFinancialProfile,
  getExpenseForecast,
  getSpendingAnomalies,
  dismissAnomaly,
  getMlModelInfo,
  predictCategory,
};

