// aiInsightService.js
// Module 8A & FinMan Dynamic Context-Aware Financial Advisors
// Grounded strictly in verified PostgreSQL records, budgets, goals, projects, holdings, and liabilities.

const db = require('../config/database');
const aiInsightRepository = require('../repositories/aiInsightRepository');
const { buildFinancialProfile } = require('./financialProfileService');
const geminiService = require('./geminiService');

function formatCurrency(amt) {
  return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function makeStructuredDescription({ whatsHappening, whyItMatters, tryThis, contextData }) {
  return JSON.stringify({
    whatsHappening,
    whyItMatters,
    tryThis,
    contextData,
    plainText: [whatsHappening, whyItMatters, tryThis ? `Try this: ${tryThis}` : ''].filter(Boolean).join(' '),
  });
}

// =================================================================
// 1. BUDGET ADVISOR (page_context = 'BUDGET')
// =================================================================
async function buildBudgetInsights(userId, profile) {
  const { budgets, categorySpending, period, isPreliminary } = profile;
  const insights = [];

  if (budgets.items.length === 0) {
    insights.push({
      userId,
      insightType: `BUDGET_EMPTY_${period}`,
      title: 'No budget envelopes configured',
      description: makeStructuredDescription({
        contextData: '0 active budget envelopes',
        whatsHappening: 'You have not created any category budget envelopes yet.',
        whyItMatters: 'Budget envelopes keep daily spending aligned with your monthly income and prevent end-of-month deficits.',
        tryThis: `Create a budget envelope for your highest-spending category (${categorySpending[0]?.categoryName || 'Food'}).`,
      }),
      severity: 'LOW',
      pageContext: 'BUDGET',
      actionLink: '/budget',
      actionText: 'Create Budget',
      dataGrounding: `User has 0 budgets in database. Total categories: ${categorySpending.length}.`,
      expectedBenefit: 'Envelopes prevent accidental overspending by creating explicit category boundaries.',
      isPreliminary,
    });
    return insights;
  }

  for (const b of budgets.items) {
    if (b.isOverBudget) {
      const overAmt = b.actualSpent - b.budgetAmount;
      insights.push({
        userId,
        insightType: `BUDGET_OVERRUN_${b.categoryId}_${period}`,
        title: `Your ${b.categoryName} budget is exceeded by ${formatCurrency(overAmt)}`,
        description: makeStructuredDescription({
          contextData: `Spent: ${formatCurrency(b.actualSpent)} of ${formatCurrency(b.budgetAmount)} limit (${Math.round(b.utilizationPercent)}%)`,
          whatsHappening: `Spending has reached ${formatCurrency(b.actualSpent)} against a planned limit of ${formatCurrency(b.budgetAmount)}.`,
          whyItMatters: 'Overruns in this envelope draw funds away from your monthly surplus and savings goals.',
          tryThis: `Pause non-essential ${b.categoryName} spending or adjust your envelope limit to rebalance.`,
        }),
        severity: 'HIGH',
        pageContext: 'BUDGET',
        actionLink: '/budget',
        actionText: `Adjust ${b.categoryName}`,
        dataGrounding: `Envelope: ${formatCurrency(b.budgetAmount)}, Actual: ${formatCurrency(b.actualSpent)} (${period}).`,
        expectedBenefit: `Rebalancing limits keeps your monthly spending predictable.`,
        isPreliminary: false,
      });
    } else if (b.utilizationPercent >= 80) {
      const rem = b.budgetAmount - b.actualSpent;
      insights.push({
        userId,
        insightType: `BUDGET_APPROACHING_${b.categoryId}_${period}`,
        title: `${b.categoryName} spending has reached ${Math.round(b.utilizationPercent)}% of your monthly budget`,
        description: makeStructuredDescription({
          contextData: `Spent: ${formatCurrency(b.actualSpent)} of ${formatCurrency(b.budgetAmount)} | Remaining: ${formatCurrency(rem)}`,
          whatsHappening: `${b.categoryName} spending has reached ${Math.round(b.utilizationPercent)}% of your monthly budget. You have ${formatCurrency(rem)} remaining.`,
          whyItMatters: 'Pacing your remaining purchases for the month avoids exceeding your envelope ceiling.',
          tryThis: `Keep remaining ${b.categoryName} outlays under ${formatCurrency(Math.max(100, Math.round(rem / 10)))}/day for the rest of the period.`,
        }),
        severity: 'MEDIUM',
        pageContext: 'BUDGET',
        actionLink: '/budget',
        actionText: `View ${b.categoryName}`,
        dataGrounding: `Spent ${formatCurrency(b.actualSpent)} of ${formatCurrency(b.budgetAmount)} (${Math.round(b.utilizationPercent)}%).`,
        expectedBenefit: 'Daily pacing preserves remaining envelope capacity.',
        isPreliminary: false,
      });
    } else if (b.actualSpent > 0) {
      const rem = b.budgetAmount - b.actualSpent;
      insights.push({
        userId,
        insightType: `BUDGET_ON_TRACK_${b.categoryId}_${period}`,
        title: `Your ${b.categoryName} spending is within its current budget`,
        description: makeStructuredDescription({
          contextData: `Spent: ${formatCurrency(b.actualSpent)} of ${formatCurrency(b.budgetAmount)} (${Math.round(b.utilizationPercent)}%)`,
          whatsHappening: `You have utilized ${Math.round(b.utilizationPercent)}% of your planned envelope (${formatCurrency(b.actualSpent)} spent of ${formatCurrency(b.budgetAmount)}).`,
          whyItMatters: 'Staying comfortably within budget maintains your targeted monthly surplus for savings.',
          tryThis: `Continue current pacing to retain the remaining ${formatCurrency(rem)} buffer.`,
        }),
        severity: 'LOW',
        pageContext: 'BUDGET',
        actionLink: '/budget',
        actionText: 'Review Envelopes',
        dataGrounding: `Utilization: ${Math.round(b.utilizationPercent)}% (${formatCurrency(b.actualSpent)} / ${formatCurrency(b.budgetAmount)}).`,
        expectedBenefit: 'Maintains consistent positive savings flow.',
        isPreliminary: false,
      });
    }
  }

  // Suggest envelope for unbudgeted top category
  if (categorySpending.length > 0) {
    const topCat = categorySpending[0];
    const isBudgeted = budgets.items.some(
      (b) => String(b.categoryId) === String(topCat.categoryId) || b.categoryName.toLowerCase() === topCat.categoryName.toLowerCase()
    );
    if (!isBudgeted && topCat.amount >= 1000) {
      insights.push({
        userId,
        insightType: `BUDGET_UNBUDGETED_TOP_${topCat.categoryId || 'top'}_${period}`,
        title: `Set a budget envelope for ${topCat.categoryName}`,
        description: makeStructuredDescription({
          contextData: `This month: ${formatCurrency(topCat.amount)} spent with no set envelope`,
          whatsHappening: `You have spent ${formatCurrency(topCat.amount)} on ${topCat.categoryName} without an active budget envelope.`,
          whyItMatters: 'Setting a target ceiling gives you early warnings before costs accumulate.',
          tryThis: `Create a monthly envelope of ${formatCurrency(topCat.amount * 1.1)} for ${topCat.categoryName}.`,
        }),
        severity: 'LOW',
        pageContext: 'BUDGET',
        actionLink: '/budget',
        actionText: 'Set Envelope',
        dataGrounding: `Top category ${topCat.categoryName} has ${formatCurrency(topCat.amount)} spent but no budget record.`,
        expectedBenefit: 'Envelopes typically reduce impulsive spending by 10%–20%.',
        isPreliminary,
      });
    }
  }

  return insights;
}

// =================================================================
// 2. PROJECT ADVISOR (page_context = 'PROJECTS')
// =================================================================
async function buildProjectInsights(userId, profile) {
  const insights = [];
  const res = await db.query(
    `SELECT pw.project_id, pw.project_name, pw.target_budget, pw.start_date, pw.target_date, pw.status,
            COALESCE(SUM(pe.amount), 0) AS total_spent,
            COUNT(pe.project_expense_id) AS expense_count
     FROM project_workspaces pw
     LEFT JOIN project_expenses pe ON pw.project_id = pe.project_id AND pe.user_id = pw.user_id
     WHERE pw.user_id = $1
     GROUP BY pw.project_id
     ORDER BY pw.created_at DESC`,
    [userId]
  );
  const projects = res.rows;

  if (projects.length === 0) {
    insights.push({
      userId,
      insightType: 'PROJECT_EMPTY',
      title: 'No project workspaces configured',
      description: makeStructuredDescription({
        contextData: '0 active project workspaces',
        whatsHappening: 'You have not created any dedicated project workspaces yet.',
        whyItMatters: 'Project workspaces isolate expenses for specific milestones like house renovations, vacations, or major purchases from regular monthly living costs.',
        tryThis: 'Create a project workspace with a target budget to manage dedicated funds.',
      }),
      severity: 'LOW',
      pageContext: 'PROJECTS',
      actionLink: '/projects',
      actionText: 'Create Project',
      dataGrounding: 'User has 0 project_workspaces records.',
      expectedBenefit: 'Separates milestone capital expenditure from operational living expenses.',
      isPreliminary: false,
    });
    return insights;
  }

  for (const p of projects) {
    const targetBudget = Number(p.target_budget || 0);
    const spent = Number(p.total_spent || 0);
    const remaining = Math.max(0, targetBudget - spent);
    const utilization = targetBudget > 0 ? (spent / targetBudget) * 100 : 0;

    if (spent > targetBudget && targetBudget > 0) {
      const overAmt = spent - targetBudget;
      insights.push({
        userId,
        insightType: `PROJECT_OVERRUN_${p.project_id}`,
        title: `${p.project_name} has exceeded its target budget by ${formatCurrency(overAmt)}`,
        description: makeStructuredDescription({
          contextData: `Spent: ${formatCurrency(spent)} of ${formatCurrency(targetBudget)} target budget (${Math.round(utilization)}%)`,
          whatsHappening: `${p.project_name} has used ${Math.round(utilization)}% of its target budget, exceeding by ${formatCurrency(overAmt)}.`,
          whyItMatters: 'Exceeding milestone allocations can divert funds away from other savings goals or liquid reserves.',
          tryThis: `Review individual transactions in ${p.project_name} or increase the allocated workspace budget.`,
        }),
        severity: 'HIGH',
        pageContext: 'PROJECTS',
        actionLink: `/projects/${p.project_id}`,
        actionText: `Review ${p.project_name}`,
        dataGrounding: `Project "${p.project_name}": Target ${formatCurrency(targetBudget)}, Spent ${formatCurrency(spent)} across ${p.expense_count} transaction(s).`,
        expectedBenefit: 'Restoring project allocation boundaries protects general cash flow.',
        isPreliminary: false,
      });
    } else if (utilization >= 70 && targetBudget > 0) {
      insights.push({
        userId,
        insightType: `PROJECT_HIGH_UTILIZATION_${p.project_id}`,
        title: `${p.project_name} has used ${Math.round(utilization)}% of its target budget`,
        description: makeStructuredDescription({
          contextData: `Spent: ${formatCurrency(spent)} | Remaining: ${formatCurrency(remaining)} of ${formatCurrency(targetBudget)}`,
          whatsHappening: `${p.project_name} has used ${Math.round(utilization)}% of its target budget. You have ${formatCurrency(remaining)} remaining.`,
          whyItMatters: 'Approaching budget capacity requires careful pacing of remaining project milestones.',
          tryThis: `Audit upcoming vendor invoices to ensure the remaining ${formatCurrency(remaining)} covers remaining needs.`,
        }),
        severity: 'MEDIUM',
        pageContext: 'PROJECTS',
        actionLink: `/projects/${p.project_id}`,
        actionText: `Open Workspace`,
        dataGrounding: `Project "${p.project_name}": ${Math.round(utilization)}% utilized, ${formatCurrency(remaining)} balance left.`,
        expectedBenefit: 'Prevents unexpected budget shortfalls before completion.',
        isPreliminary: false,
      });
    } else if (spent > 0) {
      insights.push({
        userId,
        insightType: `PROJECT_PROGRESS_${p.project_id}`,
        title: `Your ${p.project_name} project has ${formatCurrency(remaining)} remaining`,
        description: makeStructuredDescription({
          contextData: `Spent: ${formatCurrency(spent)} of ${formatCurrency(targetBudget)} (${Math.round(utilization)}% utilized)`,
          whatsHappening: `Your ${p.project_name} project has ${formatCurrency(remaining)} remaining of its ${formatCurrency(targetBudget)} allocation.`,
          whyItMatters: 'Staying within target budget ensures your project milestones remain on financial track.',
          tryThis: `Record upcoming project invoices promptly to maintain accurate budget visibility.`,
        }),
        severity: 'LOW',
        pageContext: 'PROJECTS',
        actionLink: `/projects/${p.project_id}`,
        actionText: 'View Details',
        dataGrounding: `Project "${p.project_name}": ${p.expense_count} expenses totaling ${formatCurrency(spent)}.`,
        expectedBenefit: 'Maintains accurate milestone cost records.',
        isPreliminary: false,
      });
    } else {
      insights.push({
        userId,
        insightType: `PROJECT_INACTIVE_${p.project_id}`,
        title: `Your ${p.project_name} project has no recorded expenses this month`,
        description: makeStructuredDescription({
          contextData: `Full budget available: ${formatCurrency(targetBudget)}`,
          whatsHappening: `Your ${p.project_name} project has no recorded expenses this month with full budget of ${formatCurrency(targetBudget)} available.`,
          whyItMatters: 'Logging initial deposits and contractor advances prevents unbudgeted surprises later.',
          tryThis: 'Log any down payments or initial purchases dedicated to this project.',
        }),
        severity: 'LOW',
        pageContext: 'PROJECTS',
        actionLink: `/projects/${p.project_id}`,
        actionText: 'Log Project Expense',
        dataGrounding: `Project "${p.project_name}": 0 recorded expenses, target budget ${formatCurrency(targetBudget)}.`,
        expectedBenefit: 'Captures full lifecycle project costs.',
        isPreliminary: false,
      });
    }
  }

  return insights;
}

// =================================================================
// 3. SAVINGS ADVISOR (page_context = 'SAVINGS_GOALS')
// =================================================================
async function buildSavingsInsights(userId, profile) {
  const { goals, verifiedRecords, period } = profile;
  const insights = [];

  if (goals.items.length === 0) {
    insights.push({
      userId,
      insightType: 'SAVINGS_GOAL_EMPTY',
      title: 'No savings goals configured',
      description: makeStructuredDescription({
        contextData: '0 active savings goals',
        whatsHappening: 'You have not created any active savings goals yet.',
        whyItMatters: 'Explicit savings milestones turn monthly cash flow surplus into structured wealth and protect against impulsive spending.',
        tryThis: 'Set a goal for an emergency fund, travel, or vehicle purchase with a target date.',
      }),
      severity: 'LOW',
      pageContext: 'SAVINGS_GOALS',
      actionLink: '/savings-goals',
      actionText: 'Add Savings Goal',
      dataGrounding: 'User has 0 financial_goals records.',
      expectedBenefit: 'Users with explicit targets save on average 2.5x more consistently.',
      isPreliminary: false,
    });
    return insights;
  }

  for (const g of goals.items) {
    const target = Number(g.targetAmount || 0);
    const current = Number(g.currentAmount || 0);
    const remaining = Math.max(0, target - current);
    const pct = target > 0 ? Math.round((current / target) * 100) : 0;

    if (remaining <= 0 || current >= target) {
      insights.push({
        userId,
        insightType: `GOAL_COMPLETED_${g.goalId}`,
        title: `Your ${g.goalName} goal is fully funded!`,
        description: makeStructuredDescription({
          contextData: `Saved: ${formatCurrency(current)} of ${formatCurrency(target)} (100%)`,
          whatsHappening: `You have achieved 100% of your target, saving ${formatCurrency(current)} of ${formatCurrency(target)}.`,
          whyItMatters: 'Milestone reached! You can reallocate subsequent monthly savings to your next priority.',
          tryThis: 'Mark this goal as completed or transfer surplus allocations to your next financial milestone.',
        }),
        severity: 'LOW',
        pageContext: 'SAVINGS_GOALS',
        actionLink: '/savings-goals',
        actionText: 'View Goals',
        dataGrounding: `Goal "${g.goalName}": Saved ${formatCurrency(current)} vs target ${formatCurrency(target)}.`,
        expectedBenefit: 'Frees up monthly contribution capacity for other milestones.',
        isPreliminary: false,
      });
    } else if (g.monthsRemaining !== null && g.monthsRemaining > 0) {
      const reqMonthly = Math.ceil(remaining / g.monthsRemaining);
      const isShortfall = verifiedRecords.netCashFlow > 0 && reqMonthly > verifiedRecords.netCashFlow * 1.5;

      if (isShortfall) {
        insights.push({
          userId,
          insightType: `GOAL_CASHFLOW_SHORTFALL_${g.goalId}`,
          title: `Your ${g.goalName} goal has ${formatCurrency(remaining)} remaining`,
          description: makeStructuredDescription({
            contextData: `Target: ${formatCurrency(target)} | Saved: ${formatCurrency(current)} | Months: ${g.monthsRemaining}`,
            whatsHappening: `Your ${g.goalName} goal has ${formatCurrency(remaining)} remaining. To reach the target in ${g.monthsRemaining} month(s), you would need to contribute approximately ${formatCurrency(reqMonthly)} per month (estimate).`,
            whyItMatters: `The estimated required contribution of ${formatCurrency(reqMonthly)}/month is higher than your current recorded monthly surplus of ${formatCurrency(verifiedRecords.netCashFlow)}.`,
            tryThis: `Consider extending the target date or reallocating from non-essential spending to bridge the shortfall.`,
          }),
          severity: 'MEDIUM',
          pageContext: 'SAVINGS_GOALS',
          actionLink: '/savings-goals',
          actionText: 'Adjust Goal Date',
          dataGrounding: `Goal "${g.goalName}": Remaining ${formatCurrency(remaining)} over ${g.monthsRemaining} month(s) vs Net Cash Flow ${formatCurrency(verifiedRecords.netCashFlow)}.`,
          expectedBenefit: 'Recalibrating timeline avoids cash flow stress.',
          isPreliminary: false,
        });
      } else {
        insights.push({
          userId,
          insightType: `GOAL_REQUIRED_CONTRIBUTION_${g.goalId}`,
          title: `Your ${g.goalName} goal has ${formatCurrency(remaining)} remaining`,
          description: makeStructuredDescription({
            contextData: `Target: ${formatCurrency(target)} | Saved: ${formatCurrency(current)} | ${g.monthsRemaining} month(s) remaining`,
            whatsHappening: `Your ${g.goalName} goal has ${formatCurrency(remaining)} remaining. To reach the target in ${g.monthsRemaining} month(s), you would need to contribute approximately ${formatCurrency(reqMonthly)} per month (estimate).`,
            whyItMatters: `Consistent monthly allocations of approximately ${formatCurrency(reqMonthly)} will keep you on schedule for completion.`,
            tryThis: `Automate or schedule a monthly transfer of ${formatCurrency(reqMonthly)} toward this goal.`,
          }),
          severity: 'LOW',
          pageContext: 'SAVINGS_GOALS',
          actionLink: '/savings-goals',
          actionText: `Contribute to ${g.goalName}`,
          dataGrounding: `Goal "${g.goalName}": Remaining ${formatCurrency(remaining)} / ${g.monthsRemaining} months = ~${formatCurrency(reqMonthly)}/mo.`,
          expectedBenefit: 'Maintains steady milestone progress.',
          isPreliminary: false,
        });
      }
    } else if (g.targetDate && (g.monthsRemaining === null || g.monthsRemaining <= 0)) {
      insights.push({
        userId,
        insightType: `GOAL_OVERDUE_${g.goalId}`,
        title: `Target date for ${g.goalName} has passed with ${formatCurrency(remaining)} remaining`,
        description: makeStructuredDescription({
          contextData: `Saved: ${formatCurrency(current)} of ${formatCurrency(target)} (${pct}%)`,
          whatsHappening: `Recorded savings stand at ${formatCurrency(current)} of ${formatCurrency(target)} (${pct}% completed). Target date has passed.`,
          whyItMatters: 'Updating the timeline helps recalibrate realistic monthly contribution targets.',
          tryThis: 'Set a renewed target date to recalculate the required monthly contribution pace.',
        }),
        severity: 'MEDIUM',
        pageContext: 'SAVINGS_GOALS',
        actionLink: '/savings-goals',
        actionText: 'Update Target Date',
        dataGrounding: `Goal "${g.goalName}": Past target date with ${formatCurrency(remaining)} remaining.`,
        expectedBenefit: 'Restores actionable pacing calculation.',
        isPreliminary: false,
      });
    } else {
      insights.push({
        userId,
        insightType: `GOAL_NO_DATE_${g.goalId}`,
        title: `Your ${g.goalName} goal has ${formatCurrency(remaining)} remaining (${pct}% saved)`,
        description: makeStructuredDescription({
          contextData: `Saved: ${formatCurrency(current)} of ${formatCurrency(target)}`,
          whatsHappening: `You have accumulated ${formatCurrency(current)} of ${formatCurrency(target)} with no deadline set.`,
          whyItMatters: 'Setting a target date enables FinMan to calculate precise monthly contribution estimates.',
          tryThis: 'Add a target completion date to estimate required monthly contributions.',
        }),
        severity: 'LOW',
        pageContext: 'SAVINGS_GOALS',
        actionLink: '/savings-goals',
        actionText: 'Set Target Date',
        dataGrounding: `Goal "${g.goalName}": No target_date specified.`,
        expectedBenefit: 'Enables deterministic monthly pacing.',
        isPreliminary: false,
      });
    }
  }

  return insights;
}

// =================================================================
// 4. INVESTMENT ADVISOR (page_context = 'INVESTMENTS')
// =================================================================
async function buildInvestmentInsights(userId, profile) {
  const insights = [];
  const res = await db.query(
    `SELECT holding_id, holding_type, name, quantity, current_value, purchase_value, purchase_date
     FROM financial_holdings
     WHERE user_id = $1
     ORDER BY purchase_date DESC NULLS LAST, holding_id DESC`,
    [userId]
  );
  const holdings = res.rows;

  if (holdings.length === 0) {
    insights.push({
      userId,
      insightType: 'INVESTMENT_EMPTY',
      title: 'No investment holdings recorded',
      description: makeStructuredDescription({
        contextData: '0 recorded holdings',
        whatsHappening: 'You have not logged any investment assets or portfolios yet.',
        whyItMatters: 'Recording your mutual funds, equities, fixed deposits, and gold provides accurate portfolio allocation and net worth calculation.',
        tryThis: 'Record your existing investment holdings with their purchase and current values.',
      }),
      severity: 'LOW',
      pageContext: 'INVESTMENTS',
      actionLink: '/investments',
      actionText: 'Add Investment',
      dataGrounding: 'User has 0 financial_holdings records.',
      expectedBenefit: 'Enables portfolio diversification and asset class distribution tracking.',
      isPreliminary: false,
    });
    return insights;
  }

  const totalVal = holdings.reduce(
    (acc, h) => acc + Number(h.current_value !== null ? h.current_value : (h.purchase_value || 0)),
    0
  );

  // Missing valuations check
  const unvalued = holdings.filter(
    (h) => h.current_value === null || Number(h.current_value) === 0
  );
  if (unvalued.length > 0) {
    insights.push({
      userId,
      insightType: 'INVESTMENT_MISSING_VALUATION',
      title: `${unvalued.length} of your recorded investments do not have current valuations`,
      description: makeStructuredDescription({
        contextData: `${unvalued.length} unvalued asset(s) out of ${holdings.length} total`,
        whatsHappening: `${unvalued.length} of your recorded investments do not have current valuations.`,
        whyItMatters: 'Up-to-date valuations ensure your net worth and portfolio risk analysis remain accurate.',
        tryThis: 'Update current market valuations for your recorded holdings to keep your portfolio analysis accurate.',
      }),
      severity: 'LOW',
      pageContext: 'INVESTMENTS',
      actionLink: '/investments',
      actionText: 'Update Valuations',
      dataGrounding: `${unvalued.length} holding(s) with null or 0 current_value.`,
      expectedBenefit: 'Accurate portfolio valuation eliminates stale net-worth assumptions.',
      isPreliminary: false,
    });
  }

  // Asset concentration check
  const typeMap = {};
  for (const h of holdings) {
    const t = h.holding_type || 'Other';
    typeMap[t] = (typeMap[t] || 0) + Number(h.current_value !== null ? h.current_value : (h.purchase_value || 0));
  }

  let topType = null;
  let topVal = 0;
  for (const [t, val] of Object.entries(typeMap)) {
    if (val > topVal) {
      topVal = val;
      topType = t;
    }
  }

  const topPct = totalVal > 0 ? (topVal / totalVal) * 100 : 0;
  if (topPct >= 60 && holdings.length >= 2) {
    insights.push({
      userId,
      insightType: `INVESTMENT_CONCENTRATION_${topType}`,
      title: `Most of your recorded portfolio value is concentrated in one asset class`,
      description: makeStructuredDescription({
        contextData: `${topType}: ${formatCurrency(topVal)} (${Math.round(topPct)}% of ${formatCurrency(totalVal)})`,
        whatsHappening: `Most of your recorded portfolio value is concentrated in ${topType} (${Math.round(topPct)}%).`,
        whyItMatters: 'High concentration in a single asset class increases exposure to asset-specific market volatility.',
        tryThis: 'Consider reviewing your diversification across other asset classes like index funds, debt, or gold.',
      }),
      severity: 'LOW',
      pageContext: 'INVESTMENTS',
      actionLink: '/investments',
      actionText: 'Review Holdings',
      dataGrounding: `${topType} represents ${Math.round(topPct)}% (${formatCurrency(topVal)}) of portfolio.`,
      expectedBenefit: 'Diversification moderates portfolio volatility.',
      isPreliminary: false,
    });
  }

  // Portfolio overview
  insights.push({
    userId,
    insightType: 'INVESTMENT_PORTFOLIO_SUMMARY',
    title: `Recorded portfolio value: ${formatCurrency(totalVal)} across ${holdings.length} asset(s)`,
    description: makeStructuredDescription({
      contextData: `Holdings: ${holdings.length} | Asset classes: ${Object.keys(typeMap).length}`,
      whatsHappening: `Your recorded portfolio value stands at ${formatCurrency(totalVal)} across ${holdings.length} holding(s) and ${Object.keys(typeMap).length} asset class(es). Analysis uses recorded values.`,
      whyItMatters: 'Tracking asset allocation over time maintains balanced exposure between equity, debt, and liquid instruments.',
      tryThis: 'Record new SIP additions or valuation changes to keep allocation metrics up to date.',
    }),
    severity: 'LOW',
    pageContext: 'INVESTMENTS',
    actionLink: '/investments',
    actionText: 'View Portfolio',
    dataGrounding: `Verified holdings total ${formatCurrency(totalVal)} across ${holdings.length} asset(s).`,
    expectedBenefit: 'Provides verified record grounding without fabricated live market return figures.',
    isPreliminary: false,
  });

  return insights;
}

// =================================================================
// 5. REPORTS ADVISOR (page_context = 'REPORTS')
// =================================================================
async function buildReportsInsights(userId, profile) {
  const { verifiedRecords, categorySpending, period } = profile;
  const insights = [];

  const income = verifiedRecords.currentMonthIncome;
  const expenses = verifiedRecords.currentMonthExpenses;
  const netCashFlow = verifiedRecords.netCashFlow;

  if (income === 0 && expenses === 0) {
    insights.push({
      userId,
      insightType: `REPORT_EMPTY_${period}`,
      title: `No transactions recorded for ${period}`,
      description: makeStructuredDescription({
        contextData: `Period: ${period} | 0 income | 0 expenses`,
        whatsHappening: `No income, regular expenses, or project transactions have been logged for ${period}.`,
        whyItMatters: 'Financial reports require recorded activity to compute cash flow and category breakdowns.',
        tryThis: 'Record income or expenses for this period to view detailed reports.',
      }),
      severity: 'LOW',
      pageContext: 'REPORTS',
      actionLink: '/expenses',
      actionText: 'Record Purchases',
      dataGrounding: `0 income and 0 expense transactions recorded for period ${period}.`,
      expectedBenefit: 'Logging transactions enables reporting metrics.',
      isPreliminary: true,
    });
    return insights;
  }

  // Cash flow status
  if (netCashFlow >= 0) {
    insights.push({
      userId,
      insightType: `REPORT_CASHFLOW_SURPLUS_${period}`,
      title: `Positive period net cash flow: ${formatCurrency(netCashFlow)}`,
      description: makeStructuredDescription({
        contextData: `Income: ${formatCurrency(income)} | Expenses: ${formatCurrency(expenses)} | Savings rate: ${verifiedRecords.actualSavingsRate}%`,
        whatsHappening: `Recorded income of ${formatCurrency(income)} exceeded total outlays of ${formatCurrency(expenses)} by ${formatCurrency(netCashFlow)}.`,
        whyItMatters: 'Retained period cash flow strengthens your liquid reserves and overall net worth.',
        tryThis: 'Direct retained surplus toward high-priority savings goals or debt reduction.',
      }),
      severity: 'LOW',
      pageContext: 'REPORTS',
      actionLink: '/reports',
      actionText: 'View Report Breakdown',
      dataGrounding: `Period ${period}: Income ${formatCurrency(income)} - Expenses ${formatCurrency(expenses)} = Surplus ${formatCurrency(netCashFlow)}.`,
      expectedBenefit: 'Allocating surplus prevents discretionary leakage.',
      isPreliminary: false,
    });
  } else {
    insights.push({
      userId,
      insightType: `REPORT_CASHFLOW_DEFICIT_${period}`,
      title: `Period expenses exceed income by ${formatCurrency(verifiedRecords.deficitAmount)}`,
      description: makeStructuredDescription({
        contextData: `Expenses: ${formatCurrency(expenses)} vs Income: ${formatCurrency(income)}`,
        whatsHappening: `Your recorded expenses increased compared with your recorded income, creating a ${formatCurrency(verifiedRecords.deficitAmount)} gap.`,
        whyItMatters: 'Negative cash flow reduces liquid reserves if continued across multiple reporting periods.',
        tryThis: 'Review category spending in Reports to identify non-essential outlays.',
      }),
      severity: 'MEDIUM',
      pageContext: 'REPORTS',
      actionLink: '/reports',
      actionText: 'Inspect Categories',
      dataGrounding: `Period ${period}: Expenses ${formatCurrency(expenses)} exceed income ${formatCurrency(income)}.`,
      expectedBenefit: 'Identifies cash flow leakage points.',
      isPreliminary: false,
    });
  }

  // Largest spending category
  if (categorySpending.length > 0) {
    const topCat = categorySpending[0];
    insights.push({
      userId,
      insightType: `REPORT_TOP_CATEGORY_${period}`,
      title: `${topCat.categoryName} was your largest recorded spending category`,
      description: makeStructuredDescription({
        contextData: `${topCat.categoryName}: ${formatCurrency(topCat.amount)} (${topCat.percentage}% of period spending)`,
        whatsHappening: `${topCat.categoryName} was your largest recorded spending category at ${formatCurrency(topCat.amount)} (${topCat.percentage}% of outlays).`,
        whyItMatters: 'Managing your single largest spending category produces the highest impact on net savings.',
        tryThis: `Set a budget envelope for ${topCat.categoryName} to moderate future period outlays.`,
      }),
      severity: 'LOW',
      pageContext: 'REPORTS',
      actionLink: '/budget',
      actionText: 'Set Budget',
      dataGrounding: `Top category: ${topCat.categoryName} at ${formatCurrency(topCat.amount)} (${topCat.percentage}%).`,
      expectedBenefit: 'Focusing on top outlays frees up meaningful savings capacity.',
      isPreliminary: false,
    });
  }

  // Month-over-Month comparison
  if (verifiedRecords.priorMonthExpenses > 0) {
    const diff = verifiedRecords.currentMonthExpenses - verifiedRecords.priorMonthExpenses;
    const pct = Math.round((diff / verifiedRecords.priorMonthExpenses) * 100);

    if (diff > 0 && pct >= 5) {
      insights.push({
        userId,
        insightType: `REPORT_MOM_INCREASE_${period}`,
        title: `Your recorded expenses increased compared with the previous month`,
        description: makeStructuredDescription({
          contextData: `Current: ${formatCurrency(verifiedRecords.currentMonthExpenses)} vs Prior: ${formatCurrency(verifiedRecords.priorMonthExpenses)} (+${pct}%)`,
          whatsHappening: `Recorded expenses increased by ${pct}% (+${formatCurrency(diff)}) compared with the previous month.`,
          whyItMatters: 'Identifying what drove the spending increase helps maintain steady cash flow.',
          tryThis: 'Review the category comparison chart in Reports to pinpoint which categories grew.',
        }),
        severity: 'LOW',
        pageContext: 'REPORTS',
        actionLink: '/reports',
        actionText: 'Compare Categories',
        dataGrounding: `Prior month outlays: ${formatCurrency(verifiedRecords.priorMonthExpenses)} vs current ${formatCurrency(verifiedRecords.currentMonthExpenses)}.`,
        expectedBenefit: 'Pinpoints specific category increases.',
        isPreliminary: false,
      });
    } else if (diff < 0 && Math.abs(pct) >= 5) {
      insights.push({
        userId,
        insightType: `REPORT_MOM_DECREASE_${period}`,
        title: `Your recorded expenses decreased compared with the previous month`,
        description: makeStructuredDescription({
          contextData: `Current: ${formatCurrency(verifiedRecords.currentMonthExpenses)} vs Prior: ${formatCurrency(verifiedRecords.priorMonthExpenses)} (-${Math.abs(pct)}%)`,
          whatsHappening: `Recorded expenses decreased by ${Math.abs(pct)}% (-${formatCurrency(Math.abs(diff))}) compared with the previous month.`,
          whyItMatters: 'Disciplined spending directly boosts your retained period surplus.',
          tryThis: 'Maintain these spending habits to accelerate goal completion.',
        }),
        severity: 'LOW',
        pageContext: 'REPORTS',
        actionLink: '/reports',
        actionText: 'View Trends',
        dataGrounding: `Prior month outlays: ${formatCurrency(verifiedRecords.priorMonthExpenses)} vs current ${formatCurrency(verifiedRecords.currentMonthExpenses)}.`,
        expectedBenefit: 'Reinforces positive spending restraint.',
        isPreliminary: false,
      });
    }
  }

  // Net worth balance sheet position
  insights.push({
    userId,
    insightType: `REPORT_NET_WORTH_${period}`,
    title: `Recorded net worth stands at ${formatCurrency(verifiedRecords.netWorth)}`,
    description: makeStructuredDescription({
      contextData: `Assets: ${formatCurrency(verifiedRecords.totalAssets)} - Liabilities: ${formatCurrency(verifiedRecords.totalLiabilities)} = ${formatCurrency(verifiedRecords.netWorth)}`,
      whatsHappening: `Calculated from ${formatCurrency(verifiedRecords.totalAssets)} in recorded assets minus ${formatCurrency(verifiedRecords.totalLiabilities)} in recorded liabilities.`,
      whyItMatters: 'Net worth provides the most comprehensive measure of long-term financial health.',
      tryThis: 'Continue growing assets and paying down liabilities to build net worth.',
    }),
    severity: 'LOW',
    pageContext: 'REPORTS',
    actionLink: '/reports',
    actionText: 'View Balance Sheet',
    dataGrounding: `Assets: ${formatCurrency(verifiedRecords.totalAssets)}, Liabilities: ${formatCurrency(verifiedRecords.totalLiabilities)}, Net Worth: ${formatCurrency(verifiedRecords.netWorth)}.`,
    expectedBenefit: 'Tracks overall balance sheet trajectory.',
    isPreliminary: false,
  });

  return insights;
}

// =================================================================
// 6. EXPENSE ADVISOR (page_context = 'EXPENSES')
// =================================================================
async function buildExpenseInsights(userId, profile) {
  const { categorySpending, verifiedRecords, period } = profile;
  const insights = [];

  if (categorySpending.length === 0) {
    insights.push({
      userId,
      insightType: `EXPENSE_EMPTY_${period}`,
      title: 'No expenses recorded for this month',
      description: makeStructuredDescription({
        contextData: '0 recorded expenses this month',
        whatsHappening: `0 expense transactions have been logged so far in ${period}.`,
        whyItMatters: 'Logging everyday purchases enables category analysis and budget warnings.',
        tryThis: 'Use the Quick Add button or voice assistant to record your recent purchases.',
      }),
      severity: 'LOW',
      pageContext: 'EXPENSES',
      actionLink: '/expenses',
      actionText: 'Log Expense',
      dataGrounding: '0 expense records in current month.',
      expectedBenefit: 'Enables spending pattern analytics.',
      isPreliminary: true,
    });
    return insights;
  }

  // Top Category
  const topCat = categorySpending[0];
  insights.push({
    userId,
    insightType: `EXPENSE_TOP_CAT_${topCat.categoryId || 'top'}_${period}`,
    title: `${topCat.categoryName} is your highest spending category`,
    description: makeStructuredDescription({
      contextData: `${topCat.categoryName}: ${formatCurrency(topCat.amount)} (${topCat.percentage}% of total expenses)`,
      whatsHappening: `You have spent ${formatCurrency(topCat.amount)} on ${topCat.categoryName} (${topCat.percentage}% of total expenses).`,
      whyItMatters: 'Managing your single highest outlay category has the greatest impact on monthly savings.',
      tryThis: `Review upcoming ${topCat.categoryName} purchases or create an envelope limit.`,
    }),
    severity: 'LOW',
    pageContext: 'EXPENSES',
    actionLink: '/budget',
    actionText: `Budget ${topCat.categoryName}`,
    dataGrounding: `${topCat.categoryName} accounts for ${formatCurrency(topCat.amount)} (${topCat.percentage}%).`,
    expectedBenefit: 'Targeting top category yields largest financial relief.',
    isPreliminary: false,
  });

  // Micro-spending accumulation
  const microRes = await db.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE user_id = $1 AND amount <= 250
       AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
    [userId]
  );
  const microCount = Number(microRes.rows[0]?.count || 0);
  const microSum = Number(microRes.rows[0]?.total || 0);

  if (microCount >= 5 && microSum >= 800) {
    insights.push({
      userId,
      insightType: `EXPENSE_MICRO_SPENDING_${period}`,
      title: 'Notice small daily purchases under ₹250',
      description: makeStructuredDescription({
        contextData: `${microCount} purchases under ₹250 totaling ${formatCurrency(microSum)}`,
        whatsHappening: `You have logged ${microCount} transactions under ₹250 totaling ${formatCurrency(microSum)} this month.`,
        whyItMatters: 'Small repeated purchases often accumulate without noticeable friction.',
        tryThis: `Track and bundle small everyday purchases to free up ~${formatCurrency(microSum * 0.4)} for savings.`,
      }),
      severity: 'LOW',
      pageContext: 'EXPENSES',
      actionLink: '/expenses',
      actionText: 'Review Purchases',
      dataGrounding: `${microCount} transactions under ₹250 totaling ${formatCurrency(microSum)} in ${period}.`,
      expectedBenefit: 'Trimming small daily leaks recovers meaningful cash flow.',
      isPreliminary: false,
    });
  }

  // Largest single purchase
  const maxRes = await db.query(
    `SELECT e.expense_id, e.description, e.merchant_name, e.amount, e.expense_date, COALESCE(c.name, 'Expense') AS category_name
     FROM expenses e
     LEFT JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1
       AND EXTRACT(MONTH FROM e.expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM e.expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
     ORDER BY e.amount DESC
     LIMIT 1`,
    [userId]
  );
  if (maxRes.rows.length > 0 && Number(maxRes.rows[0].amount) >= 2000) {
    const maxExp = maxRes.rows[0];
    const expPct = Math.round((Number(maxExp.amount) / Math.max(1, verifiedRecords.currentMonthExpenses)) * 100);
    const label = maxExp.description || maxExp.merchant_name || maxExp.category_name;
    insights.push({
      userId,
      insightType: `EXPENSE_LARGEST_PURCHASE_${period}`,
      title: `Largest single purchase: ${formatCurrency(maxExp.amount)} for ${label}`,
      description: makeStructuredDescription({
        contextData: `Single transaction: ${formatCurrency(maxExp.amount)} (${expPct}% of month's spending)`,
        whatsHappening: `Your single largest purchase this month was ${formatCurrency(maxExp.amount)} for ${label}.`,
        whyItMatters: 'Large one-off transactions create immediate cash flow pressure.',
        tryThis: 'Plan and buffer in advance for large one-off expenses.',
      }),
      severity: 'LOW',
      pageContext: 'EXPENSES',
      actionLink: '/expenses',
      actionText: 'View Purchases',
      dataGrounding: `Expense ID ${maxExp.expense_id}: ${formatCurrency(maxExp.amount)} on ${new Date(maxExp.expense_date).toLocaleDateString('en-IN')}.`,
      expectedBenefit: 'Pre-planning large outlays prevents cash flow disruption.',
      isPreliminary: false,
    });
  }

  return insights;
}

