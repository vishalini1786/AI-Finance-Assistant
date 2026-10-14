// projects.test.js
// Integration tests for the Project Budget Tracking API.

const request = require('supertest');
const app = require('../src/app');

describe('Projects API', () => {
  let token;
  let createdProjectId;
  let createdExpenseId;

  beforeAll(async () => {
    const email = `projects_test_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Project Tester',
      email,
      password: 'Test@1234',
    });
    token = res.body.data.token;
  });

  it('creates a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectName: 'Home Renovation',
        description: 'Kitchen remodel',
        targetBudget: 100000,
        startDate: '2026-10-01',
        targetDate: '2027-03-31',
        status: 'ACTIVE',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.project.project_name).toBe('Home Renovation');
    expect(res.body.data.project.remaining_budget).toBe(100000);
    expect(res.body.data.project.utilization_percentage).toBe(0);
    createdProjectId = res.body.data.project.project_id;
  });

  it('lists all projects for the user', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.projects)).toBe(true);
    expect(res.body.data.projects.length).toBeGreaterThan(0);
  });

  it('gets a single project by id', async () => {
    const res = await request(app)
      .get(`/api/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.project.project_id).toBe(createdProjectId);
  });

  it('adds a project expense', async () => {
    const res = await request(app)
      .post(`/api/projects/${createdProjectId}/expenses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        expenseName: 'Tiles',
        category: 'Materials',
        amount: 15000,
        expenseDate: '2026-10-05',
        paymentMode: 'BANK_TRANSFER',
      });

    expect(res.status).toBe(201);
    createdExpenseId = res.body.data.expense.expense_id;
  });

  it('updates utilization_percentage after adding expense', async () => {
    const res = await request(app)
      .get(`/api/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.project.total_spent).toBe(15000);
    expect(res.body.data.project.remaining_budget).toBe(85000);
    expect(res.body.data.project.utilization_percentage).toBe(15);
  });

  it('deletes a project expense', async () => {
    const res = await request(app)
      .delete(`/api/projects/${createdProjectId}/expenses/${createdExpenseId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('returns 404 for a non-existent project', async () => {
    const res = await request(app)
      .get('/api/projects/999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('deletes the project', async () => {
    const res = await request(app)
      .delete(`/api/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
