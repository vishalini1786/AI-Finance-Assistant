const db = require('../config/database');

const SELECT_HOLDING_FIELDS = `
  holding_id, user_id, holding_type, name, quantity, current_value, purchase_value,
  TO_CHAR(purchase_date, 'YYYY-MM-DD') AS purchase_date,
  created_at, updated_at
`;

async function findAllByUser(userId) {
  const result = await db.query(
    `SELECT ${SELECT_HOLDING_FIELDS}
     FROM financial_holdings
     WHERE user_id = $1
     ORDER BY purchase_date DESC NULLS LAST, holding_id DESC`,
    [userId]
  );
  return result.rows;
}

async function findByIdAndUser(holdingId, userId) {
  const result = await db.query(
    `SELECT ${SELECT_HOLDING_FIELDS}
     FROM financial_holdings
     WHERE holding_id = $1 AND user_id = $2`,
    [holdingId, userId]
  );
  return result.rows[0] || null;
}

async function create({ userId, holdingType, name, quantity, currentValue, purchaseValue, purchaseDate }) {
  const result = await db.query(
    `INSERT INTO financial_holdings (user_id, holding_type, name, quantity, current_value, purchase_value, purchase_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SELECT_HOLDING_FIELDS}`,
    [userId, holdingType, name, quantity || 1, currentValue, purchaseValue ?? null, purchaseDate || null]
  );
  return result.rows[0];
}

async function update(holdingId, userId, fields) {
  const hasPurchaseVal = fields.purchaseValue !== undefined;
  const purchaseValNum = hasPurchaseVal && fields.purchaseValue !== null && fields.purchaseValue !== ''
    ? Number(fields.purchaseValue)
    : null;

  const hasPurchaseDate = fields.purchaseDate !== undefined;
  const purchaseDateStr = hasPurchaseDate && fields.purchaseDate
    ? String(fields.purchaseDate).slice(0, 10)
    : null;

  const result = await db.query(
    `UPDATE financial_holdings
     SET holding_type = COALESCE($1, holding_type),
         name = COALESCE($2, name),
         quantity = COALESCE($3, quantity),
         current_value = COALESCE($4, current_value),
         purchase_value = CASE WHEN $5::boolean THEN $6::numeric ELSE purchase_value END,
         purchase_date = CASE WHEN $7::boolean THEN $8::date ELSE purchase_date END,
         updated_at = NOW()
     WHERE holding_id = $9 AND user_id = $10
     RETURNING ${SELECT_HOLDING_FIELDS}`,
    [
      fields.holdingType || null,
      fields.name || null,
      fields.quantity != null ? fields.quantity : null,
      fields.currentValue != null ? fields.currentValue : null,
      hasPurchaseVal,
      purchaseValNum,
      hasPurchaseDate,
      purchaseDateStr,
      holdingId,
      userId,
    ]
  );
  return result.rows[0] || null;
}

async function remove(holdingId, userId) {
  const result = await db.query('DELETE FROM financial_holdings WHERE holding_id = $1 AND user_id = $2 RETURNING holding_id', [holdingId, userId]);
  return result.rowCount > 0;
}

module.exports = { findAllByUser, findByIdAndUser, create, update, remove };