// =================================================================
// 7. INCOME ADVISOR (page_context = 'INCOME')
// =================================================================
async function buildIncomeInsights(userId, profile) {
  const { verifiedRecords, onboarding, period } = profile;
  const insights = [];

  const incRes = await db.query(
    `SELECT income_id, source, amount, income_date, description
     FROM incomes
     WHERE user_id = $1
       AND EXTRACT(MONTH FROM income_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM income_date) = EXTRACT(YEAR FROM CURRENT_DATE)
     ORDER BY income_date DESC`,
    [userId]
  );
  const incomeList = incRes.rows;
  const totalRecordedIncome = incomeList.reduce((acc, i) => acc + Number(i.amount || 0), 0);

  if (incomeList.length === 0) {
    insights.push({
      userId,
      insightType: `INCOME_EMPTY_${period}`,
      title: `No income recorded for ${period}`,
      description: makeStructuredDescription({
        contextData: '0 income transactions recorded this month',
        whatsHappening: `You have not recorded any income transactions yet for this month.`,
        whyItMatters: 'Accurate income records are essential to calculate your savings rate and financial health score.',
        tryThis: 'Log your salary, freelance payments, or investment dividends for this month.',
      }),
      severity: 'LOW',
      pageContext: 'INCOME',
      actionLink: '/income',
      actionText: 'Log Income',
      dataGrounding: '0 income transactions recorded in current month.',
      expectedBenefit: 'Enables verified savings rate calculation.',
      isPreliminary: true,
    });
    return insights;
  }

  // Onboarding vs Recorded income comparison
  if (onboarding.monthlyIncome > 0) {
    const diff = Math.abs(totalRecordedIncome - onboarding.monthlyIncome);
    const diffPct = Math.round((diff / onboarding.monthlyIncome) * 100);
    if (diffPct >= 20) {
      insights.push({
        userId,
        insightType: `INCOME_ESTIMATE_COMPARISON_${period}`,
        title: `Recorded income (${formatCurrency(totalRecordedIncome)}) vs onboarding estimate (${formatCurrency(onboarding.monthlyIncome)})`,
        description: makeStructuredDescription({
          contextData: `Recorded: ${formatCurrency(totalRecordedIncome)} | Onboarding stated: ${formatCurrency(onboarding.monthlyIncome)}`,
          whatsHappening: `Your recorded income this month differs by ${diffPct}% from your stated onboarding estimate.`,
          whyItMatters: 'Both values serve different purposes: onboarding provides baseline targets, while verified records power actual health scores.',
          tryThis: 'Log any pending paychecks or update your onboarding income estimate if your earnings changed.',
        }),
        severity: 'LOW',
        pageContext: 'INCOME',
        actionLink: '/income',
        actionText: 'Update Income',
        dataGrounding: `Stated: ${formatCurrency(onboarding.monthlyIncome)} vs Recorded: ${formatCurrency(totalRecordedIncome)} (${diffPct}% delta).`,
        expectedBenefit: 'Maintains calibration between expectations and actual records.',
        isPreliminary: false,
      });
    }
  }

  // Single source concentration
  const sourceMap = {};
  for (const i of incomeList) {
    const s = i.source || 'Other';
    sourceMap[s] = (sourceMap[s] || 0) + Number(i.amount || 0);
  }
  const sources = Object.keys(sourceMap);
  if (sources.length === 1 && totalRecordedIncome > 0) {
    const topSource = sources[0];
    insights.push({
      userId,
      insightType: `INCOME_SOURCE_CONCENTRATION_${period}`,
      title: `100% of recorded income is from ${topSource}`,
      description: makeStructuredDescription({
        contextData: `Source: ${topSource} (${formatCurrency(totalRecordedIncome)})`,
        whatsHappening: `All ${formatCurrency(totalRecordedIncome)} in recorded earnings for this month came from a single source (${topSource}).`,
        whyItMatters: 'Diversifying income with secondary streams or dividend investments enhances financial resilience.',
        tryThis: 'Explore options for secondary revenue streams or yield-generating investments.',
      }),
      severity: 'LOW',
      pageContext: 'INCOME',
      actionLink: '/income',
      actionText: 'Explore Sources',
      dataGrounding: `100% of ${formatCurrency(totalRecordedIncome)} from "${topSource}".`,
      expectedBenefit: 'Encourages cash flow resilience.',
      isPreliminary: false,
    });
  }

  // Total recorded income
  insights.push({
    userId,
    insightType: `INCOME_TOTAL_LOGGED_${period}`,
    title: `Recorded monthly income: ${formatCurrency(totalRecordedIncome)} across ${incomeList.length} transaction(s)`,
    description: makeStructuredDescription({
      contextData: `Total: ${formatCurrency(totalRecordedIncome)} | Transactions: ${incomeList.length}`,
      whatsHappening: `Your recorded earnings this month support a current savings capacity of ${formatCurrency(Math.max(0, totalRecordedIncome - verifiedRecords.currentMonthExpenses))}.`,
      whyItMatters: 'Regular income logging keeps your financial baseline calibrated.',
      tryThis: 'Keep recording all earnings as they arrive to maintain accurate cash flow tracking.',
    }),
    severity: 'LOW',
    pageContext: 'INCOME',
    actionLink: '/income',
    actionText: 'View Income',
    dataGrounding: `${incomeList.length} income entries totaling ${formatCurrency(totalRecordedIncome)}.`,
    expectedBenefit: 'Grounds financial advice in verified earnings.',
    isPreliminary: false,
  });

  return insights;
}

