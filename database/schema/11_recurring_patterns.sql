-- 11_recurring_patterns.sql
-- Supports intelligent recurring spending pattern tracking, user confirmations,
-- and per-day reminder prompt status.

CREATE TABLE IF NOT EXISTS recurring_patterns (
    pattern_id           SERIAL PRIMARY KEY,
    user_id              INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id          INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
    pattern_name         VARCHAR(150) NOT NULL,
    normalized_merchant  VARCHAR(150),
    typical_amount       NUMERIC(14,2) NOT NULL,
    min_amount           NUMERIC(14,2),
    max_amount           NUMERIC(14,2),
    frequency            VARCHAR(30) NOT NULL DEFAULT 'DAILY', -- 'DAILY', 'WORKDAYS', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'
    day_of_week          SMALLINT, -- 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    last_observed_date   DATE,
    next_expected_date   DATE,
    occurrence_count     INTEGER NOT NULL DEFAULT 1,
    confidence_score     NUMERIC(3,2) NOT NULL DEFAULT 0.50,
    status               VARCHAR(30) NOT NULL DEFAULT 'DETECTED', -- 'DETECTED', 'CONFIRMED', 'PAUSED', 'DISMISSED'
    reminders_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    last_prompted_date   DATE,
    last_response        VARCHAR(20), -- 'YES', 'NO', 'DISMISSED', 'SNOOZED'
    last_response_date   DATE,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_patterns_user ON recurring_patterns (user_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_prompt ON recurring_patterns (user_id, reminders_enabled, next_expected_date);
