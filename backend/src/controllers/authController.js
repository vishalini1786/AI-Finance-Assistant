// authController.js
// Thin HTTP layer: parse the request, call the service, format the response.
// No SQL and no business rules here.

const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, token } = await authService.register({ name, email, password });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Account created successfully',
    data: { user, token },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login({ email, password });

  return sendSuccess(res, {
    message: 'Logged in successfully',
    data: { user, token },
  });
});

const getMe = asyncHandler(async (req, res) => {
  // req.userId is set by authMiddleware after verifying the JWT.
  const user = await authService.getCurrentUser(req.userId);

  return sendSuccess(res, {
    message: 'Current user fetched successfully',
    data: { user },
  });
});

module.exports = { register, login, getMe };
