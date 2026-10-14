const db = require('../config/database');

async function findAllByUser(userId) {
  const result = await db.query(
    `SELECT goal_id, user_id, goal_name, target_amount, current_amount,
            TO_CHAR(target_date, 'YYYY-MM-DD') AS target_date,
            status, created_at, updated_at
     FROM financial_goals WHERE user_id = $1 ORDER BY target_date NULLS LAST, goal_id DESC`,
    [userId]
  );
  return result.rows;
}

async function findByIdAndUser(goalId, userId) {
  const result = await db.query(
    `SELECT goal_id, user_id, goal_name, target_amount, current_amount,
            TO_CHAR(target_date, 'YYYY-MM-DD') AS target_date,
            status, created_at, updated_at
     FROM financial_goals WHERE goal_id = $1 AND user_id = $2`,
    [goalId, userId]
  );
  return result.rows[0] || null;
}

async function create({ userId, goalName, targetAmount, currentAmount, targetDate, status }) {
  const result = await db.query(
    `INSERT INTO financial_goals (user_id, goal_name, target_amount, current_amount, target_date, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING goal_id, user_id, goal_name, target_amount, current_amount,
               TO_CHAR(target_date, 'YYYY-MM-DD') AS target_date,
               status, created_at, updated_at`,
    [userId, goalName, targetAmount, currentAmount || 0, targetDate || null, status || 'IN_PROGRESS']
  );
  return result.rows[0];
}

async function update(goalId, userId, fields) {
  const result = await db.query(
    `UPDATE financial_goals
     SET goal_name = $1, target_amount = $2, current_amount = $3,
         target_date = $4, status = $5, updated_at = NOW()
     WHERE goal_id = $6 AND user_id = $7
     RETURNING goal_id, user_id, goal_name, target_amount, current_amount,
               TO_CHAR(target_date, 'YYYY-MM-DD') AS target_date,
               status, created_at, updated_at`,
    [fields.goalName, fields.targetAmount, fields.currentAmount, fields.targetDate || null, fields.status, goalId, userId]
  );
  return result.rows[0] || null;
}

async function remove(goalId, userId) {
  const result = await db.query(
    'DELETE FROM financial_goals WHERE goal_id = $1 AND user_id = $2 RETURNING goal_id',
    [goalId, userId]
  );
  return result.rowCount > 0;
}

module.exports = { findAllByUser, findByIdAndUser, create, update, remove };
