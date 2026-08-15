// expense.test.js
// Requires a running PostgreSQL instance configured via backend/.env,
// seeded with categories from database/seed/01_categories.sql.

const request = require('supertest');
const app = require('../src/app');

describe('Expense API', () => {
  let token;
  let categoryId;
  let createdExpenseId;

  beforeAll(async () => {
    const email = `expense_test_${Date.now()}@example.com`;
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Expense Tester',
      email,
      password: 'Test@1234',
    });
    token = registerRes.body.data.token;

    const categoriesRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    categoryId = categoriesRes.body.data.categories[0].category_id;
  });

  it('creates an expense', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId,
        amount: 45.5,
        expenseDate: '2026-08-10',
        merchantName: 'Test Store',
        paymentMode: 'CARD',
      });

    expect(res.status).toBe(201);
    createdExpenseId = res.body.data.expense.expense_id;
  });

  it('rejects an expense with an unknown category', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: 999999, amount: 10, expenseDate: '2026-08-10' });

    expect(res.status).toBe(400);
  });

  it('gets a single expense scoped to the owner', async () => {
    const res = await request(app)
      .get(`/api/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.expense.expense_id).toBe(createdExpenseId);
  });

  it('deletes an expense', async () => {
    const res = await request(app)
      .delete(`/api/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('a second user cannot access the first user\'s expenses', async () => {
    const otherRes = await request(app).post('/api/auth/register').send({
      name: 'Other User',
      email: `other_${Date.now()}@example.com`,
      password: 'Test@1234',
    });
    const otherToken = otherRes.body.data.token;

    const res = await request(app)
      .get(`/api/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });
});
