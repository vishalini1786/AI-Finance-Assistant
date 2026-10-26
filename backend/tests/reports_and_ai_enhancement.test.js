// reports_and_ai_enhancement.test.js
// Verification suite for Financial Reports, PDF Generation, MoM/YoY comparisons,
// Liability & Net Worth Integration, and Conversational AI Assistant.

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');

jest.setTimeout(30000);

describe('Reports & Conversational AI Assistant Enhancement Suite', () => {
  let token;
  let userId;
  let foodCatId;
  let rentCatId;

  beforeAll(async () => {
    const email = `reports_test_${Date.now()}@example.com`;
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Priya Sharma',
      email,
      password: 'ReportsPass@123',
    });
    token = regRes.body.data.token;
    userId = regRes.body.data.user.user_id;

    // Fetch category IDs
    const catRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    const cats = catRes.body.data.categories;
    foodCatId = cats.find((c) => c.name.toLowerCase().includes('food'))?.category_id || cats[0].category_id;
    rentCatId = cats.find((c) => c.name.toLowerCase().includes('rent') || c.name.toLowerCase().includes('housing'))?.category_id || cats[1].category_id;

    // Seed test financial records for October 2026:
    // Income: ₹60,000
    await request(app)
      .post('/api/income')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'Salary', amount: 60000, incomeDate: '2026-10-01' });

    // Expenses: Food ₹8,000, Rent ₹22,000 (Total Expenses: ₹30,000)
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: foodCatId, amount: 8000, expenseDate: '2026-10-05', paymentMode: 'UPI' });

    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: rentCatId, amount: 22000, expenseDate: '2026-10-06', paymentMode: 'Net Banking' });

    // Holding (Asset): Mutual Fund worth ₹1,50,000
    await request(app)
      .post('/api/holdings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Nifty 50 Index Fund',
        holdingType: 'MUTUAL_FUND',
        quantity: 100,
        currentValue: 150000,
        purchaseValue: 120000,
        purchaseDate: '2026-01-15',
      });

    // Liability: Car Loan with remaining amount ₹40,000
    await pool.query(
      `INSERT INTO liabilities (user_id, liability_type, name, total_amount, remaining_amount, interest_rate, due_date)
       VALUES ($1, 'LOAN', 'Car Loan', 100000, 40000, 8.5, '2027-05-10')`,
      [userId]
    );

    // Goal: Emergency Fund
    await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goalName: 'Emergency Reserve',
        targetAmount: 100000,
        targetDate: '2027-12-31',
      });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Module 1: Comprehensive Reports Endpoint & Period Controls', () => {
    it('returns valid comprehensive report for this month with correct financial summary', async () => {
      const res = await request(app)
        .get('/api/reports/comprehensive?period=this_month')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('momComparison');
      expect(data).toHaveProperty('yoyComparison');
      expect(data).toHaveProperty('categoryExpenses');
      expect(data).toHaveProperty('assets');
      expect(data).toHaveProperty('liabilities');
      expect(data).toHaveProperty('observations');

      const { summary } = data;
      expect(Number(summary.totalIncome)).toBe(60000);
      expect(Number(summary.totalExpenses)).toBe(30000);
      expect(Number(summary.netCashFlow)).toBe(30000);
      expect(Number(summary.periodSavings)).toBe(30000);
      expect(Number(summary.totalAssets)).toBe(150000);
      expect(Number(summary.totalLiabilities)).toBe(40000);
      expect(Number(summary.netWorth)).toBe(110000); // 150000 - 40000
    });

    it('calculates category percentages correctly without NaN or undefined', async () => {
      const res = await request(app)
        .get('/api/reports/comprehensive?period=this_month')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const { categoryExpenses } = res.body.data;
      expect(categoryExpenses.length).toBeGreaterThan(0);

      categoryExpenses.forEach((cat) => {
        expect(typeof cat.category_name).toBe('string');
        expect(Number.isFinite(cat.total_amount)).toBe(true);
        expect(Number.isFinite(cat.percentage)).toBe(true);
        expect(cat.percentage).toBeGreaterThanOrEqual(0);
        expect(cat.percentage).toBeLessThanOrEqual(100);
      });

      // Total percentage should sum to approximately 100%
      const totalPct = categoryExpenses.reduce((sum, c) => sum + c.percentage, 0);
      expect(Math.round(totalPct)).toBe(100);
    });

    it('handles zero-denominator comparison safely without throwing or outputting Infinity', async () => {
      // Prior month had no income/expenses recorded
      const res = await request(app)
        .get('/api/reports/comprehensive?period=this_month')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const mom = res.body.data.momComparison;
      expect(mom).toBeDefined();

      // Income delta from zero should have null or numeric percentageChange, not NaN or Infinity
      expect(mom.income.percentageChange === null || Number.isFinite(mom.income.percentageChange)).toBe(true);
      expect(mom.income.status).toBe('Increased');
      expect(mom.income.absoluteChange).toBe(60000);
    });

    it('supports custom date range query parameters', async () => {
      const res = await request(app)
        .get('/api/reports/comprehensive?period=custom&startDate=2026-10-01&endDate=2026-10-31')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.startDate).toBe('2026-10-01');
      expect(res.body.data.endDate).toBe('2026-10-31');
      expect(res.body.data.summary.totalIncome).toBe(60000);
      expect(res.body.data.summary.totalExpenses).toBe(30000);
    });
  });

  describe('Module 4: PDF Report Generation Reliability', () => {
    it('downloads comprehensive financial PDF report matching data', async () => {
      const res = await request(app)
        .get('/api/reports/pdf?period=this_month')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('finman-financial-report.pdf');

      // Check PDF magic byte header
      const buffer = res.body;
      expect(buffer.slice(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('Conversational AI Assistant Enhancement', () => {
    it('answers natural question about spending without canned boilerplate repetition', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'How much did I spend this month?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const reply = res.body.data.reply;
      // Must NOT contain the repetitive canned boilerplate
      expect(reply).not.toContain('I am your FinMan Personal Finance Assistant, grounded in your real financial records.');
      // Must contain actual numbers
      expect(reply).toContain('30,000');
    });

    it('answers "Where does most of my money go?" with calculated category breakdown', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Where does most of my money go?' });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).not.toContain('undefined');
      expect(reply).not.toContain('NaN');
      // Rent was ₹22,000 out of ₹30,000 (largest category)
      expect(reply).toMatch(/Rent|Housing|Food/i);
    });

    it('responds empathetically and conversationally to "Bro, I think I am spending too much"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: "Bro, I think I'm spending too much" });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).not.toContain('I am your FinMan Personal Finance Assistant, grounded in your real financial records.');
      // Should give a direct answer about cash flow or surplus
      expect(reply).toMatch(/spending|expenses|surplus|income/i);
    });

    it('provides clear plain English summary for "Explain it in simple words"', async () => {
      const res = await request(app)
        .post('/api/dashboard/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Explain it in simple words' });

      expect(res.status).toBe(200);
      const reply = res.body.data.reply;
      expect(reply).toMatch(/Money Came In|Money Went Out|Leftover|Net Worth/i);
      expect(reply).not.toContain('undefined');
    });
  });
});
