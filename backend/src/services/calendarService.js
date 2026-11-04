const calendarRepository = require('../repositories/calendarRepository');

async function getEvents(userId) {
  const events = await calendarRepository.findEventsByUser(userId);
  return events.map((event) => ({
    ...event,
    amount: Number(event.amount || 0),
    event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 10) : null,
  }));
}

async function createEvent(userId, { title, eventDate, eventType, amount, description }) {
  if (!title || !title.trim()) {
    const err = new Error('Event title is required');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }
  if (!eventDate) {
    const err = new Error('Event date is required');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  // Validate date format YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(eventDate)) {
    const err = new Error('Invalid date format. Use YYYY-MM-DD');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  const event = await calendarRepository.createCalendarEvent(userId, {
    title: String(title).trim().substring(0, 255),
    eventDate,
    eventType: eventType || 'bill',
    amount: Number(amount) || 0,
    description: description ? String(description).trim().substring(0, 500) : null,
  });

  return {
    source_id: event?.recurring_payment_id,
    event_type: eventType || 'bill',
    title: event?.name || title,
    amount: Number(event?.amount || 0),
    event_date: eventDate,
    description: description || null,
    source_type: 'recurring_payments',
  };
}

module.exports = { getEvents, createEvent };
