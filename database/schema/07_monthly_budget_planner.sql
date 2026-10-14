-- 07_monthly_budget_planner.sql

CREATE TABLE IF NOT EXISTS monthly_budget_plans (
    plan_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    planned_income NUMERIC(14,2) DEFAULT 0,
    emergency_reserve NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_monthly_plans_user_month_year UNIQUE (user_id, month, year)
);

-- Add priority to budgets
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'FLEXIBLE';
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS chk_budgets_priority;
ALTER TABLE budgets ADD CONSTRAINT chk_budgets_priority CHECK (priority IN ('CRITICAL', 'ESSENTIAL', 'IMPORTANT', 'FLEXIBLE', 'DISCRETIONARY'));

-- Allow custom categories per user
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'FLEXIBLE'; -- default category priority

DROP INDEX IF EXISTS uq_categories_user_name;
CREATE UNIQUE INDEX uq_categories_user_name ON categories (name, COALESCE(user_id, -1));

-- Ensure trigger for monthly_budget_plans
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_modified_column') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_monthly_budget_plans_modtime') THEN
            CREATE TRIGGER update_monthly_budget_plans_modtime
                BEFORE UPDATE ON monthly_budget_plans
                FOR EACH ROW
                EXECUTE FUNCTION update_modified_column();
        END IF;
    END IF;
END $$;
