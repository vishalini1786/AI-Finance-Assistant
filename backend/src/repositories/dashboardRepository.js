// dashboardRepository.js
// Aggregate queries powering the dashboard. No dashboard table is
// created - everything here is computed on read from the real tables.

const db = require('../config/database');

async function getTotalIncome(userId) {
  const result = await db.query(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM incomes WHERE user_id = $1',
    [userId]
  );
  return Number(result.rows[0].total);
}

async function getTotalExpenses(userId) {
  const result = await db.query(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = $1',
    [userId]
  );
  return Number(result.rows[0].total);
}

async function getTotalHoldings(userId) {
  const result = await db.query(
    'SELECT COALESCE(SUM(current_value), 0) AS total FROM financial_holdings WHERE user_id = $1',
    [userId]
  );
  return Number(result.rows[0].total);
}

async function getTotalLiabilities(userId) {
  const result = await db.query(
    'SELECT COALESCE(SUM(remaining_amount), 0) AS total FROM liabilities WHERE user_id = $1',
    [userId]
  );
  return Number(result.rows[0].total);
}

async function getRecentTransactions(userId, limit = 10) {
  const result = await db.query(
    `SELECT e.expense_id, e.amount, e.expense_date, e.merchant_name,
            e.description, c.name AS category_name
     FROM expenses e
     JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1
     ORDER BY e.expense_date DESC, e.expense_id DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

async function getCategoryWiseExpenses(userId) {
  // Current calendar month only.
  const result = await db.query(
    `SELECT c.name AS category_name, COALESCE(SUM(e.amount), 0) AS total_amount
     FROM expenses e
     JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1
       AND EXTRACT(MONTH FROM e.expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM e.expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
     GROUP BY c.name
     ORDER BY total_amount DESC`,
    [userId]
  );
  return result.rows;
}

async function getMonthlyTrends(userId) {
  // Last 6 months of income vs expenses, including months with no data.
  const result = await db.query(
    `SELECT
        TO_CHAR(month_series, 'YYYY-MM') AS month,
        COALESCE(income.total, 0) AS total_income,
        COALESCE(expense.total, 0) AS total_expenses
     FROM generate_series(
        date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
        date_trunc('month', CURRENT_DATE),
        INTERVAL '1 month'
     ) AS month_series
     LEFT JOIN (
        SELECT date_trunc('month', income_date) AS month, SUM(amount) AS total
        FROM incomes WHERE user_id = $1 GROUP BY 1
     ) income ON income.month = month_series
     LEFT JOIN (
        SELECT date_trunc('month', expense_date) AS month, SUM(amount) AS total
        FROM expenses WHERE user_id = $1 GROUP BY 1
     ) expense ON expense.month = month_series
     ORDER BY month_series`,
    [userId]
  );
  return result.rows;
}

async function getOverallBudgetUtilization(userId) {
  // Aggregate utilization across all of the current month's budgets.
  const result = await db.query(
    `SELECT
        COALESCE(SUM(b.budget_amount), 0) AS total_budget,
        COALESCE(SUM(spent.actual), 0) AS total_spent
     FROM budgets b
     LEFT JOIN (
        SELECT category_id, SUM(amount) AS actual
        FROM expenses
        WHERE user_id = $1
          AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY category_id
     ) spent ON spent.category_id = b.category_id
     WHERE b.user_id = $1
       AND b.month = EXTRACT(MONTH FROM CURRENT_DATE)
       AND b.year = EXTRACT(YEAR FROM CURRENT_DATE)`,
    [userId]
  );
  return result.rows[0];
}

module.exports = {
  getTotalIncome,
  getTotalExpenses,
  getTotalHoldings,
  getTotalLiabilities,
  getRecentTransactions,
  getCategoryWiseExpenses,
  getMonthlyTrends,
  getOverallBudgetUtilization,
};
