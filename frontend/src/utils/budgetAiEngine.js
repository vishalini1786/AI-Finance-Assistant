// budgetAiEngine.js
// Intelligence engine for budget analysis, cold-start advice, and priority-based reallocation.

export function analyzeBudget(plan, categories) {
  const recommendations = [];
  const warnings = [];

  const totalAllocated = (plan.allocations || []).reduce((acc, a) => acc + Number(a.budget_amount || a.budgetAmount || 0), 0);
  const income = Number(plan.plannedIncome || plan.actualIncome || 0);
  const emergencyReserve = Number(plan.emergencyReserve || 0);
  const totalSpent = Number(plan.totalSpent || (plan.allocations || []).reduce((acc, a) => acc + Number(a.actual_spent || 0), 0));

  // 1. Overall plan validation & cold-start guidance
  if (income > 0 && totalAllocated + emergencyReserve > income) {
    const excess = (totalAllocated + emergencyReserve) - income;
    warnings.push({
      type: 'OVER_INCOME',
      message: `Your planned allocations and reserve (₹${(totalAllocated + emergencyReserve).toLocaleString('en-IN')}) exceed your monthly income (₹${income.toLocaleString('en-IN')}) by ₹${excess.toLocaleString('en-IN')}.`,
    });
  }

  // Cold-start / available data intelligence (No refusal for limited data!)
  if (income > 0 && totalAllocated < income * 0.7) {
    const unallocated = income - (totalAllocated + emergencyReserve);
    if (unallocated > 0) {
      recommendations.push({
        id: `rec-unallocated-${Date.now()}`,
        fromId: null,
        fromName: 'Unallocated Surplus',
        toId: null,
        toName: 'Emergency Reserve / Savings',
        amount: Math.round(unallocated * 0.5),
        reason: `Based on your available monthly income of ₹${income.toLocaleString('en-IN')}, you have ₹${unallocated.toLocaleString('en-IN')} unallocated. Directing ₹${Math.round(unallocated * 0.5).toLocaleString('en-IN')} into your Emergency Reserve strengthens your safety buffer.`,
      });
    }
  }

  // 2. Priority mapping (Critical > Essential > Important > Flexible > Discretionary)
  const getPriorityWeight = (p) => {
    switch (String(p || '').toUpperCase()) {
      case 'CRITICAL': return 5;
      case 'ESSENTIAL': return 4;
      case 'IMPORTANT': return 3;
      case 'FLEXIBLE': return 2;
      case 'DISCRETIONARY': return 1;
      default: return 2;
    }
  };

  // 3. Identify over-budget and available-budget categories
  const overBudgets = [];
  const underBudgets = [];

  (plan.allocations || []).forEach(alloc => {
    const allocated = Number(alloc.budget_amount || alloc.budgetAmount || 0);
    const spent = Number(alloc.actual_spent || 0);
    const remaining = allocated - spent;
    const priority = String(alloc.priority || 'FLEXIBLE').toUpperCase();
    const weight = getPriorityWeight(priority);

    if (spent > allocated && allocated > 0) {
      overBudgets.push({ ...alloc, priority, weight, overage: Math.abs(remaining), allocated, spent });
    } else if (remaining > 0) {
      underBudgets.push({ ...alloc, priority, weight, remaining, allocated, spent });
    }

    // Near-limit threshold warning at 80%
    const util = allocated > 0 ? (spent / allocated) * 100 : 0;
    if (util >= 80 && util < 100) {
      warnings.push({
        type: 'NEAR_LIMIT',
        message: `${alloc.category_name || 'Category'} budget is almost exhausted (${util.toFixed(1)}% utilized, only ₹${remaining.toLocaleString('en-IN')} left).`,
      });
    } else if (util >= 100) {
      warnings.push({
        type: 'EXCEEDED',
        message: `${alloc.category_name || 'Category'} budget has been exceeded by ₹${Math.abs(remaining).toLocaleString('en-IN')} (${util.toFixed(1)}% utilized).`,
      });
    }
  });

  // 4. Generate Reallocation Recommendations using strict priority rules
  // Rule: High-priority categories (Critical, Essential, Important) overspending should be funded by
  // lower-priority categories (Discretionary, Flexible). Never reduce Critical/Essential to fund lower priority!
  overBudgets.sort((a, b) => b.weight - a.weight); // Highest priority overspending first
  underBudgets.sort((a, b) => a.weight - b.weight); // Lowest priority source first (Discretionary first)

  for (let over of overBudgets) {
    if (over.overage <= 0) continue;

    for (let under of underBudgets) {
      if (under.remaining <= 0) continue;

      // Strict Rule: Never reduce Critical (5) or Essential (4) to fund another category
      if (under.weight >= 4) continue;

      // Under category must have lower priority than over category, OR be Flexible/Discretionary
      if (under.weight < over.weight || under.weight <= 2) {
        const amountToMove = Math.min(over.overage, under.remaining);
        if (amountToMove <= 0) continue;

        recommendations.push({
          id: `realloc-${over.budget_id || over.category_id}-${under.budget_id || under.category_id}-${Date.now()}`,
          fromId: under.category_id,
          fromName: under.category_name,
          fromPriority: under.priority,
          fromRemaining: under.remaining,
          toId: over.category_id,
          toName: over.category_name,
          toPriority: over.priority,
          toOverage: over.overage,
          amount: amountToMove,
          reason: `Your ${over.category_name} budget (${over.priority}) exceeded by ₹${over.overage.toLocaleString('en-IN')}. ${under.category_name} has ₹${under.remaining.toLocaleString('en-IN')} available with lower priority (${under.priority}). Reallocate ₹${amountToMove.toLocaleString('en-IN')} from ${under.category_name} to ${over.category_name}?`,
        });

        over.overage -= amountToMove;
        under.remaining -= amountToMove;

        if (over.overage <= 0) break;
      }
    }
  }

  // 5. If no overage exists, provide proactive optimization advice from available allocations
  if (recommendations.length === 0 && (plan.allocations || []).length > 0) {
    const discretionaryAllocs = (plan.allocations || []).filter(a => ['DISCRETIONARY', 'FLEXIBLE'].includes(String(a.priority || '').toUpperCase()));
    if (discretionaryAllocs.length > 0) {
      const topDiscretionary = discretionaryAllocs.sort((a, b) => Number(b.budget_amount || 0) - Number(a.budget_amount || 0))[0];
      const allocAmt = Number(topDiscretionary.budget_amount || 0);
      if (allocAmt >= 3000) {
        const potentialSavings = Math.round(allocAmt * 0.15);
        recommendations.push({
          id: `rec-discretionary-${Date.now()}`,
          fromId: topDiscretionary.category_id,
          fromName: topDiscretionary.category_name,
          toId: null,
          toName: 'Savings Goals',
          amount: potentialSavings,
          reason: `Your ${topDiscretionary.category_name} allocation is ₹${allocAmt.toLocaleString('en-IN')} (${topDiscretionary.priority}). Trimming 15% (₹${potentialSavings.toLocaleString('en-IN')}) would accelerate your monthly savings rate based on your current budget.`,
        });
      }
    }
  }

  return { recommendations, warnings };
}
