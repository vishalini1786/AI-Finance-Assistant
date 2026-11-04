import api from './api';

const notificationService = {
  getNotifications: async () => (await api.get('/notifications')).data.data,
  markRead: async (id) => (await api.put(`/notifications/${id}/read`)).data.data.notification,
  markAllRead: async () => (await api.put('/notifications/mark-all-read')).data.data,
};

export default notificationService;
