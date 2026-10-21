-- =====================================================================
-- FinMan Database Migration to Supabase
-- File: 04_functions_triggers_views.sql
-- Description: Creates trigger functions, automated updated_at triggers,
--              and analytical views for the FinMan schema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TRIGGER FUNCTION: update_modified_column
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 2. ATTACH UPDATED_AT TRIGGERS
-- ---------------------------------------------------------------------

-- Users
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Incomes
DROP TRIGGER IF EXISTS trg_incomes_updated_at ON public.incomes;
CREATE TRIGGER trg_incomes_updated_at
    BEFORE UPDATE ON public.incomes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Expenses
DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Budgets
DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Financial Holdings
DROP TRIGGER IF EXISTS trg_holdings_updated_at ON public.financial_holdings;
CREATE TRIGGER trg_holdings_updated_at
    BEFORE UPDATE ON public.financial_holdings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Liabilities
DROP TRIGGER IF EXISTS trg_liabilities_updated_at ON public.liabilities;
CREATE TRIGGER trg_liabilities_updated_at
    BEFORE UPDATE ON public.liabilities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Recurring Payments
DROP TRIGGER IF EXISTS trg_recurring_updated_at ON public.recurring_payments;
CREATE TRIGGER trg_recurring_updated_at
    BEFORE UPDATE ON public.recurring_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Taxes
DROP TRIGGER IF EXISTS trg_taxes_updated_at ON public.taxes;
CREATE TRIGGER trg_taxes_updated_at
    BEFORE UPDATE ON public.taxes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Financial Goals
DROP TRIGGER IF EXISTS trg_goals_updated_at ON public.financial_goals;
CREATE TRIGGER trg_goals_updated_at
    BEFORE UPDATE ON public.financial_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Project Workspaces
DROP TRIGGER IF EXISTS update_project_workspaces_modtime ON public.project_workspaces;
CREATE TRIGGER update_project_workspaces_modtime
    BEFORE UPDATE ON public.project_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Project Expenses
DROP TRIGGER IF EXISTS update_project_expenses_modtime ON public.project_expenses;
CREATE TRIGGER update_project_expenses_modtime
    BEFORE UPDATE ON public.project_expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Monthly Budget Plans
DROP TRIGGER IF EXISTS update_monthly_budget_plans_modtime ON public.monthly_budget_plans;
CREATE TRIGGER update_monthly_budget_plans_modtime
    BEFORE UPDATE ON public.monthly_budget_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- ---------------------------------------------------------------------
-- 3. ANALYTICAL VIEWS
-- ---------------------------------------------------------------------

-- View: Budget vs Actual Spending (per user, category, month, year)
CREATE OR REPLACE VIEW public.v_budget_vs_actual AS
SELECT 
    b.budget_id,
    b.user_id,
    b.category_id,
    c.name AS category_name,
    b.month,
    b.year,
    b.budget_amount,
    b.priority,
    COALESCE(SUM(e.amount), 0) AS total_spent,
    (b.budget_amount - COALESCE(SUM(e.amount), 0)) AS remaining_budget,
    CASE 
        WHEN b.budget_amount > 0 THEN ROUND((COALESCE(SUM(e.amount), 0) / b.budget_amount * 100), 2)
        ELSE 0 
    END AS utilization_percentage
FROM public.budgets b
JOIN public.categories c ON b.category_id = c.category_id
LEFT JOIN public.expenses e 
    ON e.category_id = b.category_id 
    AND e.user_id = b.user_id 
    AND EXTRACT(MONTH FROM e.expense_date) = b.month 
    AND EXTRACT(YEAR FROM e.expense_date) = b.year
GROUP BY b.budget_id, b.user_id, b.category_id, c.name, b.month, b.year, b.budget_amount, b.priority;

-- View: Monthly User Cashflow Summary
CREATE OR REPLACE VIEW public.v_user_monthly_cashflow AS
SELECT 
    u.user_id,
    TO_CHAR(d.month_date, 'YYYY-MM') AS month_year,
    COALESCE((
        SELECT SUM(i.amount) 
        FROM public.incomes i 
        WHERE i.user_id = u.user_id 
          AND DATE_TRUNC('month', i.income_date) = d.month_date
    ), 0) AS total_income,
    COALESCE((
        SELECT SUM(e.amount) 
        FROM public.expenses e 
        WHERE e.user_id = u.user_id 
          AND DATE_TRUNC('month', e.expense_date) = d.month_date
    ), 0) AS total_expenses
FROM public.users u
CROSS JOIN (
    SELECT generate_series(
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
        DATE_TRUNC('month', CURRENT_DATE),
        INTERVAL '1 month'
    )::date AS month_date
) d;

DO $$
BEGIN
    RAISE NOTICE '✓ Trigger functions, triggers, and analytical views created successfully.';
END $$;
