import api from './api';

const notificationService = {
  getNotifications: async () => (await api.get('/notifications')).data.data,
  markRead: async (id) => (await api.put(`/notifications/${id}/read`)).data.data.notification,
};

export default notificationService;
