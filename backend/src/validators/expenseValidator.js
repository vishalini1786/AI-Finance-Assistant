// expenseValidator.js

const VALID_SOURCE_TYPES = ['MANUAL', 'OCR', 'RECURRING'];

function validateExpense(body) {
  const errors = [];
  const { categoryId, amount, expenseDate, sourceType } = body;

  if (!categoryId || isNaN(Number(categoryId))) {
    errors.push('A valid categoryId is required');
  }

  if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('Amount must be a positive number');
  }

  if (!expenseDate || isNaN(Date.parse(expenseDate))) {
    errors.push('A valid expenseDate is required');
  }

  if (sourceType && !VALID_SOURCE_TYPES.includes(sourceType)) {
    errors.push(`sourceType must be one of: ${VALID_SOURCE_TYPES.join(', ')}`);
  }

  return errors;
}

module.exports = validateExpense;
