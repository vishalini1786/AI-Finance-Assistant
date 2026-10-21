const db = require('../config/database');

async function findAllByUser(userId) {
  const result = await db.query(
    `SELECT * FROM ai_insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [userId]
  );
  return result.rows;
}

async function upsertInsight({ userId, insightType, title, description, severity }) {
  // Avoid duplicate inserts for the same user and type within the same day
  const result = await db.query(
    `INSERT INTO ai_insights (user_id, insight_type, title, description, severity, created_at)
     SELECT $1, $2, $3, $4, $5, NOW()
     WHERE NOT EXISTS (
       SELECT 1 FROM ai_insights
       WHERE user_id = $1 AND insight_type = $2 AND created_at >= NOW() - INTERVAL '24 hours'
     )
     RETURNING *`,
    [userId, insightType, title, description, severity || 'LOW']
  );
  return result.rows[0] || null;
}

async function markRead(insightId, userId) {
  const result = await db.query(
    `UPDATE ai_insights SET is_read = TRUE WHERE insight_id = $1 AND user_id = $2 RETURNING *`,
    [insightId, userId]
  );
  return result.rows[0] || null;
}

module.exports = { findAllByUser, upsertInsight, markRead };
