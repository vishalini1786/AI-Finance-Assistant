// monthlyPlanRepository.js
const db = require('../config/database');

async function findAllByUser(userId) {
  const result = await db.query(
    'SELECT * FROM monthly_budget_plans WHERE user_id = $1 ORDER BY year DESC, month DESC',
    [userId]
  );
  return result.rows;
}

async function findByMonthAndYear(userId, month, year) {
  const result = await db.query(
    'SELECT * FROM monthly_budget_plans WHERE user_id = $1 AND month = $2 AND year = $3',
    [userId, month, year]
  );
  return result.rows[0] || null;
}

async function upsertPlan({ userId, month, year, plannedIncome, emergencyReserve }) {
  const result = await db.query(
    `INSERT INTO monthly_budget_plans (user_id, month, year, planned_income, emergency_reserve)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, month, year)
     DO UPDATE SET 
       planned_income = EXCLUDED.planned_income,
       emergency_reserve = EXCLUDED.emergency_reserve,
       updated_at = NOW()
     RETURNING *`,
    [userId, month, year, plannedIncome, emergencyReserve]
  );
  return result.rows[0];
}

module.exports = { findAllByUser, findByMonthAndYear, upsertPlan };
