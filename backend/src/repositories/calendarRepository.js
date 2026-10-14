const db = require('../config/database');

async function findEventsByUser(userId) {
  const result = await db.query(
    `SELECT income_id AS source_id, 'income' AS event_type, source AS title,
            amount, TO_CHAR(income_date, 'YYYY-MM-DD') AS event_date, description, 'incomes' AS source_type
     FROM incomes WHERE user_id = $1
     UNION ALL
     SELECT holding_id AS source_id, 'investment' AS event_type, name AS title,
            current_value AS amount, TO_CHAR(purchase_date, 'YYYY-MM-DD') AS event_date, NULL AS description, 'financial_holdings' AS source_type
     FROM financial_holdings WHERE user_id = $1 AND purchase_date IS NOT NULL
     UNION ALL
     SELECT recurring_payment_id AS source_id,
            CASE WHEN LOWER(name) LIKE '%emi%' OR LOWER(name) LIKE '%loan%' THEN 'emi' ELSE 'bill' END AS event_type,
            name AS title, amount, TO_CHAR(next_due_date, 'YYYY-MM-DD') AS event_date, NULL AS description, 'recurring_payments' AS source_type
     FROM recurring_payments WHERE user_id = $1 AND is_active = TRUE AND next_due_date IS NOT NULL
     UNION ALL
     SELECT tax_id AS source_id, 'tax' AS event_type, tax_type AS title,
            amount, TO_CHAR(due_date, 'YYYY-MM-DD') AS event_date, status AS description, 'taxes' AS source_type
     FROM taxes WHERE user_id = $1 AND due_date IS NOT NULL
     UNION ALL
     SELECT goal_id AS source_id, 'savings' AS event_type, goal_name AS title,
            target_amount - current_amount AS amount, TO_CHAR(target_date, 'YYYY-MM-DD') AS event_date, status AS description, 'financial_goals' AS source_type
     FROM financial_goals WHERE user_id = $1 AND target_date IS NOT NULL
     UNION ALL
     SELECT e.expense_id AS source_id, 
            CASE 
              WHEN LOWER(c.name) LIKE '%emi%' THEN 'emi'
              WHEN LOWER(c.name) LIKE '%investment%' THEN 'investment'
              WHEN LOWER(c.name) LIKE '%subscription%' THEN 'subscription'
              WHEN LOWER(c.name) LIKE '%saving%' THEN 'savings'
              WHEN LOWER(c.name) LIKE '%tax%' THEN 'tax'
              ELSE 'bill'
            END AS event_type,
            COALESCE(e.merchant_name, c.name) AS title,
            e.amount, TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS event_date, e.description, 'expenses' AS source_type
     FROM expenses e
     JOIN categories c ON e.category_id = c.category_id
     WHERE e.user_id = $1 AND e.expense_date IS NOT NULL
       AND (LOWER(c.name) IN ('bills', 'emi', 'investment', 'subscription', 'savings', 'tax') OR c.name IN ('Bills', 'EMI', 'Investment', 'Subscription', 'Savings', 'Tax'))
     ORDER BY event_date ASC, source_id ASC`,
    [userId]
  );
  return result.rows;
}

module.exports = { findEventsByUser };
