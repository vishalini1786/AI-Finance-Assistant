import api from './api';

const goalService = {
  getGoals: async () => (await api.get('/goals')).data.data.goals,
  createGoal: async (data) => (await api.post('/goals', data)).data.data.goal,
  updateGoal: async (id, data) => (await api.put(`/goals/${id}`, data)).data.data.goal,
  deleteGoal: async (id) => api.delete(`/goals/${id}`),
};

export default goalService;
