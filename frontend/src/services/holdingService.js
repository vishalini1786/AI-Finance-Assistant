import api from './api';

const holdingService = {
  getHoldings: async () => (await api.get('/holdings')).data.data.holdings,
  createHolding: async (data) => (await api.post('/holdings', data)).data.data.holding,
  updateHolding: async (id, data) => (await api.put(`/holdings/${id}`, data)).data.data.holding,
  deleteHolding: async (id) => api.delete(`/holdings/${id}`),
};

export default holdingService;