// =================================================================
// 8. FINANCIAL HEALTH ADVISOR (page_context = 'FINANCIAL_HEALTH')
// =================================================================
async function buildHealthInsights(userId, profile) {
  const { verifiedRecords, period } = profile;
  const insights = [];

  const runway = verifiedRecords.emergencyFundRunwayMonths;
  if (runway < 3) {
    insights.push({
      userId,
      insightType: `HEALTH_EMERGENCY_RUNWAY_${period}`,
      title: `Emergency savings cover ${runway} month(s) of expenses`,
      description: makeStructuredDescription({
        contextData: `Liquid reserves: ${formatCurrency(verifiedRecords.liquidAssets)} | Monthly burn: ${formatCurrency(verifiedRecords.currentMonthExpenses || 25000)}`,
        whatsHappening: `Your liquid reserves of ${formatCurrency(verifiedRecords.liquidAssets)} cover approximately ${runway} month(s) of basic living costs.`,
        whyItMatters: 'Financial advisors recommend 3 to 6 months of expenses set aside in liquid accounts for safety.',
        tryThis: `Aim to accumulate ${formatCurrency(Math.round((3 - runway) * (verifiedRecords.currentMonthExpenses || 25000)))} into your liquid emergency reserve.`,
      }),
      severity: 'MEDIUM',
      pageContext: 'FINANCIAL_HEALTH',
      actionLink: '/savings-goals',
      actionText: 'Build Emergency Fund',
      dataGrounding: `Liquid assets: ${formatCurrency(verifiedRecords.liquidAssets)} vs Monthly burn: ${formatCurrency(verifiedRecords.currentMonthExpenses || 25000)}.`,
      expectedBenefit: 'Provides protection against unforeseen life events.',
      isPreliminary: false,
    });
  } else {
    insights.push({
      userId,
      insightType: `HEALTH_EMERGENCY_HEALTHY_${period}`,
      title: `Healthy emergency liquidity: ${runway} months covered`,
      description: makeStructuredDescription({
        contextData: `Liquid reserves: ${formatCurrency(verifiedRecords.liquidAssets)} | ${runway} months buffer`,
        whatsHappening: `Your liquid reserves of ${formatCurrency(verifiedRecords.liquidAssets)} provide a strong safety net exceeding the 3-month baseline.`,
        whyItMatters: 'Ample emergency savings protects your long-term investments from untimely withdrawals.',
        tryThis: 'Maintain this buffer while channeling additional surplus into higher-yield assets.',
      }),
      severity: 'LOW',
      pageContext: 'FINANCIAL_HEALTH',
      actionLink: '/investments',
      actionText: 'Explore Investments',
      dataGrounding: `Liquid assets: ${formatCurrency(verifiedRecords.liquidAssets)} covers ${runway} months.`,
      expectedBenefit: 'Preserves long-term capital compounding.',
      isPreliminary: false,
    });
  }

  // Savings rate
  if (verifiedRecords.isDeficit) {
    insights.push({
      userId,
      insightType: `HEALTH_DEFICIT_${period}`,
      title: `Expenses exceed income by ${formatCurrency(verifiedRecords.deficitAmount)} this month`,
      description: makeStructuredDescription({
        contextData: `Spent: ${formatCurrency(verifiedRecords.currentMonthExpenses)} vs Income: ${formatCurrency(verifiedRecords.currentMonthIncome)}`,
        whatsHappening: `Recorded spending (${formatCurrency(verifiedRecords.currentMonthExpenses)}) is higher than recorded income (${formatCurrency(verifiedRecords.currentMonthIncome)}).`,
        whyItMatters: 'Pacing your spending or logging any unrecorded income restores positive monthly savings.',
        tryThis: 'Review your outlays or log any unrecorded income to balance this month.',
      }),
      severity: 'MEDIUM',
      pageContext: 'FINANCIAL_HEALTH',
      actionLink: '/expenses',
      actionText: 'Review Expenses',
      dataGrounding: `Deficit: ${formatCurrency(verifiedRecords.deficitAmount)} on Income of ${formatCurrency(verifiedRecords.currentMonthIncome)}.`,
      expectedBenefit: 'Prevents liquid savings erosion.',
      isPreliminary: false,
    });
  } else {
    insights.push({
      userId,
      insightType: `HEALTH_SAVINGS_RATE_${period}`,
      title: `Actual savings rate: ${verifiedRecords.actualSavingsRate}% this month`,
      description: makeStructuredDescription({
        contextData: `Saved: ${formatCurrency(verifiedRecords.surplusAmount)} of ${formatCurrency(verifiedRecords.currentMonthIncome)}`,
        whatsHappening: `You have retained ${formatCurrency(verifiedRecords.surplusAmount)} of your recorded income (${verifiedRecords.actualSavingsRate}% savings rate).`,
        whyItMatters: 'A consistent positive savings rate builds long-term wealth.',
        tryThis: 'Deploy surplus into active savings goals or investment holdings.',
      }),
      severity: 'LOW',
      pageContext: 'FINANCIAL_HEALTH',
      actionLink: '/savings-goals',
      actionText: 'Allocate Surplus',
      dataGrounding: `Surplus: ${formatCurrency(verifiedRecords.surplusAmount)} (${verifiedRecords.actualSavingsRate}% rate).`,
      expectedBenefit: 'Accelerates goal milestone achievement.',
      isPreliminary: false,
    });
  }

  // Debt position
  if (verifiedRecords.totalLiabilities > 0) {
    insights.push({
      userId,
      insightType: `HEALTH_DEBT_BURDEN_${period}`,
      title: `Total recorded debt is ${formatCurrency(verifiedRecords.totalLiabilities)}`,
      description: makeStructuredDescription({
        contextData: `Liabilities: ${formatCurrency(verifiedRecords.totalLiabilities)} vs Assets: ${formatCurrency(verifiedRecords.totalAssets)}`,
        whatsHappening: `Outstanding liabilities account for ${Math.round((verifiedRecords.totalLiabilities / Math.max(1, verifiedRecords.totalAssets)) * 100)}% of your asset base.`,
        whyItMatters: 'Lowering high-interest debt improves your net worth and cash flow agility.',
        tryThis: 'Prioritize extra payments to your highest-interest liabilities.',
      }),
      severity: 'LOW',
      pageContext: 'FINANCIAL_HEALTH',
      actionLink: '/reports',
      actionText: 'View Liabilities',
      dataGrounding: `Total debt: ${formatCurrency(verifiedRecords.totalLiabilities)} across recorded liabilities.`,
      expectedBenefit: 'Reduces interest burden.',
      isPreliminary: false,
    });
  } else {
    insights.push({
      userId,
      insightType: `HEALTH_ZERO_DEBT_${period}`,
      title: 'Zero debt burden',
      description: makeStructuredDescription({
        contextData: '0 recorded loans or liabilities',
        whatsHappening: 'You have no recorded loans or liabilities against your income.',
        whyItMatters: 'Freedom from EMI commitments maximizes your discretionary savings potential.',
        tryThis: 'Leverage this advantage to aggressively grow your asset portfolio.',
      }),
      severity: 'LOW',
      pageContext: 'FINANCIAL_HEALTH',
      actionLink: '/investments',
      actionText: 'Grow Assets',
      dataGrounding: 'User has 0 recorded liabilities.',
      expectedBenefit: 'Maximizes surplus investing capacity.',
      isPreliminary: false,
    });
  }

  return insights;
}

