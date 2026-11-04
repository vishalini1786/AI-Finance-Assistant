const documentService = require('../services/documentService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendError, sendSuccess } = require('../utils/response');

const uploadReceipt = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, { statusCode: 400, message: 'Receipt file is required' });
  const result = await documentService.processReceipt(req.userId, req.file);

  if (result.status === 'BANK_STATEMENT') {
    return sendError(res, {
      statusCode: 422,
      message: result.message || "This appears to be a bank statement. Please use the 'Import Statement' feature to import bank statements.",
      error: 'BANK_STATEMENT_DETECTED',
    });
  }

  if (result.status === 'INVALID_DOCUMENT') {
    return sendError(res, {
      statusCode: 422,
      message: result.message || 'This document does not appear to be a valid financial receipt or invoice. Please upload a clear receipt, bill, or invoice.',
      error: 'INVALID_FINANCIAL_DOCUMENT',
    });
  }

  if (result.status === 'DUPLICATE') {
    return sendError(res, {
      statusCode: 409,
      message: result.message || 'This receipt or document has already been uploaded.',
      error: 'DUPLICATE_DOCUMENT',
    });
  }

  if (result.status === 'UNAVAILABLE' || result.status === 'FAILED') {
    return sendError(res, {
      statusCode: result.statusCode || 503,
      message: result.message || 'OCR service is temporarily unavailable. Please enter details manually.',
      error: result.statusCode === 422 ? 'OCR_NO_TEXT' : 'OCR_UNAVAILABLE',
    });
  }

  return sendSuccess(res, { message: 'Receipt processed; confirm extracted fields before saving', data: result });
});

const getOcrDiagnostics = asyncHandler(async (req, res) => {
  const diag = await documentService.getOcrDiagnostics();
  return sendSuccess(res, { message: 'OCR service diagnostics fetched', data: diag });
});

module.exports = { uploadReceipt, getOcrDiagnostics };
