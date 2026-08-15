// budgetRoutes.js

const express = require('express');
const router = express.Router();

const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const validateBudget = require('../validators/budgetValidator');

router.use(authMiddleware);

router.post('/', validate(validateBudget), budgetController.createBudget);
router.get('/', budgetController.getAllBudgets);
router.get('/:id', budgetController.getBudgetById);
router.put('/:id', budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;
