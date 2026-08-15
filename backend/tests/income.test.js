// income.test.js
// Requires a running PostgreSQL instance configured via backend/.env

const request = require('supertest');
const app = require('../src/app');

describe('Income API', () => {
  let token;
  let createdIncomeId;

  beforeAll(async () => {
    const email = `income_test_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Income Tester',
      email,
      password: 'Test@1234',
    });
    token = res.body.data.token;
  });

  it('creates an income record', async () => {
    const res = await request(app)
      .post('/api/income')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'Salary', amount: 3000, incomeDate: '2026-08-01', description: 'August salary' });

    expect(res.status).toBe(201);
    expect(res.body.data.income.amount).toBe('3000.00');
    createdIncomeId = res.body.data.income.income_id;
  });

  it('rejects an invalid income source', async () => {
    const res = await request(app)
      .post('/api/income')
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'NotARealSource', amount: 100, incomeDate: '2026-08-01' });

    expect(res.status).toBe(400);
  });

  it('lists only the current user\'s income', async () => {
    const res = await request(app)
      .get('/api/income')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.income)).toBe(true);
    expect(res.body.data.income.length).toBeGreaterThan(0);
  });

  it('updates an income record', async () => {
    const res = await request(app)
      .put(`/api/income/${createdIncomeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'Salary', amount: 3200, incomeDate: '2026-08-01', description: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.income.amount).toBe('3200.00');
  });

  it('deletes an income record', async () => {
    const res = await request(app)
      .delete(`/api/income/${createdIncomeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/income');
    expect(res.status).toBe(401);
  });
});
