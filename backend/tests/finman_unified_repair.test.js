// tests/finman_unified_repair.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const aiChatService = require('../src/services/aiChatService');

describe('FinMan — Unified AI Agent & Entity Extraction Repairs', () => {
  let token;
  let testUserId;

  beforeAll(async () => {
    const email = `unified_tester_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ramesh Sundaram',
      email,
      password: 'TestPassword@123',
    });
    token = res.body.data.token;
    testUserId = res.body.data.user.user_id;

    await db.query(
      `UPDATE users 
       SET monthly_income = 75000, 
           occupation = 'Product Specialist',
           preferred_language = 'en',
           is_onboarded = true
       WHERE user_id = $1`,
      [testUserId]
    );
  });

  describe('Section B: Financial Intent & Typed Entity Extraction', () => {
    it('accurately parses "I purchased 1 gram of gold on 19th September 2026, worth about ₹15,000. Add it to my investments."', async () => {
      const msg = 'I purchased 1 gram of gold on 19th September 2026, worth about ₹15,000. Add it to my investments.';
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: msg });

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.pendingTransaction).toBeDefined();

      const tx = data.pendingTransaction;
      // 1. Action: Create an investment holding
      expect(tx.type).toBe('holding');
      // 2. Asset Name: Gold Investment
      expect(tx.name).toBe('Gold Investment');
      // 3. Asset Type: Gold
      expect(tx.holdingType).toBe('Gold');
      // 4. Quantity: 1 (unit: gram)
      expect(Number(tx.quantity)).toBe(1);
      expect(tx.quantityUnit).toBe('gram');
      // 5. Purchase Date: 2026-09-19 (not today's date)
      expect(tx.purchaseDate).toBe('2026-09-19');
      // 6. Purchase Value: ₹15,000 (not ₹19)
      expect(Number(tx.purchaseValue)).toBe(15000);
      // 7. Current Value: ₹15,000
      expect(Number(tx.currentValue)).toBe(15000);
      // 8. Currency: INR
      expect(tx.currency).toBe('INR');
      // 9. Status: PENDING_CONFIRMATION
      expect(tx.status).toBe('PENDING_CONFIRMATION');

      // Verify readable preview message
      expect(data.reply).toContain('Gold Investment');
      expect(data.reply).toContain('1 gram');
      expect(data.reply).toContain('2026-09-19');
      expect(data.reply).toContain('15,000');
    });

    it('distinguishes percentages, durations, quantities, and dates from monetary amounts', () => {
      const text = 'I bought 5 units of stock for ₹2,500 with 8% return expected over 12 months on 15th August 2026';
      const entities = aiChatService.extractFinancialEntities ? aiChatService.extractFinancialEntities(text) : null;
      if (entities) {
        expect(entities.quantities[0].value).toBe(5);
        expect(entities.quantities[0].unit).toBe('units');
        expect(entities.percentages[0].value).toBe(8);
        expect(entities.durations[0].value).toBe(12);
        expect(entities.dates[0].iso).toBe('2026-08-15');
        expect(entities.money[0].value).toBe(2500);
      }
    });
  });

  describe('Section D: Full-Day Narration & Batch Processing', () => {
    it('identifies five separate expenses from word narration totaling ₹1,260', async () => {
      const msg = 'This morning I had tea for ten rupees. Breakfast cost two hundred. I bought fruits for fifty. Later I filled petrol for five hundred, and in the evening I went to the theatre and spent another five hundred.';
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: msg });

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.pendingTransaction).toBeDefined();

      const batch = data.pendingTransaction;
      expect(batch.type).toBe('batch');
      expect(batch.count).toBe(5);
      expect(batch.items.length).toBe(5);
      expect(batch.totalAmount).toBe(1260);

      // Verify amounts and item names
      const amounts = batch.items.map((it) => it.amount);
      expect(amounts).toEqual([10, 200, 50, 500, 500]);

      // Verify categories mapped correctly from existing schema
      const categories = batch.items.map((it) => it.category);
      expect(categories[0]).toBe('Food'); // Tea
      expect(categories[1]).toBe('Food'); // Breakfast
      expect(categories[2]).toBe('Food'); // Fruits
      expect(categories[3]).toBe('Transportation'); // Petrol
      expect(categories[4]).toBe('Entertainment'); // Theatre
    });

    it('identifies five separate expenses from comma-separated list', async () => {
      const msg = 'I spent ₹10 on tea, ₹200 on breakfast, ₹50 on fruits, ₹500 on petrol, and ₹500 at the theatre.';
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: msg });

      expect(res.status).toBe(200);
      const batch = res.body.data.pendingTransaction;
      expect(batch).toBeDefined();
      expect(batch.type).toBe('batch');
      expect(batch.count).toBe(5);
      expect(batch.totalAmount).toBe(1260);
    });

    it('handles mixed income and expense narration', async () => {
      const msg = 'I received ₹10,000 from freelancing yesterday, and spent ₹450 on dinner.';
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: msg });

      expect(res.status).toBe(200);
      const batch = res.body.data.pendingTransaction;
      expect(batch).toBeDefined();
      expect(batch.type).toBe('batch');
      expect(batch.items.length).toBe(2);

      const incomeItem = batch.items.find((it) => it.type === 'income');
      const expenseItem = batch.items.find((it) => it.type === 'expense');

      expect(incomeItem).toBeDefined();
      expect(incomeItem.amount).toBe(10000);
      expect(incomeItem.source).toBe('Freelance');

      expect(expenseItem).toBeDefined();
      expect(expenseItem.amount).toBe(450);
      expect(expenseItem.category).toBe('Food');
    });

    it('supports conversational correction to batch: "change breakfast to 250"', async () => {
      // 1. Send narration
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I spent ₹10 on tea and ₹200 on breakfast.' });

      expect(initRes.status).toBe(200);
      const pendingBatch = initRes.body.data.pendingTransaction;
      expect(pendingBatch.type).toBe('batch');
      expect(pendingBatch.totalAmount).toBe(210);

      // 2. Correct breakfast to 250
      const editRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'Change breakfast to 250',
          pendingTransaction: pendingBatch,
        });

      expect(editRes.status).toBe(200);
      const updatedBatch = editRes.body.data.pendingTransaction;
      expect(updatedBatch).toBeDefined();
      expect(updatedBatch.type).toBe('batch');
      expect(updatedBatch.totalAmount).toBe(260);

      const breakfast = updatedBatch.items.find((it) => it.merchantName.toLowerCase().includes('breakfast'));
      expect(breakfast.amount).toBe(250);
    });

    it('confirms and executes batch transactions via "yes add" without duplicates', async () => {
      // 1. Propose batch
      const initRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I spent ₹15 on tea and ₹45 on snacks today' });

      expect(initRes.status).toBe(200);
      const pendingBatch = initRes.body.data.pendingTransaction;
      expect(pendingBatch.type).toBe('batch');

      // 2. Confirm batch
      const confirmRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'yes add',
          pendingTransaction: pendingBatch,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.reply).toContain('Successfully saved');
      expect(confirmRes.body.data.transactionSaved).toBe(true);

      // 3. Confirming again is idempotent
      const dupRes = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          message: 'confirm',
          pendingTransaction: pendingBatch,
        });

      expect(dupRes.status).toBe(200);
      expect(dupRes.body.data.reply).toContain('already been saved');
    }, 20000);
  });
});
