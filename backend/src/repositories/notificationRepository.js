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

async function createIfMissing({ userId, title, message, notificationType, link }) {
  const result = await db.query(
    `INSERT INTO notifications (user_id, title, message, notification_type, link)
     SELECT $1::int, $2::text, $3::text, $4::varchar, $5::varchar
     WHERE NOT EXISTS (
       SELECT 1 FROM notifications
       WHERE user_id = $1::int AND title = $2::text AND message = $3::text AND is_read = FALSE
     )
     RETURNING *`,
    [userId, title, message, notificationType || 'GENERAL', link || null]
  );
  return result.rows[0] || null;
}

module.exports = { findAllByUser, countUnread, markRead, createIfMissing };
