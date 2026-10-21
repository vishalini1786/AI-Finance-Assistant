import api from './api';

export const DOCUMENT_UPLOAD_ACCEPT = '.png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf';

const documentService = {
  uploadReceipt: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/documents/ocr/receipt', formData);
    return response.data.data;
  },
};

export default documentService;
