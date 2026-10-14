// monthlyPlanService.js
const monthlyPlanRepository = require('../repositories/monthlyPlanRepository');
const budgetRepository = require('../repositories/budgetRepository');
const incomeRepository = require('../repositories/incomeRepository');
const budgetService = require('./budgetService');

async function getMonthlyPlan(userId, month, year) {
  // 1. Get the plan details (if exists)
  const plan = await monthlyPlanRepository.findByMonthAndYear(userId, month, year);
  
  // 2. Get the categories allocated for this month (from budgets)
  const allBudgets = await budgetService.getAllBudgets(userId);
  const monthBudgets = allBudgets.filter(b => Number(b.month) === Number(month) && Number(b.year) === Number(year));

  // 3. Compute actual monthly income from incomes table if plan.planned_income is 0 or no plan
  let actualIncome = 0;
  const userIncomes = await incomeRepository.findAllByUser(userId);
  userIncomes.forEach(inc => {
    const d = new Date(inc.income_date);
    if (d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year)) {
      actualIncome += Number(inc.amount);
    }
  });

  const totalAllocated = monthBudgets.reduce((acc, curr) => acc + Number(curr.budget_amount), 0);
  const totalSpent = monthBudgets.reduce((acc, curr) => acc + Number(curr.actual_spent), 0);

  const emergencyReserve = plan ? Number(plan.emergency_reserve) : 0;
  const plannedIncome = plan && plan.planned_income > 0 ? Number(plan.planned_income) : actualIncome;
  const unallocated = plannedIncome - totalAllocated - emergencyReserve;

  return {
    planId: plan ? plan.plan_id : null,
    month: Number(month),
    year: Number(year),
    plannedIncome,
    actualIncome,
    emergencyReserve,
    totalAllocated,
    totalSpent,
    unallocated,
    allocations: monthBudgets
  };
}

async function saveMonthlyPlan(userId, month, year, { plannedIncome, emergencyReserve, allocations }) {
  // Upsert the main plan record
  const plan = await monthlyPlanRepository.upsertPlan({
    userId,
    month,
    year,
    plannedIncome: plannedIncome || 0,
    emergencyReserve: emergencyReserve || 0
  });

  // Handle allocations
  // allocations is array of { categoryId, budgetAmount, priority }
  if (allocations && Array.isArray(allocations)) {
    const existingBudgets = await budgetRepository.findAllByUser(userId);
    const monthBudgets = existingBudgets.filter(b => Number(b.month) === Number(month) && Number(b.year) === Number(year));
    
    // For each allocation, either update existing or create new
    for (const alloc of allocations) {
      const existing = monthBudgets.find(b => Number(b.category_id) === Number(alloc.categoryId));
      if (existing) {
        await budgetRepository.update(existing.budget_id, userId, {
          budgetAmount: alloc.budgetAmount,
          month,
          year,
          priority: alloc.priority
        });
      } else {
        await budgetRepository.create({
          userId,
          categoryId: alloc.categoryId,
          budgetAmount: alloc.budgetAmount,
          month,
          year,
          priority: alloc.priority
        });
      }
    }
  }

  return getMonthlyPlan(userId, month, year);
}

module.exports = { getMonthlyPlan, saveMonthlyPlan };
