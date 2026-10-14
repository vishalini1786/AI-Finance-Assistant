// dashboard.test.js
// Tests the dashboard summary endpoint - the central data aggregator.

const request = require('supertest');
const app = require('../src/app');

describe('Dashboard API', () => {
  let token;
  let categoryId;

  beforeAll(async () => {
    const email = `dashboard_test_${Date.now()}@example.com`;
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Dashboard Tester',
      email,
      password: 'Test@1234',
    });
    token = registerRes.body.data.token;

    const catRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    categoryId = catRes.body.data.categories[0].category_id;
  });

  it('returns dashboard summary for a new user with zero values', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary).toHaveProperty('totalIncome');
    expect(res.body.data.summary).toHaveProperty('totalExpenses');
    expect(res.body.data.summary).toHaveProperty('netCashFlow');
    expect(res.body.data.summary).toHaveProperty('budget');
    expect(res.body.data.summary).toHaveProperty('financialHealthScore');
  });

  it('rejects dashboard without a token', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('returns updated summary after adding income and expense', async () => {
    // Add income
    await request(app)
      .post('/api/income')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'Salary', amount: 5000, incomeDate: '2026-10-01' });

    // Add expense
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId, amount: 1000, expenseDate: '2026-10-01', paymentMode: 'CASH' });

    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.data.summary.totalIncome)).toBe(5000);
    expect(Number(res.body.data.summary.totalExpenses)).toBe(1000);
    expect(Number(res.body.data.summary.netCashFlow)).toBe(4000);
  });

  it('returns monthly trends', async () => {
    const res = await request(app)
      .get('/api/dashboard/monthly-trends')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('trends');
    expect(Array.isArray(res.body.data.trends)).toBe(true);
  });

  it('returns category-wise expenses', async () => {
    const res = await request(app)
      .get('/api/dashboard/category-expenses')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.categoryExpenses)).toBe(true);
  });
});
