// userService.js

const userRepository = require('../repositories/userRepository');
const { toSafeUser } = require('./authService');

async function getProfile(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }
  return toSafeUser(user);
}

async function updateProfile(userId, updates) {
  // Map camelCase from the API body to the snake_case DB columns.
  const fields = {
    name: updates.name,
    phone: updates.phone,
    occupation: updates.occupation,
    preferred_language: updates.preferredLanguage,
    monthly_income: updates.monthlyIncome,
    profile_picture: updates.profilePicture,
    theme_preference: updates.themePreference,
  };

  const updatedUser = await userRepository.updateProfile(userId, fields);
  if (!updatedUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }
  return toSafeUser(updatedUser);
}

module.exports = { getProfile, updateProfile };
