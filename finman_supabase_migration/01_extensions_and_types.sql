-- =====================================================================
-- FinMan Database Migration to Supabase
-- File: 01_extensions_and_types.sql
-- Description: Installs required PostgreSQL extensions in Supabase
-- =====================================================================

-- 1. Enable pgcrypto (standard extension for cryptographic hashes & UUID generation)
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Make sure extensions schema is in search_path or functions are accessible
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
    RAISE NOTICE '✓ Extension pgcrypto verified/installed.';
END $$;
