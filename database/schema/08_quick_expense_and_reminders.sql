-- 08_quick_expense_and_reminders.sql
-- Adds expense reminder preferences and micro-expense prompts to users table.
-- Also adds daily reporting query support via expense_date filtering.

ALTER TABLE users ADD COLUMN IF NOT EXISTS expense_reminder_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS expense_reminder_time   TIME;
ALTER TABLE users ADD COLUMN IF NOT EXISTS micro_expense_prompts_enabled BOOLEAN DEFAULT FALSE;

-- Index to speed up daily expense queries (expense_date lookups)
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses (user_id, expense_date);
