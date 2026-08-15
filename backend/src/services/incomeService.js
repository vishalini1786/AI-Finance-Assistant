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
  return incomeRepository.create({ userId, source, amount, incomeDate, description });
}

async function updateIncome(incomeId, userId, { source, amount, incomeDate, description }) {
  // Ownership is enforced inside the repository query
  // (WHERE income_id = $1 AND user_id = $2), so a null result here
  // means either "doesn't exist" or "belongs to someone else" -
  // both should look identical to the caller (404, not 403), so we
  // don't leak whether the record exists for another user.
  const updated = await incomeRepository.update(incomeId, userId, { source, amount, incomeDate, description });
  if (!updated) throw notFoundError();
  return updated;
}

async function deleteIncome(incomeId, userId) {
  const deleted = await incomeRepository.remove(incomeId, userId);
  if (!deleted) throw notFoundError();
}

module.exports = { getAllIncome, getIncomeById, createIncome, updateIncome, deleteIncome };
