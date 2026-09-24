-- ==========================================================
-- 06_create_projects.sql
-- Creates tables for Project-Based Workspaces
-- ==========================================================

-- ----------------------------------------------------------
-- 16. PROJECT_WORKSPACE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_workspaces (
    project_id      SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    project_name    VARCHAR(150) NOT NULL,
    description     TEXT,
    target_budget   NUMERIC(12,2) NOT NULL CHECK (target_budget >= 0),
    start_date      DATE NOT NULL,
    target_date     DATE,
    status          VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 17. PROJECT_EXPENSE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_expenses (
    project_expense_id  SERIAL PRIMARY KEY,
    project_id          INTEGER NOT NULL REFERENCES project_workspaces(project_id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expense_name        VARCHAR(150) NOT NULL,
    category            VARCHAR(100) NOT NULL,
    amount              NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    expense_date        DATE NOT NULL,
    payment_mode        VARCHAR(50),
    description         TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- INDEXES FOR PROJECTS
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_project_workspaces_user_id ON project_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_project_id ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_user_id ON project_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON project_expenses(expense_date);

-- ----------------------------------------------------------
-- TRIGGERS FOR UPDATED_AT
-- ----------------------------------------------------------
-- Assume the trigger function `update_modified_column` already exists from 02_create_tables.sql
-- If not, it will be standard procedure, but typically FinMan might just rely on app-level update or have a function. 
-- We'll add the standard postgres trigger if the function exists, but to be safe we'll use a robust approach:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_modified_column') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_workspaces_modtime'
        ) THEN
            CREATE TRIGGER update_project_workspaces_modtime
                BEFORE UPDATE ON project_workspaces
                FOR EACH ROW
                EXECUTE FUNCTION update_modified_column();
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_expenses_modtime'
        ) THEN
            CREATE TRIGGER update_project_expenses_modtime
                BEFORE UPDATE ON project_expenses
                FOR EACH ROW
                EXECUTE FUNCTION update_modified_column();
        END IF;
    END IF;
END $$;
