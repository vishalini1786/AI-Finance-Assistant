import api from './api';

const calendarService = {
  getEvents: async () => (await api.get('/calendar/events')).data.data.events,
  createEvent: async ({ title, eventDate, eventType, amount, description }) =>
    (await api.post('/calendar/events', { title, eventDate, eventType, amount, description })).data.data.event,
};

export default calendarService;
