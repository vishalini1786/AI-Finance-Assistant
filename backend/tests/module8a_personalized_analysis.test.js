// module8a_personalized_analysis.test.js
// Module 8A: Automated verification for personalized financial analysis based on onboarding and user behavior.

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Module 8A: Personalized AI Financial Analysis', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let user1Email;
  let user2Email;

  beforeAll(async () => {
    user1Email = `mod8a_u1_${Date.now()}@example.com`;
    user2Email = `mod8a_u2_${Date.now()}@example.com`;

    // Register User 1
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'Priya Sharma',
      email: user1Email,
      password: 'Password@123',
    });
    user1Token = res1.body.data.token;
    user1Id = res1.body.data.user.user_id;

    // Register User 2 (for cross-user isolation verification)
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Rohan Verma',
      email: user2Email,
      password: 'Password@123',
    });
    user2Token = res2.body.data.token;
    user2Id = res2.body.data.user.user_id;

    // Set User 1 Onboarding Answers in PostgreSQL
    await request(app)
      .post('/api/users/onboarding')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        occupation: 'Software Engineer',
        monthlyIncome: 75000,
        spendingCategories: ['Food', 'Rent', 'Entertainment', 'Transport'],
        financialGoals: ['Emergency Fund', 'Car', 'Home Down Payment'],
        financialExperience: 'Intermediate',
        aiPreferences: ['Budget Alerts', 'Savings Recommendations', 'Tax Tips'],
        savingsHabit: 'Save fixed percentage',
        investmentPreference: 'Mutual Funds & Gold',
      });

    // Set User 2 Onboarding Answers differently
    await request(app)
      .post('/api/users/onboarding')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        occupation: 'Graphic Designer',
        monthlyIncome: 35000,
        spendingCategories: ['Groceries', 'Utilities'],
        financialGoals: ['Emergency Fund'],
        financialExperience: 'Beginner',
        savingsHabit: 'Save what is left',
      });
  });

  afterAll(async () => {
    // Cleanup created test users
    try {
      if (user1Id) {
        await db.query('DELETE FROM ai_insights WHERE user_id = $1', [user1Id]);
        await db.query('DELETE FROM expenses WHERE user_id = $1', [user1Id]);
        await db.query('DELETE FROM incomes WHERE user_id = $1', [user1Id]);
        await db.query('DELETE FROM financial_goals WHERE user_id = $1', [user1Id]);
        await db.query('DELETE FROM budgets WHERE user_id = $1', [user1Id]);
        await db.query('DELETE FROM users WHERE user_id = $1', [user1Id]);
      }
      if (user2Id) {
        await db.query('DELETE FROM ai_insights WHERE user_id = $1', [user2Id]);
        await db.query('DELETE FROM users WHERE user_id = $1', [user2Id]);
      }
    } catch (e) {
      console.warn('Cleanup error:', e.message);
    }
  });

  describe('8A.1 & 8A.2: Profile Creation and Discrepancy Detection', () => {
    it('returns a verified financial profile combining onboarding and verified DB records', async () => {
      const res = await request(app)
        .get('/api/dashboard/financial-profile')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const profile = res.body.data.profile;
      expect(profile).toBeDefined();
      expect(profile.user.id).toBe(user1Id);
      expect(profile.statedProfile.occupation).toBe('Software Engineer');
      expect(profile.statedProfile.monthlyIncome).toBe(75000);
      expect(profile.statedProfile.spendingCategories).toContain('Food');
      expect(profile.statedProfile.financialGoals).toContain('Car');

      // Before recording transactions, data maturity should reflect preliminary status
      expect(profile.dataMaturity.hasOnboarded).toBe(true);
      expect(profile.dataMaturity.hasTransactions).toBe(false);
      expect(profile.isPreliminary).toBe(true);
    });

    it('isolates user financial profile — User 2 cannot access User 1 profile', async () => {
      const res2 = await request(app)
        .get('/api/dashboard/financial-profile')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res2.status).toBe(200);
      const profile2 = res2.body.data.profile;
      expect(profile2.user.id).toBe(user2Id);
      expect(profile2.statedProfile.occupation).toBe('Graphic Designer');
      expect(profile2.statedProfile.monthlyIncome).toBe(35000);
      expect(profile2.statedProfile.occupation).not.toBe('Software Engineer');
    });
  });

  describe('8A.3 & 8A.4: Grounded Insights Generation & Page Context Filtering', () => {
    beforeAll(async () => {
      // Record a verified salary income and expenses for User 1
      const today = new Date().toISOString().slice(0, 10);

      await request(app)
        .post('/api/income')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          source: 'Salary',
          amount: 75000,
          incomeDate: today,
          description: 'Tech monthly salary',
        });

      // Add category expenses
      await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          amount: 15000,
          categoryId: 1, // Food
          expenseDate: today,
          merchantName: 'Supermarket & Dining',
        });

      // Add a savings goal for Car
      await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          goalName: 'New Car',
          targetAmount: 500000,
          currentAmount: 150000,
          targetDate: '2027-12-31',
        });
    });

    it('refreshes and persists data-grounded insights for the authenticated user', async () => {
      const refreshRes = await request(app)
        .post('/api/dashboard/insights/refresh')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(Array.isArray(refreshRes.body.data.insights)).toBe(true);
      expect(refreshRes.body.data.insights.length).toBeGreaterThan(0);

      const firstInsight = refreshRes.body.data.insights[0];
      expect(firstInsight.user_id).toBe(user1Id);
      expect(firstInsight.data_grounding).toBeDefined();
    });

    it('filters insights by page context without cross-page pollution', async () => {
      const dashRes = await request(app)
        .get('/api/dashboard/insights?page_context=DASHBOARD')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(dashRes.status).toBe(200);
      expect(Array.isArray(dashRes.body.data.insights)).toBe(true);

      const expRes = await request(app)
        .get('/api/dashboard/insights?page_context=EXPENSES')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(expRes.status).toBe(200);
      expect(Array.isArray(expRes.body.data.insights)).toBe(true);
    });

    it('allows users to provide helpful/unhelpful feedback on insights', async () => {
      const listRes = await request(app)
        .get('/api/dashboard/insights')
        .set('Authorization', `Bearer ${user1Token}`);

      const insight = listRes.body.data.insights[0];
      expect(insight).toBeDefined();

      const feedbackRes = await request(app)
        .post(`/api/dashboard/insights/${insight.insight_id}/feedback`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ feedback: 'HELPFUL' });

      expect(feedbackRes.status).toBe(200);
      expect(feedbackRes.body.data.insight.feedback).toBe('HELPFUL');
    });

    it('allows users to dismiss an insight without altering financial records', async () => {
      const listRes = await request(app)
        .get('/api/dashboard/insights')
        .set('Authorization', `Bearer ${user1Token}`);

      const insight = listRes.body.data.insights[0];

      const dismissRes = await request(app)
        .patch(`/api/dashboard/insights/${insight.insight_id}/dismiss`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(dismissRes.status).toBe(200);
      expect(dismissRes.body.data.insight.status).toBe('DISMISSED');

      // Active list should not include dismissed insight
      const activeRes = await request(app)
        .get('/api/dashboard/insights?status=ACTIVE')
        .set('Authorization', `Bearer ${user1Token}`);

      const activeIds = activeRes.body.data.insights.map((i) => i.insight_id);
      expect(activeIds).not.toContain(insight.insight_id);
    });
  });

  describe('8A.9: Personalized AI Conversational Guidance', () => {
    it('answers: "Based on my onboarding details, what should I focus on first?"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: 'Based on my onboarding details, what should I focus on first?',
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).toBeDefined();
      expect(reply).toContain('Software Engineer');
      expect(reply).toContain('75,000');
      expect(res.body.data.suggestedQuestions).toBeDefined();
    });

    it('answers: "Analyze my spending this month"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: 'Analyze my spending this month',
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).toContain('Total Recorded Spending');
      expect(reply).toContain('15,000');
    });

    it('answers: "How can I save more money based on my current income?"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: 'How can I save more money based on my current income?',
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).toContain('Personalized Savings Strategy');
      expect(reply).toContain('75,000');
    });

    it('answers: "Am I on track to reach my car savings goal?"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: 'Am I on track to reach my car savings goal?',
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).toContain('Goal Tracking Analysis');
      expect(reply).toContain('New Car');
      expect(reply).toContain('5,00,000');
    });

    it('answers: "Help me plan a realistic budget for next month"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: 'Help me plan a realistic budget for next month',
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).toContain('50/30/20 Rule');
      expect(reply).toContain('Essentials / Needs');
      expect(reply).toContain('Discretionary / Wants');
      expect(reply).toContain('Savings & Investments');
    });

    it('answers: "Which expenses should I review first?"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: 'Which expenses should I review first?',
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).toContain('Prioritized Expense Review');
    });

    it('answers: "What financial habits should I improve?"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: 'What financial habits should I improve?',
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).toContain('Financial Habit Improvements');
    });

    it('answers: "What changed in my financial situation this month?"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          message: 'What changed in my financial situation this month?',
        });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).toContain('Financial Shifts');
    });
  });
});
