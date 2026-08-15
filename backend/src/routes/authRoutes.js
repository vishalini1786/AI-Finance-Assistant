// authRoutes.js

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const { validateRegister, validateLogin } = require('../validators/authValidator');

router.post('/register', validate(validateRegister), authController.register);
router.post('/login', validate(validateLogin), authController.login);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
