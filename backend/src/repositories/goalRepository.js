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
  const currentAmount = fields.currentAmount !== undefined && fields.currentAmount !== null && fields.currentAmount !== '' && !isNaN(Number(fields.currentAmount))
    ? Number(fields.currentAmount)
    : null;

  const result = await db.query(
    `UPDATE financial_goals
     SET goal_name = COALESCE($1, goal_name),
         target_amount = COALESCE($2, target_amount),
         current_amount = COALESCE($3, current_amount),
         target_date = $4,
         status = COALESCE($5, status),
         updated_at = NOW()
     WHERE goal_id = $6 AND user_id = $7
     RETURNING goal_id, user_id, goal_name, target_amount, current_amount,
               TO_CHAR(target_date, 'YYYY-MM-DD') AS target_date,
               status, created_at, updated_at`,
    [fields.goalName || null, fields.targetAmount || null, currentAmount, fields.targetDate || null, fields.status || null, goalId, userId]
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

async function addContribution({ goalId, userId, amount, contributionDate, note }) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock and check goal exists for authenticated user
    const goalRes = await client.query(
      `SELECT goal_id, target_amount, current_amount, status
       FROM financial_goals
       WHERE goal_id = $1 AND user_id = $2
       FOR UPDATE`,
      [goalId, userId]
    );

    if (goalRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const currentGoal = goalRes.rows[0];
    const newCurrent = Number(currentGoal.current_amount || 0) + Number(amount);
    const target = Number(currentGoal.target_amount || 0);
    const newStatus = (target > 0 && newCurrent >= target) ? 'COMPLETED' : (currentGoal.status || 'IN_PROGRESS');

    // 2. Insert auditable contribution entry
    const contribRes = await client.query(
      `INSERT INTO goal_contributions (goal_id, user_id, amount, contribution_date, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING contribution_id, goal_id, user_id, amount,
                 TO_CHAR(contribution_date, 'YYYY-MM-DD') AS contribution_date,
                 note, created_at`,
      [goalId, userId, amount, contributionDate || new Date().toISOString().slice(0, 10), note || null]
    );

    // 3. Atomically update financial_goals
    const updatedGoalRes = await client.query(
      `UPDATE financial_goals
       SET current_amount = $1, status = $2, updated_at = NOW()
       WHERE goal_id = $3 AND user_id = $4
       RETURNING goal_id, user_id, goal_name, target_amount, current_amount,
                 TO_CHAR(target_date, 'YYYY-MM-DD') AS target_date,
                 status, created_at, updated_at`,
      [newCurrent, newStatus, goalId, userId]
    );

    await client.query('COMMIT');

    return {
      goal: updatedGoalRes.rows[0],
      contribution: contribRes.rows[0],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getContributions(goalId, userId) {
  const result = await db.query(
    `SELECT contribution_id, goal_id, user_id, amount,
            TO_CHAR(contribution_date, 'YYYY-MM-DD') AS contribution_date,
            note, created_at
     FROM goal_contributions
     WHERE goal_id = $1 AND user_id = $2
     ORDER BY contribution_date DESC, contribution_id DESC`,
    [goalId, userId]
  );
  return result.rows;
}

module.exports = { findAllByUser, findByIdAndUser, create, update, remove, addContribution, getContributions };

