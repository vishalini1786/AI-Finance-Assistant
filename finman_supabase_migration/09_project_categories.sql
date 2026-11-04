-- =====================================================================
-- FinMan Supabase Migration: Project Categories
-- File: 09_project_categories.sql
-- Description: Adds project_categories table for project-scoped expense
--              categories. Safe migration — does not alter existing data.
-- =====================================================================

-- -------------------------------------------------------------------
-- TABLE: project_categories
-- Each row is one category owned by a specific project and user.
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_categories (
    category_id   SERIAL PRIMARY KEY,
    project_id    INTEGER NOT NULL
                      REFERENCES public.project_workspaces(project_id)
                      ON DELETE CASCADE,
    user_id       INTEGER NOT NULL
                      REFERENCES public.users(user_id)
                      ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    -- Prevent duplicate category names within the same project
    CONSTRAINT uq_project_category_name UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_project_categories_project_id
    ON public.project_categories(project_id);

CREATE INDEX IF NOT EXISTS idx_project_categories_user_id
    ON public.project_categories(user_id);

-- -------------------------------------------------------------------
-- Row-Level Security
-- Users may only see and manage categories for their own projects.
-- -------------------------------------------------------------------
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies idempotently
DO $$
BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'project_categories'
      AND policyname = 'project_categories_select_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY project_categories_select_own
        ON public.project_categories
        FOR SELECT
        USING (
          user_id = (
            SELECT user_id FROM public.project_workspaces
            WHERE project_id = project_categories.project_id
          )
        )
    $pol$;
  END IF;

  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'project_categories'
      AND policyname = 'project_categories_insert_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY project_categories_insert_own
        ON public.project_categories
        FOR INSERT
        WITH CHECK (
          user_id = (
            SELECT user_id FROM public.project_workspaces
            WHERE project_id = project_categories.project_id
          )
        )
    $pol$;
  END IF;

  -- UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'project_categories'
      AND policyname = 'project_categories_update_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY project_categories_update_own
        ON public.project_categories
        FOR UPDATE
        USING (
          user_id = (
            SELECT user_id FROM public.project_workspaces
            WHERE project_id = project_categories.project_id
          )
        )
    $pol$;
  END IF;

  -- DELETE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'project_categories'
      AND policyname = 'project_categories_delete_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY project_categories_delete_own
        ON public.project_categories
        FOR DELETE
        USING (
          user_id = (
            SELECT user_id FROM public.project_workspaces
            WHERE project_id = project_categories.project_id
          )
        )
    $pol$;
  END IF;
END $$;

-- Grant access to authenticated role (Supabase convention)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.project_categories
  TO authenticated;

GRANT USAGE, SELECT
  ON SEQUENCE public.project_categories_category_id_seq
  TO authenticated;


-- Backward compatibility backfill
INSERT INTO public.project_categories (project_id, user_id, name)
SELECT DISTINCT pe.project_id, pe.user_id, TRIM(pe.category)
FROM public.project_expenses pe
WHERE pe.category IS NOT NULL AND TRIM(pe.category) != ''
ON CONFLICT (project_id, name) DO NOTHING;
