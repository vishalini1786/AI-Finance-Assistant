const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.get('/pdf', reportController.downloadPdf);
router.get('/pdf/daily', reportController.downloadDailyPdf);
module.exports = router;
