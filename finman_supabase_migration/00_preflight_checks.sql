-- =====================================================================
-- FinMan Database Migration to Supabase
-- File: 00_preflight_checks.sql
-- Description: Non-destructive preflight diagnostics to verify target
--              Supabase environment, extensions, and schema conflicts.
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================================';
    RAISE NOTICE 'Starting FinMan Supabase Preflight Checks...';
    RAISE NOTICE 'Timestamp: %', clock_timestamp();
    RAISE NOTICE 'Target Database: %', current_database();
    RAISE NOTICE 'Current User: %', current_user;
    RAISE NOTICE '=========================================================';
END $$;

-- 1. Check PostgreSQL Version (Supabase runs PostgreSQL 15+)
SELECT 
    version() AS pg_version,
    current_setting('server_version_num')::integer AS version_num,
    CASE 
        WHEN current_setting('server_version_num')::integer >= 140000 
        THEN 'PASSED: PostgreSQL version >= 14' 
        ELSE 'WARNING: Expected PostgreSQL 14 or higher' 
    END AS version_check;

-- 2. Check Database Encoding (Must be UTF8)
SELECT 
    datname,
    pg_encoding_to_char(encoding) AS encoding,
    datcollate,
    datctype,
    CASE 
        WHEN pg_encoding_to_char(encoding) = 'UTF8' 
        THEN 'PASSED: UTF8 encoding confirmed' 
        ELSE 'WARNING: Non-UTF8 encoding' 
    END AS encoding_check
FROM pg_database 
WHERE datname = current_database();

-- 3. Check Available Required Extensions (pgcrypto)
SELECT 
    name AS extension_name,
    installed_version,
    default_version,
    comment
FROM pg_available_extensions 
WHERE name IN ('pgcrypto', 'uuid-ossp');

-- 4. Check for existing FinMan tables in public schema to detect conflicts
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'categories', 'incomes', 'expenses', 'budgets', 
    'financial_holdings', 'liabilities', 'recurring_payments', 
    'taxes', 'financial_documents', 'document_transactions', 
    'ai_insights', 'financial_goals', 'life_event_simulations', 
    'notifications', 'project_workspaces', 'project_expenses', 
    'monthly_budget_plans'
  )
ORDER BY table_name;

-- 5. Diagnostic Notice
DO $$
DECLARE
    v_conflict_count integer;
BEGIN
    SELECT count(*) INTO v_conflict_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN (
        'users', 'categories', 'incomes', 'expenses', 'budgets', 
        'financial_holdings', 'liabilities', 'recurring_payments', 
        'taxes', 'financial_documents', 'document_transactions', 
        'ai_insights', 'financial_goals', 'life_event_simulations', 
        'notifications', 'project_workspaces', 'project_expenses', 
        'monthly_budget_plans'
      );

    IF v_conflict_count > 0 THEN
        RAISE WARNING 'Target database already contains % FinMan table(s). Running migrations will safely alter/create with IF NOT EXISTS.', v_conflict_count;
    ELSE
        RAISE NOTICE 'Target database is clean: No conflicting FinMan tables detected in public schema.';
    END IF;
END $$;
