const pdfReportService = require('../services/pdfReportService');
const { asyncHandler } = require('../middleware/errorMiddleware');

const downloadPdf = asyncHandler(async (req, res) => pdfReportService.createReport(req.userId, res));
module.exports = { downloadPdf };
