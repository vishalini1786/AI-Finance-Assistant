const goalRepository = require('../repositories/goalRepository');

function notFound() {
  const error = new Error('Savings goal not found');
  error.statusCode = 404;
  error.expose = true;
  return error;
}

function formatGoal(goal) {
  const targetAmount = Number(goal.target_amount || 0);
  const currentAmount = Number(goal.current_amount || 0);
  return {
    ...goal,
    target_amount: targetAmount,
    current_amount: currentAmount,
    remaining_amount: Math.max(targetAmount - currentAmount, 0),
    progress_percent: targetAmount > 0 ? Number(Math.min((currentAmount / targetAmount) * 100, 100).toFixed(2)) : 0,
  };
}

async function getGoals(userId) {
  const goals = await goalRepository.findAllByUser(userId);
  return goals.map(formatGoal);
}

async function getGoal(goalId, userId) {
  const goal = await goalRepository.findByIdAndUser(goalId, userId);
  if (!goal) throw notFound();
  return formatGoal(goal);
}

async function createGoal(userId, fields) {
  return formatGoal(await goalRepository.create({ userId, ...fields }));
}

async function updateGoal(goalId, userId, fields) {
  const goal = await goalRepository.update(goalId, userId, fields);
  if (!goal) throw notFound();
  return formatGoal(goal);
}

async function deleteGoal(goalId, userId) {
  if (!(await goalRepository.remove(goalId, userId))) throw notFound();
}

module.exports = { getGoals, getGoal, createGoal, updateGoal, deleteGoal };
