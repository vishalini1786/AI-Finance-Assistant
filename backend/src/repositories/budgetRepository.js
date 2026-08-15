// budgetRepository.js
// All raw SQL for the `budgets` table.

const db = require('../config/database');

async function findAllByUser(userId) {
  // Joins against expenses to compute actual_spent per budget in one
  // query - the utilization %/remaining amount are derived in the
  // service layer from actual_spent and budget_amount.
  const result = await db.query(
    `SELECT
        b.budget_id,
        b.user_id,
        b.category_id,
        c.name AS category_name,
        b.budget_amount,
        b.month,
        b.year,
        b.created_at,
        b.updated_at,
        COALESCE(SUM(e.amount), 0) AS actual_spent
     FROM budgets b
     JOIN categories c ON c.category_id = b.category_id
     LEFT JOIN expenses e
        ON e.category_id = b.category_id
        AND e.user_id = b.user_id
        AND EXTRACT(MONTH FROM e.expense_date) = b.month
        AND EXTRACT(YEAR FROM e.expense_date) = b.year
     WHERE b.user_id = $1
     GROUP BY b.budget_id, b.user_id, b.category_id, c.name, b.budget_amount, b.month, b.year, b.created_at, b.updated_at
     ORDER BY b.year DESC, b.month DESC`,
    [userId]
  );
  return result.rows;
}

async function findByIdAndUser(budgetId, userId) {
  const result = await db.query(
    `SELECT b.*, c.name AS category_name
     FROM budgets b
     JOIN categories c ON c.category_id = b.category_id
     WHERE b.budget_id = $1 AND b.user_id = $2`,
    [budgetId, userId]
  );
  return result.rows[0] || null;
}

async function create({ userId, categoryId, budgetAmount, month, year }) {
  const result = await db.query(
    `INSERT INTO budgets (user_id, category_id, budget_amount, month, year)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, categoryId, budgetAmount, month, year]
  );
  return result.rows[0];
}

async function update(budgetId, userId, { budgetAmount, month, year }) {
  const result = await db.query(
    `UPDATE budgets
     SET budget_amount = $1, month = $2, year = $3, updated_at = NOW()
     WHERE budget_id = $4 AND user_id = $5
     RETURNING *`,
    [budgetAmount, month, year, budgetId, userId]
  );
  return result.rows[0] || null;
}

async function remove(budgetId, userId) {
  const result = await db.query(
    'DELETE FROM budgets WHERE budget_id = $1 AND user_id = $2 RETURNING budget_id',
    [budgetId, userId]
  );
  return result.rowCount > 0;
}

module.exports = { findAllByUser, findByIdAndUser, create, update, remove };
