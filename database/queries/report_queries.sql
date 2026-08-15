-- ==========================================================
-- report_queries.sql
-- Placeholder reference queries for future monthly/yearly
-- report generation (Phase 2+, backend/src/services/reportService.js).
-- Not wired to any route yet.
-- ==========================================================

-- Monthly summary: total income, total expenses, savings
SELECT
    (SELECT COALESCE(SUM(amount), 0) FROM incomes
        WHERE user_id = $1
        AND EXTRACT(MONTH FROM income_date) = $2
        AND EXTRACT(YEAR FROM income_date) = $3) AS total_income,
    (SELECT COALESCE(SUM(amount), 0) FROM expenses
        WHERE user_id = $1
        AND EXTRACT(MONTH FROM expense_date) = $2
        AND EXTRACT(YEAR FROM expense_date) = $3) AS total_expenses;
