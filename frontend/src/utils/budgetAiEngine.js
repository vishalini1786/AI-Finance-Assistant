// budgetAiEngine.js

export function analyzeBudget(plan, categories) {
  const recommendations = [];
  const warnings = [];

  const totalAllocated = plan.allocations.reduce((acc, a) => acc + Number(a.budget_amount || a.budgetAmount || 0), 0);
  const income = plan.plannedIncome || 0;
  const emergencyReserve = plan.emergencyReserve || 0;

  // 1. Overall plan validation
  if (totalAllocated + emergencyReserve > income) {
    warnings.push({
      type: 'OVER_INCOME',
      message: `Your planned allocations (₹${totalAllocated + emergencyReserve}) exceed your monthly income (₹${income}).`,
    });
  }
  
  // Historical check placeholder (since we don't have enough history loaded)
  warnings.push({
    type: 'HISTORY',
    message: 'Not enough historical data to make a reliable category recommendation.',
  });

  // 2. Identify over-budget categories and under-budget flexible categories
  const overBudgets = [];
  const underBudgets = [];

  plan.allocations.forEach(alloc => {
    const allocated = Number(alloc.budget_amount || alloc.budgetAmount || 0);
    const spent = Number(alloc.actual_spent || 0);
    const remaining = allocated - spent;
    const priority = alloc.priority || 'FLEXIBLE';

    if (spent > allocated) {
      overBudgets.push({ ...alloc, overage: Math.abs(remaining) });
    } else if (remaining > 0 && (priority === 'FLEXIBLE' || priority === 'DISCRETIONARY')) {
      underBudgets.push({ ...alloc, remaining });
    }
    
    // Simple run-rate prediction (assuming we are midway through month, simplify by checking if util > 90)
    const util = allocated > 0 ? (spent / allocated) * 100 : 0;
    if (util >= 90 && util <= 100) {
      warnings.push({
        type: 'NEAR_LIMIT',
        message: `${alloc.category_name || 'Category'} is nearing its limit (${util.toFixed(1)}%).`,
      });
    }
  });

  // 3. Generate Reallocation Recommendations
  // Priority: Try to cover CRITICAL/ESSENTIAL overages using FLEXIBLE/DISCRETIONARY underages.
  
  const getPriorityWeight = (p) => {
    switch(p) {
      case 'CRITICAL': return 5;
      case 'ESSENTIAL': return 4;
      case 'IMPORTANT': return 3;
      case 'FLEXIBLE': return 2;
      case 'DISCRETIONARY': return 1;
      default: return 2;
    }
  };

  // Sort overBudgets by priority (Highest first)
  overBudgets.sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority));
  // Sort underBudgets by priority (Lowest first)
  underBudgets.sort((a, b) => getPriorityWeight(a.priority) - getPriorityWeight(b.priority));

  for (let over of overBudgets) {
    if (over.overage <= 0) continue;

    for (let under of underBudgets) {
      if (under.remaining <= 0) continue;
      // Only reallocate if under category is lower priority than over category
      if (getPriorityWeight(under.priority) < getPriorityWeight(over.priority) || under.priority === 'DISCRETIONARY' || under.priority === 'FLEXIBLE') {
        const amountToMove = Math.min(over.overage, under.remaining);
        
        recommendations.push({
          id: `realloc-${over.budget_id}-${under.budget_id}-${Date.now()}`,
          fromId: under.category_id,
          fromName: under.category_name,
          toId: over.category_id,
          toName: over.category_name,
          amount: amountToMove,
          reason: `${over.category_name} has exceeded its allocation by ₹${over.overage}. ${under.category_name} currently has ₹${under.remaining} remaining and is classified as ${under.priority}.`
        });

        over.overage -= amountToMove;
        under.remaining -= amountToMove;

        if (over.overage <= 0) break;
      }
    }
  }

  return { recommendations, warnings };
}
