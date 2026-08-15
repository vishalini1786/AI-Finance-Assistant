// validationMiddleware.js
// Runs a validator function (from src/validators/) against req.body
// and stops the request early with a clear 400 error if anything
// is invalid. Keeps the "how do I validate this" logic out of
// controllers.
//
// Usage in a route file:
//   router.post('/', validate(incomeValidator), incomeController.create);

const { sendError } = require('../utils/response');

function validate(validatorFn) {
  return (req, res, next) => {
    const errors = validatorFn(req.body);

    if (errors.length > 0) {
      return sendError(res, {
        statusCode: 400,
        message: 'Validation failed',
        error: errors.join('; '),
      });
    }

    next();
  };
}

module.exports = validate;
