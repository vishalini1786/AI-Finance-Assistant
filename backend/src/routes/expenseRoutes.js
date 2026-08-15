// expenseRoutes.js

const express = require('express');
const router = express.Router();

const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const validateExpense = require('../validators/expenseValidator');

router.use(authMiddleware);

router.post('/', validate(validateExpense), expenseController.createExpense);
router.get('/', expenseController.getAllExpenses);
router.get('/:id', expenseController.getExpenseById);
router.put('/:id', validate(validateExpense), expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