// =================================================================
// 9. LIABILITY ADVISOR (page_context = 'ASSETS_LIABILITIES')
// =================================================================
async function buildLiabilityInsights(userId, profile) {
  const { verifiedRecords } = profile;
  const insights = [];

  const res = await db.query(
    `SELECT liability_id, liability_type, name, total_amount, remaining_amount, interest_rate, due_date
     FROM liabilities
     WHERE user_id = $1
     ORDER BY due_date ASC NULLS LAST, liability_id DESC`,
    [userId]
  );
  const liabilities = res.rows;

  if (liabilities.length === 0) {
    insights.push({
      userId,
      insightType: 'LIABILITY_ZERO',
      title: 'Zero recorded liabilities',
      description: makeStructuredDescription({
        contextData: '0 recorded debts or loans',
        whatsHappening: 'You have no active loans, credit debt, or liabilities recorded in FinMan.',
        whyItMatters: 'Operating without debt interest preserves 100% of your net cash flow for wealth accumulation.',
        tryThis: 'Continue maintaining a debt-free profile while investing your monthly surplus.',
      }),
      severity: 'LOW',
      pageContext: 'ASSETS_LIABILITIES',
      actionLink: '/investments',
      actionText: 'Invest Surplus',
      dataGrounding: 'User has 0 liabilities records in database.',
      expectedBenefit: 'Preserves full cash flow for wealth building.',
      isPreliminary: false,
    });
    return insights;
  }

  const totalDebt = liabilities.reduce((acc, l) => acc + Number(l.remaining_amount || 0), 0);

  // High interest liability check
  const highL = liabilities.find((l) => Number(l.interest_rate || 0) >= 10);
  if (highL) {
    insights.push({
      userId,
      insightType: `LIABILITY_HIGH_INTEREST_${highL.liability_id}`,
      title: `High interest rate on ${highL.name} (${highL.interest_rate}%)`,
      description: makeStructuredDescription({
        contextData: `${highL.name}: ${formatCurrency(highL.remaining_amount)} @ ${highL.interest_rate}% interest`,
        whatsHappening: `${highL.name} carries an interest rate of ${highL.interest_rate}% on a remaining balance of ${formatCurrency(highL.remaining_amount)}.`,
        whyItMatters: 'High-interest debt compounds quickly, diverting funds from productive savings.',
        tryThis: 'Consider applying the avalanche method: prioritize extra principal payments toward this account first.',
      }),
      severity: 'HIGH',
      pageContext: 'ASSETS_LIABILITIES',
      actionLink: '/reports',
      actionText: 'Inspect Debt',
      dataGrounding: `Liability ${highL.name}: ${highL.interest_rate}% interest on ${formatCurrency(highL.remaining_amount)}.`,
      expectedBenefit: 'Accelerates interest elimination.',
      isPreliminary: false,
    });
  }

  // Upcoming due date
  const dueL = liabilities.find((l) => l.due_date);
  if (dueL) {
    insights.push({
      userId,
      insightType: `LIABILITY_UPCOMING_DUE_${dueL.liability_id}`,
      title: `Upcoming due date for ${dueL.name}`,
      description: makeStructuredDescription({
        contextData: `Due on ${new Date(dueL.due_date).toLocaleDateString('en-IN')}: ${formatCurrency(dueL.remaining_amount)}`,
        whatsHappening: `Scheduled due date on ${new Date(dueL.due_date).toLocaleDateString('en-IN')} with remaining balance of ${formatCurrency(dueL.remaining_amount)}.`,
        whyItMatters: 'Timely payments prevent late penalties and protect your credit reputation.',
        tryThis: 'Ensure sufficient liquid account balance is available before the due date.',
      }),
      severity: 'MEDIUM',
      pageContext: 'ASSETS_LIABILITIES',
      actionLink: '/reports',
      actionText: 'View Details',
      dataGrounding: `Due date: ${new Date(dueL.due_date).toLocaleDateString('en-IN')}, Remaining: ${formatCurrency(dueL.remaining_amount)}.`,
      expectedBenefit: 'Avoids late payment penalties.',
      isPreliminary: false,
    });
  }

  // Total debt overview
  insights.push({
    userId,
    insightType: 'LIABILITY_TOTAL_OVERVIEW',
    title: `Total outstanding liabilities: ${formatCurrency(totalDebt)} across ${liabilities.length} account(s)`,
    description: makeStructuredDescription({
      contextData: `Total debt: ${formatCurrency(totalDebt)} across ${liabilities.length} account(s)`,
      whatsHappening: `Your recorded debt compares with ${formatCurrency(verifiedRecords.totalAssets)} in recorded assets for a net worth of ${formatCurrency(verifiedRecords.netWorth)}.`,
      whyItMatters: 'Systematic debt reduction improves your debt-to-income ratio and expands borrowing capacity when needed.',
      tryThis: 'Review your monthly payment schedule in Reports & Liabilities.',
    }),
    severity: 'LOW',
    pageContext: 'ASSETS_LIABILITIES',
    actionLink: '/reports',
    actionText: 'Open Balance Sheet',
    dataGrounding: `Liabilities total ${formatCurrency(totalDebt)} across ${liabilities.length} account(s).`,
    expectedBenefit: 'Tracks overall debt elimination progress.',
    isPreliminary: false,
  });

  return insights;
}

