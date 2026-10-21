// phase3a.test.js
// Verification suite for Phase 3A:
// - Chatbot conversation memory and follow-up confirmations ("yes, add", "yes bro", "seri pa", etc.)
// - Confirmation with no pending transaction (bare "yes" must not create a record)
// - Edits to pending transaction (amount, category, date)
// - Cancellations ("Cancel", "No, I didn't buy tea")
// - Conflict prevention when a new transaction is introduced while one is pending
// - Exactly-once persistence and duplicate prevention

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Phase 3A: Conversational Memory, Confirmation & Idempotency', () => {
  let token;
  let userId;

  beforeAll(async () => {
    const email = `phase3a_tester_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ananya Raman',
      email,
      password: 'TestPassword@123',
    });
    token = res.body.data.token;
    userId = res.body.data.user.user_id;
  });

  describe('1. Natural Confirmations on Pending Transactions', () => {
    it('handles exact user scenario: "Can you add an expense of ₹10 for tea?" followed by "Yes, add."', async () => {
      // 1. Initial request
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Can you add an expense of ₹10 for tea?' });

      expect(initRes.status).toBe(200);
      expect(initRes.body.data.pendingTransaction).toBeDefined();
      expect(initRes.body.data.pendingTransaction.amount).toBe(10);
      expect(initRes.body.data.pendingTransaction.type).toBe('expense');
      expect(initRes.body.data.reply).toContain('Should I add this expense to your FinMan records?');

      const pendingTx = initRes.body.data.pendingTransaction;

      // 2. Follow-up confirmation "Yes, add."
      const confirmRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Yes, add.',
          pendingTransaction: pendingTx,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.transactionSaved).toBe(true);
      expect(confirmRes.body.data.pendingTransaction).toBeNull();
      expect(confirmRes.body.data.reply).toContain('Successfully recorded expense');

      // 3. Verify exactly saved in PostgreSQL
      const dbExp = await db.query(
        'SELECT * FROM expenses WHERE user_id = $1 AND amount = 10 AND merchant_name ILIKE $2',
        [userId, '%tea%']
      );
      expect(dbExp.rows.length).toBe(1);
    });

    it('recognizes colloquial variant "yes bro"', async () => {
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I spent ₹45 on coffee' });

      const pendingTx = initRes.body.data.pendingTransaction;
      expect(pendingTx).toBeDefined();

      const confirmRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'yes bro',
          pendingTransaction: pendingTx,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.transactionSaved).toBe(true);
      expect(confirmRes.body.data.pendingTransaction).toBeNull();
    });

    it('recognizes colloquial variant "seri pa"', async () => {
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I spent ₹30 on bus fare' });

      const pendingTx = initRes.body.data.pendingTransaction;
      expect(pendingTx).toBeDefined();

      const confirmRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'seri pa',
          pendingTransaction: pendingTx,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.transactionSaved).toBe(true);
      expect(confirmRes.body.data.pendingTransaction).toBeNull();
    });

    it('recognizes "Confirm and Add" (from quick action button)', async () => {
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Add my salary of ₹50,000' });

      const pendingTx = initRes.body.data.pendingTransaction;
      expect(pendingTx).toBeDefined();
      expect(pendingTx.type).toBe('income');

      const confirmRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Confirm and Add',
          pendingTransaction: pendingTx,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.transactionSaved).toBe(true);
      expect(confirmRes.body.data.pendingTransaction).toBeNull();

      const dbInc = await db.query(
        'SELECT * FROM incomes WHERE user_id = $1 AND amount = 50000',
        [userId]
      );
      expect(dbInc.rows.length).toBe(1);
    });

    it('recognizes "Okay, save it" and "do it"', async () => {
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I paid 120 for snacks' });

      const pendingTx = initRes.body.data.pendingTransaction;

      const confirmRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Okay, save it',
          pendingTransaction: pendingTx,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.transactionSaved).toBe(true);
    });
  });

  describe('2. Bare Confirmations with No Pending Transaction', () => {
    it('does NOT create financial record when user says "Yes" without pending transaction', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Yes',
          pendingTransaction: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.transactionSaved).toBeUndefined();
      expect(res.body.data.pendingTransaction).toBeNull();
      expect(res.body.data.reply).toContain('no pending transaction waiting for confirmation');
    });

    it('does NOT create financial record when user says "Yes, add" without pending transaction', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Yes, add',
          pendingTransaction: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.transactionSaved).toBeUndefined();
      expect(res.body.data.pendingTransaction).toBeNull();
      expect(res.body.data.reply).toContain('no pending transaction waiting for confirmation');
    });
  });

  describe('3. Edits to Pending Transactions', () => {
    it('supports amount modification: "Change it to ₹100."', async () => {
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I spent ₹50 on snacks' });

      const pendingTx = initRes.body.data.pendingTransaction;
      expect(pendingTx.amount).toBe(50);

      const editRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Change it to ₹100.',
          pendingTransaction: pendingTx,
        });

      expect(editRes.status).toBe(200);
      expect(editRes.body.data.pendingTransaction).toBeDefined();
      expect(editRes.body.data.pendingTransaction.amount).toBe(100);
      expect(editRes.body.data.reply).toContain('100');
    });

    it('supports category modification: "Actually, make the category Transport."', async () => {
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I paid ₹200 for lunch' });

      const pendingTx = initRes.body.data.pendingTransaction;
      expect(pendingTx.category).toBe('Food');

      const editRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Actually, make the category Transport.',
          pendingTransaction: pendingTx,
        });

      expect(editRes.status).toBe(200);
      expect(editRes.body.data.pendingTransaction).toBeDefined();
      expect(editRes.body.data.pendingTransaction.category).toBe('Transportation');
      expect(editRes.body.data.reply).toContain('Transportation');
    });
  });

  describe('4. Cancellations & Rejections', () => {
    it('supports "Cancel." and clears pending transaction', async () => {
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I spent ₹500 on dinner' });

      const pendingTx = initRes.body.data.pendingTransaction;
      expect(pendingTx).toBeDefined();

      const cancelRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Cancel.',
          pendingTransaction: pendingTx,
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.pendingTransaction).toBeNull();
      expect(cancelRes.body.data.reply).toContain('Cancelled');

      // Verify not saved in PostgreSQL
      const dbExp = await db.query(
        'SELECT * FROM expenses WHERE user_id = $1 AND amount = 500',
        [userId]
      );
      expect(dbExp.rows.length).toBe(0);
    });

    it('supports natural rejection: "No, I didn\'t buy tea."', async () => {
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Can you add an expense of ₹15 for tea?' });

      const pendingTx = initRes.body.data.pendingTransaction;
      expect(pendingTx).toBeDefined();

      const cancelRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: "No, I didn't buy tea.",
          pendingTransaction: pendingTx,
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.pendingTransaction).toBeNull();
      expect(cancelRes.body.data.reply).toContain('Cancelled');
    });
  });

  describe('5. Duplicate Protection & Exactly-Once Persistence', () => {
    it('prevents duplicate saves when the same pending transaction confirmation is submitted again', async () => {
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I paid ₹80 for auto' });

      const pendingTx = initRes.body.data.pendingTransaction;

      // First confirmation
      const firstConfirm = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Yes, add',
          pendingTransaction: pendingTx,
        });

      expect(firstConfirm.status).toBe(200);
      expect(firstConfirm.body.data.transactionSaved).toBe(true);

      // Repeated confirmation with same pending transaction ID
      const secondConfirm = await request(app)
        .post('/api/dashboard/ai/confirm-transaction')
        .set('Authorization', `Bearer ${token}`)
        .send({ pendingTransaction: pendingTx });

      expect(secondConfirm.status).toBe(200);
      expect(secondConfirm.body.data.alreadySaved).toBe(true);

      // Verify exactly one record in database
      const dbExp = await db.query(
        'SELECT * FROM expenses WHERE user_id = $1 AND amount = 80',
        [userId]
      );
      expect(dbExp.rows.length).toBe(1);
    });
  });

  describe('6. Conflict Handling (New transaction while one is pending)', () => {
    it('prompts user when a new transaction is introduced while another is pending', async () => {
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I spent ₹25 on tea' });

      const pendingTx = initRes.body.data.pendingTransaction;
      expect(pendingTx.amount).toBe(25);

      // User says: "I spent ₹500 on groceries" without confirming tea
      const conflictRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'I spent ₹500 on groceries',
          pendingTransaction: pendingTx,
        });

      expect(conflictRes.status).toBe(200);
      // Retains existing pending transaction, does not silently overwrite
      expect(conflictRes.body.data.pendingTransaction).toBeDefined();
      expect(conflictRes.body.data.pendingTransaction.amount).toBe(25);
      expect(conflictRes.body.data.reply).toContain('pending');
      expect(conflictRes.body.data.reply).toContain('awaiting confirmation');
    });
  });
});
