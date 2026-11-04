const db = require('../config/database');

async function findAllByUser(userId) {
  const result = await db.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY is_read ASC, created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function countUnread(userId) {
  const result = await db.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE', [userId]);
  return result.rows[0].count;
}

async function markRead(notificationId, userId) {
  const result = await db.query(
    `UPDATE notifications SET is_read = TRUE WHERE notification_id = $1 AND user_id = $2 RETURNING *`,
    [notificationId, userId]
  );
  return result.rows[0] || null;
}

async function createIfMissing({ userId, title, message, notificationType, link, deliveryDate }) {
  if (notificationType === 'DAILY_REMINDER') {
    const targetDate = deliveryDate || new Date().toISOString().slice(0, 10);
    const result = await db.query(
      `INSERT INTO notifications (user_id, title, message, notification_type, link)
       SELECT $1::int, $2::text, $3::text, $4::varchar, $5::varchar
       WHERE NOT EXISTS (
         SELECT 1 FROM notifications
         WHERE user_id = $1::int
           AND notification_type = 'DAILY_REMINDER'
           AND DATE(created_at) = $6::date
       )
       RETURNING *`,
      [userId, title, message, notificationType, link || '/expenses', targetDate]
    );
    return result.rows[0] || null;
  }

  const result = await db.query(
    `INSERT INTO notifications (user_id, title, message, notification_type, link)
     SELECT $1::int, $2::text, $3::text, $4::varchar, $5::varchar
     WHERE NOT EXISTS (
       SELECT 1 FROM notifications
       WHERE user_id = $1::int AND title = $2::text AND message = $3::text
     )
     RETURNING *`,
    [userId, title, message, notificationType || 'GENERAL', link || null]
  );
  return result.rows[0] || null;
}

async function createBudgetNotificationIfMissing({ userId, title, message, notificationType, budgetId, month, year, link }) {
  // Deduplicate strictly by user + notification_type + title + budget period (month & year)
  // CRITICAL: Do NOT check `is_read = FALSE`! Once generated in a period,
  // marking as read must never cause duplicate alerts on page reloads.
  const result = await db.query(
    `INSERT INTO notifications (user_id, title, message, notification_type, link)
     SELECT $1::int, $2::text, $3::text, $4::varchar, $5::varchar
     WHERE NOT EXISTS (
       SELECT 1 FROM notifications
       WHERE user_id = $1::int
         AND notification_type = $4::varchar
         AND title = $2::text
         AND created_at >= date_trunc('month', NOW()) AND EXTRACT(MONTH FROM created_at) = $6::int
         AND EXTRACT(YEAR FROM created_at) = $7::int
     )
     RETURNING *`,
    [userId, title, message, notificationType, link || '/budget', month, year]
  );
  return result.rows[0] || null;
}

async function markAllRead(userId) {
  await db.query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
}

module.exports = { findAllByUser, countUnread, markRead, createIfMissing, createBudgetNotificationIfMissing, markAllRead };
