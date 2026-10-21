-- =====================================================================
-- FinMan Database Migration to Supabase
-- File: 02_create_tables.sql
-- Description: Recreates all 18 verified FinMan application tables.
--              Includes all unified columns from core schema and incremental migrations.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. USERS
-- ---------------------------------------------------------------------
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
    -- Onboarding extensions (from 05_add_onboarding_fields.sql)
    is_onboarded                BOOLEAN NOT NULL DEFAULT FALSE,
    financial_interests         JSONB DEFAULT '[]'::jsonb,
    spending_categories         JSONB DEFAULT '[]'::jsonb,
    financial_goals             JSONB DEFAULT '[]'::jsonb,
    financial_experience         VARCHAR(50),
    ai_preferences              JSONB DEFAULT '[]'::jsonb,
    savings_habit               VARCHAR(50),
    investment_preference       VARCHAR(50),
    -- Reminders extensions (from 08_quick_expense_and_reminders.sql)
    expense_reminder_enabled    BOOLEAN DEFAULT FALSE,
    expense_reminder_time       TIME,
    micro_expense_prompts_enabled BOOLEAN DEFAULT FALSE,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. CATEGORIES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    category_id   SERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES public.users(user_id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    priority      VARCHAR(20) DEFAULT 'FLEXIBLE',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 3. INCOMES
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 4. FINANCIAL_DOCUMENTS
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 5. DOCUMENT_TRANSACTIONS
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 6. RECURRING_PAYMENTS
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 7. EXPENSES
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 8. BUDGETS
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 9. FINANCIAL_HOLDINGS
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 10. LIABILITIES
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 11. TAXES
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 12. AI_INSIGHTS
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 13. FINANCIAL_GOALS
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 14. LIFE_EVENT_SIMULATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.life_event_simulations (
    simulation_id      SERIAL PRIMARY KEY,
    user_id            INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    event_type         VARCHAR(50) NOT NULL,
    event_details      JSONB,
    simulated_result   JSONB,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 15. NOTIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id     SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    message             TEXT,
    notification_type   VARCHAR(50) DEFAULT 'GENERAL',
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 16. PROJECT_WORKSPACES
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 17. PROJECT_EXPENSES
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 18. MONTHLY_BUDGET_PLANS
-- ---------------------------------------------------------------------
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

DO $$
BEGIN
    RAISE NOTICE '✓ All 18 FinMan application tables created or verified successfully.';
END $$;
