const db = require('../config/database');

async function findEventsByUser(userId) {
  const result = await db.query(
    `SELECT income_id AS source_id, 'income' AS event_type, source AS title,
            amount, income_date AS event_date, description, 'incomes' AS source_type
     FROM incomes WHERE user_id = $1
     UNION ALL
     SELECT holding_id AS source_id, 'investment' AS event_type, name AS title,
            current_value AS amount, purchase_date AS event_date, NULL AS description, 'financial_holdings' AS source_type
     FROM financial_holdings WHERE user_id = $1 AND purchase_date IS NOT NULL
     UNION ALL
     SELECT recurring_payment_id AS source_id,
            CASE WHEN LOWER(name) LIKE '%emi%' OR LOWER(name) LIKE '%loan%' THEN 'emi' ELSE 'bill' END AS event_type,
            name AS title, amount, next_due_date AS event_date, NULL AS description, 'recurring_payments' AS source_type
     FROM recurring_payments WHERE user_id = $1 AND is_active = TRUE AND next_due_date IS NOT NULL
     UNION ALL
     SELECT tax_id AS source_id, 'tax' AS event_type, tax_type AS title,
            amount, due_date AS event_date, status AS description, 'taxes' AS source_type
     FROM taxes WHERE user_id = $1 AND due_date IS NOT NULL
     UNION ALL
     SELECT goal_id AS source_id, 'savings' AS event_type, goal_name AS title,
            target_amount - current_amount AS amount, target_date AS event_date, status AS description, 'financial_goals' AS source_type
     FROM financial_goals WHERE user_id = $1 AND target_date IS NOT NULL
     ORDER BY event_date ASC, source_id ASC`,
    [userId]
  );
  return result.rows;
}

module.exports = { findEventsByUser };
