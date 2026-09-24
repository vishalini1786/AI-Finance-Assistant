const holdingService = require('../services/holdingService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getHoldings = asyncHandler(async (req, res) => sendSuccess(res, { data: { holdings: await holdingService.getHoldings(req.userId) } }));
const getHolding = asyncHandler(async (req, res) => sendSuccess(res, { data: { holding: await holdingService.getHolding(req.params.id, req.userId) } }));
const createHolding = asyncHandler(async (req, res) => sendSuccess(res, { statusCode: 201, message: 'Investment holding created successfully', data: { holding: await holdingService.createHolding(req.userId, req.body) } }));
const updateHolding = asyncHandler(async (req, res) => sendSuccess(res, { message: 'Investment holding updated successfully', data: { holding: await holdingService.updateHolding(req.params.id, req.userId, req.body) } }));
const deleteHolding = asyncHandler(async (req, res) => { await holdingService.deleteHolding(req.params.id, req.userId); return sendSuccess(res, { message: 'Investment holding deleted successfully' }); });
module.exports = { getHoldings, getHolding, createHolding, updateHolding, deleteHolding };