// =================================================================
// 10. CALENDAR ADVISOR (page_context = 'CALENDAR')
// =================================================================
async function buildCalendarInsights(userId, profile) {
  const { upcomingObligations, period } = profile;
  const insights = [];

  if (upcomingObligations.count > 0) {
    const firstBill = upcomingObligations.items[0];
    insights.push({
      userId,
      insightType: `CALENDAR_UPCOMING_BILL_${firstBill.recurring_payment_id}_${period}`,
      title: `Upcoming payment: ${firstBill.name}`,
      description: makeStructuredDescription({
        contextData: `Due on ${new Date(firstBill.next_due_date).toLocaleDateString('en-IN')}: ${formatCurrency(firstBill.amount)}`,
        whatsHappening: `A recurring payment of ${formatCurrency(firstBill.amount)} for ${firstBill.name} is scheduled soon.`,
        whyItMatters: 'Keeping track of scheduled bills ensures your primary account is prepared and avoids overdraft fees.',
        tryThis: 'Check that your account has enough balance before the payment date.',
      }),
      severity: 'LOW',
      pageContext: 'CALENDAR',
      actionLink: '/calendar',
      actionText: 'Inspect Recurring Schedule',
      dataGrounding: `Due date: ${new Date(firstBill.next_due_date).toLocaleDateString('en-IN')}, Amount: ${formatCurrency(firstBill.amount)}.`,
      expectedBenefit: 'Prevents overdraft penalties or failed recurring transaction fees.',
      isPreliminary: false,
    });
  } else {
    insights.push({
      userId,
      insightType: `CALENDAR_NO_BILLS_${period}`,
      title: 'No upcoming recurring payments scheduled',
      description: makeStructuredDescription({
        contextData: '0 recurring payments due in next 30 days',
        whatsHappening: 'No subscriptions, EMIs, or utility bills are scheduled in the next 30 days.',
        whyItMatters: 'Logging recurring commitments avoids overdrafts and unexpected fees.',
        tryThis: 'Add recurring bills to your Smart Calendar to track upcoming payment dates.',
      }),
      severity: 'LOW',
      pageContext: 'CALENDAR',
      actionLink: '/calendar',
      actionText: 'Add Recurring Bill',
      dataGrounding: 'User has 0 recurring_payments due in upcoming period.',
      expectedBenefit: 'Enables automatic calendar notifications.',
      isPreliminary: false,
    });
  }

  return insights;
}

