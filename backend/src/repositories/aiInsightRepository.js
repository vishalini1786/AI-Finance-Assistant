// aiInsightRepository.js
// Handles all CRUD and filtering queries for user-scoped personalized AI insights.

const db = require('../config/database');

async function findAllByUser(userId, { pageContext = null, status = 'ACTIVE' } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];
  let paramIdx = 2;

  if (status && status !== 'ALL') {
    conditions.push(`status = $${paramIdx}`);
    params.push(status);
    paramIdx += 1;
  }

  if (pageContext && pageContext !== 'ALL') {
    conditions.push(`(page_context = $${paramIdx} OR page_context = 'DASHBOARD' OR page_context = 'ALL')`);
    params.push(pageContext);
    paramIdx += 1;
  }

  const query = `
    SELECT
      insight_id, user_id, insight_type, title, description,
      severity, is_read, page_context, action_link, action_text,
      data_grounding, expected_benefit, status, feedback, is_preliminary,
      created_at, updated_at
    FROM ai_insights
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      CASE severity
        WHEN 'HIGH' THEN 1
        WHEN 'MEDIUM' THEN 2
        WHEN 'LOW' THEN 3
        ELSE 4
      END,
      created_at DESC
    LIMIT 20
  `;

  const result = await db.query(query, params);
  return result.rows;
}

async function upsertInsight({
  userId,
  insightType,
  title,
  description,
  severity = 'LOW',
  pageContext = 'DASHBOARD',
  actionLink = null,
  actionText = null,
  dataGrounding = null,
  expectedBenefit = null,
  isPreliminary = false,
}) {
  const normSeverity = ['LOW', 'MEDIUM', 'HIGH'].includes(String(severity).toUpperCase())
    ? String(severity).toUpperCase()
    : (['CRITICAL', 'ALERT'].includes(String(severity).toUpperCase()) ? 'HIGH' : (['WARNING'].includes(String(severity).toUpperCase()) ? 'MEDIUM' : 'LOW'));
  // Suppress duplicate insight creation for the same user and type within 24 hours if already active
  const check = await db.query(
    `SELECT insight_id, status FROM ai_insights
     WHERE user_id = $1 AND insight_type = $2 AND created_at >= NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [userId, insightType]
  );

  if (check.rows.length > 0) {
    // If it exists and is dismissed, keep it dismissed. Otherwise update details.
    const existing = check.rows[0];
    if (existing.status === 'DISMISSED') {
      return null;
    }
    const updateRes = await db.query(
      `UPDATE ai_insights
       SET title = $1, description = $2, severity = $3, page_context = $4,
           action_link = $5, action_text = $6, data_grounding = $7,
           expected_benefit = $8, is_preliminary = $9, updated_at = NOW()
       WHERE insight_id = $10 AND user_id = $11
       RETURNING *`,
      [
        title,
        description,
        normSeverity,
        pageContext,
        actionLink,
        actionText,
        dataGrounding,
        expectedBenefit,
        Boolean(isPreliminary),
        existing.insight_id,
        userId,
      ]
    );
    return updateRes.rows[0];
  }

  const insertRes = await db.query(
    `INSERT INTO ai_insights (
       user_id, insight_type, title, description, severity,
       page_context, action_link, action_text, data_grounding,
       expected_benefit, is_preliminary, status, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE', NOW(), NOW())
     RETURNING *`,
    [
      userId,
      insightType,
      title,
      description,
      normSeverity,
      pageContext,
      actionLink,
      actionText,
      dataGrounding,
      expectedBenefit,
      Boolean(isPreliminary),
    ]
  );
  return insertRes.rows[0];
}

async function markRead(insightId, userId) {
  const result = await db.query(
    `UPDATE ai_insights
     SET is_read = TRUE, updated_at = NOW()
     WHERE insight_id = $1 AND user_id = $2
     RETURNING *`,
    [insightId, userId]
  );
  return result.rows[0] || null;
}

async function dismissInsight(insightId, userId) {
  const result = await db.query(
    `UPDATE ai_insights
     SET status = 'DISMISSED', updated_at = NOW()
     WHERE insight_id = $1 AND user_id = $2
     RETURNING *`,
    [insightId, userId]
  );
  return result.rows[0] || null;
}

async function setFeedback(insightId, userId, feedback) {
  const validFeedback = ['HELPFUL', 'UNHELPFUL'].includes(String(feedback).toUpperCase())
    ? String(feedback).toUpperCase()
    : null;

  const result = await db.query(
    `UPDATE ai_insights
     SET feedback = $1, updated_at = NOW()
     WHERE insight_id = $2 AND user_id = $3
     RETURNING *`,
    [validFeedback, insightId, userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  findAllByUser,
  upsertInsight,
  markRead,
  dismissInsight,
  setFeedback,
};
