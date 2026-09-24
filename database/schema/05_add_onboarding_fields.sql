-- ==========================================================
-- 05_add_onboarding_fields.sql
-- Extends the `users` table with onboarding completion status
-- and structured financial preference fields.
--
-- All onboarding user data is stored in PostgreSQL.
-- localStorage is NOT used as the source of truth for user state.
--
-- Run this ONCE after 02_create_tables.sql has been applied.
-- Safe to run multiple times due to IF NOT EXISTS checks.
-- ==========================================================

-- Onboarding completion flag
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT FALSE;

-- Financial interests (array of strings, e.g. ["Saving Money","Budget Planning"])
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS financial_interests JSONB DEFAULT '[]'::jsonb;

-- Primary spending categories (e.g. ["Food","Transport","Bills"])
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS spending_categories JSONB DEFAULT '[]'::jsonb;

-- Financial goals selected during onboarding (e.g. ["Emergency Fund","Save More Money"])
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS financial_goals JSONB DEFAULT '[]'::jsonb;

-- Financial experience/confidence level (e.g. "Learning")
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS financial_experience VARCHAR(50);

-- AI assistant preferences (e.g. ["Analyze my spending","Give saving suggestions"])
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '[]'::jsonb;

-- Savings habit category selected during onboarding
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS savings_habit VARCHAR(50);

-- Investment preference selected during onboarding
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS investment_preference VARCHAR(50);
