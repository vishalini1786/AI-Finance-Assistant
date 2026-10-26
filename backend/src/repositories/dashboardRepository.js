const db = require('../config/database');

function buildDateFilter(columnName, startDate, endDate, values) {
  let filterStr = '';
  if (startDate) {
    values.push(startDate);
    filterStr += ` AND ${columnName} >= $${values.length}`;
  }
  if (endDate) {
    values.push(endDate);
    filterStr += ` AND ${columnName} <= $${values.length}`;
  }
  return filterStr;
}

async function getTotalIncome(userId, { startDate, endDate } = {}) {
  const values = [userId];
  const dateFilter = buildDateFilter('income_date', startDate, endDate, values);
  const result = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM incomes WHERE user_id = $1 ${dateFilter}`,
    values
  );
  return Number(result.rows[0].total);
}

async function getTotalExpenses(userId, { startDate, endDate } = {}) {
  const values = [userId];
  const dateFilter = buildDateFilter('expense_date', startDate, endDate, values);
  const result = await db.query(
    `SELECT (
       (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = $1 ${dateFilter}) +
       (SELECT COALESCE(SUM(amount), 0) FROM project_expenses WHERE user_id = $1 ${dateFilter})
     ) AS total`,
    values
  );
  return Number(result.rows[0].total);
}

async function getCurrentMonthTotals(userId) {
  const result = await db.query(
    `SELECT
       (SELECT COALESCE(SUM(amount), 0) FROM incomes
        WHERE user_id = $1 AND TO_CHAR(income_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')) AS income,
       (
         (SELECT COALESCE(SUM(amount), 0) FROM expenses
          WHERE user_id = $1 AND TO_CHAR(expense_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')) +
         (SELECT COALESCE(SUM(amount), 0) FROM project_expenses
          WHERE user_id = $1 AND TO_CHAR(expense_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM'))
       ) AS expenses`,
    [userId]
  );
  return {
    income: Number(result.rows[0].income),
    expenses: Number(result.rows[0].expenses),
  };
}

async function getTotalHoldings(userId, { startDate, endDate } = {}) {
  const values = [userId];
  let filterStr = '';
  // Assets represent cumulative balance sheet holdings acquired on or before endDate
  if (endDate) {
    values.push(endDate);
    filterStr += ` AND (purchase_date IS NULL OR purchase_date <= $${values.length}::date)`;
  }
  const result = await db.query(
    `SELECT COALESCE(SUM(current_value), 0) AS total FROM financial_holdings WHERE user_id = $1 ${filterStr}`,
    values
  );
  return Number(result.rows[0].total);
}

async function getTotalLiabilities(userId, { startDate, endDate } = {}) {
  const values = [userId];
  let filterStr = '';
  // Liabilities represent cumulative outstanding debt obligations existing on or before endDate
  if (endDate) {
    values.push(endDate);
    filterStr += ` AND (created_at::date <= $${values.length}::date)`;
  }
  const result = await db.query(
    `SELECT COALESCE(SUM(remaining_amount), 0) AS total FROM liabilities WHERE user_id = $1 ${filterStr}`,
    values
  );
  return Number(result.rows[0].total);
}

async function getRecentTransactions(userId, limit = 10, { startDate, endDate } = {}) {
  const values = [userId];
  const dateFilter = buildDateFilter('e.expense_date', startDate, endDate, values);
  values.push(limit);
  const limitIndex = values.length;
  
  const result = await db.query(
    `SELECT e.expense_id, e.amount, TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date, e.merchant_name,
            e.description, e.payment_mode, COALESCE(c.name, 'Other') AS category_name
     FROM expenses e
     LEFT JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1 ${dateFilter}
     ORDER BY e.expense_date DESC, e.expense_id DESC
     LIMIT $${limitIndex}`,
    values
  );
  return result.rows;
}

async function getCategoryWiseExpenses(userId, { startDate, endDate } = {}) {
  const values = [userId];
  let dateFilter = '';
  
  if (startDate || endDate) {
    dateFilter = buildDateFilter('expense_date', startDate, endDate, values);
  } else {
    // Current month filter
    dateFilter = ` AND TO_CHAR(expense_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')`;
  }

  let result = await db.query(
    `WITH all_expenses AS (
       SELECT COALESCE(c.name, 'Other') AS category_name, e.amount, e.expense_date
       FROM expenses e
       LEFT JOIN categories c ON c.category_id = e.category_id
       WHERE e.user_id = $1
       UNION ALL
       SELECT COALESCE(pe.category, 'Project Expenses') AS category_name, pe.amount, pe.expense_date
       FROM project_expenses pe
       WHERE pe.user_id = $1
     )
     SELECT category_name, COALESCE(SUM(amount), 0) AS total_amount
     FROM all_expenses
     WHERE 1=1 ${dateFilter}
     GROUP BY category_name
     ORDER BY total_amount DESC`,
    values
  );

  // If no date filter was requested and current month is empty, fall back to overall expenses
  // so charts and breakdowns are not empty when user has valid records
  if (result.rows.length === 0 && !startDate && !endDate) {
    result = await db.query(
      `WITH all_expenses AS (
         SELECT COALESCE(c.name, 'Other') AS category_name, e.amount
         FROM expenses e
         LEFT JOIN categories c ON c.category_id = e.category_id
         WHERE e.user_id = $1
         UNION ALL
         SELECT COALESCE(pe.category, 'Project Expenses') AS category_name, pe.amount
         FROM project_expenses pe
         WHERE pe.user_id = $1
       )
       SELECT category_name, COALESCE(SUM(amount), 0) AS total_amount
       FROM all_expenses
       GROUP BY category_name
       ORDER BY total_amount DESC`,
      [userId]
    );
  }

  return result.rows;
}

async function getMonthlyTrends(userId, { startDate, endDate } = {}) {
  const values = [userId];
  
  // For monthly trends, if a period is selected, we should show the months within that period.
  // If no period is selected, fallback to last 6 months.
  let seriesStart = `date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'`;
  let seriesEnd = `date_trunc('month', CURRENT_DATE)`;

  if (startDate) {
    values.push(startDate);
    seriesStart = `date_trunc('month', $${values.length}::date)`;
  }
  if (endDate) {
    values.push(endDate);
    seriesEnd = `date_trunc('month', $${values.length}::date)`;
  }

  const result = await db.query(
    `SELECT
        TO_CHAR(month_series, 'YYYY-MM') AS month,
        COALESCE(income.total, 0) AS total_income,
        COALESCE(expense.total, 0) AS total_expenses
     FROM generate_series(
        ${seriesStart},
        ${seriesEnd},
        INTERVAL '1 month'
     ) AS month_series
     LEFT JOIN (
        SELECT TO_CHAR(income_date, 'YYYY-MM') AS month_str, SUM(amount) AS total
        FROM incomes WHERE user_id = $1 GROUP BY 1
     ) income ON income.month_str = TO_CHAR(month_series, 'YYYY-MM')
     LEFT JOIN (
        SELECT TO_CHAR(expense_date, 'YYYY-MM') AS month_str, SUM(amount) AS total
        FROM (
          SELECT expense_date, amount FROM expenses WHERE user_id = $1
          UNION ALL
          SELECT expense_date, amount FROM project_expenses WHERE user_id = $1
        ) combined_expenses
        GROUP BY 1
     ) expense ON expense.month_str = TO_CHAR(month_series, 'YYYY-MM')
     ORDER BY month_series`,
    values
  );
  return result.rows;
}

async function getTotalAllocatedSavings(userId, { startDate, endDate } = {}) {
  const values = [userId];
  const dateFilter = buildDateFilter('contribution_date', startDate, endDate, values);
  const result = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM goal_contributions WHERE user_id = $1 ${dateFilter}`,
    values
  );
  return Number(result.rows[0].total);
}

async function getTotalAllocatedInvestments(userId, { startDate, endDate } = {}) {
  const values = [userId];
  const dateFilter = buildDateFilter('purchase_date', startDate, endDate, values);
  const result = await db.query(
    `SELECT COALESCE(SUM(purchase_value), 0) AS total FROM financial_holdings WHERE user_id = $1 AND purchase_value IS NOT NULL ${dateFilter}`,
    values
  );
  return Number(result.rows[0].total);
}

async function getOverallBudgetUtilization(userId, { startDate, endDate } = {}) {
  // If a period is provided, aggregate budgets for all months intersecting the period.
  // We'll simplify and aggregate the spent amount in the given period, and compare against budgets for those months.
  // If no period is provided, fallback to current month.
  
  const values = [userId];
  let expenseDateFilter = '';
  let budgetMonthFilter = '';

  if (startDate || endDate) {
    expenseDateFilter = buildDateFilter('expense_date', startDate, endDate, values);
    
    // We will just match the budgets where month/year falls in the date range approximately.
    // For simplicity, we just aggregate all budgets for the user. A more precise check would extract month/year from bounds.
    let bFilter = '';
    if (startDate) {
      // startDate is at values[2]
      bFilter += ` AND (b.year > EXTRACT(YEAR FROM $2::date) OR (b.year = EXTRACT(YEAR FROM $2::date) AND b.month >= EXTRACT(MONTH FROM $2::date)))`;
    }
    if (endDate) {
      // endDate is at values[3] (or 2 if no start date)
      const edIndex = startDate ? 3 : 2;
      bFilter += ` AND (b.year < EXTRACT(YEAR FROM $${edIndex}::date) OR (b.year = EXTRACT(YEAR FROM $${edIndex}::date) AND b.month <= EXTRACT(MONTH FROM $${edIndex}::date)))`;
    }
    budgetMonthFilter = bFilter;

  } else {
    expenseDateFilter = ` AND TO_CHAR(expense_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')`;
    budgetMonthFilter = ` AND b.month = EXTRACT(MONTH FROM CURRENT_DATE)
                          AND b.year = EXTRACT(YEAR FROM CURRENT_DATE)`;
  }

  const result = await db.query(
    `SELECT
        COALESCE(SUM(b.budget_amount), 0) AS total_budget,
        COALESCE(SUM(spent.actual), 0) AS total_spent
     FROM budgets b
     LEFT JOIN (
        SELECT category_id, SUM(amount) AS actual
        FROM expenses
        WHERE user_id = $1 ${expenseDateFilter}
        GROUP BY category_id
     ) spent ON spent.category_id = b.category_id
     WHERE b.user_id = $1 ${budgetMonthFilter}`,
    values
  );
  return result.rows[0];
}

module.exports = {
  getTotalIncome,
  getTotalExpenses,
  getCurrentMonthTotals,
  getTotalHoldings,
  getTotalLiabilities,
  getRecentTransactions,
  getCategoryWiseExpenses,
  getMonthlyTrends,
  getOverallBudgetUtilization,
  getTotalAllocatedSavings,
  getTotalAllocatedInvestments,
};
