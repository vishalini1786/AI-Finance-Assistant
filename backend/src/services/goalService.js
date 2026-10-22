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
  const goal = await goalRepository.create({ userId, ...fields });
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId).catch(() => null);
  return formatGoal(goal);
}

async function updateGoal(goalId, userId, fields) {
  const goal = await goalRepository.update(goalId, userId, fields);
  if (!goal) throw notFound();
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId).catch(() => null);
  return formatGoal(goal);
}

async function deleteGoal(goalId, userId) {
  if (!(await goalRepository.remove(goalId, userId))) throw notFound();
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId).catch(() => null);
}

async function recordContribution(goalId, userId, { amount, contributionDate, note }) {
  const parsedAmount = Number(amount);
  if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
    const error = new Error('Contribution amount must be a positive number');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  const result = await goalRepository.addContribution({
    goalId,
    userId,
    amount: parsedAmount,
    contributionDate,
    note,
  });

  if (!result) throw notFound();

  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId).catch(() => null);

  return {
    goal: formatGoal(result.goal),
    contribution: result.contribution,
  };
}

async function getContributions(goalId, userId) {
  const goal = await goalRepository.findByIdAndUser(goalId, userId);
  if (!goal) throw notFound();
  return goalRepository.getContributions(goalId, userId);
}

module.exports = { getGoals, getGoal, createGoal, updateGoal, deleteGoal, recordContribution, getContributions };

