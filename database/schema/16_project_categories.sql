-- ==========================================================
-- 16_project_categories.sql
-- Adds project-specific expense category support
-- Safe migration: preserves existing project_expenses data
-- ==========================================================

-- ----------------------------------------------------------
-- TABLE: project_categories
-- Stores categories that are scoped to a specific project.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_categories (
    category_id   SERIAL PRIMARY KEY,
    project_id    INTEGER NOT NULL REFERENCES project_workspaces(project_id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    -- Prevent duplicate category names within the same project
    CONSTRAINT uq_project_category_name UNIQUE (project_id, name)
);

-- Indexes for quick lookup by project and user
CREATE INDEX IF NOT EXISTS idx_project_categories_project_id ON project_categories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_categories_user_id   ON project_categories(user_id);

-- ----------------------------------------------------------
-- Backward compatibility backfill:
-- Populate project_categories from existing project_expenses
-- so pre-existing projects retain all their recorded categories.
-- ----------------------------------------------------------
INSERT INTO project_categories (project_id, user_id, name)
SELECT DISTINCT pe.project_id, pe.user_id, TRIM(pe.category)
FROM project_expenses pe
WHERE pe.category IS NOT NULL AND TRIM(pe.category) != ''
ON CONFLICT (project_id, name) DO NOTHING;
