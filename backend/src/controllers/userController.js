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

module.exports = { getProfile, updateProfile };
