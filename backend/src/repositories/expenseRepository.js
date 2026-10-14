// expenseRepository.js
// All raw SQL for the `expenses` table. Every query is scoped to a
// user_id so one user can never see or modify another user's expenses.

const db = require('../config/database');

async function findAllByUser(userId) {
  const result = await db.query(
    `SELECT e.expense_id, e.user_id, e.category_id, e.amount, TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date, e.merchant_name, e.payment_mode, e.description, e.source_type, e.document_transaction_id, e.recurring_payment_id, e.created_at, e.updated_at, c.name AS category_name
     FROM expenses e
     JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1
     ORDER BY e.expense_date DESC, e.expense_id DESC`,
    [userId]
  );
  return result.rows;
}

async function findByIdAndUser(expenseId, userId) {
  const result = await db.query(
    `SELECT e.expense_id, e.user_id, e.category_id, e.amount, TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date, e.merchant_name, e.payment_mode, e.description, e.source_type, e.document_transaction_id, e.recurring_payment_id, e.created_at, e.updated_at, c.name AS category_name
     FROM expenses e
     JOIN categories c ON c.category_id = e.category_id
     WHERE e.expense_id = $1 AND e.user_id = $2`,
    [expenseId, userId]
  );
  return result.rows[0] || null;
}

async function create({
  userId,
  categoryId,
  amount,
  expenseDate,
  merchantName,
  paymentMode,
  description,
  sourceType,
  documentTransactionId,
  recurringPaymentId,
}) {
  const result = await db.query(
    `INSERT INTO expenses
       (user_id, category_id, amount, expense_date, merchant_name,
        payment_mode, description, source_type, document_transaction_id, recurring_payment_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      userId,
      categoryId,
      amount,
      expenseDate,
      merchantName || null,
      paymentMode || null,
      description || null,
      sourceType || 'MANUAL',
      documentTransactionId || null,
      recurringPaymentId || null,
    ]
  );
  return result.rows[0];
}

async function update(expenseId, userId, {
  categoryId,
  amount,
  expenseDate,
  merchantName,
  paymentMode,
  description,
}) {
  const result = await db.query(
    `UPDATE expenses
     SET category_id = $1, amount = $2, expense_date = $3, merchant_name = $4,
         payment_mode = $5, description = $6, updated_at = NOW()
     WHERE expense_id = $7 AND user_id = $8
     RETURNING *`,
    [categoryId, amount, expenseDate, merchantName || null, paymentMode || null, description || null, expenseId, userId]
  );
  return result.rows[0] || null;
}

async function remove(expenseId, userId) {
  const result = await db.query(
    'DELETE FROM expenses WHERE expense_id = $1 AND user_id = $2 RETURNING expense_id',
    [expenseId, userId]
  );
  return result.rowCount > 0;
}

// Used by budgetRepository to calculate "actual spent" for a category/month/year.
async function sumByCategoryAndMonth(userId, categoryId, month, year) {
  const result = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE user_id = $1
       AND category_id = $2
       AND EXTRACT(MONTH FROM expense_date) = $3
       AND EXTRACT(YEAR FROM expense_date) = $4`,
    [userId, categoryId, month, year]
  );
  return Number(result.rows[0].total);
}

// Fetch all expenses for a specific date (YYYY-MM-DD) — used for daily reports
async function findByDate(userId, date) {
  const result = await db.query(
    `SELECT e.expense_id, e.user_id, e.category_id, e.amount,
            TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date,
            e.merchant_name, e.payment_mode, e.description, e.source_type,
            c.name AS category_name
     FROM expenses e
     JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1 AND e.expense_date = $2::date
     ORDER BY e.created_at DESC`,
    [userId, date]
  );
  return result.rows;
}

// Daily summary totals by category for a specific date
async function getDailySummary(userId, date) {
  const result = await db.query(
    `SELECT
        COALESCE(SUM(e.amount), 0) AS total_expenses,
        COUNT(e.expense_id) AS transaction_count,
        json_agg(json_build_object(
          'category_name', c.name,
          'total', SUM(e.amount)
        ) ORDER BY SUM(e.amount) DESC) AS by_category
     FROM expenses e
     JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1 AND e.expense_date = $2::date
     GROUP BY e.user_id`,
    [userId, date]
  );
  if (result.rows.length === 0) {
    return { total_expenses: 0, transaction_count: 0, by_category: [] };
  }
  return result.rows[0];
}

// Frequent expense descriptions/categories for quick-add suggestions
async function getFrequentExpenses(userId, limit = 8) {
  const result = await db.query(
    `SELECT c.name AS category_name, c.category_id,
            e.description,
            ROUND(AVG(e.amount), 2) AS avg_amount,
            COUNT(*) AS occurrence_count
     FROM expenses e
     JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1
       AND e.expense_date >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY c.category_id, c.name, e.description
     HAVING COUNT(*) >= 2
     ORDER BY occurrence_count DESC, avg_amount ASC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

// Yesterday's expenses for "Repeat Yesterday" feature
async function getYesterdaysExpenses(userId) {
  const result = await db.query(
    `SELECT e.expense_id, e.category_id, e.amount,
            TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date,
            e.merchant_name, e.payment_mode, e.description,
            c.name AS category_name
     FROM expenses e
     JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1 AND e.expense_date = CURRENT_DATE - INTERVAL '1 day'
     ORDER BY e.created_at DESC`,
    [userId]
  );
  return result.rows;
}

module.exports = {
  findAllByUser,
  findByIdAndUser,
  create,
  update,
  remove,
  sumByCategoryAndMonth,
  findByDate,
  getDailySummary,
  getFrequentExpenses,
  getYesterdaysExpenses,
};
