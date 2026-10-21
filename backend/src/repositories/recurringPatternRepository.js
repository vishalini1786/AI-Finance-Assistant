// recurringPatternRepository.js
// Data layer for recurring spending pattern detection, user confirmations, and daily prompt tracking.

const db = require('../config/database');

async function createPattern({
  userId,
  categoryId,
  patternName,
  normalizedMerchant,
  typicalAmount,
  minAmount,
  maxAmount,
  frequency,
  dayOfWeek,
  lastObservedDate,
  nextExpectedDate,
  occurrenceCount,
  confidenceScore,
  status,
  remindersEnabled,
}) {
  const result = await db.query(
    `INSERT INTO recurring_patterns (
       user_id, category_id, pattern_name, normalized_merchant,
       typical_amount, min_amount, max_amount, frequency,
       day_of_week, last_observed_date, next_expected_date,
       occurrence_count, confidence_score, status, reminders_enabled
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      userId,
      categoryId || null,
      patternName,
      normalizedMerchant || null,
      typicalAmount,
      minAmount || typicalAmount,
      maxAmount || typicalAmount,
      frequency || 'DAILY',
      dayOfWeek != null ? dayOfWeek : null,
      lastObservedDate || null,
      nextExpectedDate || null,
      occurrenceCount || 1,
      confidenceScore || 0.50,
      status || 'DETECTED',
      remindersEnabled !== undefined ? remindersEnabled : true,
    ]
  );
  return result.rows[0];
}

async function findAllByUser(userId, statusFilter) {
  let query = `
    SELECT rp.*, c.name AS category_name
    FROM recurring_patterns rp
    LEFT JOIN categories c ON c.category_id = rp.category_id
    WHERE rp.user_id = $1
  `;
  const params = [userId];

  if (statusFilter && statusFilter !== 'ALL') {
    params.push(statusFilter);
    query += ` AND rp.status = $2`;
  }

  query += ` ORDER BY rp.status ASC, rp.confidence_score DESC, rp.updated_at DESC`;

  const result = await db.query(query, params);
  return result.rows;
}

async function findByIdAndUser(patternId, userId) {
  const result = await db.query(
    `SELECT rp.*, c.name AS category_name
     FROM recurring_patterns rp
     LEFT JOIN categories c ON c.category_id = rp.category_id
     WHERE rp.pattern_id = $1 AND rp.user_id = $2`,
    [patternId, userId]
  );
  return result.rows[0] || null;
}

async function findByNameAndUser(patternName, userId) {
  const result = await db.query(
    `SELECT * FROM recurring_patterns
     WHERE user_id = $1 AND LOWER(TRIM(pattern_name)) = LOWER(TRIM($2))`,
    [userId, patternName]
  );
  return result.rows[0] || null;
}

async function updatePattern(patternId, userId, fields) {
  const allowed = [
    'category_id', 'pattern_name', 'normalized_merchant', 'typical_amount',
    'min_amount', 'max_amount', 'frequency', 'day_of_week', 'last_observed_date',
    'next_expected_date', 'occurrence_count', 'confidence_score', 'status',
    'reminders_enabled', 'last_prompted_date', 'last_response', 'last_response_date'
  ];

  const setClauses = [];
  const params = [patternId, userId];

  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      params.push(val);
      setClauses.push(`${key} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) return findByIdAndUser(patternId, userId);

  setClauses.push('updated_at = NOW()');

  const result = await db.query(
    `UPDATE recurring_patterns
     SET ${setClauses.join(', ')}
     WHERE pattern_id = $1 AND user_id = $2
     RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

async function deletePattern(patternId, userId) {
  const result = await db.query(
    `DELETE FROM recurring_patterns WHERE pattern_id = $1 AND user_id = $2 RETURNING pattern_id`,
    [patternId, userId]
  );
  return result.rowCount > 0;
}

async function recordPrompt(patternId, userId, date) {
  await db.query(
    `UPDATE recurring_patterns
     SET last_prompted_date = $3, updated_at = NOW()
     WHERE pattern_id = $1 AND user_id = $2`,
    [patternId, userId, date]
  );
}

async function recordResponse(patternId, userId, response, date) {
  const result = await db.query(
    `UPDATE recurring_patterns
     SET last_response = $3, last_response_date = $4, updated_at = NOW()
     WHERE pattern_id = $1 AND user_id = $2
     RETURNING *`,
    [patternId, userId, response, date]
  );
  return result.rows[0] || null;
}

module.exports = {
  createPattern,
  findAllByUser,
  findByIdAndUser,
  findByNameAndUser,
  updatePattern,
  deletePattern,
  recordPrompt,
  recordResponse,
};
