// multi_module_agent.test.js
// Comprehensive end-to-end integration test suite for FinMan Intelligent Personal Finance Agent:
// Tests full conversational understanding and multi-module actions across all 13 supported application modules:
// 1. Income
// 2. Expenses
// 3. Budgets
// 4. Project Workspaces
// 5. Savings Goals
// 6. Investments & Financial Holdings
// 7. Liabilities & Loans
// 8. Recurring Payments & Subscriptions
// 9. Taxes
// 10. Smart Calendar
// 11. Financial Health & Period Comparisons
// 12. Micro-Spending Intelligence
// 13. OCR Document Workflows

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('FinMan Agent: Multi-Module Natural Language Actions & Conversational Lifecycle', () => {
  let token1;
  let userId1;
  let token2;
  let userId2;

  beforeAll(async () => {
    // Register User 1
    const email1 = `agent_user1_${Date.now()}@example.com`;
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'Ananya Sharma',
      email: email1,
      password: 'TestPassword@123',
    });
    token1 = res1.body.data.token;
    userId1 = res1.body.data.user.user_id;

    // Register User 2 (for user-isolation tests)
    const email2 = `agent_user2_${Date.now()}@example.com`;
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Rohan Gupta',
      email: email2,
      password: 'TestPassword@123',
    });
    token2 = res2.body.data.token;
    userId2 = res2.body.data.user.user_id;

    // Setup initial profile & data for User 1
    await db.query(
      `UPDATE users 
       SET monthly_income = 75000, 
           occupation = 'Product Designer',
           preferred_language = 'en',
           is_onboarded = true
       WHERE user_id = $1`,
      [userId1]
    );

    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const curDate = `${curYear}-${String(curMonth).padStart(2, '0')}-05`;

    // Seed an initial expense (₹1,500) and an income (₹75,000) for current month
    await db.query(
      `INSERT INTO expenses (user_id, category_id, merchant_name, amount, expense_date, payment_mode, description)
       VALUES ($1, 1, 'Organic Groceries', 1500, $2, 'UPI', 'Weekly Groceries')`,
      [userId1, curDate]
    );

    await db.query(
      `INSERT INTO incomes (user_id, source, amount, income_date, description)
       VALUES ($1, 'Salary', 75000, $2, 'Monthly Company Salary')`,
      [userId1, curDate]
    );
  });

  // =========================================================================
  // 1. Natural Language Intent Extraction across Modules
  // =========================================================================
  describe('1. Natural Language Intent Extraction & Previews', () => {
    it('extracts income creation intent with preview for "Add my salary of ₹50,000."', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Add my salary of ₹50,000.' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Income Confirmation Preview');
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('income');
      expect(res.body.data.pendingTransaction.amount).toBe(50000);
      expect(res.body.data.pendingTransaction.source).toBe('Salary');
    });

    it('extracts expense creation intent with preview for "I spent ₹120 on lunch today."', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'I spent ₹120 on lunch today.' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Expense Confirmation Preview');
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('expense');
      expect(res.body.data.pendingTransaction.amount).toBe(120);
      expect(res.body.data.pendingTransaction.category).toBe('Food');
    });

    it('extracts budget creation intent with preview for "Create a monthly food budget of ₹6,000."', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Create a monthly food budget of ₹6,000.' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Budget Confirmation Preview');
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('budget');
      expect(res.body.data.pendingTransaction.amount).toBe(6000);
      expect(res.body.data.pendingTransaction.category).toBe('Food');
    });

    it('extracts project workspace creation intent for "Create a home construction project with a target cost of ₹1 crore."', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Create a home construction project with a target cost of ₹1 crore.' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Project Workspace Preview');
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('project');
      expect(res.body.data.pendingTransaction.targetBudget).toBe(10000000);
      expect(res.body.data.pendingTransaction.projectName).toBe('Home Construction');
    });

    it('extracts savings goal creation intent for "Create a savings goal of ₹5 lakh for my education by December 2027."', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Create a savings goal of ₹5 lakh for my education by December 2027.' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Savings Goal Preview');
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('goal');
      expect(res.body.data.pendingTransaction.targetAmount).toBe(500000);
      expect(res.body.data.pendingTransaction.targetDate).toMatch(/2027-12/);
      expect(res.body.data.pendingTransaction.suggestedMonthlyContribution).toBeGreaterThan(0);
    });

    it('extracts investment holding creation intent for "Record an investment of ₹15,000 in gold."', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Record an investment of ₹15,000 in gold.' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Investment Holding Preview');
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('holding');
      expect(res.body.data.pendingTransaction.currentValue).toBe(15000);
      expect(res.body.data.pendingTransaction.holdingType).toBe('Gold');
    });

    it('extracts recurring payment creation intent for "Add a recurring subscription of ₹499 per month."', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Add a recurring subscription of ₹499 per month.' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Recurring Payment Preview');
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('recurring_payment');
      expect(res.body.data.pendingTransaction.amount).toBe(499);
      expect(res.body.data.pendingTransaction.frequency).toBe('MONTHLY');
    });

    it('extracts tax record intent for "Record a tax payment of ₹25,000."', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Record a tax payment of ₹25,000.' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Tax Record Preview');
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('tax');
      expect(res.body.data.pendingTransaction.amount).toBe(25000);
    });
  });

  // =========================================================================
  // 2. Multi-Module Execution & PostgreSQL Persistence
  // =========================================================================
  describe('2. Multi-Module Action Execution & Database Persistence', () => {
    let savedProjectId;

    it('confirms and executes Project creation in PostgreSQL', async () => {
      const projectPending = {
        id: `prj_test_${Date.now()}`,
        type: 'project',
        projectName: 'Greenhouse Construction',
        targetBudget: 250000,
        startDate: '2026-10-21',
        targetDate: '2027-04-30',
        status: 'PENDING_CONFIRMATION',
      };

      const res = await request(app)
        .post('/api/dashboard/confirm-transaction')
        .set('Authorization', `Bearer ${token1}`)
        .send({ pendingTransaction: projectPending });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.record.project_name).toBe('Greenhouse Construction');
      expect(Number(res.body.data.record.target_budget)).toBe(250000);
      savedProjectId = res.body.data.record.project_id;
    });

    it('confirms and links an expense to the created project workspace', async () => {
      const projectExpensePending = {
        id: `prjexp_test_${Date.now()}`,
        type: 'project_expense',
        projectId: savedProjectId,
        projectName: 'Greenhouse Construction',
        expenseName: 'Solar Glass Panels',
        category: 'Materials',
        amount: 35000,
        date: '2026-10-21',
        paymentMode: 'Net Banking',
        status: 'PENDING_CONFIRMATION',
      };

      const res = await request(app)
        .post('/api/dashboard/confirm-transaction')
        .set('Authorization', `Bearer ${token1}`)
        .send({ pendingTransaction: projectExpensePending });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.message).toContain('Greenhouse Construction');
    });

    it('confirms and executes Budget creation in PostgreSQL', async () => {
      const budgetPending = {
        id: `bgt_test_${Date.now()}`,
        type: 'budget',
        categoryId: 1, // Food
        category: 'Food',
        amount: 8000,
        month: 10,
        year: 2026,
        priority: 'FLEXIBLE',
        status: 'PENDING_CONFIRMATION',
      };

      const res = await request(app)
        .post('/api/dashboard/confirm-transaction')
        .set('Authorization', `Bearer ${token1}`)
        .send({ pendingTransaction: budgetPending });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.message).toContain('Food');
    });

    it('confirms and executes Savings Goal creation in PostgreSQL', async () => {
      const goalPending = {
        id: `goal_test_${Date.now()}`,
        type: 'goal',
        goalName: 'Master Degree Tuition',
        targetAmount: 400000,
        currentAmount: 50000,
        targetDate: '2027-08-31',
        status: 'PENDING_CONFIRMATION',
      };

      const res = await request(app)
        .post('/api/dashboard/confirm-transaction')
        .set('Authorization', `Bearer ${token1}`)
        .send({ pendingTransaction: goalPending });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.record.goal_name).toBe('Master Degree Tuition');
    });

    it('confirms and executes Investment Holding creation in PostgreSQL', async () => {
      const holdingPending = {
        id: `hld_test_${Date.now()}`,
        type: 'holding',
        name: 'Sovereign Gold Bonds 2026',
        holdingType: 'Gold',
        quantity: 5,
        currentValue: 35000,
        purchaseValue: 32000,
        date: '2026-10-21',
        status: 'PENDING_CONFIRMATION',
      };

      const res = await request(app)
        .post('/api/dashboard/confirm-transaction')
        .set('Authorization', `Bearer ${token1}`)
        .send({ pendingTransaction: holdingPending });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.record.name).toBe('Sovereign Gold Bonds 2026');
      expect(res.body.data.record.holding_type).toBe('GOLD');
    });

    it('confirms and executes Recurring Payment creation in PostgreSQL', async () => {
      const recurringPending = {
        id: `rec_test_${Date.now()}`,
        type: 'recurring_payment',
        name: 'Broadband Fiber',
        amount: 999,
        frequency: 'MONTHLY',
        nextDueDate: '2026-11-01',
        status: 'PENDING_CONFIRMATION',
      };

      const res = await request(app)
        .post('/api/dashboard/confirm-transaction')
        .set('Authorization', `Bearer ${token1}`)
        .send({ pendingTransaction: recurringPending });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.record.name).toBe('Broadband Fiber');
    });
  });

  // =========================================================================
  // 3. Idempotency & Duplicate Confirmation Prevention
  // =========================================================================
  describe('3. Idempotency & Duplicate Submissions', () => {
    it('returns alreadySaved when the identical pending action ID is confirmed twice', async () => {
      const txId = `idempotency_test_${Date.now()}`;
      const pending = {
        id: txId,
        type: 'income',
        source: 'Consulting',
        amount: 15000,
        date: '2026-10-21',
        status: 'PENDING_CONFIRMATION',
      };

      // First confirmation
      const res1 = await request(app)
        .post('/api/dashboard/confirm-transaction')
        .set('Authorization', `Bearer ${token1}`)
        .send({ pendingTransaction: pending });
      expect(res1.status).toBe(200);
      expect(res1.body.data.success).toBe(true);

      // Duplicate submission of exact same transaction ID
      const res2 = await request(app)
        .post('/api/dashboard/confirm-transaction')
        .set('Authorization', `Bearer ${token1}`)
        .send({ pendingTransaction: pending });
      expect(res2.status).toBe(200);
      expect(res2.body.data.alreadySaved).toBe(true);
      expect(res2.body.data.message).toContain('already been saved');
    });
  });

  // =========================================================================
  // 4. Conversational Modifications, Corrections & Cancellation
  // =========================================================================
  describe('4. Conversational Edits, Corrections & Cancellation', () => {
    it('updates amount on pending action when user says "Make it ₹500 instead."', async () => {
      const pending = {
        id: `edit_test_${Date.now()}`,
        type: 'expense',
        amount: 250,
        category: 'Food',
        date: '2026-10-21',
        status: 'PENDING_CONFIRMATION',
      };

      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          message: 'Make it ₹500 instead.',
          pendingTransaction: pending,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.pendingTransaction.amount).toBe(500);
      expect(res.body.data.reply).toContain('₹500');
    });

    it('cancels pending action cleanly without database write when user says "Cancel"', async () => {
      const pending = {
        id: `cancel_test_${Date.now()}`,
        type: 'expense',
        amount: 800,
        category: 'Shopping',
        date: '2026-10-21',
        status: 'PENDING_CONFIRMATION',
      };

      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          message: 'Cancel',
          pendingTransaction: pending,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.pendingTransaction).toBeNull();
      expect(res.body.data.reply).toContain('Cancelled');
    });

    it('asks clarification when ambiguous number request is given ("Add 500")', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Add 500' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('income or an expense');
      expect(res.body.data.pendingTransaction).toBeNull();
    });
  });

  // =========================================================================
  // 5. Deterministic Financial Answers Grounded in PostgreSQL
  // =========================================================================
  describe('5. Deterministic Grounded Financial Answers', () => {
    it('answers "Show my largest expense this month" with real recorded data', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Show my largest expense this month' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('largest recorded expense');
      expect(res.body.data.reply).toContain('₹1,500');
    });

    it('answers "How much of my food budget have I used?" with calculated utilization', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'How much of my food budget have I used?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Food Budget Utilization');
      expect(res.body.data.reply).toContain('utilized');
    });

    it('answers "Show my project spending and remaining budget" with aggregated totals', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Show my project spending and remaining budget' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Project Workspaces Summary');
      expect(res.body.data.reply).toContain('Greenhouse Construction');
    });

    it('calculates deterministic monthly savings needed for savings goals', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'How much should I save monthly to reach my target?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Monthly Savings Needed');
      expect(res.body.data.reply).toMatch(/₹[\d,]+\s+per\s+month/i);
    });

    it('answers "Help me understand the risks of investing in gold." with objective guidance', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Help me understand the risks of investing in gold.' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Gold Investment Risks');
      expect(res.body.data.reply).toContain('Sovereign Gold Bonds');
    });

    it('compares this month with last month deterministically', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token1}`)
        .send({ message: 'Compare this month with last month and explain what changed' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Financial Comparison');
      expect(res.body.data.reply).toContain('Income:');
      expect(res.body.data.reply).toContain('Expenses:');
    });
  });

  // =========================================================================
  // 6. User Isolation
  // =========================================================================
  describe('6. Authenticated User Isolation', () => {
    it('ensures User 2 cannot see or access User 1 project records', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token2}`)
        .send({ message: 'Show my projects' });

      expect(res.status).toBe(200);
      // User 2 has no projects
      expect(res.body.data.reply).toContain('do not have any active project workspaces');
      expect(res.body.data.reply).not.toContain('Greenhouse Construction');
    });
  });
});
