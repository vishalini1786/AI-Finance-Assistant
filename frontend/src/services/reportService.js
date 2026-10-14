import api from './api';

const reportService = {
  downloadPdf: async (params = {}) => {
    const response = await api.get('/reports/pdf', { params, responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'finman-financial-report.pdf';
    link.click();
    URL.revokeObjectURL(url);
  },
  downloadDailyPdf: async (date) => {
    const response = await api.get('/reports/pdf/daily', { params: { date }, responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finman-daily-${date}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export default reportService;
