const calendarRepository = require('../repositories/calendarRepository');

async function getEvents(userId) {
  const events = await calendarRepository.findEventsByUser(userId);
  return events.map((event) => ({
    ...event,
    amount: Number(event.amount || 0),
    event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 10) : null,
  }));
}

module.exports = { getEvents };
