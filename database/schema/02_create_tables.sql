-- ==========================================================
-- 02_create_tables.sql
-- Creates all 15 entities for the FinMan database.
-- Order matters because of foreign keys.
-- CHECK constraints beyond simple NOT NULL live in 03_constraints.sql
-- Indexes live in 04_indexes.sql
-- ==========================================================

-- ----------------------------------------------------------
-- 1. USER
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id             SERIAL PRIMARY KEY,
    name                VARCHAR(100)  NOT NULL,
    email               VARCHAR(150)  NOT NULL UNIQUE,
    password_hash       VARCHAR(255)  NOT NULL,
    phone               VARCHAR(20),
    occupation          VARCHAR(100),
    preferred_language  VARCHAR(20)   DEFAULT 'en',
    monthly_income      NUMERIC(14,2) DEFAULT 0,
    profile_picture     TEXT,
    theme_preference    VARCHAR(20)   DEFAULT 'light',
    created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 2. CATEGORY
-- (predefined, seeded from database/seed/01_categories.sql)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    category_id   SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    description   TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3. INCOME
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS incomes (
    income_id     SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    source        VARCHAR(50)   NOT NULL,
    amount        NUMERIC(14,2) NOT NULL,
    income_date   DATE          NOT NULL,
    description   TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 10. FINANCIAL_DOCUMENT
-- (created before expenses/document_transactions because
--  expenses references document_transactions, which references this table)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_documents (
    document_id        SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    file_name           VARCHAR(255) NOT NULL,
    file_path           VARCHAR(500) NOT NULL,
    document_type       VARCHAR(30)  DEFAULT 'OTHER',
    upload_date         TIMESTAMP NOT NULL DEFAULT NOW(),
    processing_status   VARCHAR(20)  DEFAULT 'PENDING',
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 11. DOCUMENT_TRANSACTION
-- (extracted line items from an OCR-processed document)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_transactions (
    document_transaction_id  SERIAL PRIMARY KEY,
    document_id              INTEGER NOT NULL REFERENCES financial_documents(document_id) ON DELETE CASCADE,
    extracted_amount         NUMERIC(14,2),
    extracted_date           DATE,
    extracted_merchant       VARCHAR(150),
    raw_ocr_text              TEXT,
    confidence_score         NUMERIC(5,2),
    created_at               TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 8. RECURRING_PAYMENT
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_payments (
    recurring_payment_id  SERIAL PRIMARY KEY,
    user_id                INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id            INTEGER REFERENCES categories(category_id),
    name                   VARCHAR(150) NOT NULL,
    amount                 NUMERIC(14,2) NOT NULL,
    frequency              VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    next_due_date          DATE,
    is_active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 4. EXPENSE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    expense_id                SERIAL PRIMARY KEY,
    user_id                    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id                INTEGER NOT NULL REFERENCES categories(category_id),
    amount                     NUMERIC(14,2) NOT NULL,
    expense_date               DATE NOT NULL,
    merchant_name              VARCHAR(150),
    payment_mode               VARCHAR(30),
    description                TEXT,
    source_type                VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    document_transaction_id    INTEGER REFERENCES document_transactions(document_transaction_id) ON DELETE SET NULL,
    recurring_payment_id       INTEGER REFERENCES recurring_payments(recurring_payment_id) ON DELETE SET NULL,
    created_at                 TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5. BUDGET
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
    budget_id       SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id      INTEGER NOT NULL REFERENCES categories(category_id),
    budget_amount    NUMERIC(14,2) NOT NULL,
    month            SMALLINT NOT NULL,
    year             SMALLINT NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 6. FINANCIAL_HOLDING (assets / investments)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_holdings (
    holding_id       SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    holding_type      VARCHAR(30) NOT NULL,
    name              VARCHAR(150) NOT NULL,
    quantity          NUMERIC(14,4) DEFAULT 1,
    current_value     NUMERIC(14,2) NOT NULL,
    purchase_value    NUMERIC(14,2),
    purchase_date     DATE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 7. LIABILITY
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS liabilities (
    liability_id      SERIAL PRIMARY KEY,
    user_id            INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    liability_type     VARCHAR(30) NOT NULL,
    name               VARCHAR(150) NOT NULL,
    total_amount       NUMERIC(14,2) NOT NULL,
    remaining_amount   NUMERIC(14,2) NOT NULL,
    interest_rate      NUMERIC(5,2) DEFAULT 0,
    due_date           DATE,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 9. TAX
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS taxes (
    tax_id       SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tax_year      SMALLINT NOT NULL,
    tax_type      VARCHAR(50) NOT NULL,
    amount        NUMERIC(14,2) NOT NULL,
    due_date      DATE,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 12. AI_INSIGHT
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_insights (
    insight_id     SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    insight_type    VARCHAR(50) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    severity        VARCHAR(20) NOT NULL DEFAULT 'LOW',
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 13. FINANCIAL_GOAL
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_goals (
    goal_id          SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    goal_name         VARCHAR(150) NOT NULL,
    target_amount     NUMERIC(14,2) NOT NULL,
    current_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    target_date       DATE,
    status            VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 14. LIFE_EVENT_SIMULATION
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS life_event_simulations (
    simulation_id      SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_type          VARCHAR(50) NOT NULL,
    event_details       JSONB,
    simulated_result    JSONB,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 15. NOTIFICATION
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    notification_id     SERIAL PRIMARY KEY,
    user_id              INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title                VARCHAR(200) NOT NULL,
    message              TEXT,
    notification_type    VARCHAR(50) DEFAULT 'GENERAL',
    is_read              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