// =================================================================
// 11. DASHBOARD ADVISOR (page_context = 'DASHBOARD')
// =================================================================
async function buildDashboardInsights(userId, profile) {
  const { verifiedRecords, onboarding, dataMaturity, isPreliminary, period } = profile;
  const insights = [];

  if (isPreliminary) {
    insights.push({
      userId,
      insightType: `PRELIMINARY_PROFILE_${period}`,
      title: 'Welcome to your financial overview',
      description: makeStructuredDescription({
        contextData: `Logged so far: ${verifiedRecords.expenseTransactionCount} expense(s)`,
        whatsHappening: 'Your initial recommendations combine your onboarding preferences with early records.',
        whyItMatters: 'As you record everyday expenses, your recommendations become more tailored.',
        tryThis: 'Log your daily purchases to unlock deeper spending patterns.',
      }),
      severity: 'LOW',
      pageContext: 'DASHBOARD',
      actionLink: '/expenses',
      actionText: 'Record Purchases',
      dataGrounding: `Data maturity: ${dataMaturity.status}. Total recorded expenses all-time: ${verifiedRecords.allTimeExpenseCount}.`,
      expectedBenefit: 'Logging daily transactions enables realistic budget envelope limits and spending analysis.',
      isPreliminary: true,
    });
  }

  if (verifiedRecords.isDeficit) {
    insights.push({
      userId,
      insightType: `MONTHLY_DEFICIT_${period}`,
      title: `Expenses exceed recorded income by ${formatCurrency(verifiedRecords.deficitAmount)}`,
      description: makeStructuredDescription({
        contextData: `This month: ${formatCurrency(verifiedRecords.currentMonthExpenses)} spent vs ${formatCurrency(verifiedRecords.currentMonthIncome)} income`,
        whatsHappening: `Your recorded spending is currently higher than recorded income by ${formatCurrency(verifiedRecords.deficitAmount)}.`,
        whyItMatters: 'Balancing spending and income keeps your savings on track.',
        tryThis: 'Review your outlays or log any unrecorded income to balance this month.',
      }),
      severity: 'MEDIUM',
      pageContext: 'DASHBOARD',
      actionLink: '/expenses',
      actionText: 'Review Expenses',
      dataGrounding: `Verified Income: ${formatCurrency(verifiedRecords.currentMonthIncome)} vs Verified Expenses: ${formatCurrency(verifiedRecords.currentMonthExpenses)} (${period}).`,
      expectedBenefit: `Closing this ${formatCurrency(verifiedRecords.deficitAmount)} gap prevents liquid savings erosion.`,
      isPreliminary,
    });
  } else if (verifiedRecords.surplusAmount > 0 && verifiedRecords.currentMonthIncome > 0) {
    insights.push({
      userId,
      insightType: `MONTHLY_SURPLUS_${period}`,
      title: `Positive monthly savings: ${formatCurrency(verifiedRecords.surplusAmount)} surplus`,
      description: makeStructuredDescription({
        contextData: `Saved so far: ${verifiedRecords.actualSavingsRate}% of monthly income`,
        whatsHappening: `You have saved ${formatCurrency(verifiedRecords.surplusAmount)} of your income this month.`,
        whyItMatters: 'A steady monthly surplus accelerates your financial goals.',
        tryThis: 'Allocate a portion of this surplus to your active savings goals.',
      }),
      severity: 'LOW',
      pageContext: 'DASHBOARD',
      actionLink: '/savings-goals',
      actionText: 'Add to Goals',
      dataGrounding: `Recorded Surplus: ${formatCurrency(verifiedRecords.surplusAmount)} on Income of ${formatCurrency(verifiedRecords.currentMonthIncome)}.`,
      expectedBenefit: 'Allocating a portion adds steady progress to active milestones.',
      isPreliminary,
    });
  }

  return insights;
}

