-- ==========================================================
-- expense_queries.sql
-- Reference copies of queries used by
-- backend/src/repositories/expenseRepository.js
-- ==========================================================

-- All expenses for a user, most recent first
SELECT * FROM expenses
WHERE user_id = $1
ORDER BY expense_date DESC, expense_id DESC;

-- A single expense, scoped to its owner (ownership check happens here)
SELECT * FROM expenses
WHERE expense_id = $1 AND user_id = $2;

-- Total expenses in a given category for a given month/year
-- (used by the budget utilization calculation)
SELECT COALESCE(SUM(amount), 0) AS total
FROM expenses
WHERE user_id = $1
  AND category_id = $2
  AND EXTRACT(MONTH FROM expense_date) = $3
  AND EXTRACT(YEAR FROM expense_date) = $4;
