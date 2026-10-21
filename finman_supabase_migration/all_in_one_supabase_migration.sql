-- =====================================================================
-- FinMan Database Migration to Supabase
-- ALL-IN-ONE MASTER MIGRATION SCRIPT
-- Description: Executes complete schema creation, constraints, indexes,
--              triggers, views, RLS policies, baseline categories,
--              and sequence synchronization in one transaction.
-- Compatible with Supabase SQL Editor (PostgreSQL 15+).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. EXTENSIONS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. CREATE ALL 18 TABLES
-- ---------------------------------------------------------------------

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
    user_id                     SERIAL PRIMARY KEY,
    name                        VARCHAR(100) NOT NULL,
    email                       VARCHAR(150) NOT NULL UNIQUE,
    password_hash               VARCHAR(255) NOT NULL,
    phone                       VARCHAR(20),
    occupation                  VARCHAR(100),
    preferred_language          VARCHAR(20) DEFAULT 'en',
    monthly_income              NUMERIC(14,2) DEFAULT 0,
    profile_picture             TEXT,
    theme_preference            VARCHAR(20) DEFAULT 'light',
    is_onboarded                BOOLEAN NOT NULL DEFAULT FALSE,
    financial_interests         JSONB DEFAULT '[]'::jsonb,
    spending_categories         JSONB DEFAULT '[]'::jsonb,
    financial_goals             JSONB DEFAULT '[]'::jsonb,
    financial_experience         VARCHAR(50),
    ai_preferences              JSONB DEFAULT '[]'::jsonb,
    savings_habit               VARCHAR(50),
    investment_preference       VARCHAR(50),
    expense_reminder_enabled    BOOLEAN DEFAULT FALSE,
    expense_reminder_time       TIME,
    micro_expense_prompts_enabled BOOLEAN DEFAULT FALSE,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    category_id   SERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES public.users(user_id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    priority      VARCHAR(20) DEFAULT 'FLEXIBLE',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- INCOMES
CREATE TABLE IF NOT EXISTS public.incomes (
    income_id     SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    source        VARCHAR(50) NOT NULL,
    amount        NUMERIC(14,2) NOT NULL,
    income_date   DATE NOT NULL,
    description   TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- FINANCIAL_DOCUMENTS
CREATE TABLE IF NOT EXISTS public.financial_documents (
    document_id        SERIAL PRIMARY KEY,
    user_id            INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    file_name          VARCHAR(255) NOT NULL,
    file_path          VARCHAR(500) NOT NULL,
    document_type      VARCHAR(30) DEFAULT 'OTHER',
    upload_date        TIMESTAMP NOT NULL DEFAULT NOW(),
    processing_status  VARCHAR(20) DEFAULT 'PENDING',
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- DOCUMENT_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.document_transactions (
    document_transaction_id  SERIAL PRIMARY KEY,
    document_id              INTEGER NOT NULL REFERENCES public.financial_documents(document_id) ON DELETE CASCADE,
    extracted_amount         NUMERIC(14,2),
    extracted_date           DATE,
    extracted_merchant       VARCHAR(150),
    raw_ocr_text             TEXT,
    confidence_score         NUMERIC(5,2),
    created_at               TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RECURRING_PAYMENTS
CREATE TABLE IF NOT EXISTS public.recurring_payments (
    recurring_payment_id  SERIAL PRIMARY KEY,
    user_id               INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    category_id           INTEGER REFERENCES public.categories(category_id),
    name                  VARCHAR(150) NOT NULL,
    amount                NUMERIC(14,2) NOT NULL,
    frequency             VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    next_due_date         DATE,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    expense_id                SERIAL PRIMARY KEY,
    user_id                   INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    category_id               INTEGER NOT NULL REFERENCES public.categories(category_id),
    amount                    NUMERIC(14,2) NOT NULL,
    expense_date              DATE NOT NULL,
    merchant_name             VARCHAR(150),
    payment_mode              VARCHAR(30),
    description               TEXT,
    source_type               VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    document_transaction_id   INTEGER REFERENCES public.document_transactions(document_transaction_id) ON DELETE SET NULL,
    recurring_payment_id      INTEGER REFERENCES public.recurring_payments(recurring_payment_id) ON DELETE SET NULL,
    created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

-- BUDGETS
CREATE TABLE IF NOT EXISTS public.budgets (
    budget_id       SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    category_id     INTEGER NOT NULL REFERENCES public.categories(category_id),
    budget_amount   NUMERIC(14,2) NOT NULL,
    month           SMALLINT NOT NULL,
    year            SMALLINT NOT NULL,
    priority        VARCHAR(20) DEFAULT 'FLEXIBLE',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- FINANCIAL_HOLDINGS
CREATE TABLE IF NOT EXISTS public.financial_holdings (
    holding_id       SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    holding_type     VARCHAR(30) NOT NULL,
    name             VARCHAR(150) NOT NULL,
    quantity         NUMERIC(14,4) DEFAULT 1,
    current_value    NUMERIC(14,2) NOT NULL,
    purchase_value   NUMERIC(14,2),
    purchase_date    DATE,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- LIABILITIES
CREATE TABLE IF NOT EXISTS public.liabilities (
    liability_id      SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    liability_type    VARCHAR(30) NOT NULL,
    name              VARCHAR(150) NOT NULL,
    total_amount      NUMERIC(14,2) NOT NULL,
    remaining_amount  NUMERIC(14,2) NOT NULL,
    interest_rate     NUMERIC(5,2) DEFAULT 0,
    due_date          DATE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TAXES
CREATE TABLE IF NOT EXISTS public.taxes (
    tax_id       SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    tax_year     SMALLINT NOT NULL,
    tax_type     VARCHAR(50) NOT NULL,
    amount       NUMERIC(14,2) NOT NULL,
    due_date     DATE,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI_INSIGHTS
CREATE TABLE IF NOT EXISTS public.ai_insights (
    insight_id     SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    insight_type   VARCHAR(50) NOT NULL,
    title          VARCHAR(200) NOT NULL,
    description    TEXT,
    severity       VARCHAR(20) NOT NULL DEFAULT 'LOW',
    is_read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- FINANCIAL_GOALS
CREATE TABLE IF NOT EXISTS public.financial_goals (
    goal_id          SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    goal_name        VARCHAR(150) NOT NULL,
    target_amount    NUMERIC(14,2) NOT NULL,
    current_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
    target_date      DATE,
    status           VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- LIFE_EVENT_SIMULATIONS
CREATE TABLE IF NOT EXISTS public.life_event_simulations (
    simulation_id      SERIAL PRIMARY KEY,
    user_id            INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    event_type         VARCHAR(50) NOT NULL,
    event_details      JSONB,
    simulated_result   JSONB,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id     SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    message             TEXT,
    notification_type   VARCHAR(50) DEFAULT 'GENERAL',
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PROJECT_WORKSPACES
CREATE TABLE IF NOT EXISTS public.project_workspaces (
    project_id      SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    project_name    VARCHAR(150) NOT NULL,
    description     TEXT,
    target_budget   NUMERIC(12,2) NOT NULL CHECK (target_budget >= 0),
    start_date      DATE NOT NULL,
    target_date     DATE,
    status          VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PROJECT_EXPENSES
CREATE TABLE IF NOT EXISTS public.project_expenses (
    project_expense_id  SERIAL PRIMARY KEY,
    project_id          INTEGER NOT NULL REFERENCES public.project_workspaces(project_id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    expense_name        VARCHAR(150) NOT NULL,
    category            VARCHAR(100) NOT NULL,
    amount              NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    expense_date        DATE NOT NULL,
    payment_mode        VARCHAR(50),
    description         TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- MONTHLY_BUDGET_PLANS
CREATE TABLE IF NOT EXISTS public.monthly_budget_plans (
    plan_id           SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    month             SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year              SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    planned_income    NUMERIC(14,2) DEFAULT 0,
    emergency_reserve NUMERIC(14,2) DEFAULT 0,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 3. CONSTRAINTS AND INDEXES
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_email_format') THEN
        ALTER TABLE public.users ADD CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_monthly_income_non_negative') THEN
        ALTER TABLE public.users ADD CONSTRAINT chk_users_monthly_income_non_negative CHECK (monthly_income >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_incomes_amount_positive') THEN
        ALTER TABLE public.incomes ADD CONSTRAINT chk_incomes_amount_positive CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_incomes_source') THEN
        ALTER TABLE public.incomes ADD CONSTRAINT chk_incomes_source CHECK (source IN ('Salary', 'Freelance', 'Business', 'Scholarship', 'Rental', 'Other'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_amount_positive') THEN
        ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_amount_positive CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_source_type') THEN
        ALTER TABLE public.expenses ADD CONSTRAINT chk_expenses_source_type CHECK (source_type IN ('MANUAL', 'OCR', 'RECURRING'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_budgets_amount_positive') THEN
        ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_amount_positive CHECK (budget_amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_budgets_month_range') THEN
        ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_month_range CHECK (month BETWEEN 1 AND 12);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_budgets_year_range') THEN
        ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_year_range CHECK (year BETWEEN 2000 AND 2100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_budgets_priority') THEN
        ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_priority CHECK (priority IN ('CRITICAL', 'ESSENTIAL', 'IMPORTANT', 'FLEXIBLE', 'DISCRETIONARY'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_budgets_user_category_month_year') THEN
        ALTER TABLE public.budgets ADD CONSTRAINT uq_budgets_user_category_month_year UNIQUE (user_id, category_id, month, year);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_holdings_type') THEN
        ALTER TABLE public.financial_holdings ADD CONSTRAINT chk_holdings_type CHECK (holding_type IN ('STOCK', 'MUTUAL_FUND', 'CRYPTO', 'REAL_ESTATE', 'GOLD', 'BOND', 'OTHER'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_holdings_current_value_non_negative') THEN
        ALTER TABLE public.financial_holdings ADD CONSTRAINT chk_holdings_current_value_non_negative CHECK (current_value >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_liabilities_type') THEN
        ALTER TABLE public.liabilities ADD CONSTRAINT chk_liabilities_type CHECK (liability_type IN ('LOAN', 'CREDIT_CARD', 'MORTGAGE', 'OTHER'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_liabilities_amounts_non_negative') THEN
        ALTER TABLE public.liabilities ADD CONSTRAINT chk_liabilities_amounts_non_negative CHECK (total_amount >= 0 AND remaining_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_recurring_amount_positive') THEN
        ALTER TABLE public.recurring_payments ADD CONSTRAINT chk_recurring_amount_positive CHECK (amount > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_recurring_frequency') THEN
        ALTER TABLE public.recurring_payments ADD CONSTRAINT chk_recurring_frequency CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_taxes_amount_non_negative') THEN
        ALTER TABLE public.taxes ADD CONSTRAINT chk_taxes_amount_non_negative CHECK (amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_taxes_status') THEN
        ALTER TABLE public.taxes ADD CONSTRAINT chk_taxes_status CHECK (status IN ('PENDING', 'PAID', 'OVERDUE'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_type') THEN
        ALTER TABLE public.financial_documents ADD CONSTRAINT chk_documents_type CHECK (document_type IN ('RECEIPT', 'BANK_STATEMENT', 'INVOICE', 'OTHER'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_status') THEN
        ALTER TABLE public.financial_documents ADD CONSTRAINT chk_documents_status CHECK (processing_status IN ('PENDING', 'PROCESSED', 'FAILED'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_insights_severity') THEN
        ALTER TABLE public.ai_insights ADD CONSTRAINT chk_ai_insights_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_goals_amounts_non_negative') THEN
        ALTER TABLE public.financial_goals ADD CONSTRAINT chk_goals_amounts_non_negative CHECK (target_amount >= 0 AND current_amount >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_goals_status') THEN
        ALTER TABLE public.financial_goals ADD CONSTRAINT chk_goals_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_monthly_plans_user_month_year') THEN
        ALTER TABLE public.monthly_budget_plans ADD CONSTRAINT uq_monthly_plans_user_month_year UNIQUE (user_id, month, year);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_name ON public.categories (name, COALESCE(user_id, -1));

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON public.incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_income_date ON public.incomes(income_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month_year ON public.budgets(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON public.financial_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON public.liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON public.recurring_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_taxes_user_id ON public.taxes(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.financial_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_transactions_document_id ON public.document_transactions(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_life_events_user_id ON public.life_event_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_project_workspaces_user_id ON public.project_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_user_id ON public.project_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON public.project_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_monthly_plans_user_id ON public.monthly_budget_plans(user_id);

-- ---------------------------------------------------------------------
-- 4. TRIGGER FUNCTION & TRIGGERS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS trg_incomes_updated_at ON public.incomes;
CREATE TRIGGER trg_incomes_updated_at BEFORE UPDATE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS trg_holdings_updated_at ON public.financial_holdings;
CREATE TRIGGER trg_holdings_updated_at BEFORE UPDATE ON public.financial_holdings FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS trg_liabilities_updated_at ON public.liabilities;
CREATE TRIGGER trg_liabilities_updated_at BEFORE UPDATE ON public.liabilities FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS trg_recurring_updated_at ON public.recurring_payments;
CREATE TRIGGER trg_recurring_updated_at BEFORE UPDATE ON public.recurring_payments FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS trg_taxes_updated_at ON public.taxes;
CREATE TRIGGER trg_taxes_updated_at BEFORE UPDATE ON public.taxes FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS trg_goals_updated_at ON public.financial_goals;
CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON public.financial_goals FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_project_workspaces_modtime ON public.project_workspaces;
CREATE TRIGGER update_project_workspaces_modtime BEFORE UPDATE ON public.project_workspaces FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_project_expenses_modtime ON public.project_expenses;
CREATE TRIGGER update_project_expenses_modtime BEFORE UPDATE ON public.project_expenses FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

DROP TRIGGER IF EXISTS update_monthly_budget_plans_modtime ON public.monthly_budget_plans;
CREATE TRIGGER update_monthly_budget_plans_modtime BEFORE UPDATE ON public.monthly_budget_plans FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) & PERMISSIONS
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

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

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
-- 6. SEED PREDEFINED ESSENTIAL CATEGORIES
-- ---------------------------------------------------------------------
INSERT INTO public.categories (category_id, name, description, priority, user_id) VALUES
    (1,  'Food',           'Groceries, restaurants and takeout',          'ESSENTIAL', NULL),
    (2,  'Shopping',       'Clothing, electronics and general shopping',  'DISCRETIONARY', NULL),
    (3,  'Medical',        'Doctor visits, medicine and health expenses', 'CRITICAL', NULL),
    (4,  'Education',      'Tuition, courses and books',                  'IMPORTANT', NULL),
    (5,  'Transportation', 'Fuel, public transport, ride-hailing',        'ESSENTIAL', NULL),
    (6,  'Entertainment',  'Movies, games, subscriptions and hobbies',    'DISCRETIONARY', NULL),
    (7,  'Bills',          'Electricity, water, internet and phone bills','CRITICAL', NULL),
    (8,  'Insurance',      'Health, life and vehicle insurance premiums', 'IMPORTANT', NULL),
    (9,  'Investments',    'Money moved into investment accounts',        'IMPORTANT', NULL),
    (10, 'Others',         'Anything that does not fit another category', 'FLEXIBLE', NULL)
ON CONFLICT (category_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority;

-- ---------------------------------------------------------------------
-- 7. SYNCHRONIZE SERIAL SEQUENCES
-- ---------------------------------------------------------------------
DO $$
DECLARE
    rec RECORD;
    v_seq text;
    v_max_id bigint;
    v_sql text;
BEGIN
    FOR rec IN (
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_default LIKE 'nextval(%'
    ) LOOP
        v_seq := pg_get_serial_sequence('public.' || quote_ident(rec.table_name), rec.column_name);
        IF v_seq IS NOT NULL THEN
            v_sql := format('SELECT COALESCE(MAX(%I), 0) FROM public.%I', rec.column_name, rec.table_name);
            EXECUTE v_sql INTO v_max_id;
            IF v_max_id > 0 THEN
                PERFORM setval(v_seq, v_max_id, true);
            ELSE
                PERFORM setval(v_seq, 1, false);
            END IF;
        END IF;
    END LOOP;
END $$;

COMMIT;
