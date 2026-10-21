const aiInsightRepository = require('../repositories/aiInsightRepository');
const budgetRepository = require('../repositories/budgetRepository');
const expenseRepository = require('../repositories/expenseRepository');
const incomeRepository = require('../repositories/incomeRepository');
const goalRepository = require('../repositories/goalRepository');
const db = require('../config/database');

function formatCurrency(amt) {
  return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

async function refreshInsightsForUser(userId) {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Check budget overruns
    const budgets = await budgetRepository.findAllByUser(userId);
    const activeBudgets = budgets.filter(b => Number(b.month) === currentMonth && Number(b.year) === currentYear);
    for (const b of activeBudgets) {
      const spent = Number(b.actual_spent || 0);
      const limit = Number(b.budget_amount || 0);
      if (limit > 0 && spent > limit) {
        const overrun = spent - limit;
        const pct = Math.round((spent / limit) * 100);
        await aiInsightRepository.upsertInsight({
          userId,
          insightType: `BUDGET_OVERRUN_${b.category_id}`,
          title: `${b.category_name} budget exceeded by ${formatCurrency(overrun)}`,
          description: `You have spent ${formatCurrency(spent)} of your ${formatCurrency(limit)} budget (${pct}%). Consider capping discretionary purchases in this category for the rest of the month.`,
          severity: 'HIGH',
        });
      }
    }

    // 2. Check Deficit vs Income
    const incRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM incomes WHERE user_id = $1 AND EXTRACT(MONTH FROM income_date) = $2 AND EXTRACT(YEAR FROM income_date) = $3`,
      [userId, currentMonth, currentYear]
    );
    const expRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3`,
      [userId, currentMonth, currentYear]
    );
    const monthlyIncome = Number(incRes.rows[0]?.total || 0);
    const monthlyExpenses = Number(expRes.rows[0]?.total || 0);
    if (monthlyIncome > 0 && monthlyExpenses > monthlyIncome) {
      const deficit = monthlyExpenses - monthlyIncome;
      await aiInsightRepository.upsertInsight({
        userId,
        insightType: `MONTHLY_DEFICIT_${currentYear}_${currentMonth}`,
        title: `Expenses exceed recorded income by ${formatCurrency(deficit)}`,
        description: `This month's expenses (${formatCurrency(monthlyExpenses)}) exceed your recorded income (${formatCurrency(monthlyIncome)}). If you drew from savings or received unrecorded income, be sure to log it.`,
        severity: 'HIGH',
      });
    }

    // 3. Micro-spending accumulation
    const microRes = await db.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = $1 AND amount <= 250
         AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3`,
      [userId, currentMonth, currentYear]
    );
    const microCount = Number(microRes.rows[0]?.count || 0);
    const microTotal = Number(microRes.rows[0]?.total || 0);
    if (microCount >= 5 && microTotal >= 1000) {
      await aiInsightRepository.upsertInsight({
        userId,
        insightType: `MICRO_SPENDING_${currentYear}_${currentMonth}`,
        title: `Small purchases accumulated to ${formatCurrency(microTotal)}`,
        description: `You have made ${microCount} minor purchases under ₹250 this month totaling ${formatCurrency(microTotal)}. Tracking these daily helps prevent silent leaks in your savings.`,
        severity: 'MEDIUM',
      });
    }

    // 4. Upcoming Bills / EMIs (within 5 days)
    const billRes = await db.query(
      `SELECT name, amount, next_due_date
       FROM recurring_payments
       WHERE user_id = $1 AND is_active = TRUE
         AND next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '5 days'`,
      [userId]
    );
    for (const bill of billRes.rows) {
      await aiInsightRepository.upsertInsight({
        userId,
        insightType: `UPCOMING_BILL_${bill.name}_${bill.next_due_date}`,
        title: `Upcoming bill: ${bill.name} (${formatCurrency(bill.amount)})`,
        description: `${bill.name} of ${formatCurrency(bill.amount)} is scheduled on ${new Date(bill.next_due_date).toLocaleDateString('en-IN')}. Ensure your account has sufficient funds.`,
        severity: 'MEDIUM',
      });
    }

    // 5. Savings Goals Progress
    const goals = await goalRepository.findAllByUser(userId);
    for (const g of goals) {
      const target = Number(g.target_amount || 0);
      const current = Number(g.current_amount || 0);
      if (target > 0 && g.target_date) {
        const targetDate = new Date(g.target_date);
        const daysLeft = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        const progress = Math.round((current / target) * 100);
        if (daysLeft > 0 && daysLeft <= 60 && progress < 50) {
          await aiInsightRepository.upsertInsight({
            userId,
            insightType: `GOAL_LAGGING_${g.goal_id}`,
            title: `Goal "${g.goal_name}" is behind schedule (${progress}%)`,
            description: `Target date is in ${daysLeft} days, but only ${formatCurrency(current)} of ${formatCurrency(target)} has been saved. An extra ${formatCurrency(Math.ceil((target - current) / Math.max(1, Math.ceil(daysLeft / 30))))}/month is needed to meet this goal.`,
            severity: 'MEDIUM',
          });
        }
      }
    }
  } catch (err) {
    console.error('Error generating AI insights:', err.message);
  }
}

async function getInsights(userId) {
  await refreshInsightsForUser(userId);
  return aiInsightRepository.findAllByUser(userId);
}

module.exports = { refreshInsightsForUser, getInsights };
