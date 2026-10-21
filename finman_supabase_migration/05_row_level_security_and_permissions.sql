-- =====================================================================
-- FinMan Database Migration to Supabase
-- File: 05_row_level_security_and_permissions.sql
-- Description: Enables Row Level Security (RLS) on all 18 tables and
--              configures policies supporting both backend connection pool
--              and direct Supabase client access.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ---------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_event_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budget_plans ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. GRANT PERMISSIONS TO POSTGRES & SERVICE ROLE
-- (Ensures backend Express connection pool operates smoothly without restriction)
-- ---------------------------------------------------------------------
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Allow service_role to bypass RLS policies
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'users', 'categories', 'incomes', 'financial_documents', 
        'document_transactions', 'recurring_payments', 'expenses', 
        'budgets', 'financial_holdings', 'liabilities', 'taxes', 
        'ai_insights', 'financial_goals', 'life_event_simulations', 
        'notifications', 'project_workspaces', 'project_expenses', 
        'monthly_budget_plans'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I', t);
        EXECUTE format('CREATE POLICY service_role_all ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. POLICIES FOR AUTHENTICATED USERS (Supabase Auth / Client access)
-- Note: When frontend connects directly via Supabase Auth, auth.uid()
-- matches the authenticated session user.
-- ---------------------------------------------------------------------

-- USERS TABLE
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
    FOR SELECT TO authenticated
    USING (email = (auth.jwt() ->> 'email') OR (auth.jwt() ->> 'user_id')::integer = user_id);

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
    FOR UPDATE TO authenticated
    USING (email = (auth.jwt() ->> 'email') OR (auth.jwt() ->> 'user_id')::integer = user_id)
    WITH CHECK (email = (auth.jwt() ->> 'email') OR (auth.jwt() ->> 'user_id')::integer = user_id);

-- CATEGORIES TABLE
-- System categories (user_id IS NULL) are readable by all authenticated users.
-- Custom categories (user_id IS NOT NULL) are only readable/writable by owner.
DROP POLICY IF EXISTS categories_select ON public.categories;
CREATE POLICY categories_select ON public.categories
    FOR SELECT TO authenticated
    USING (user_id IS NULL OR user_id = (auth.jwt() ->> 'user_id')::integer);

DROP POLICY IF EXISTS categories_insert ON public.categories;
CREATE POLICY categories_insert ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (auth.jwt() ->> 'user_id')::integer);

DROP POLICY IF EXISTS categories_update ON public.categories;
CREATE POLICY categories_update ON public.categories
    FOR UPDATE TO authenticated
    USING (user_id = (auth.jwt() ->> 'user_id')::integer)
    WITH CHECK (user_id = (auth.jwt() ->> 'user_id')::integer);

DROP POLICY IF EXISTS categories_delete ON public.categories;
CREATE POLICY categories_delete ON public.categories
    FOR DELETE TO authenticated
    USING (user_id = (auth.jwt() ->> 'user_id')::integer);

-- USER DATA TABLES MACRO
-- For tables with direct user_id foreign key:
DO $$
DECLARE
    t text;
    user_tables text[] := ARRAY[
        'incomes', 'financial_documents', 'recurring_payments', 
        'expenses', 'budgets', 'financial_holdings', 'liabilities', 
        'taxes', 'ai_insights', 'financial_goals', 'life_event_simulations', 
        'notifications', 'project_workspaces', 'project_expenses', 
        'monthly_budget_plans'
    ];
BEGIN
    FOREACH t IN ARRAY user_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_user_isolation ON public.%I', t, t);
        EXECUTE format(
            'CREATE POLICY %I_user_isolation ON public.%I FOR ALL TO authenticated ' ||
            'USING (user_id = (auth.jwt() ->> ''user_id'')::integer) ' ||
            'WITH CHECK (user_id = (auth.jwt() ->> ''user_id'')::integer)',
            t, t
        );
    END LOOP;
END $$;

-- DOCUMENT TRANSACTIONS (Child of financial_documents)
DROP POLICY IF EXISTS document_transactions_isolation ON public.document_transactions;
CREATE POLICY document_transactions_isolation ON public.document_transactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.financial_documents fd
            WHERE fd.document_id = public.document_transactions.document_id
              AND fd.user_id = (auth.jwt() ->> 'user_id')::integer
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.financial_documents fd
            WHERE fd.document_id = public.document_transactions.document_id
              AND fd.user_id = (auth.jwt() ->> 'user_id')::integer
        )
    );

DO $$
BEGIN
    RAISE NOTICE '✓ Row Level Security (RLS) and policies enabled on all 18 tables.';
END $$;
