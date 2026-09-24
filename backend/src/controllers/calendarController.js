const calendarService = require('../services/calendarService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getEvents = asyncHandler(async (req, res) => sendSuccess(res, { message: 'Calendar events fetched successfully', data: { events: await calendarService.getEvents(req.userId) } }));
module.exports = { getEvents };
