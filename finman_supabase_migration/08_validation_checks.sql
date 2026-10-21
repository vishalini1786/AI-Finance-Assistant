-- =====================================================================
-- FinMan Database Migration to Supabase
-- File: 08_validation_checks.sql
-- Description: Non-destructive verification queries to validate schema,
--              constraints, indexes, triggers, RLS, and data integrity.
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'Starting FinMan Migration Validation Checks in Supabase...';
    RAISE NOTICE '=========================================================';
END $$;

-- ---------------------------------------------------------------------
-- TEST 1: Table Existence (Expected: 18 base tables)
-- ---------------------------------------------------------------------
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'users', 'categories', 'incomes', 'financial_documents', 
            'document_transactions', 'recurring_payments', 'expenses', 
            'budgets', 'financial_holdings', 'liabilities', 'taxes', 
            'ai_insights', 'financial_goals', 'life_event_simulations', 
            'notifications', 'project_workspaces', 'project_expenses', 
            'monthly_budget_plans'
        ) THEN 'EXISTS (VERIFIED)'
        ELSE 'UNEXPECTED'
    END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Summary Count (Expected: >= 18)
SELECT 
    COUNT(*) AS total_tables_found,
    CASE WHEN COUNT(*) >= 18 THEN 'PASSED (18/18 tables present)' ELSE 'FAILED (Missing tables)' END AS result
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'categories', 'incomes', 'financial_documents', 
    'document_transactions', 'recurring_payments', 'expenses', 
    'budgets', 'financial_holdings', 'liabilities', 'taxes', 
    'ai_insights', 'financial_goals', 'life_event_simulations', 
    'notifications', 'project_workspaces', 'project_expenses', 
    'monthly_budget_plans'
  );

-- ---------------------------------------------------------------------
-- TEST 2: Primary Key Verification (Expected: 1 PK per table)
-- ---------------------------------------------------------------------
SELECT 
    tc.table_name,
    kcu.column_name AS primary_key_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public' 
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name;

-- ---------------------------------------------------------------------
-- TEST 3: Foreign Key Count & Referential Integrity
-- ---------------------------------------------------------------------
SELECT 
    tc.table_name AS dependent_table,
    kcu.column_name AS foreign_key_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column,
    rc.delete_rule AS on_delete_action
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc 
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- ---------------------------------------------------------------------
-- TEST 4: Row Level Security (RLS) Status (Expected: TRUE on all 18 tables)
-- ---------------------------------------------------------------------
SELECT 
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    CASE WHEN c.relrowsecurity THEN 'PASSED' ELSE 'FAILED (RLS Disabled)' END AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.relname IN (
    'users', 'categories', 'incomes', 'financial_documents', 
    'document_transactions', 'recurring_payments', 'expenses', 
    'budgets', 'financial_holdings', 'liabilities', 'taxes', 
    'ai_insights', 'financial_goals', 'life_event_simulations', 
    'notifications', 'project_workspaces', 'project_expenses', 
    'monthly_budget_plans'
  )
ORDER BY c.relname;

-- ---------------------------------------------------------------------
-- TEST 5: Active RLS Policies Count
-- ---------------------------------------------------------------------
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd AS command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ---------------------------------------------------------------------
-- TEST 6: Table Row Counts (Recovered/Seeded Data)
-- ---------------------------------------------------------------------
SELECT 
    'users' AS table_name, count(*) AS row_count FROM public.users
UNION ALL SELECT 'categories', count(*) FROM public.categories
UNION ALL SELECT 'incomes', count(*) FROM public.incomes
UNION ALL SELECT 'expenses', count(*) FROM public.expenses
UNION ALL SELECT 'budgets', count(*) FROM public.budgets
UNION ALL SELECT 'financial_holdings', count(*) FROM public.financial_holdings
UNION ALL SELECT 'liabilities', count(*) FROM public.liabilities
UNION ALL SELECT 'recurring_payments', count(*) FROM public.recurring_payments
UNION ALL SELECT 'taxes', count(*) FROM public.taxes
UNION ALL SELECT 'financial_documents', count(*) FROM public.financial_documents
UNION ALL SELECT 'document_transactions', count(*) FROM public.document_transactions
UNION ALL SELECT 'ai_insights', count(*) FROM public.ai_insights
UNION ALL SELECT 'financial_goals', count(*) FROM public.financial_goals
UNION ALL SELECT 'life_event_simulations', count(*) FROM public.life_event_simulations
UNION ALL SELECT 'notifications', count(*) FROM public.notifications
UNION ALL SELECT 'project_workspaces', count(*) FROM public.project_workspaces
UNION ALL SELECT 'project_expenses', count(*) FROM public.project_expenses
UNION ALL SELECT 'monthly_budget_plans', count(*) FROM public.monthly_budget_plans
ORDER BY table_name;

-- ---------------------------------------------------------------------
-- TEST 7: Views and Trigger Functions
-- ---------------------------------------------------------------------
SELECT 
    table_name AS view_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT 
    proname AS trigger_function,
    prorettype::regtype AS return_type
FROM pg_proc 
WHERE proname = 'update_modified_column';

DO $$
BEGIN
    RAISE NOTICE '✓ Validation script complete. Review above table outputs for test results.';
END $$;
