// recurringPatternController.js

const recurringPatternService = require('../services/recurringPatternService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getPatterns = asyncHandler(async (req, res) => {
  const patterns = await recurringPatternService.getPatterns(req.userId, req.query.status);
  return sendSuccess(res, {
    message: 'Recurring spending patterns fetched successfully',
    data: { patterns },
  });
});

const createPattern = asyncHandler(async (req, res) => {
  const pattern = await recurringPatternService.createManualPattern(req.userId, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Recurring pattern created successfully',
    data: { pattern },
  });
});

const updatePattern = asyncHandler(async (req, res) => {
  const pattern = await recurringPatternService.updatePattern(req.params.id, req.userId, req.body);
  return sendSuccess(res, {
    message: 'Recurring pattern updated successfully',
    data: { pattern },
  });
});

const deletePattern = asyncHandler(async (req, res) => {
  await recurringPatternService.deletePattern(req.params.id, req.userId);
  return sendSuccess(res, {
    message: 'Recurring pattern removed successfully',
    data: {},
  });
});

const getDuePrompts = asyncHandler(async (req, res) => {
  const prompts = await recurringPatternService.getDuePrompts(req.userId, req.query.date);
  return sendSuccess(res, {
    message: 'Due recurring prompts fetched successfully',
    data: { prompts },
  });
});

const respondToPrompt = asyncHandler(async (req, res) => {
  const result = await recurringPatternService.respondToPrompt(req.params.id, req.userId, req.body);
  return sendSuccess(res, {
    message: result.message || 'Prompt response recorded',
    data: result,
  });
});

module.exports = {
  getPatterns,
  createPattern,
  updatePattern,
  deletePattern,
  getDuePrompts,
  respondToPrompt,
};
