// categoryRoutes.js

const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', categoryController.getAllCategories);

module.exports = router;
