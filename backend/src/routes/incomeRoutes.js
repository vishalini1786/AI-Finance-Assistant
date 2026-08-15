// incomeRoutes.js

const express = require('express');
const router = express.Router();

const incomeController = require('../controllers/incomeController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const validateIncome = require('../validators/incomeValidator');

router.use(authMiddleware);

router.post('/', validate(validateIncome), incomeController.createIncome);
router.get('/', incomeController.getAllIncome);
router.get('/:id', incomeController.getIncomeById);
router.put('/:id', validate(validateIncome), incomeController.updateIncome);
router.delete('/:id', incomeController.deleteIncome);

module.exports = router;
