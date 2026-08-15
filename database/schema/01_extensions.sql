-- ==========================================================
-- 01_extensions.sql
-- PostgreSQL extensions required by the FinMan database
-- ==========================================================

-- Used to generate UUIDs if we ever need them (not used for PKs here,
-- but kept available for future features like document tokens etc.)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
