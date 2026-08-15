// budget.test.js
// Requires a running PostgreSQL instance configured via backend/.env,
// seeded with categories from database/seed/01_categories.sql.

const request = require('supertest');
const app = require('../src/app');

describe('Budget API', () => {
  let token;
  let categoryId;
  let createdBudgetId;
  const month = 8;
  const year = 2026;

  beforeAll(async () => {
    const email = `budget_test_${Date.now()}@example.com`;
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Budget Tester',
      email,
      password: 'Test@1234',
    });
    token = registerRes.body.data.token;

    const categoriesRes = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);
    categoryId = categoriesRes.body.data.categories[0].category_id;
  });

  it('creates a budget', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId, budgetAmount: 500, month, year });

    expect(res.status).toBe(201);
    createdBudgetId = res.body.data.budget.budget_id;
  });

  it('rejects a duplicate budget for the same category/month/year', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId, budgetAmount: 700, month, year });

    expect(res.status).toBe(409);
  });

  it('calculates utilization when listing budgets', async () => {
    const res = await request(app)
      .get('/api/budgets')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const budget = res.body.data.budgets.find((b) => b.budget_id === createdBudgetId);
    expect(budget).toBeDefined();
    expect(budget).toHaveProperty('utilization_percent');
    expect(budget).toHaveProperty('remaining_amount');
    expect(budget).toHaveProperty('is_exceeded');
  });

  it('deletes a budget', async () => {
    const res = await request(app)
      .delete(`/api/budgets/${createdBudgetId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
