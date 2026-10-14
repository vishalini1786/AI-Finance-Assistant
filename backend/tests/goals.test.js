// goals.test.js
// Integration tests for the Savings Goals API.

const request = require('supertest');
const app = require('../src/app');

describe('Savings Goals API', () => {
  let token;
  let createdGoalId;

  beforeAll(async () => {
    const email = `goals_test_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Goals Tester',
      email,
      password: 'Test@1234',
    });
    token = res.body.data.token;
  });

  it('creates a savings goal', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goalName: 'Emergency Fund',
        targetAmount: 50000,
        currentAmount: 10000,
        targetDate: '2027-12-31',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.goal.goal_name).toBe('Emergency Fund');
    expect(res.body.data.goal.progress_percent).toBe(20);
    expect(res.body.data.goal.remaining_amount).toBe(40000);
    createdGoalId = res.body.data.goal.goal_id;
  });

  it('lists all goals for the user', async () => {
    const res = await request(app)
      .get('/api/goals')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.goals)).toBe(true);
    expect(res.body.data.goals.length).toBeGreaterThan(0);
  });

  it('gets a single goal by id', async () => {
    const res = await request(app)
      .get(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.goal.goal_id).toBe(createdGoalId);
  });

  it('updates a savings goal', async () => {
    const res = await request(app)
      .put(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        goalName: 'Emergency Fund',
        targetAmount: 50000,
        currentAmount: 25000,
        targetDate: '2027-12-31',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.goal.progress_percent).toBe(50);
    expect(res.body.data.goal.remaining_amount).toBe(25000);
  });

  it('returns 404 for a non-existent goal', async () => {
    const res = await request(app)
      .get('/api/goals/999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('deletes a savings goal', async () => {
    const res = await request(app)
      .delete(`/api/goals/${createdGoalId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('rejects goal creation without a token', async () => {
    const res = await request(app).post('/api/goals').send({
      goalName: 'Vacation',
      targetAmount: 10000,
      currentAmount: 0,
    });
    expect(res.status).toBe(401);
  });
});
