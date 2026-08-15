// incomeRepository.js
// All raw SQL for the `incomes` table. Every query is scoped to a
// user_id so one user can never see or modify another user's income.

const db = require('../config/database');

async function findAllByUser(userId) {
  const result = await db.query(
    `SELECT * FROM incomes
     WHERE user_id = $1
     ORDER BY income_date DESC, income_id DESC`,
    [userId]
  );
  return result.rows;
}

async function findByIdAndUser(incomeId, userId) {
  const result = await db.query(
    'SELECT * FROM incomes WHERE income_id = $1 AND user_id = $2',
    [incomeId, userId]
  );
  return result.rows[0] || null;
}

async function create({ userId, source, amount, incomeDate, description }) {
  const result = await db.query(
    `INSERT INTO incomes (user_id, source, amount, income_date, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, source, amount, incomeDate, description || null]
  );
  return result.rows[0];
}

async function update(incomeId, userId, { source, amount, incomeDate, description }) {
  const result = await db.query(
    `UPDATE incomes
     SET source = $1, amount = $2, income_date = $3, description = $4, updated_at = NOW()
     WHERE income_id = $5 AND user_id = $6
     RETURNING *`,
    [source, amount, incomeDate, description || null, incomeId, userId]
  );
  return result.rows[0] || null;
}

async function remove(incomeId, userId) {
  const result = await db.query(
    'DELETE FROM incomes WHERE income_id = $1 AND user_id = $2 RETURNING income_id',
    [incomeId, userId]
  );
  return result.rowCount > 0;
}

module.exports = { findAllByUser, findByIdAndUser, create, update, remove };
