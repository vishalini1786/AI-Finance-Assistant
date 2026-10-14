// userRoutes.js

const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const { validateOnboarding } = require('../validators/userValidator');

// Every route in this file requires a valid JWT.
router.use(authMiddleware);

router.get('/me', userController.getProfile);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Onboarding completion — saves all onboarding data to PostgreSQL
// and sets is_onboarded = true
router.post('/onboarding', validate(validateOnboarding), userController.completeOnboarding);
router.put('/expense-preferences', userController.updateExpensePreferences);

module.exports = router;
