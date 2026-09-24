// projectValidator.js

function validateProject(data) {
  const errors = [];
  
  if (!data.projectName || typeof data.projectName !== 'string' || data.projectName.trim() === '') {
    errors.push('Project name is required');
  }
  
  if (data.targetBudget === undefined || data.targetBudget === null || Number(data.targetBudget) < 0) {
    errors.push('Target budget must be a positive number or zero');
  }
  
  if (!data.startDate) {
    errors.push('Start date is required');
  }
  
  if (data.startDate && data.targetDate) {
    const start = new Date(data.startDate);
    const target = new Date(data.targetDate);
    if (target < start) {
      errors.push('Target date cannot be before start date');
    }
  }

  return errors;
}

function validateProjectExpense(data) {
  const errors = [];
  
  if (!data.expenseName || typeof data.expenseName !== 'string' || data.expenseName.trim() === '') {
    errors.push('Expense name is required');
  }
  
  if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
    errors.push('Category is required');
  }
  
  if (data.amount === undefined || data.amount === null || Number(data.amount) <= 0) {
    errors.push('Amount must be greater than zero');
  }
  
  if (!data.expenseDate) {
    errors.push('Expense date is required');
  }

  return errors;
}

module.exports = {
  validateProject,
  validateProjectExpense
};
