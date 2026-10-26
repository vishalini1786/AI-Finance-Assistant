// incomeService.js

const incomeRepository = require('../repositories/incomeRepository');

function notFoundError() {
  const err = new Error('Income record not found');
  err.statusCode = 404;
  err.expose = true;
  return err;
}

async function getAllIncome(userId) {
  return incomeRepository.findAllByUser(userId);
}

async function getIncomeById(incomeId, userId) {
  const income = await incomeRepository.findByIdAndUser(incomeId, userId);
  if (!income) throw notFoundError();
  return income;
}

async function createIncome(userId, { source, amount, incomeDate, description }) {
  const created = await incomeRepository.create({ userId, source, amount, incomeDate, description });
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId, { pageContext: ['INCOME', 'REPORTS', 'FINANCIAL_HEALTH', 'DASHBOARD'] }).catch(() => null);
  return created;
}

async function updateIncome(incomeId, userId, { source, amount, incomeDate, description }) {
  const updated = await incomeRepository.update(incomeId, userId, { source, amount, incomeDate, description });
  if (!updated) throw notFoundError();
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId, { pageContext: ['INCOME', 'REPORTS', 'FINANCIAL_HEALTH', 'DASHBOARD'] }).catch(() => null);
  return updated;
}

async function deleteIncome(incomeId, userId) {
  const deleted = await incomeRepository.remove(incomeId, userId);
  if (!deleted) throw notFoundError();
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId, { pageContext: ['INCOME', 'REPORTS', 'FINANCIAL_HEALTH', 'DASHBOARD'] }).catch(() => null);
}

module.exports = { getAllIncome, getIncomeById, createIncome, updateIncome, deleteIncome };
