const express = require('express');
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadReceipt } = require('../middleware/uploadMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.get('/ocr/status', documentController.getOcrDiagnostics);
router.post('/ocr/receipt', uploadReceipt, documentController.uploadReceipt);
router.post('/upload', uploadReceipt, documentController.uploadReceipt);
module.exports = router;
