// budgetValidator.js

function validateBudget(body) {
  const errors = [];
  const { categoryId, budgetAmount, month, year } = body;

  if (!categoryId || isNaN(Number(categoryId))) {
    errors.push('A valid categoryId is required');
  }

  if (budgetAmount === undefined || budgetAmount === null || isNaN(Number(budgetAmount)) || Number(budgetAmount) <= 0) {
    errors.push('budgetAmount must be a positive number');
  }

  if (!month || isNaN(Number(month)) || Number(month) < 1 || Number(month) > 12) {
    errors.push('month must be a number between 1 and 12');
  }

  if (!year || isNaN(Number(year)) || Number(year) < 2000 || Number(year) > 2100) {
    errors.push('year must be a valid 4-digit year');
  }

  return errors;
}

module.exports = validateBudget;