// =================================================================
// REFRESH & PERSISTENCE PIPELINE
// =================================================================
/**
 * Deterministically generates page-contextual insights for a user based on their
 * verified records. Inserts or updates insights in PostgreSQL ai_insights table.
 */
async function refreshInsightsForUser(userId, { pageContext = null } = {}) {
  try {
    const profile = await buildFinancialProfile(userId);

    const contextMap = {
      BUDGET: () => buildBudgetInsights(userId, profile),
      PROJECTS: () => buildProjectInsights(userId, profile),
      SAVINGS_GOALS: () => buildSavingsInsights(userId, profile),
      INVESTMENTS: () => buildInvestmentInsights(userId, profile),
      REPORTS: () => buildReportsInsights(userId, profile),
      EXPENSES: () => buildExpenseInsights(userId, profile),
      INCOME: () => buildIncomeInsights(userId, profile),
      FINANCIAL_HEALTH: () => buildHealthInsights(userId, profile),
      ASSETS_LIABILITIES: () => buildLiabilityInsights(userId, profile),
      LIABILITIES: () => buildLiabilityInsights(userId, profile),
      CALENDAR: () => buildCalendarInsights(userId, profile),
      DASHBOARD: () => buildDashboardInsights(userId, profile),
    };

    let contextsToRun = [];
    if (Array.isArray(pageContext)) {
      contextsToRun = pageContext.map((c) => String(c).toUpperCase()).filter((c) => contextMap[c]);
    } else if (pageContext && pageContext !== 'ALL') {
      const norm = pageContext.toUpperCase();
      if (contextMap[norm]) {
        contextsToRun.push(norm);
      } else {
        contextsToRun = Object.keys(contextMap);
      }
    } else {
      contextsToRun = Object.keys(contextMap);
    }

    let allGenerated = [];
    for (const ctx of contextsToRun) {
      if (typeof contextMap[ctx] === 'function') {
        const generated = await contextMap[ctx]();
        allGenerated = allGenerated.concat(generated);
      }
    }

    // Upsert all generated insights
    for (const insight of allGenerated) {
      await aiInsightRepository.upsertInsight(insight);
    }

    // Expire stale active insights for each refreshed context so outdated recommendations disappear
    for (const ctx of contextsToRun) {
      const activeTypesForContext = allGenerated
        .filter((i) => i.pageContext === ctx)
        .map((i) => i.insightType);
      await aiInsightRepository.expireStaleInsights(userId, ctx, activeTypesForContext);
    }

    return { success: true, count: allGenerated.length, profile };
  } catch (err) {
    console.error('[AiInsightService] Error refreshing insights:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves personalized insights for the authenticated user,
 * strictly filtered by page context.
 */
async function getInsights(userId, { pageContext = null, status = 'ACTIVE', refresh = false } = {}) {
  const normContext = pageContext && pageContext !== 'ALL' ? pageContext.toUpperCase() : null;

  if (refresh) {
    await refreshInsightsForUser(userId, { pageContext: normContext });
  } else {
    // If user has 0 active insights for this context, generate them immediately
    const existing = await aiInsightRepository.findAllByUser(userId, { pageContext: normContext, status });
    if (existing.length === 0) {
      await refreshInsightsForUser(userId, { pageContext: normContext });
    }
  }

  const [insights, profile] = await Promise.all([
    aiInsightRepository.findAllByUser(userId, { pageContext: normContext, status }),
    buildFinancialProfile(userId),
  ]);

  return {
    insights,
    profileSummary: {
      userName: profile.userName,
      occupation: profile.onboarding.occupation,
      statedIncome: profile.onboarding.monthlyIncome,
      verifiedIncome: profile.verifiedRecords.currentMonthIncome,
      verifiedExpenses: profile.verifiedRecords.currentMonthExpenses,
      netCashFlow: profile.verifiedRecords.netCashFlow,
      savingsRate: profile.verifiedRecords.actualSavingsRate,
      emergencyRunwayMonths: profile.verifiedRecords.emergencyFundRunwayMonths,
      dataMaturity: profile.dataMaturity,
      isPreliminary: profile.isPreliminary,
      discrepancies: profile.discrepancies,
      period: profile.period,
      assessmentDate: profile.assessmentDate,
    },
  };
}

async function markRead(insightId, userId) {
  return aiInsightRepository.markRead(insightId, userId);
}

async function dismissInsight(insightId, userId) {
  return aiInsightRepository.dismissInsight(insightId, userId);
}

async function recordFeedback(insightId, userId, feedback) {
  return aiInsightRepository.setFeedback(insightId, userId, feedback);
}

module.exports = {
  refreshInsightsForUser,
  getInsights,
  markRead,
  dismissInsight,
  recordFeedback,
};
