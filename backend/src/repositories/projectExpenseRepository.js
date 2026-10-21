// projectExpenseRepository.js
const db = require('../config/database');

function normalizeProjectExpense(row) {
  if (!row) return row;
  return {
    ...row,
    expense_id: row.project_expense_id,
  };
}

async function createProjectExpense({ projectId, userId, expenseName, category, amount, expenseDate, paymentMode, description }) {
  const result = await db.query(
    `INSERT INTO project_expenses (project_id, user_id, expense_name, category, amount, expense_date, payment_mode, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [projectId, userId, expenseName, category, amount, expenseDate, paymentMode, description]
  );
  return normalizeProjectExpense(result.rows[0]);
}

async function getProjectExpenses(projectId, userId) {
  const result = await db.query(
    `SELECT project_expense_id, project_id, user_id, expense_name, category, amount, TO_CHAR(expense_date, 'YYYY-MM-DD') AS expense_date, payment_mode, description, created_at, updated_at FROM project_expenses 
     WHERE project_id = $1 AND user_id = $2
     ORDER BY expense_date DESC, created_at DESC`,
    [projectId, userId]
  );
  return result.rows.map(normalizeProjectExpense);
}

async function getProjectExpenseById(expenseId, projectId, userId) {
  const result = await db.query(
    `SELECT project_expense_id, project_id, user_id, expense_name, category, amount, TO_CHAR(expense_date, 'YYYY-MM-DD') AS expense_date, payment_mode, description, created_at, updated_at FROM project_expenses WHERE project_expense_id = $1 AND project_id = $2 AND user_id = $3`,
    [expenseId, projectId, userId]
  );
  return normalizeProjectExpense(result.rows[0] || null);
}

async function updateProjectExpense(expenseId, projectId, userId, fields) {
  const allowedFields = ['expense_name', 'category', 'amount', 'expense_date', 'payment_mode', 'description'];
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(fields[key]);
      paramIndex += 1;
    }
  }

  if (setClauses.length === 0) return getProjectExpenseById(expenseId, projectId, userId);

  setClauses.push(`updated_at = NOW()`);
  values.push(expenseId, projectId, userId);

  const result = await db.query(
    `UPDATE project_expenses SET ${setClauses.join(', ')}
     WHERE project_expense_id = $${paramIndex} AND project_id = $${paramIndex + 1} AND user_id = $${paramIndex + 2}
     RETURNING *`,
    values
  );

  return normalizeProjectExpense(result.rows[0] || null);
}

async function deleteProjectExpense(expenseId, projectId, userId) {
  const result = await db.query(
    `DELETE FROM project_expenses 
     WHERE project_expense_id = $1 AND project_id = $2 AND user_id = $3 
     RETURNING *`,
    [expenseId, projectId, userId]
  );
  return normalizeProjectExpense(result.rows[0] || null);
}

module.exports = {
  createProjectExpense,
  getProjectExpenses,
  getProjectExpenseById,
  updateProjectExpense,
  deleteProjectExpense
};
