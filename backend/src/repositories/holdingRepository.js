const db = require('../config/database');

async function findAllByUser(userId) {
  const result = await db.query('SELECT * FROM financial_holdings WHERE user_id = $1 ORDER BY purchase_date DESC NULLS LAST, holding_id DESC', [userId]);
  return result.rows;
}

async function findByIdAndUser(holdingId, userId) {
  const result = await db.query('SELECT * FROM financial_holdings WHERE holding_id = $1 AND user_id = $2', [holdingId, userId]);
  return result.rows[0] || null;
}

async function create({ userId, holdingType, name, quantity, currentValue, purchaseValue, purchaseDate }) {
  const result = await db.query(
    `INSERT INTO financial_holdings (user_id, holding_type, name, quantity, current_value, purchase_value, purchase_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, holdingType, name, quantity || 1, currentValue, purchaseValue ?? null, purchaseDate || null]
  );
  return result.rows[0];
}

async function update(holdingId, userId, fields) {
  const result = await db.query(
    `UPDATE financial_holdings
     SET holding_type = $1, name = $2, quantity = $3, current_value = $4,
         purchase_value = $5, purchase_date = $6, updated_at = NOW()
     WHERE holding_id = $7 AND user_id = $8 RETURNING *`,
    [fields.holdingType, fields.name, fields.quantity, fields.currentValue, fields.purchaseValue ?? null, fields.purchaseDate || null, holdingId, userId]
  );
  return result.rows[0] || null;
}

async function remove(holdingId, userId) {
  const result = await db.query('DELETE FROM financial_holdings WHERE holding_id = $1 AND user_id = $2 RETURNING holding_id', [holdingId, userId]);
  return result.rowCount > 0;
}

module.exports = { findAllByUser, findByIdAndUser, create, update, remove };
