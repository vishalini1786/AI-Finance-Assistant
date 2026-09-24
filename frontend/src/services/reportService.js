import api from './api';

const reportService = {
  downloadPdf: async () => {
    const response = await api.get('/reports/pdf', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'finman-financial-report.pdf';
    link.click();
    URL.revokeObjectURL(url);
  },
};

export default reportService;
