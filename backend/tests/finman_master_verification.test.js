// finman_master_verification.test.js
// Verification suite for FinMan Financial Logic, Savings Allocations, Project Expenses, Investments, and Recurring Reminders.

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

describe('FinMan Master Verification Suite', () => {
  let token;
  let userId;
  let categoryId;

  beforeAll(async () => {
    const email = `finman_master_${Date.now()}@example.com`;
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'FinMan Master Verifier',
      email,
      password: 'MasterTest@1234',
    });
    token = registerRes.body.data.token;
    userId = registerRes.body.data.user.user_id;

    const catRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    categoryId = catRes.body.data.categories[0].category_id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Module 1: Financial Logic & Dashboard Calculations', () => {
    it('accurately calculates Net Cash Flow (Income - Expenses) preserving deficit when negative', async () => {
      // Record ₹20,000 Income
      await request(app)
        .post('/api/income')
        .set('Authorization', `Bearer ${token}`)
        .send({ source: 'Salary', amount: 20000, incomeDate: '2026-10-05' });

      // Record ₹25,000 Expense (Causes deficit of ₹5,000)
      await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({ categoryId, amount: 25000, expenseDate: '2026-10-06', paymentMode: 'UPI' });

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const { totalIncome, totalExpenses, netCashFlow, periodSavings, deficit } = res.body.data.summary;
      
      expect(Number(totalIncome)).toBe(20000);
      expect(Number(totalExpenses)).toBe(25000);
      expect(Number(netCashFlow)).toBe(-5000); // Preserved negative cash flow
      expect(Number(deficit)).toBe(5000);
      expect(Number(periodSavings)).toBe(0); // Deficit is never converted to positive savings
    });

    it('includes Project Expenses in overall expense totals and dashboard summary without double-counting', async () => {
      // Create a Project Workspace
      const projRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectName: 'Master Verification Renovation',
          targetBudget: 50000,
          startDate: '2026-10-01',
          status: 'ACTIVE'
        });
      expect(projRes.status).toBe(201);
      const projectId = projRes.body.data.project.project_id;

      // Add a Project Expense of ₹10,000
      const expRes = await request(app)
        .post(`/api/projects/${projectId}/expenses`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          expenseName: 'Cement & Bricks',
          category: 'Material',
          amount: 10000,
          expenseDate: '2026-10-08',
          paymentMode: 'Bank Transfer'
        });
      expect(expRes.status).toBe(201);

      // Check Dashboard Summary includes the project expense in totalExpenses
      const summaryRes = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);

      const { totalExpenses, netCashFlow } = summaryRes.body.data.summary;
      // Previous expenses (25,000) + Project expense (10,000) = 35,000
      expect(Number(totalExpenses)).toBe(35000);
      // Income (20,000) - 35,000 = -15,000
      expect(Number(netCashFlow)).toBe(-15000);
    });

    it('calculates Period Savings from actual goal contributions and surplus without treating transfers as expenses', async () => {
      // Add more income to create a surplus: +₹100,000
      await request(app)
        .post('/api/income')
        .set('Authorization', `Bearer ${token}`)
        .send({ source: 'Business', amount: 100000, incomeDate: '2026-10-10' });

      // Create a Savings Goal
      const goalRes = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          goalName: 'Emergency Fund',
          targetAmount: 50000,
          targetDate: '2027-10-10'
        });
      expect(goalRes.status).toBe(201);
      const goalId = goalRes.body.data.goal.goal_id;

      // Add a Contribution of ₹15,000
      const contribRes = await request(app)
        .post(`/api/goals/${goalId}/contributions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 15000 });
      expect(contribRes.status).toBe(201);

      // Verify that the contribution does NOT increase totalExpenses
      const summaryRes = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);

      const { totalIncome, totalExpenses, netCashFlow, periodSavings, allocatedSavings } = summaryRes.body.data.summary;
      expect(Number(totalIncome)).toBe(120000); // 20k + 100k
      expect(Number(totalExpenses)).toBe(35000); // Not increased by 15k
      expect(Number(netCashFlow)).toBe(85000); // 120k - 35k
      expect(Number(allocatedSavings)).toBe(15000);
      expect(Number(periodSavings)).toBe(15000);
    });
  });

  describe('Module 1.4: Savings Goal Updates & Persistence', () => {
    it('preserves accumulated savings amount when updating goal target or date', async () => {
      // Create a goal
      const goalRes = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          goalName: 'Car Fund',
          targetAmount: 200000,
          targetDate: '2027-12-31'
        });
      expect(goalRes.status).toBe(201);
      const goalId = goalRes.body.data.goal.goal_id;

      // Contribute ₹30,000
      const contribRes = await request(app)
        .post(`/api/goals/${goalId}/contributions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 30000 });
      expect(contribRes.status).toBe(201);

      // Update goal name and targetAmount without sending currentAmount
      const updateRes = await request(app)
        .put(`/api/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          goalName: 'Dream Car Fund',
          targetAmount: 250000,
          targetDate: '2028-06-30'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.goal.goal_name).toBe('Dream Car Fund');
      expect(Number(updateRes.body.data.goal.target_amount)).toBe(250000);
      // Saved amount must NOT be wiped out
      expect(Number(updateRes.body.data.goal.current_amount)).toBe(30000);
    });
  });

  describe('Module 4: Investment Holding Purchase Date Persistence & Retrieval', () => {
    it('creates holding and returns purchase_date in exact YYYY-MM-DD format', async () => {
      const holdingRes = await request(app)
        .post('/api/holdings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Index Fund Nifty 50',
          holdingType: 'MUTUAL_FUND',
          purchaseDate: '2026-03-15',
          quantity: 100,
          purchaseValue: 25000,
          currentValue: 28000
        });

      expect(holdingRes.status).toBe(201);
      const holding = holdingRes.body.data.holding;
      expect(holding.purchase_date).toBe('2026-03-15');
      const holdingId = holding.holding_id;

      // Retrieve via GET /api/holdings
      const listRes = await request(app)
        .get('/api/holdings')
        .set('Authorization', `Bearer ${token}`);
      const found = listRes.body.data.holdings.find(h => h.holding_id === holdingId);
      expect(found).toBeDefined();
      expect(found.purchase_date).toBe('2026-03-15');

      // Update unrelated field (e.g., currentValue) without passing purchaseDate
      const updateRes = await request(app)
        .put(`/api/holdings/${holdingId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Index Fund Nifty 50',
          holdingType: 'MUTUAL_FUND',
          currentValue: 30000
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.holding.purchase_date).toBe('2026-03-15');
      expect(Number(updateRes.body.data.holding.current_value)).toBe(30000);
    });
  });

  describe('Module 6: Daily Reminders & Multi-Day Recurrence', () => {
    it('ensures unread daily reminder from yesterday does not block today reminder', async () => {
      const notificationRepo = require('../src/repositories/notificationRepository');

      // Insert reminder for yesterday
      const yesterday = '2026-10-25';
      const createdYesterday = await notificationRepo.createIfMissing({
        userId,
        title: 'Daily Check-in',
        message: 'Review your daily spending for 2026-10-25',
        type: 'DAILY_REMINDER',
        deliveryDate: yesterday,
      });
      expect(createdYesterday).toBeDefined();

      // Running scheduler again for yesterday is idempotent (returns null or same)
      const duplicateYesterday = await notificationRepo.createIfMissing({
        userId,
        title: 'Daily Check-in',
        message: 'Review your daily spending for 2026-10-25',
        type: 'DAILY_REMINDER',
        deliveryDate: yesterday,
      });
      expect(duplicateYesterday).toBeNull();

      // Today's reminder triggers even if yesterday's reminder remains unread (is_read = FALSE)
      const today = '2026-10-26';
      const createdToday = await notificationRepo.createIfMissing({
        userId,
        title: 'Daily Check-in',
        message: 'Review your daily spending for 2026-10-26',
        type: 'DAILY_REMINDER',
        deliveryDate: today,
      });
      expect(createdToday).toBeDefined();
      expect(createdToday.notification_id).not.toBe(createdYesterday.notification_id);
    });
  });
});
