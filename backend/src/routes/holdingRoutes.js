const express = require('express');
const holdingController = require('../controllers/holdingController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const validateHolding = require('../validators/holdingValidator');

const router = express.Router();
router.use(authMiddleware);
router.get('/', holdingController.getHoldings);
router.post('/', validate(validateHolding), holdingController.createHolding);
router.get('/:id', holdingController.getHolding);
router.put('/:id', validate(validateHolding), holdingController.updateHolding);
router.delete('/:id', holdingController.deleteHolding);
module.exports = router;
