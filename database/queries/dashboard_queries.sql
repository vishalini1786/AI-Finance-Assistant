-- ==========================================================
-- dashboard_queries.sql
-- Reference copies of the aggregate queries used by
-- backend/src/repositories/dashboardRepository.js
-- (kept here so they can be reviewed/tested outside of Node.js)
-- Replace $1 with the authenticated user's id.
-- ==========================================================

-- Total income (all time)
SELECT COALESCE(SUM(amount), 0) AS total_income
FROM incomes
WHERE user_id = $1;

-- Total expenses (all time)
SELECT COALESCE(SUM(amount), 0) AS total_expenses
FROM expenses
WHERE user_id = $1;

-- Total value of holdings (investments/assets)
SELECT COALESCE(SUM(current_value), 0) AS total_holdings
FROM financial_holdings
WHERE user_id = $1;

-- Total liabilities (remaining balance owed)
SELECT COALESCE(SUM(remaining_amount), 0) AS total_liabilities
FROM liabilities
WHERE user_id = $1;

-- Net worth = holdings - liabilities
-- (computed in the service layer from the two queries above)

-- Recent transactions (latest 10 expenses)
SELECT expense_id, category_id, amount, expense_date, merchant_name, description
FROM expenses
WHERE user_id = $1
ORDER BY expense_date DESC, expense_id DESC
LIMIT 10;

-- Category-wise expense breakdown (current month)
SELECT c.name AS category_name, SUM(e.amount) AS total_amount
FROM expenses e
JOIN categories c ON c.category_id = e.category_id
WHERE e.user_id = $1
  AND EXTRACT(MONTH FROM e.expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM e.expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY c.name
ORDER BY total_amount DESC;

-- Monthly income vs expense trend (last 6 months)
SELECT
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
ORDER BY month_series;
