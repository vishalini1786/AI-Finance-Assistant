// incomeValidator.js

const VALID_SOURCES = ['Salary', 'Freelance', 'Business', 'Scholarship', 'Rental', 'Other'];

function validateIncome(body) {
  const errors = [];
  const { source, amount, incomeDate } = body;

  if (!source || !VALID_SOURCES.includes(source)) {
    errors.push(`Source must be one of: ${VALID_SOURCES.join(', ')}`);
  }

  if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('Amount must be a positive number');
  }

  if (!incomeDate || isNaN(Date.parse(incomeDate))) {
    errors.push('A valid incomeDate is required');
  }

  return errors;
}

module.exports = validateIncome;
