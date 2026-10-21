// projectRoutes.js
const express = require('express');
const router = express.Router();

const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const { validateProject, validateProjectExpense } = require('../validators/projectValidator');

// Protect all project routes
router.use(authMiddleware);

router.get('/summary', projectController.getProjectSummary);

router.get('/', projectController.getProjects);
router.post('/', validate(validateProject), projectController.createProject);

router.get('/:projectId/expenses', projectController.getProjectExpenses);
router.post('/:projectId/expenses', validate(validateProjectExpense), projectController.createProjectExpense);
router.put('/:projectId/expenses/:expenseId', validate(validateProjectExpense), projectController.updateProjectExpense);
router.delete('/:projectId/expenses/:expenseId', projectController.deleteProjectExpense);

router.get('/:projectId', projectController.getProject);
router.put('/:projectId', validate(validateProject), projectController.updateProject);
router.delete('/:projectId', projectController.deleteProject);

module.exports = router;
