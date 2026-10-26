const holdingRepository = require('../repositories/holdingRepository');

function notFound() {
  const error = new Error('Investment holding not found');
  error.statusCode = 404;
  error.expose = true;
  return error;
}

function formatHolding(holding) {
  let purchaseDate = null;
  if (holding.purchase_date) {
    if (typeof holding.purchase_date === 'string') {
      purchaseDate = holding.purchase_date.slice(0, 10);
    } else if (holding.purchase_date instanceof Date) {
      purchaseDate = holding.purchase_date.toISOString().slice(0, 10);
    } else {
      purchaseDate = String(holding.purchase_date).slice(0, 10);
    }
  }

  return {
    ...holding,
    quantity: Number(holding.quantity || 0),
    current_value: Number(holding.current_value || 0),
    purchase_value: holding.purchase_value == null ? null : Number(holding.purchase_value),
    purchase_date: purchaseDate,
  };
}

async function getHoldings(userId) {
  const holdings = await holdingRepository.findAllByUser(userId);
  return holdings.map(formatHolding);
}

async function getHolding(holdingId, userId) {
  const holding = await holdingRepository.findByIdAndUser(holdingId, userId);
  if (!holding) throw notFound();
  return formatHolding(holding);
}

async function createHolding(userId, fields) {
  const purchaseDate = fields.purchaseDate ? String(fields.purchaseDate).slice(0, 10) : null;
  const holding = await holdingRepository.create({
    userId,
    ...fields,
    purchaseDate,
  });
  return formatHolding(holding);
}

async function updateHolding(holdingId, userId, fields) {
  const payload = { ...fields };
  if (fields.purchaseDate !== undefined) {
    payload.purchaseDate = fields.purchaseDate ? String(fields.purchaseDate).slice(0, 10) : null;
  }
  const holding = await holdingRepository.update(holdingId, userId, payload);
  if (!holding) throw notFound();
  return formatHolding(holding);
}

async function deleteHolding(holdingId, userId) {
  if (!(await holdingRepository.remove(holdingId, userId))) throw notFound();
}

module.exports = { getHoldings, getHolding, createHolding, updateHolding, deleteHolding };
