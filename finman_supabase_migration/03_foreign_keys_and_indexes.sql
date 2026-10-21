-- =====================================================================
-- FinMan Database Migration to Supabase
-- File: 03_foreign_keys_and_indexes.sql
-- Description: Applies all verified business CHECK constraints,
--              UNIQUE constraints, and performance indexes.
-- =====================================================================

DO $$
BEGIN
    -- -----------------------------------------------------------------
    -- 1. USERS CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_email_format') THEN
        ALTER TABLE public.users
            ADD CONSTRAINT chk_users_email_format
            CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_monthly_income_non_negative') THEN
        ALTER TABLE public.users
            ADD CONSTRAINT chk_users_monthly_income_non_negative
            CHECK (monthly_income >= 0);
    END IF;

    -- -----------------------------------------------------------------
    -- 2. INCOMES CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_incomes_amount_positive') THEN
        ALTER TABLE public.incomes
            ADD CONSTRAINT chk_incomes_amount_positive
            CHECK (amount > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_incomes_source') THEN
        ALTER TABLE public.incomes
            ADD CONSTRAINT chk_incomes_source
            CHECK (source IN ('Salary', 'Freelance', 'Business', 'Scholarship', 'Rental', 'Other'));
    END IF;

    -- -----------------------------------------------------------------
    -- 3. EXPENSES CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_amount_positive') THEN
        ALTER TABLE public.expenses
            ADD CONSTRAINT chk_expenses_amount_positive
            CHECK (amount > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_source_type') THEN
        ALTER TABLE public.expenses
            ADD CONSTRAINT chk_expenses_source_type
            CHECK (source_type IN ('MANUAL', 'OCR', 'RECURRING'));
    END IF;

    -- -----------------------------------------------------------------
    -- 4. BUDGETS CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_budgets_amount_positive') THEN
        ALTER TABLE public.budgets
            ADD CONSTRAINT chk_budgets_amount_positive
            CHECK (budget_amount > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_budgets_month_range') THEN
        ALTER TABLE public.budgets
            ADD CONSTRAINT chk_budgets_month_range
            CHECK (month BETWEEN 1 AND 12);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_budgets_year_range') THEN
        ALTER TABLE public.budgets
            ADD CONSTRAINT chk_budgets_year_range
            CHECK (year BETWEEN 2000 AND 2100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_budgets_priority') THEN
        ALTER TABLE public.budgets
            ADD CONSTRAINT chk_budgets_priority
            CHECK (priority IN ('CRITICAL', 'ESSENTIAL', 'IMPORTANT', 'FLEXIBLE', 'DISCRETIONARY'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_budgets_user_category_month_year') THEN
        ALTER TABLE public.budgets
            ADD CONSTRAINT uq_budgets_user_category_month_year
            UNIQUE (user_id, category_id, month, year);
    END IF;

    -- -----------------------------------------------------------------
    -- 5. FINANCIAL_HOLDINGS CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_holdings_type') THEN
        ALTER TABLE public.financial_holdings
            ADD CONSTRAINT chk_holdings_type
            CHECK (holding_type IN ('STOCK', 'MUTUAL_FUND', 'CRYPTO', 'REAL_ESTATE', 'GOLD', 'BOND', 'OTHER'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_holdings_current_value_non_negative') THEN
        ALTER TABLE public.financial_holdings
            ADD CONSTRAINT chk_holdings_current_value_non_negative
            CHECK (current_value >= 0);
    END IF;

    -- -----------------------------------------------------------------
    -- 6. LIABILITIES CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_liabilities_type') THEN
        ALTER TABLE public.liabilities
            ADD CONSTRAINT chk_liabilities_type
            CHECK (liability_type IN ('LOAN', 'CREDIT_CARD', 'MORTGAGE', 'OTHER'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_liabilities_amounts_non_negative') THEN
        ALTER TABLE public.liabilities
            ADD CONSTRAINT chk_liabilities_amounts_non_negative
            CHECK (total_amount >= 0 AND remaining_amount >= 0);
    END IF;

    -- -----------------------------------------------------------------
    -- 7. RECURRING_PAYMENTS CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_recurring_amount_positive') THEN
        ALTER TABLE public.recurring_payments
            ADD CONSTRAINT chk_recurring_amount_positive
            CHECK (amount > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_recurring_frequency') THEN
        ALTER TABLE public.recurring_payments
            ADD CONSTRAINT chk_recurring_frequency
            CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'));
    END IF;

    -- -----------------------------------------------------------------
    -- 8. TAXES CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_taxes_amount_non_negative') THEN
        ALTER TABLE public.taxes
            ADD CONSTRAINT chk_taxes_amount_non_negative
            CHECK (amount >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_taxes_status') THEN
        ALTER TABLE public.taxes
            ADD CONSTRAINT chk_taxes_status
            CHECK (status IN ('PENDING', 'PAID', 'OVERDUE'));
    END IF;

    -- -----------------------------------------------------------------
    -- 9. FINANCIAL_DOCUMENTS CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_type') THEN
        ALTER TABLE public.financial_documents
            ADD CONSTRAINT chk_documents_type
            CHECK (document_type IN ('RECEIPT', 'BANK_STATEMENT', 'INVOICE', 'OTHER'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_status') THEN
        ALTER TABLE public.financial_documents
            ADD CONSTRAINT chk_documents_status
            CHECK (processing_status IN ('PENDING', 'PROCESSED', 'FAILED'));
    END IF;

    -- -----------------------------------------------------------------
    -- 10. AI_INSIGHTS CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_insights_severity') THEN
        ALTER TABLE public.ai_insights
            ADD CONSTRAINT chk_ai_insights_severity
            CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH'));
    END IF;

    -- -----------------------------------------------------------------
    -- 11. FINANCIAL_GOALS CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_goals_amounts_non_negative') THEN
        ALTER TABLE public.financial_goals
            ADD CONSTRAINT chk_goals_amounts_non_negative
            CHECK (target_amount >= 0 AND current_amount >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_goals_status') THEN
        ALTER TABLE public.financial_goals
            ADD CONSTRAINT chk_goals_status
            CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
    END IF;

    -- -----------------------------------------------------------------
    -- 12. MONTHLY_BUDGET_PLANS CONSTRAINTS
    -- -----------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_monthly_plans_user_month_year') THEN
        ALTER TABLE public.monthly_budget_plans
            ADD CONSTRAINT uq_monthly_plans_user_month_year
            UNIQUE (user_id, month, year);
    END IF;

END $$;

-- ---------------------------------------------------------------------
-- UNIQUE INDEXES
-- ---------------------------------------------------------------------
-- Unique index for categories: allows system categories (user_id IS NULL)
-- and custom user categories without collisions.
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_name 
    ON public.categories (name, COALESCE(user_id, -1));

-- ---------------------------------------------------------------------
-- PERFORMANCE & FILTER INDEXES
-- ---------------------------------------------------------------------

-- USERS
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- INCOMES
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON public.incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_income_date ON public.incomes(income_date);

-- EXPENSES
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, expense_date);

-- BUDGETS
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month_year ON public.budgets(user_id, month, year);

-- FINANCIAL_HOLDINGS
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON public.financial_holdings(user_id);

-- LIABILITIES
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON public.liabilities(user_id);

-- RECURRING_PAYMENTS
CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON public.recurring_payments(user_id);

-- TAXES
CREATE INDEX IF NOT EXISTS idx_taxes_user_id ON public.taxes(user_id);

-- FINANCIAL_DOCUMENTS
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.financial_documents(user_id);

-- DOCUMENT_TRANSACTIONS
CREATE INDEX IF NOT EXISTS idx_doc_transactions_document_id ON public.document_transactions(document_id);

-- AI_INSIGHTS
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON public.ai_insights(user_id);

-- FINANCIAL_GOALS
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.financial_goals(user_id);

-- LIFE_EVENT_SIMULATIONS
CREATE INDEX IF NOT EXISTS idx_life_events_user_id ON public.life_event_simulations(user_id);

-- NOTIFICATIONS
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- PROJECT_WORKSPACES
CREATE INDEX IF NOT EXISTS idx_project_workspaces_user_id ON public.project_workspaces(user_id);

-- PROJECT_EXPENSES
CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_user_id ON public.project_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON public.project_expenses(expense_date);

-- MONTHLY_BUDGET_PLANS
CREATE INDEX IF NOT EXISTS idx_monthly_plans_user_id ON public.monthly_budget_plans(user_id);

DO $$
BEGIN
    RAISE NOTICE '✓ All constraints and performance indexes applied successfully.';
END $$;
