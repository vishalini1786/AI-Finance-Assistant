const express = require('express');
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadReceipt } = require('../middleware/uploadMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.post('/ocr/receipt', uploadReceipt, documentController.uploadReceipt);
module.exports = router;
