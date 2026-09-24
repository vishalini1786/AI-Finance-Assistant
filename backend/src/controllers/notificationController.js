const notificationService = require('../services/notificationService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getNotifications = asyncHandler(async (req, res) => sendSuccess(res, { data: await notificationService.getNotifications(req.userId) }));
const markRead = asyncHandler(async (req, res) => sendSuccess(res, { data: { notification: await notificationService.markRead(req.params.id, req.userId) } }));
module.exports = { getNotifications, markRead };
