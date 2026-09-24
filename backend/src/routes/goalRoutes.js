const express = require('express');
const goalController = require('../controllers/goalController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const validateGoal = require('../validators/goalValidator');

const router = express.Router();
router.use(authMiddleware);
router.get('/', goalController.getGoals);
router.post('/', validate(validateGoal), goalController.createGoal);
router.get('/:id', goalController.getGoal);
router.put('/:id', validate(validateGoal), goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);
module.exports = router;
