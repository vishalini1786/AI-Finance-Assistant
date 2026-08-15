-- ==========================================================
-- budget_queries.sql
-- Reference copies of queries used by
-- backend/src/repositories/budgetRepository.js
-- ==========================================================

-- All budgets for a user in a given month/year, with how much
-- has actually been spent in that category so far.
SELECT
    b.budget_id,
    b.category_id,
    c.name AS category_name,
    b.budget_amount,
    b.month,
    b.year,
    COALESCE(SUM(e.amount), 0) AS actual_spent
FROM budgets b
JOIN categories c ON c.category_id = b.category_id
LEFT JOIN expenses e
    ON e.category_id = b.category_id
    AND e.user_id = b.user_id
    AND EXTRACT(MONTH FROM e.expense_date) = b.month
    AND EXTRACT(YEAR FROM e.expense_date) = b.year
WHERE b.user_id = $1
GROUP BY b.budget_id, b.category_id, c.name, b.budget_amount, b.month, b.year
ORDER BY b.year DESC, b.month DESC;

-- Utilization % and remaining amount are derived in JS as:
--   utilization = (actual_spent / budget_amount) * 100
--   remaining   = budget_amount - actual_spent
--   isExceeded  = actual_spent > budget_amount
