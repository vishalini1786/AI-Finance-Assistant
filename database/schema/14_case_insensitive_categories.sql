-- Migration 14: Case-Insensitive Unique Categories Index
-- Enforces that within the same user scope (or globally when user_id IS NULL),
-- category names cannot be duplicated by case or surrounding whitespace.

DROP INDEX IF EXISTS uq_categories_lower_name_user;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_lower_name_user
ON categories (LOWER(TRIM(name)), COALESCE(user_id, -1));
