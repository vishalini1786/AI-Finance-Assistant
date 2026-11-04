// liabilityRoutes.js
// Routes for managing liabilities and debt repayments.

const express = require('express');
const router = express.Router();

const liabilityController = require('../controllers/liabilityController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const { validateLiability, validateLiabilityUpdate, validateRepayment } = require('../validators/liabilityValidator');

router.use(authMiddleware);

router.get('/summary', liabilityController.getSummary);
router.get('/', liabilityController.getLiabilities);
router.post('/', validate(validateLiability), liabilityController.createLiability);
router.get('/:id', liabilityController.getLiability);
router.put('/:id', validate(validateLiabilityUpdate), liabilityController.updateLiability);
router.delete('/:id', liabilityController.deleteLiability);
router.patch('/:id/archive', liabilityController.archiveLiability);
router.get('/:id/calculate-repayment', liabilityController.calculateRepayment);
router.post('/:id/calculate-repayment', liabilityController.calculateRepayment);
router.post('/:id/payments', validate(validateRepayment), liabilityController.recordPayment);

module.exports = router;
