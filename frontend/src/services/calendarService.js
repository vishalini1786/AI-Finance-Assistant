import api from './api';

const calendarService = {
  getEvents: async () => (await api.get('/calendar/events')).data.data.events,
};

export default calendarService;
