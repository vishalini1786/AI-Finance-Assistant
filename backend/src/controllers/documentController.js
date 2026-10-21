const documentService = require('../services/documentService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendError, sendSuccess } = require('../utils/response');

const uploadReceipt = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, { statusCode: 400, message: 'Receipt file is required' });
  const result = await documentService.processReceipt(req.userId, req.file);
  if (result.status === 'UNAVAILABLE') {
    return sendError(res, {
      statusCode: result.statusCode || 503,
      message: result.message,
      error: result.statusCode === 422 ? 'OCR_NO_TEXT' : 'OCR_UNAVAILABLE',
    });
  }
  return sendSuccess(res, { message: 'Receipt processed; confirm extracted fields before saving', data: result });
});

module.exports = { uploadReceipt };
