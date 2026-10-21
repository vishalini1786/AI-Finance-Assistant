// authController.js
// Thin HTTP layer: parse the request, call the service, format the response.

const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const { user, token } = await authService.register({ name, email, password, phone });

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

const googleLogin = asyncHandler(async (req, res) => {
  const { credential, demoEmail, demoName } = req.body;
  const { user, token } = await authService.googleLogin({ credential, demoEmail, demoName });

  return sendSuccess(res, {
    message: 'Signed in with Google successfully',
    data: { user, token },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.requestPasswordReset(email);

  return sendSuccess(res, {
    message: result.message,
    data: {
      ...(result.resetUrl ? { resetUrl: result.resetUrl } : {}),
      ...(result.previewUrl ? { previewUrl: result.previewUrl } : {}),
    },
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, newPassword } = req.body;
  const chosenPassword = newPassword || password;
  const result = await authService.resetPassword({ token, newPassword: chosenPassword });

  return sendSuccess(res, {
    message: result.message,
    data: null,
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.userId);

  return sendSuccess(res, {
    message: 'Current user fetched successfully',
    data: { user },
  });
});

module.exports = {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  getMe,
};
