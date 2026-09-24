const holdingRepository = require('../repositories/holdingRepository');

function notFound() {
  const error = new Error('Investment holding not found');
  error.statusCode = 404;
  error.expose = true;
  return error;
}

function formatHolding(holding) {
  return {
    ...holding,
    quantity: Number(holding.quantity || 0),
    current_value: Number(holding.current_value || 0),
    purchase_value: holding.purchase_value == null ? null : Number(holding.purchase_value),
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
async function createHolding(userId, fields) { return formatHolding(await holdingRepository.create({ userId, ...fields })); }
async function updateHolding(holdingId, userId, fields) {
  const holding = await holdingRepository.update(holdingId, userId, fields);
  if (!holding) throw notFound();
  return formatHolding(holding);
}
async function deleteHolding(holdingId, userId) {
  if (!(await holdingRepository.remove(holdingId, userId))) throw notFound();
}
module.exports = { getHoldings, getHolding, createHolding, updateHolding, deleteHolding };
