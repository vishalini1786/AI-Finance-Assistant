function validateHolding(data) {
  const errors = [];
  if (!data.holdingType || typeof data.holdingType !== 'string') errors.push('Holding type is required');
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) errors.push('Holding name is required');
  if (data.quantity !== undefined && Number(data.quantity) <= 0) errors.push('Quantity must be greater than zero');
  if (data.currentValue === undefined || Number(data.currentValue) < 0) errors.push('Current value cannot be negative');
  if (data.purchaseValue !== undefined && data.purchaseValue !== null && Number(data.purchaseValue) < 0) errors.push('Purchase value cannot be negative');
  if (data.purchaseDate && Number.isNaN(Date.parse(data.purchaseDate))) errors.push('Purchase date must be valid');
  return errors;
}
module.exports = validateHolding;
