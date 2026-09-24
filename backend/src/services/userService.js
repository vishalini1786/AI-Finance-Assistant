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
    name:                  updates.name,
    phone:                 updates.phone,
    occupation:            updates.occupation,
    preferred_language:    updates.preferredLanguage,
    monthly_income:        updates.monthlyIncome,
    profile_picture:       updates.profilePicture,
    theme_preference:      updates.themePreference,
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

/**
 * Persist all onboarding data to PostgreSQL and mark the user as onboarded.
 * This is the ONLY function that sets is_onboarded = true.
 * PostgreSQL is the single source of truth — no localStorage flag.
 */
async function completeOnboarding(userId, onboardingData) {
  const {
    occupation,
    monthlyIncome,
    preferredLanguage,
    financialInterests,
    spendingCategories,
    financialGoals,
    financialExperience,
    aiPreferences,
    savingsHabit,
    investmentPreference,
  } = onboardingData;

  // Validate JSONB array fields to ensure they are arrays before inserting
  const safeArray = (val) => (Array.isArray(val) ? val : []);

  const fields = {
    occupation:             occupation          || null,
    monthly_income:         monthlyIncome       != null ? Number(monthlyIncome) : null,
    preferred_language:     preferredLanguage   || 'en',
    financial_interests:    JSON.stringify(safeArray(financialInterests)),
    spending_categories:    JSON.stringify(safeArray(spendingCategories)),
    financial_goals:        JSON.stringify(safeArray(financialGoals)),
    financial_experience:   financialExperience || null,
    ai_preferences:         JSON.stringify(safeArray(aiPreferences)),
    savings_habit:          savingsHabit        || null,
    investment_preference:  investmentPreference || null,
    is_onboarded:           true,
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

module.exports = { getProfile, updateProfile, completeOnboarding };
