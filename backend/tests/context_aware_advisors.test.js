// context_aware_advisors.test.js
// Automated verification for FinMan Dynamic, Context-Aware Financial Advisors
// Verifies all 17 testing requirements from the Master Prompt.

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('FinMan Dynamic, Context-Aware Financial Advisors', () => {
  jest.setTimeout(60000);

  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let userAEmail;
  let userBEmail;

  let foodCategoryId;
  let transportCategoryId;

  beforeAll(async () => {
    try {
      userAEmail = `advisor_uA_${Date.now()}@example.com`;
    userBEmail = `advisor_uB_${Date.now()}@example.com`;

    // 1. Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Aditi Rao',
      email: userAEmail,
      password: 'Password@123',
    });
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.user_id;

    // 2. Register User B (for cross-user isolation verification)
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Vikram Seth',
      email: userBEmail,
      password: 'Password@123',
    });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.user_id;

    // 3. User A Onboarding Answers
    await request(app)
      .post('/api/users/onboarding')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        occupation: 'Architect',
        monthlyIncome: 85000,
        spendingCategories: ['Food', 'Transport', 'Utilities'],
        financialGoals: ['Home Renovation', 'Car Down Payment'],
        financialExperience: 'Intermediate',
        aiPreferences: ['Budget Alerts', 'Savings Recommendations'],
        savingsHabit: '20_30',
        investmentPreference: 'Mutual Funds & Equity',
      });

    // 4. Get active categories for seeded budgets
    const catRes = await db.query('SELECT category_id, name FROM categories LIMIT 5');
    const foodRow = catRes.rows.find((r) => r.name.toLowerCase().includes('food')) || catRes.rows[0];
    const transRow = catRes.rows.find((r) => r.name.toLowerCase().includes('transport')) || catRes.rows[1] || catRes.rows[0];
    foodCategoryId = foodRow.category_id;
    transportCategoryId = transRow.category_id;

    // Seed Verified Records for User A:
    // A. Income: ₹60,000 (differs from ₹85,000 onboarding estimate)
    await db.query(
      `INSERT INTO incomes (user_id, source, amount, income_date, description)
       VALUES ($1, 'Salary', 60000, CURRENT_DATE, 'Monthly Architectural Practice Salary')`,
      [userAId]
    );

    // B. Budgets:
    // - Food: Budget ₹5,000
    // - Transport: Budget ₹2,000
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    await db.query(
      `INSERT INTO budgets (user_id, category_id, budget_amount, month, year)
       VALUES ($1, $2, 5000, $4, $5), ($1, $3, 2000, $4, $5)`,
      [userAId, foodCategoryId, transportCategoryId, curMonth, curYear]
    );

    // C. Expenses:
    // - Food: ₹3,500 spent + ₹900 micro = ₹4,400 (utilization: 88% -> approaching limit)
    // - Transport: ₹2,600 spent (exceeded by ₹600)
    // - Micro-expenses: 5 small transactions under ₹250
    await db.query(
      `INSERT INTO expenses (user_id, category_id, amount, expense_date, description)
       VALUES
         ($1, $2, 3500, CURRENT_DATE, 'Supermarket and organic groceries'),
         ($1, $3, 2600, CURRENT_DATE, 'Monthly Metro and Cab Passes'),
         ($1, $2, 180, CURRENT_DATE, 'Chai and Snack #1'),
         ($1, $2, 180, CURRENT_DATE, 'Chai and Snack #2'),
         ($1, $2, 180, CURRENT_DATE, 'Chai and Snack #3'),
         ($1, $2, 180, CURRENT_DATE, 'Chai and Snack #4'),
         ($1, $2, 180, CURRENT_DATE, 'Chai and Snack #5')`,
      [userAId, foodCategoryId, transportCategoryId]
    );

    // D. Projects:
    // Project 1: House Construction, target ₹1,00,000, spent ₹75,000 (75% utilization)
    const p1 = await db.query(
      `INSERT INTO project_workspaces (user_id, project_name, description, target_budget, start_date, status)
       VALUES ($1, 'House Construction', 'Foundation and brickwork', 100000, CURRENT_DATE, 'ACTIVE')
       RETURNING project_id`,
      [userAId]
    );
    await db.query(
      `INSERT INTO project_expenses (project_id, user_id, expense_name, category, amount, expense_date)
       VALUES ($1, $2, 'Cement and Steel', 'Materials', 75000, CURRENT_DATE)`,
      [p1.rows[0].project_id, userAId]
    );

    // Project 2: Vehicle Purchase, target ₹50,000, spent ₹10,000 (₹40,000 remaining)
    const p2 = await db.query(
      `INSERT INTO project_workspaces (user_id, project_name, description, target_budget, start_date, status)
       VALUES ($1, 'Vehicle Purchase', 'Pre-owned two-wheeler', 50000, CURRENT_DATE, 'ACTIVE')
       RETURNING project_id`,
      [userAId]
    );
    await db.query(
      `INSERT INTO project_expenses (project_id, user_id, expense_name, category, amount, expense_date)
       VALUES ($1, $2, 'Vehicle Inspection Fee', 'Services', 10000, CURRENT_DATE)`,
      [p2.rows[0].project_id, userAId]
    );

    // E. Savings Goals:
    // Goal 1: "Car Goal", target ₹6,50,000, current ₹0, target_date in 2 months
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    await db.query(
      `INSERT INTO financial_goals (user_id, goal_name, target_amount, current_amount, target_date, status)
       VALUES ($1, 'Car Goal', 650000, 0, $2, 'IN_PROGRESS')`,
      [userAId, futureDate.toISOString().split('T')[0]]
    );

    // F. Investment Holdings:
    // STOCK: ₹80,000, BOND: ₹20,000 (STOCK is 80% concentrated)
    // One holding has current_value = 0 (unvalued)
    await db.query(
      `INSERT INTO financial_holdings (user_id, holding_type, name, quantity, purchase_value, current_value)
       VALUES
         ($1, 'STOCK', 'Nifty Index Fund', 100, 70000, 80000),
         ($1, 'BOND', 'Government Bond Fund', 50, 20000, 20000),
         ($1, 'STOCK', 'Legacy Stock Certificate', 10, 5000, 0)`,
      [userAId]
    );

    // G. Liabilities:
    // Loan with 14% interest rate (High interest debt)
    await db.query(
      `INSERT INTO liabilities (user_id, liability_type, name, total_amount, remaining_amount, interest_rate, due_date)
       VALUES ($1, 'LOAN', 'Personal Renovation Loan', 50000, 35000, 14.5, CURRENT_DATE + INTERVAL '15 days')`,
      [userAId]
    );

    // Allow background refreshes to settle before tests start
    await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (err) {
      console.error('[CRITICAL] beforeAll FAILED with error:', err);
      throw err;
    }
  }, 60000);

  afterAll(async () => {
    // Cleanup test users
    if (userAId) {
      await db.query('DELETE FROM users WHERE user_id = $1', [userAId]).catch(() => null);
    }
    if (userBId) {
      await db.query('DELETE FROM users WHERE user_id = $1', [userBId]).catch(() => null);
    }
  });

  // =================================================================
  // 1. BUDGET ADVISOR (page_context = 'BUDGET')
  // =================================================================
  it('1. Budget Advisor returns budget-specific insights grounded in actual envelope limits', async () => {
    const res = await request(app)
      .get('/api/dashboard/insights?page_context=BUDGET&refresh=true')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const insights = res.body.data.insights;
    expect(Array.isArray(insights)).toBe(true);
    expect(insights.length).toBeGreaterThan(0);

    // All returned insights must have page_context = 'BUDGET'
    for (const item of insights) {
      expect(item.page_context).toBe('BUDGET');
    }

    // Must find the overrun budget recommendation for Transport (exceeded by ₹600)
    const overrun = insights.find((i) => i.insight_type.startsWith('BUDGET_OVERRUN'));
    expect(overrun).toBeDefined();
    expect(overrun.title).toMatch(/exceeded by ₹600|exceeded/i);

    // Must find approaching limit recommendation for Food
    const approaching = insights.find((i) => i.insight_type.startsWith('BUDGET_APPROACHING'));
    expect(approaching).toBeDefined();
    expect(approaching.title).toMatch(/spending has reached|approaching/i);
  });

  // =================================================================
  // 2. PROJECT ADVISOR (page_context = 'PROJECTS')
  // =================================================================
  it('2. Project Advisor returns project-specific insights with target budget and utilization', async () => {
    const res = await request(app)
      .get('/api/dashboard/insights?page_context=PROJECTS&refresh=true')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    const insights = res.body.data.insights;
    expect(insights.length).toBeGreaterThan(0);

    for (const item of insights) {
      expect(item.page_context).toBe('PROJECTS');
    }

    // Project 1 (House Construction) used 75% of target budget
    const p1Insight = insights.find((i) => i.title.includes('House Construction'));
    expect(p1Insight).toBeDefined();
    expect(p1Insight.title).toMatch(/75% of its target budget/i);

    // Project 2 (Vehicle Purchase) has ₹40,000 remaining
    const p2Insight = insights.find((i) => i.title.includes('Vehicle Purchase'));
    expect(p2Insight).toBeDefined();
    expect(p2Insight.title).toMatch(/₹40,000 remaining/i);
  });

  // =================================================================
  // 3. SAVINGS ADVISOR (page_context = 'SAVINGS_GOALS')
  // =================================================================
  it('3. Savings Advisor calculates estimated required monthly contributions accurately', async () => {
    const res = await request(app)
      .get('/api/dashboard/insights?page_context=SAVINGS_GOALS&refresh=true')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    const insights = res.body.data.insights;
    expect(insights.length).toBeGreaterThan(0);

    for (const item of insights) {
      expect(item.page_context).toBe('SAVINGS_GOALS');
    }

    // Car Goal has ₹6,50,000 remaining over 2 months (~₹3,25,000/mo)
    const carGoalInsight = insights.find((i) => i.title.includes('Car Goal'));
    expect(carGoalInsight).toBeDefined();
    expect(carGoalInsight.title).toMatch(/₹6,50,000 remaining/i);
    expect(carGoalInsight.whats_happening).toMatch(/₹3,25,000 per month/i);
  });

  // =================================================================
  // 4. INVESTMENT ADVISOR (page_context = 'INVESTMENTS')
  // =================================================================
  it('4. Investment Advisor uses verified holdings, flags concentration and unvalued holdings', async () => {
    const res = await request(app)
      .get('/api/dashboard/insights?page_context=INVESTMENTS&refresh=true')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    const insights = res.body.data.insights;
    expect(insights.length).toBeGreaterThan(0);

    for (const item of insights) {
      expect(item.page_context).toBe('INVESTMENTS');
    }

    // Flag unvalued holdings (Legacy Stock Certificate has current_value = 0)
    const unvaluedInsight = insights.find((i) => i.insight_type === 'INVESTMENT_MISSING_VALUATION');
    expect(unvaluedInsight).toBeDefined();
    expect(unvaluedInsight.title).toMatch(/do not have current valuations/i);

    // Flag Equity concentration (Equity is 80% of portfolio)
    const concentrationInsight = insights.find((i) => i.insight_type.startsWith('INVESTMENT_CONCENTRATION'));
    expect(concentrationInsight).toBeDefined();
    expect(concentrationInsight.title).toMatch(/concentrated in one asset class/i);
  });

  // =================================================================
  // 5. REPORTS ADVISOR (page_context = 'REPORTS')
  // =================================================================
  it('5. Reports Advisor provides period cash flow, top spending category, and net worth position', async () => {
    const res = await request(app)
      .get('/api/dashboard/insights?page_context=REPORTS&refresh=true')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    const insights = res.body.data.insights;
    expect(insights.length).toBeGreaterThan(0);

    for (const item of insights) {
      expect(item.page_context).toBe('REPORTS');
    }

    // Cash flow surplus insight
    const cashFlowInsight = insights.find((i) => i.insight_type.startsWith('REPORT_CASHFLOW'));
    expect(cashFlowInsight).toBeDefined();

    // Balance Sheet net worth insight
    const netWorthInsight = insights.find((i) => i.insight_type.startsWith('REPORT_NET_WORTH'));
    expect(netWorthInsight).toBeDefined();
    expect(netWorthInsight.title).toMatch(/Recorded net worth stands at/i);
  });

  // =================================================================
  // 6. EXPENSE ADVISOR (page_context = 'EXPENSES')
  // =================================================================
  it('6. Expense Advisor computes top category and detects micro-spending accumulation', async () => {
    const res = await request(app)
      .get('/api/dashboard/insights?page_context=EXPENSES&refresh=true')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    const insights = res.body.data.insights;
    expect(insights.length).toBeGreaterThan(0);

    for (const item of insights) {
      expect(item.page_context).toBe('EXPENSES');
    }

    // Top Category (Food or Transport)
    const topCatInsight = insights.find((i) => i.insight_type.startsWith('EXPENSE_TOP_CAT'));
    expect(topCatInsight).toBeDefined();

    // Micro-spending accumulation (5 transactions of ₹180 = ₹900)
    const microInsight = insights.find((i) => i.insight_type.startsWith('EXPENSE_MICRO_SPENDING'));
    expect(microInsight).toBeDefined();
    expect(microInsight.title).toMatch(/small daily purchases under ₹250/i);
  });

  // =================================================================
  // 7. INCOME ADVISOR (page_context = 'INCOME')
  // =================================================================
  it('7. Income Advisor distinguishes recorded income from onboarding stated estimates', async () => {
    const res = await request(app)
      .get('/api/dashboard/insights?page_context=INCOME&refresh=true')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    const insights = res.body.data.insights;
    expect(insights.length).toBeGreaterThan(0);

    for (const item of insights) {
      expect(item.page_context).toBe('INCOME');
    }

    // Discrepancy comparison: Recorded ₹60,000 vs Onboarding ₹85,000 (29% difference)
    const discrepancyInsight = insights.find((i) => i.insight_type.startsWith('INCOME_ESTIMATE_COMPARISON'));
    expect(discrepancyInsight).toBeDefined();
    expect(discrepancyInsight.title).toMatch(/Recorded income.*vs onboarding estimate/i);
  });

  // =================================================================
  // 8. ASSETS & LIABILITIES ADVISOR (page_context = 'ASSETS_LIABILITIES')
  // =================================================================
  it('8. Liability Advisor identifies high-interest debt and payment obligations', async () => {
    const res = await request(app)
      .get('/api/dashboard/insights?page_context=ASSETS_LIABILITIES&refresh=true')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    const insights = res.body.data.insights;
    expect(insights.length).toBeGreaterThan(0);

    for (const item of insights) {
      expect(item.page_context).toBe('ASSETS_LIABILITIES');
    }

    // High interest debt: 14.5% interest on Personal Renovation Loan
    const highInterest = insights.find((i) => i.insight_type.startsWith('LIABILITY_HIGH_INTEREST'));
    expect(highInterest).toBeDefined();
    expect(highInterest.title).toMatch(/14\.5/i);

    // Upcoming due date
    const upcomingDue = insights.find((i) => i.insight_type.startsWith('LIABILITY_UPCOMING_DUE'));
    expect(upcomingDue).toBeDefined();
  });

  // =================================================================
  // 9. CROSS-PAGE ISOLATION (No Leaks Across Contexts)
  // =================================================================
  it('9. Strictly enforces cross-page isolation: Budget Advisor never returns Project or Investment advice', async () => {
    const budgetRes = await request(app)
      .get('/api/dashboard/insights?page_context=BUDGET')
      .set('Authorization', `Bearer ${userAToken}`);

    const budgetInsights = budgetRes.body.data.insights;
    expect(budgetInsights.length).toBeGreaterThan(0);

    for (const item of budgetInsights) {
      expect(item.page_context).toBe('BUDGET');
      // Must not contain keywords from other contexts
      expect(item.title).not.toMatch(/House Construction|Vehicle Purchase/i);
      expect(item.title).not.toMatch(/Car Goal/i);
      expect(item.title).not.toMatch(/portfolio value/i);
      expect(item.title).not.toMatch(/Renovation Loan/i);
    }

    const projectRes = await request(app)
      .get('/api/dashboard/insights?page_context=PROJECTS')
      .set('Authorization', `Bearer ${userAToken}`);

    const projectInsights = projectRes.body.data.insights;
    expect(projectInsights.length).toBeGreaterThan(0);

    for (const item of projectInsights) {
      expect(item.page_context).toBe('PROJECTS');
      expect(item.title).not.toMatch(/Food spending|Transport budget/i);
    }
  });

  // =================================================================
  // 10. CROSS-USER ISOLATION
  // =================================================================
  it('10. User B cannot access User A insights and sees honest empty state before recording data', async () => {
    const resB = await request(app)
      .get('/api/dashboard/insights?page_context=BUDGET')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(resB.status).toBe(200);
    const insightsB = resB.body.data.insights;
    expect(Array.isArray(insightsB)).toBe(true);

    // User B must not see any of User A's insights
    for (const item of insightsB) {
      expect(item.user_id).toBe(userBId);
      expect(item.title).not.toMatch(/Transport budget is exceeded by ₹600/i);
      expect(item.title).not.toMatch(/House Construction/i);
    }
  });

  // =================================================================
  // 11. FEEDBACK AND DISMISSAL
  // =================================================================
  it('11. Allows user to rate helpful/unhelpful and dismiss insight without leaking into active list', async () => {
    const listRes = await request(app)
      .get('/api/dashboard/insights?page_context=BUDGET')
      .set('Authorization', `Bearer ${userAToken}`);

    const targetInsight = listRes.body.data.insights[0];
    expect(targetInsight).toBeDefined();

    // Rate HELPFUL
    const fbRes = await request(app)
      .post(`/api/dashboard/insights/${targetInsight.insight_id}/feedback`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ feedback: 'HELPFUL' });

    expect(fbRes.status).toBe(200);
    expect(fbRes.body.data.insight.feedback).toBe('HELPFUL');

    // Dismiss insight
    const disRes = await request(app)
      .patch(`/api/dashboard/insights/${targetInsight.insight_id}/dismiss`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(disRes.status).toBe(200);
    expect(disRes.body.data.insight.status).toBe('DISMISSED');

    // Active list should not contain dismissed insight
    const updatedListRes = await request(app)
      .get('/api/dashboard/insights?page_context=BUDGET&status=ACTIVE')
      .set('Authorization', `Bearer ${userAToken}`);

    const activeIds = updatedListRes.body.data.insights.map((i) => i.insight_id);
    expect(activeIds).not.toContain(targetInsight.insight_id);
  });
});
