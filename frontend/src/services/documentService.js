import api from './api';

const documentService = {
  uploadReceipt: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/documents/ocr/receipt', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data.data;
  },
};

export default documentService;
