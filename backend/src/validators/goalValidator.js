function validateGoal(data) {
  const errors = [];
  if (!data.goalName || typeof data.goalName !== 'string' || !data.goalName.trim()) errors.push('Goal name is required');
  if (data.targetAmount === undefined || Number(data.targetAmount) <= 0) errors.push('Target amount must be greater than zero');
  if (data.currentAmount !== undefined && Number(data.currentAmount) < 0) errors.push('Current amount cannot be negative');
  if (data.targetDate && Number.isNaN(Date.parse(data.targetDate))) errors.push('Target date must be valid');
  return errors;
}
module.exports = validateGoal;
