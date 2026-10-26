import api from './api';

const liabilityService = {
  getLiabilities: async (params = {}) => {
    const response = await api.get('/liabilities', { params });
    return response.data.data;
  },

  getSummary: async () => {
    const response = await api.get('/liabilities/summary');
    return response.data.data;
  },

  getLiability: async (id) => {
    const response = await api.get(`/liabilities/${id}`);
    return response.data.data;
  },

  createLiability: async (data) => {
    const response = await api.post('/liabilities', data);
    return response.data.data;
  },

  updateLiability: async (id, data) => {
    const response = await api.put(`/liabilities/${id}`, data);
    return response.data.data;
  },

  deleteLiability: async (id) => {
    const response = await api.delete(`/liabilities/${id}`);
    return response.data;
  },

  archiveLiability: async (id) => {
    const response = await api.patch(`/liabilities/${id}/archive`);
    return response.data.data;
  },

  recordPayment: async (id, paymentData) => {
    const response = await api.post(`/liabilities/${id}/payments`, paymentData);
    return response.data.data;
  },
};

export default liabilityService;
