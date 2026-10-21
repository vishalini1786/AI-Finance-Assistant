// phase3b.test.js
// Verification suite for Phase 3B:
// - Conversational behavior & informal slang ("Hey bro", "Hi da", "Can you help me?")
// - Deterministic profile integration ("Add my salary.")
// - Deterministic financial calculations & period shifts ("What did I spend last month?", "What about the previous month?")
// - Conversational corrections ("No, I meant expenses, not income.")
// - Entity references ("What was my last expense?", "that expense")
// - Authenticated database grounding

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Phase 3B: Personalization and Memory Across Sessions', () => {
  jest.setTimeout(20000);
  let token;
  let userId;

  beforeAll(async () => {
    const email = `phase3b_tester_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Karthik Subramanian',
      email,
      password: 'TestPassword@123',
    });
    token = res.body.data.token;
    userId = res.body.data.user.user_id;

    // Set user profile with monthly income
    await db.query(
      `UPDATE users 
       SET monthly_income = 85000, 
           occupation = 'Senior Engineer',
           preferred_language = 'en',
           is_onboarded = true
       WHERE user_id = $1`,
      [userId]
    );

    // Seed previous month and current month transactions for deterministic testing
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    const prevYear = curMonth === 1 ? curYear - 1 : curYear;

    const prevDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-15`;
    const curDate = `${curYear}-${String(curMonth).padStart(2, '0')}-05`;

    // Seed previous month expense (₹4500)
    await db.query(
      `INSERT INTO expenses (user_id, category_id, merchant_name, amount, expense_date, payment_mode)
       VALUES ($1, 1, 'Supermarket Supplies', 4500, $2, 'UPI')`,
      [userId, prevDate]
    );

    // Seed previous month income (₹85000 salary)
    await db.query(
      `INSERT INTO incomes (user_id, source, amount, income_date, description)
       VALUES ($1, 'Salary', 85000, $2, 'Monthly Company Salary')`,
      [userId, prevDate]
    );

    // Seed current month expense (₹1200)
    await db.query(
      `INSERT INTO expenses (user_id, category_id, merchant_name, amount, expense_date, payment_mode)
       VALUES ($1, 1, 'Dinner Cafe', 1200, $2, 'UPI')`,
      [userId, curDate]
    );
  });

  describe('1. Natural Tone & Conversational Openers', () => {
    it('handles informal greeting "Hey bro" naturally with friendly tone', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Hey bro' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toMatch(/Hey bro!/i);
      expect(res.body.data.suggestedQuestions.length).toBeGreaterThan(0);
    });

    it('handles informal greeting "Hi da" naturally', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Hi da' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toMatch(/Hi da!/i);
    });

    it('handles capability request "Can you help me?" with comprehensive overview', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Can you help me?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('FinMan Financial Assistant');
      expect(res.body.data.reply).toContain('Add Transactions Naturally');
      expect(res.body.data.reply).toContain('Spending Analysis');
      expect(res.body.data.reply).toContain('Period Comparisons');
    });
  });

  describe('2. Personalized Salary Entry from Profile', () => {
    it('proposes salary entry using verified profile monthly income (₹85,000) when user says "Add my salary."', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Add my salary.' });

      expect(res.status).toBe(200);
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('income');
      expect(res.body.data.pendingTransaction.amount).toBe(85000);
      expect(res.body.data.reply).toContain('85,000');
      expect(res.body.data.reply).toContain('verified profile');
    });
  });

  describe('3. Deterministic Financial Answers & Period Shifts', () => {
    it('calculates deterministic spending for last month when directly asked "What did I spend last month?"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'What did I spend last month?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('4,500');
    });

    it('handles period shift: "How much did I spend this month?" followed by "What about the previous month?"', async () => {
      // 1. Current month query
      const firstRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'How much did I spend this month?' });

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.data.reply).toContain('1,200');

      // 2. Follow-up period shift
      const shiftRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'What about the previous month?',
          history: [
            { role: 'user', content: 'How much did I spend this month?' },
            { role: 'assistant', content: firstRes.body.data.reply },
          ],
        });

      expect(shiftRes.status).toBe(200);
      expect(shiftRes.body.data.reply).toContain('4,500');
    });

    it('handles period shift for income: "How much income did I receive this month?" followed by "What about last month?"', async () => {
      const firstRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'How much income did I receive this month?' });

      expect(firstRes.status).toBe(200);

      const shiftRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'What about last month?',
          history: [
            { role: 'user', content: 'How much income did I receive this month?' },
            { role: 'assistant', content: firstRes.body.data.reply },
          ],
        });

      expect(shiftRes.status).toBe(200);
      expect(shiftRes.body.data.reply).toContain('85,000');
    });
  });

  describe('4. Conversational Corrections & Entity References', () => {
    it('converts pending transaction when user says "No, I meant expenses, not income."', async () => {
      // 1. User starts income
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Add 600 received' });

      const pendingTx = initRes.body.data.pendingTransaction;
      expect(pendingTx.type).toBe('income');
      expect(pendingTx.amount).toBe(600);

      // 2. User corrects: "No, I meant expenses, not income."
      const correctRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'No, I meant expenses, not income.',
          pendingTransaction: pendingTx,
        });

      expect(correctRes.status).toBe(200);
      expect(correctRes.body.data.pendingTransaction).toBeDefined();
      expect(correctRes.body.data.pendingTransaction.type).toBe('expense');
      expect(correctRes.body.data.pendingTransaction.amount).toBe(600);
      expect(correctRes.body.data.reply).toContain('Expense');
    });

    it('resolves reference to "the previous one" / "what was my last expense"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'What was my last expense?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('1,200');
      expect(res.body.data.reply).toContain('Dinner Cafe');
    }, 15000);
  });
});
