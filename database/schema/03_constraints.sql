-- ==========================================================
-- 03_constraints.sql
-- CHECK constraints and extra UNIQUE constraints that describe
-- valid business values (kept separate from 02 for readability).
-- ==========================================================

-- USER --------------------------------------------------------
ALTER TABLE users
    ADD CONSTRAINT chk_users_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE users
    ADD CONSTRAINT chk_users_monthly_income_non_negative
    CHECK (monthly_income >= 0);

-- INCOME --------------------------------------------------------
ALTER TABLE incomes
    ADD CONSTRAINT chk_incomes_amount_positive
    CHECK (amount > 0);

ALTER TABLE incomes
    ADD CONSTRAINT chk_incomes_source
    CHECK (source IN ('Salary', 'Freelance', 'Business', 'Scholarship', 'Rental', 'Other'));

-- EXPENSE --------------------------------------------------------
ALTER TABLE expenses
    ADD CONSTRAINT chk_expenses_amount_positive
    CHECK (amount > 0);

ALTER TABLE expenses
    ADD CONSTRAINT chk_expenses_source_type
    CHECK (source_type IN ('MANUAL', 'OCR', 'RECURRING'));

-- BUDGET --------------------------------------------------------
ALTER TABLE budgets
    ADD CONSTRAINT chk_budgets_amount_positive
    CHECK (budget_amount > 0);

ALTER TABLE budgets
    ADD CONSTRAINT chk_budgets_month_range
    CHECK (month BETWEEN 1 AND 12);

ALTER TABLE budgets
    ADD CONSTRAINT chk_budgets_year_range
    CHECK (year BETWEEN 2000 AND 2100);

-- Prevent a user from creating two budgets for the same
-- category in the same month/year.
ALTER TABLE budgets
    ADD CONSTRAINT uq_budgets_user_category_month_year
    UNIQUE (user_id, category_id, month, year);

-- FINANCIAL_HOLDING ----------------------------------------------
ALTER TABLE financial_holdings
    ADD CONSTRAINT chk_holdings_type
    CHECK (holding_type IN ('STOCK', 'MUTUAL_FUND', 'CRYPTO', 'REAL_ESTATE', 'GOLD', 'BOND', 'OTHER'));

ALTER TABLE financial_holdings
    ADD CONSTRAINT chk_holdings_current_value_non_negative
    CHECK (current_value >= 0);

-- LIABILITY --------------------------------------------------------
ALTER TABLE liabilities
    ADD CONSTRAINT chk_liabilities_type
    CHECK (liability_type IN ('LOAN', 'CREDIT_CARD', 'MORTGAGE', 'OTHER'));

ALTER TABLE liabilities
    ADD CONSTRAINT chk_liabilities_amounts_non_negative
    CHECK (total_amount >= 0 AND remaining_amount >= 0);

-- RECURRING_PAYMENT ----------------------------------------------
ALTER TABLE recurring_payments
    ADD CONSTRAINT chk_recurring_amount_positive
    CHECK (amount > 0);

ALTER TABLE recurring_payments
    ADD CONSTRAINT chk_recurring_frequency
    CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'));

-- TAX --------------------------------------------------------
ALTER TABLE taxes
    ADD CONSTRAINT chk_taxes_amount_non_negative
    CHECK (amount >= 0);

ALTER TABLE taxes
    ADD CONSTRAINT chk_taxes_status
    CHECK (status IN ('PENDING', 'PAID', 'OVERDUE'));

-- FINANCIAL_DOCUMENT ----------------------------------------------
ALTER TABLE financial_documents
    ADD CONSTRAINT chk_documents_type
    CHECK (document_type IN ('RECEIPT', 'BANK_STATEMENT', 'INVOICE', 'OTHER'));

ALTER TABLE financial_documents
    ADD CONSTRAINT chk_documents_status
    CHECK (processing_status IN ('PENDING', 'PROCESSED', 'FAILED'));

-- AI_INSIGHT --------------------------------------------------------
ALTER TABLE ai_insights
    ADD CONSTRAINT chk_ai_insights_severity
    CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH'));

-- FINANCIAL_GOAL ----------------------------------------------
ALTER TABLE financial_goals
    ADD CONSTRAINT chk_goals_amounts_non_negative
    CHECK (target_amount >= 0 AND current_amount >= 0);

ALTER TABLE financial_goals
    ADD CONSTRAINT chk_goals_status
    CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
