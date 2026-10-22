// aiInsightService.js
// Module 8A: Personalized AI Financial Analysis Engine
// Grounded strictly in onboarding answers, verified PostgreSQL records,
// budgets, goals, recurring obligations, and user feedback.

const aiInsightRepository = require('../repositories/aiInsightRepository');
const { buildFinancialProfile } = require('./financialProfileService');
const geminiService = require('./geminiService');

function formatCurrency(amt) {
  return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/**
 * Deterministically generates page-contextual insights for a user based on their
 * verified profile. Inserts or updates insights in PostgreSQL ai_insights table.
 */
async function refreshInsightsForUser(userId) {
  try {
    const profile = await buildFinancialProfile(userId);
    const {
      onboarding,
      verifiedRecords,
      categorySpending,
      budgets,
      goals,
      upcomingObligations,
      discrepancies,
      dataMaturity,
      isPreliminary,
      period,
    } = profile;

    const insightsToUpsert = [];

    // =================================================================
    // 1. PRELIMINARY DATA NOTICE (For new/low-activity accounts)
    // =================================================================
    if (isPreliminary) {
      insightsToUpsert.push({
        userId,
        insightType: `PRELIMINARY_PROFILE_${period}`,
        title: 'Preliminary Analysis: Early Financial Baseline',
        description: `You have logged ${verifiedRecords.expenseTransactionCount} expense(s) this month. Your recommendations currently combine your onboarding preferences with initial records. Log your daily transactions to unlock deeper historical insights.`,
        severity: 'LOW',
        pageContext: 'DASHBOARD',
        actionLink: '/expenses',
        actionText: "Record Today's Purchases",
        dataGrounding: `Data maturity: ${dataMaturity}. Total recorded expenses all-time: ${verifiedRecords.allTimeExpenseCount}.`,
        expectedBenefit: 'Logging 5+ transactions enables category spike detection and realistic budget envelope limits.',
        isPreliminary: true,
      });
    }

    // =================================================================
    // 2. CASH FLOW & DEFICIT (DASHBOARD & FINANCIAL HEALTH)
    // =================================================================
    if (verifiedRecords.isDeficit) {
      insightsToUpsert.push({
        userId,
        insightType: `MONTHLY_DEFICIT_${period}`,
        title: `Expenses Exceed Recorded Income by ${formatCurrency(verifiedRecords.deficitAmount)}`,
        description: `This month's expenses (${formatCurrency(verifiedRecords.currentMonthExpenses)}) exceed verified income (${formatCurrency(verifiedRecords.currentMonthIncome)}). If you drew from savings or received unlogged income, record it to keep financial health accurate.`,
        severity: 'HIGH',
        pageContext: 'DASHBOARD',
        actionLink: '/expenses',
        actionText: 'Review Outlays',
        dataGrounding: `Verified Income: ${formatCurrency(verifiedRecords.currentMonthIncome)} vs Verified Expenses: ${formatCurrency(verifiedRecords.currentMonthExpenses)} (${period}).`,
        expectedBenefit: `Closing this ${formatCurrency(verifiedRecords.deficitAmount)} gap prevents liquid savings erosion.`,
        isPreliminary,
      });
    } else if (verifiedRecords.surplusAmount > 0 && verifiedRecords.currentMonthIncome > 0) {
      insightsToUpsert.push({
        userId,
        insightType: `MONTHLY_SURPLUS_${period}`,
        title: `Healthy Cash Flow: ${formatCurrency(verifiedRecords.surplusAmount)} Surplus (${verifiedRecords.actualSavingsRate}% Saved)`,
        description: `You are maintaining a ${verifiedRecords.actualSavingsRate}% savings rate this month. Based on your stated onboarding goal "${onboarding.financialGoals[0] || 'Build Savings'}", allocating a portion of this surplus directly into your goals accelerates target completion.`,
        severity: 'LOW',
        pageContext: 'DASHBOARD',
        actionLink: '/savings-goals',
        actionText: 'Allocate to Savings Goals',
        dataGrounding: `Recorded Surplus: ${formatCurrency(verifiedRecords.surplusAmount)} on Income of ${formatCurrency(verifiedRecords.currentMonthIncome)}.`,
        expectedBenefit: `Allocating 50% (${formatCurrency(verifiedRecords.surplusAmount / 2)}) adds substantial progress to active milestones.`,
        isPreliminary,
      });
    }

    // =================================================================
    // 3. EMERGENCY FUND RUNWAY (FINANCIAL HEALTH)
    // =================================================================
    const runway = verifiedRecords.emergencyFundRunwayMonths;
    const caresAboutEmergency = onboarding.financialInterests.includes('Emergency Fund') ||
      onboarding.financialGoals.includes('Emergency Fund');

    if (caresAboutEmergency || runway < 3) {
      const severity = runway < 1 ? 'HIGH' : (runway < 3 ? 'MEDIUM' : 'LOW');
      insightsToUpsert.push({
        userId,
        insightType: `EMERGENCY_RUNWAY_${period}`,
        title: runway < 1
          ? 'Critical Buffer Alert: Under 1 Month of Expenses Covered'
          : `Emergency Buffer: ${runway} Months of Living Expenses Covered`,
        description: `Your recorded liquid reserves (${formatCurrency(verifiedRecords.liquidAssets)}) provide ${runway} months of living expenses. Standard financial resilience suggests 3 to 6 months of buffer.`,
        severity,
        pageContext: 'FINANCIAL_HEALTH',
        actionLink: '/savings-goals',
        actionText: 'Review Emergency Goal',
        dataGrounding: `Liquid Assets: ${formatCurrency(verifiedRecords.liquidAssets)} / Monthly Burn: ${formatCurrency(verifiedRecords.currentMonthExpenses || onboarding.monthlyIncome * 0.6)}.`,
        expectedBenefit: `Building reserves to 3 months (${formatCurrency((verifiedRecords.currentMonthExpenses || 30000) * 3)}) secures protection against unforeseen emergencies.`,
        isPreliminary,
      });
    }

    // =================================================================
    // 4. SPENDING CATEGORY SPIKES & LEAKS (EXPENSES)
    // =================================================================
    if (categorySpending.length > 0) {
      const topCat = categorySpending[0];
      if (topCat.percentage >= 35 && topCat.amount >= 1500) {
        insightsToUpsert.push({
          userId,
          insightType: `CATEGORY_CONCENTRATION_${topCat.categoryId || 'top'}_${period}`,
          title: `${topCat.categoryName} Drives ${topCat.percentage}% of Monthly Spending`,
          description: `You have spent ${formatCurrency(topCat.amount)} across ${topCat.transactionCount} transaction(s) in ${topCat.categoryName}. As a ${onboarding.occupation}, capping discretionary costs in this category protects monthly targets.`,
          severity: topCat.percentage >= 50 ? 'HIGH' : 'MEDIUM',
          pageContext: 'EXPENSES',
          actionLink: '/budget',
          actionText: `Set ${topCat.categoryName} Budget`,
          dataGrounding: `${topCat.categoryName}: ${formatCurrency(topCat.amount)} (${topCat.percentage}% of total outlays).`,
          expectedBenefit: `A 15% reduction in ${topCat.categoryName} frees up ${formatCurrency(topCat.amount * 0.15)} each month.`,
          isPreliminary,
        });
      }
    }

    // Micro-spending accumulation
    const microTotal = categorySpending.reduce((acc, c) => acc, 0); // checked via query in profile
    const microExpensesRes = await require('../config/database').query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = $1 AND amount <= 250
         AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [userId]
    );
    const microCount = Number(microExpensesRes.rows[0]?.count || 0);
    const microSum = Number(microExpensesRes.rows[0]?.total || 0);

    if (microCount >= 5 && microSum >= 800) {
      insightsToUpsert.push({
        userId,
        insightType: `MICRO_SPENDING_${period}`,
        title: `Micro-Spending Leak: ${formatCurrency(microSum)} in Small Purchases`,
        description: `You recorded ${microCount} minor transactions under ₹250 totaling ${formatCurrency(microSum)}. Small daily coffees, quick snacks, and impulsive micro-purchases often accumulate into a major leak.`,
        severity: 'MEDIUM',
        pageContext: 'EXPENSES',
        actionLink: '/expenses',
        actionText: 'Inspect Micro-Expenses',
        dataGrounding: `${microCount} transactions under ₹250 totaling ${formatCurrency(microSum)} in ${period}.`,
        expectedBenefit: `Cutting daily micro-purchases by half recovers ~${formatCurrency(microSum * 0.5)} for your savings.`,
        isPreliminary: false,
      });
    }

    // =================================================================
    // 5. BUDGET OVERRUNS & ENVELOPE RECOMMENDATIONS (BUDGET)
    // =================================================================
    if (budgets.items.length > 0) {
      for (const b of budgets.items) {
        if (b.isOverBudget) {
          const overrun = b.actualSpent - b.budgetAmount;
          insightsToUpsert.push({
            userId,
            insightType: `BUDGET_OVERRUN_${b.categoryId}_${period}`,
            title: `${b.categoryName} Budget Exceeded by ${formatCurrency(overrun)}`,
            description: `You spent ${formatCurrency(b.actualSpent)} against a ${formatCurrency(b.budgetAmount)} limit (${b.utilizationPercent}% utilized). Priority: ${b.priority}. Restrict non-essential expenses in this category for the remainder of the month.`,
            severity: 'HIGH',
            pageContext: 'BUDGET',
            actionLink: '/budget',
            actionText: 'Adjust Budget Envelopes',
            dataGrounding: `Budget: ${formatCurrency(b.budgetAmount)}, Actual: ${formatCurrency(b.actualSpent)} (${period}).`,
            expectedBenefit: `Rebalancing limits prevents end-of-month cash deficits.`,
            isPreliminary: false,
          });
        }
      }
    } else if (categorySpending.length >= 2) {
      // Suggesting first budgets when user has spending but 0 envelopes
      const top1 = categorySpending[0];
      insightsToUpsert.push({
        userId,
        insightType: `SUGGEST_FIRST_BUDGET_${period}`,
        title: `Set Your First Budget Envelope: ${top1.categoryName}`,
        description: `You have logged ${formatCurrency(top1.amount)} in ${top1.categoryName} without a budget envelope. Setting a limit based on your ${onboarding.occupation} profile helps keep outlays predictable.`,
        severity: 'MEDIUM',
        pageContext: 'BUDGET',
        actionLink: '/budget',
        actionText: 'Create Budget Envelope',
        dataGrounding: `Top category ${top1.categoryName}: ${formatCurrency(top1.amount)} spent with no limit.`,
        expectedBenefit: `Envelopes typically reduce impulsive spending by 10%–20%.`,
        isPreliminary,
      });
    }

    // =================================================================
    // 6. INCOME DISCREPANCY & STABILITY (INCOME)
    // =================================================================
    const incomeDiscrepancy = discrepancies.find((d) => d.type.startsWith('INCOME'));
    if (incomeDiscrepancy) {
      insightsToUpsert.push({
        userId,
        insightType: `INCOME_LOG_DISCREPANCY_${period}`,
        title: incomeDiscrepancy.type === 'INCOME_UNRECORDED'
          ? `Unrecorded Income: Stated ${formatCurrency(onboarding.monthlyIncome)} in Onboarding`
          : 'Recorded Income Varies from Onboarding Estimate',
        description: incomeDiscrepancy.message,
        severity: 'MEDIUM',
        pageContext: 'INCOME',
        actionLink: '/income',
        actionText: 'Log Monthly Income',
        dataGrounding: `Onboarding income: ${formatCurrency(onboarding.monthlyIncome)} vs Recorded: ${formatCurrency(verifiedRecords.currentMonthIncome)}.`,
        expectedBenefit: 'Accurate income tracking enables true savings-rate and health score calculations.',
        isPreliminary: true,
      });
    }

    // =================================================================
    // 7. SAVINGS GOALS FEASIBILITY & PROGRESS (SAVINGS_GOALS)
    // =================================================================
    if (goals.items.length > 0) {
      for (const g of goals.items) {
        if (g.isLagging) {
          insightsToUpsert.push({
            userId,
            insightType: `GOAL_LAGGING_${g.goalId}`,
            title: `Goal Behind Schedule: "${g.goalName}" (${g.progressPercent}%)`,
            description: `Target date is in ${g.monthsRemaining} month(s). To save the remaining ${formatCurrency(g.remainingAmount)} on time, a contribution of ${formatCurrency(g.requiredMonthlyContribution)}/month is required.`,
            severity: 'HIGH',
            pageContext: 'SAVINGS_GOALS',
            actionLink: '/savings-goals',
            actionText: 'Adjust Goal Milestone',
            dataGrounding: `Target: ${formatCurrency(g.targetAmount)}, Saved: ${formatCurrency(g.currentAmount)}, Target Date: ${g.targetDate ? new Date(g.targetDate).toLocaleDateString('en-IN') : 'N/A'}.`,
            expectedBenefit: `Extending target date by 2 months lowers required contribution to ${formatCurrency(Math.ceil(g.remainingAmount / (g.monthsRemaining + 2)))}/month.`,
            isPreliminary: false,
          });
        }
      }
    } else if (onboarding.financialGoals.length > 0) {
      insightsToUpsert.push({
        userId,
        insightType: `CREATE_STATED_GOAL_${period}`,
        title: `Create Goal for "${onboarding.financialGoals[0]}"`,
        description: `During onboarding you selected "${onboarding.financialGoals.join(', ')}". Creating a dedicated savings target with a timeline helps you track progress automatically.`,
        severity: 'LOW',
        pageContext: 'SAVINGS_GOALS',
        actionLink: '/savings-goals',
        actionText: 'Create Savings Goal',
        dataGrounding: `Onboarding stated goals: ${onboarding.financialGoals.join(', ')}.`,
        expectedBenefit: 'Users with explicit targets save on average 2.5x more consistently.',
        isPreliminary,
      });
    }

    // =================================================================
    // 8. UPCOMING OBLIGATIONS & FIXED COMMITMENTS (CALENDAR)
    // =================================================================
    if (upcomingObligations.count > 0) {
      const firstBill = upcomingObligations.items[0];
      insightsToUpsert.push({
        userId,
        insightType: `UPCOMING_PAYMENT_${firstBill.recurring_payment_id}_${period}`,
        title: `Upcoming Payment: ${firstBill.name} (${formatCurrency(firstBill.amount)})`,
        description: `${firstBill.name} of ${formatCurrency(firstBill.amount)} is scheduled for ${new Date(firstBill.next_due_date).toLocaleDateString('en-IN')}. Ensure your primary account has sufficient balance.`,
        severity: 'MEDIUM',
        pageContext: 'CALENDAR',
        actionLink: '/calendar',
        actionText: 'Inspect Recurring Schedule',
        dataGrounding: `Due date: ${new Date(firstBill.next_due_date).toLocaleDateString('en-IN')}, Amount: ${formatCurrency(firstBill.amount)}.`,
        expectedBenefit: 'Prevents overdraft penalties or failed recurring transaction fees.',
        isPreliminary: false,
      });
    }

    // Upsert all generated insights
    for (const insight of insightsToUpsert) {
      await aiInsightRepository.upsertInsight(insight);
    }

    return { success: true, count: insightsToUpsert.length, profile };
  } catch (err) {
    console.error('[AiInsightService] Error refreshing insights:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves personalized insights for the authenticated user,
 * optionally filtered by page context.
 */
async function getInsights(userId, { pageContext = null, status = 'ACTIVE', refresh = false } = {}) {
  if (refresh) {
    await refreshInsightsForUser(userId);
  } else {
    // If user has 0 active insights, generate initial set
    const existing = await aiInsightRepository.findAllByUser(userId, { pageContext, status });
    if (existing.length === 0) {
      await refreshInsightsForUser(userId);
    }
  }

  const [insights, profile] = await Promise.all([
    aiInsightRepository.findAllByUser(userId, { pageContext, status }),
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
