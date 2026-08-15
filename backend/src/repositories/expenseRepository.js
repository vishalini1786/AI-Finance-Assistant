// expenseRepository.js
// All raw SQL for the `expenses` table. Every query is scoped to a
// user_id so one user can never see or modify another user's expenses.

const db = require('../config/database');

async function findAllByUser(userId) {
  const result = await db.query(
    `SELECT e.*, c.name AS category_name
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
    `SELECT e.*, c.name AS category_name
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

module.exports = {
  findAllByUser,
  findByIdAndUser,
  create,
  update,
  remove,
  sumByCategoryAndMonth,
};
