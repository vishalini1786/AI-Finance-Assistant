const pdfReportService = require('../services/pdfReportService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendError } = require('../utils/response');

const downloadPdf = asyncHandler(async (req, res) => pdfReportService.createReport(req.userId, res, req.query));

const downloadDailyPdf = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendError(res, { statusCode: 400, message: 'A valid date (YYYY-MM-DD) is required' });
  }
  return pdfReportService.createDailyReport(req.userId, res, date);
});

module.exports = { downloadPdf, downloadDailyPdf };
