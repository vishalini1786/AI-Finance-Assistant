import api from './api';

const bankTransactionService = {
  parsePreview: async (formData) => {
    const response = await api.post('/bank-transactions/parse-preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  commitImport: async (payload) => {
    const response = await api.post('/bank-transactions/commit-import', payload);
    return response.data.data;
  },

  getTransactions: async (params = {}) => {
    const response = await api.get('/bank-transactions', { params });
    return response.data.data;
  },

  getTransaction: async (id) => {
    const response = await api.get(`/bank-transactions/${id}`);
    return response.data.data;
  },

  getBatches: async () => {
    const response = await api.get('/bank-transactions/batches');
    return response.data.data;
  },

  matchTransaction: async (id, payload) => {
    const response = await api.post(`/bank-transactions/${id}/match`, payload);
    return response.data.data;
  },

  postToLedger: async (id, payload) => {
    const response = await api.post(`/bank-transactions/${id}/post-to-ledger`, payload);
    return response.data.data;
  },

  excludeTransaction: async (id) => {
    const response = await api.patch(`/bank-transactions/${id}/exclude`);
    return response.data.data;
  },

  unmatchTransaction: async (id) => {
    const response = await api.patch(`/bank-transactions/${id}/unmatch`);
    return response.data.data;
  },

  deleteTransaction: async (id) => {
    const response = await api.delete(`/bank-transactions/${id}`);
    return response.data;
  },
};

export default bankTransactionService;
