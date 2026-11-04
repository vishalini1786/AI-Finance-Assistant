const calendarService = require('../services/calendarService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getEvents = asyncHandler(async (req, res) => sendSuccess(res, { message: 'Calendar events fetched successfully', data: { events: await calendarService.getEvents(req.userId) } }));

const createEvent = asyncHandler(async (req, res) => {
  const { title, eventDate, eventType, amount, description } = req.body;
  const event = await calendarService.createEvent(req.userId, { title, eventDate, eventType, amount, description });
  sendSuccess(res, { message: 'Event created successfully', data: { event } }, 201);
});

module.exports = { getEvents, createEvent };
