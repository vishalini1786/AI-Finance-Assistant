// bankTransactionRoutes.js
// Routes for importing, viewing, reconciling, and managing bank statement transactions.

const express = require('express');
const multer = require('multer');
const router = express.Router();

const bankTransactionController = require('../controllers/bankTransactionController');
const authMiddleware = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || '').toLowerCase();
    if (
      ext.endsWith('.csv') ||
      ext.endsWith('.xlsx') ||
      ext.endsWith('.xls') ||
      ext.endsWith('.txt') ||
      ext.endsWith('.tsv')
    ) {
      return cb(null, true);
    }
    const err = new Error('Only CSV, TSV, XLSX, or XLS files are supported for bank statement imports.');
    err.statusCode = 400;
    err.expose = true;
    cb(err);
  },
});

router.use(authMiddleware);

// Upload & Preview parsed rows without persisting
router.post('/parse-preview', upload.single('file'), bankTransactionController.parsePreview);

// Commit reviewed transactions into database
router.post('/commit-import', bankTransactionController.commitImport);

// List transactions & summary
router.get('/', bankTransactionController.getTransactions);

// List upload batch history
router.get('/batches', bankTransactionController.getBatches);

// Aggregated summary
router.get('/summary', bankTransactionController.getSummary);

// Single transaction details + suggested matches
router.get('/:id', bankTransactionController.getTransaction);

// Reconciliation actions
router.post('/:id/match', bankTransactionController.matchTransaction);
router.post('/:id/post-to-ledger', bankTransactionController.postToLedger);
router.patch('/:id/exclude', bankTransactionController.excludeTransaction);
router.patch('/:id/unmatch', bankTransactionController.unmatchTransaction);
router.delete('/:id', bankTransactionController.deleteTransaction);

module.exports = router;
