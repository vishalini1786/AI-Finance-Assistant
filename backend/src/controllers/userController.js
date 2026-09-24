// userController.js

const userService = require('../services/userService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.userId);
  return sendSuccess(res, { message: 'Profile fetched successfully', data: { user } });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.userId, req.body);
  return sendSuccess(res, { message: 'Profile updated successfully', data: { user } });
});

/**
 * POST /api/users/onboarding
 * Persists all onboarding selections to PostgreSQL and sets is_onboarded = true.
 * This is the single endpoint responsible for completing the onboarding flow.
 */
const completeOnboarding = asyncHandler(async (req, res) => {
  const user = await userService.completeOnboarding(req.userId, req.body);
  return sendSuccess(res, {
    message: 'Onboarding completed successfully',
    data: { user },
  });
});

module.exports = { getProfile, updateProfile, completeOnboarding };
