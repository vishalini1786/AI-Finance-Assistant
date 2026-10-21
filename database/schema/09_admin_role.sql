-- ==========================================================
-- 09_admin_role.sql
-- Adds an administrative role field to the users table.
-- Promotes specific users to 'admin' role for dashboard access.
--
-- Run this ONCE after 02_create_tables.sql has been applied.
-- Safe to run multiple times due to IF NOT EXISTS checks.
-- ==========================================================

-- Add role column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Create an index for role-based queries (admin listing etc.)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Promote the first registered user to admin (for initial setup).
-- Adjust the email to match your actual admin account.
-- UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';

-- Example: promote user by ID
-- UPDATE users SET role = 'admin' WHERE user_id = 1;
