-- 13_reminder_timezone_and_logs.sql
-- Add timezone to users, link to notifications, and idempotent delivery logs for reminders.

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Asia/Kolkata';

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS link VARCHAR(255) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS reminder_delivery_logs (
    log_id          SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    scheduled_time  TIME NOT NULL,
    delivery_date   DATE NOT NULL,
    channel         VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
    status          VARCHAR(30) NOT NULL DEFAULT 'DELIVERED',
    error_message   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reminder_user_date_channel UNIQUE (user_id, delivery_date, channel)
);

CREATE INDEX IF NOT EXISTS idx_reminder_delivery_user_date 
ON reminder_delivery_logs (user_id, delivery_date);
