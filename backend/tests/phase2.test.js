// phase2.test.js
// Verification suite for Phase 2:
// - 12-Step Onboarding persistence & validation
// - AI Assistant conversational income and expense parsing & preview
// - AI transaction confirmation, cancellation, and duplicate prevention
// - Grounded financial answers
// - Document/OCR validation

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const aiChatService = require('../src/services/aiChatService');

describe('Phase 2 Verification Suite', () => {
  let token;
  let userId;

  beforeAll(async () => {
    const email = `phase2_tester_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Priya Sharma',
      email,
      password: 'TestPassword@123',
    });
    token = res.body.data.token;
    userId = res.body.data.user.user_id;
  });

  describe('PHASE 2A: 12-Step Onboarding API Contract & Persistence', () => {
    it('persists complete 12-step onboarding payload and sets is_onboarded = true', async () => {
      const payload = {
        occupation: 'Working Professional',
        monthlyIncome: 75000,
        preferredLanguage: 'hi',
        financialInterests: ['Saving Money', 'Budget Planning', 'Investments'],
        spendingCategories: ['Food', 'Transport', 'Utilities'],
        financialGoals: ['Build Savings', 'Emergency Fund'],
        financialExperience: 'Comfortable',
        aiPreferences: ['Analyze my spending', 'Give saving suggestions'],
        savingsHabit: '20_30',
        investmentPreference: 'balanced',
        expenseReminderEnabled: true,
        expenseReminderTime: '21:00',
        microExpensePromptsEnabled: true,
      };

      const res = await request(app)
        .post('/api/users/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.is_onboarded).toBe(true);
      expect(res.body.data.user.occupation).toBe('Working Professional');
      expect(res.body.data.user.preferred_language).toBe('hi');

      // Verify in PostgreSQL directly
      const dbUser = await db.query('SELECT is_onboarded, occupation, monthly_income FROM users WHERE user_id = $1', [userId]);
      expect(dbUser.rows[0].is_onboarded).toBe(true);
      expect(dbUser.rows[0].occupation).toBe('Working Professional');
      expect(Number(dbUser.rows[0].monthly_income)).toBe(75000);
    });

    it('rejects invalid onboarding payloads with 400', async () => {
      const res = await request(app)
        .post('/api/users/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({
          occupation: '',
          preferredLanguage: 'invalid_lang_code',
          monthlyIncome: -500,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PHASE 2E & 2G: Conversational Income and Expense Assistant', () => {
    let pendingTx;

    it('Example 1: parses income request and presents structured confirmation preview', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Bro, can you add my salary of ₹10,000?' });

      expect(res.status).toBe(200);
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('income');
      expect(res.body.data.pendingTransaction.amount).toBe(10000);
      expect(res.body.data.pendingTransaction.source).toBe('Salary');
      expect(res.body.data.reply).toContain('Income Confirmation Preview');
      expect(res.body.data.reply).toContain('Should I add this income to your FinMan records?');

      pendingTx = res.body.data.pendingTransaction;
    });

    it('Example 4: allows conversational modification of proposed transaction', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Change it to ₹12000',
          pendingTransaction: pendingTx,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.amount).toBe(12000);
      expect(res.body.data.reply).toContain('12,000');

      pendingTx = res.body.data.pendingTransaction;
    });

    it('confirms and saves proposed income transaction to database', async () => {
      const res = await request(app)
        .post('/api/dashboard/ai/confirm-transaction')
        .set('Authorization', `Bearer ${token}`)
        .send({ pendingTransaction: pendingTx });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);

      // Verify income is in database
      const dbIncome = await db.query(
        'SELECT * FROM incomes WHERE user_id = $1 AND amount = 12000',
        [userId]
      );
      expect(dbIncome.rows.length).toBeGreaterThan(0);
      expect(dbIncome.rows[0].source).toBe('Salary');
    });

    it('prevents duplicate submissions of the exact same pending transaction', async () => {
      const res = await request(app)
        .post('/api/dashboard/ai/confirm-transaction')
        .set('Authorization', `Bearer ${token}`)
        .send({ pendingTransaction: pendingTx });

      expect(res.status).toBe(200);
      expect(res.body.data.alreadySaved).toBe(true);
    });

    it('Example 2: parses expense request and presents preview without saving immediately', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I spent ₹50 on tea today' });

      expect(res.status).toBe(200);
      expect(res.body.data.pendingTransaction).toBeDefined();
      expect(res.body.data.pendingTransaction.type).toBe('expense');
      expect(res.body.data.pendingTransaction.amount).toBe(50);
      expect(res.body.data.pendingTransaction.category).toBe('Food');
      expect(res.body.data.reply).toContain('Expense Confirmation Preview');
      expect(res.body.data.reply).toContain('Should I add this expense to your FinMan records?');

      const expPending = res.body.data.pendingTransaction;

      // Confirm via chat "yes"
      const confirmRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'yes',
          pendingTransaction: expPending,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.transactionSaved).toBe(true);

      // Verify expense in database
      const dbExp = await db.query(
        'SELECT * FROM expenses WHERE user_id = $1 AND amount = 50',
        [userId]
      );
      expect(dbExp.rows.length).toBeGreaterThan(0);
    });

    it('Example 3: clarifies ambiguous requests without guessing type', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Add 500' });

      expect(res.status).toBe(200);
      expect(res.body.data.pendingTransaction).toBeNull();
      expect(res.body.data.reply).toContain('Should I record ₹500 as income or an expense?');
    });

    it('cancellation clears the proposed transaction without creating any record', async () => {
      const startRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I spent ₹999 on shoes' });

      const pendingToCancel = startRes.body.data.pendingTransaction;

      const cancelRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'cancel',
          pendingTransaction: pendingToCancel,
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.pendingTransaction).toBeNull();
      expect(cancelRes.body.data.reply).toContain('Cancelled');

      // Verify 999 is NOT in database
      const dbCheck = await db.query(
        'SELECT * FROM expenses WHERE user_id = $1 AND amount = 999',
        [userId]
      );
      expect(dbCheck.rows.length).toBe(0);
    });

    it('answers grounded questions: "How much income did I receive this month?"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'How much income did I receive this month?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('12,000');
    });

    it('answers grounded questions: "Where am I spending the most?"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Where am I spending the most?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Food');
    });

    it('evaluates affordability calculations deterministically', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Can I afford a phone worth ₹25,000?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Affordability Analysis for ₹25,000');
    });
  });

  describe('PHASE 2D: Document / OCR Validation Contract', () => {
    it('rejects document upload without file with 400', async () => {
      const res = await request(app)
        .post('/api/documents/ocr/receipt')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/required/i);
    });

    it('rejects unsupported file formats with clear 400 error', async () => {
      const res = await request(app)
        .post('/api/documents/ocr/receipt')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('dummy exe content'), 'malicious.exe');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unsupported file format');
    });
  });
});
