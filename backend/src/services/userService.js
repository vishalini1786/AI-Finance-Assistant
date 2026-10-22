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
  const fields = {};
  if (updates.name !== undefined) fields.name = updates.name;
  if (updates.phone !== undefined) fields.phone = updates.phone;
  if (updates.occupation !== undefined) fields.occupation = updates.occupation;
  if (updates.preferredLanguage !== undefined) fields.preferred_language = updates.preferredLanguage;
  if (updates.monthlyIncome !== undefined) fields.monthly_income = updates.monthlyIncome;
  if (updates.profilePicture !== undefined) fields.profile_picture = updates.profilePicture;
  if (updates.themePreference !== undefined) fields.theme_preference = updates.themePreference;
  if (updates.expenseReminderEnabled !== undefined) fields.expense_reminder_enabled = updates.expenseReminderEnabled;
  if (updates.expenseReminderTime !== undefined) fields.expense_reminder_time = updates.expenseReminderTime;
  if (updates.microExpensePromptsEnabled !== undefined) fields.micro_expense_prompts_enabled = updates.microExpensePromptsEnabled;
  if (updates.timezone !== undefined) fields.timezone = updates.timezone;

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
    expenseReminderEnabled,
    expenseReminderTime,
    microExpensePromptsEnabled,
    timezone,
  } = onboardingData;

  // Validate JSONB array fields to ensure they are arrays before inserting
  const safeArray = (val) => (Array.isArray(val) ? val : []);

  const fields = {
    occupation:                   occupation          || null,
    monthly_income:               monthlyIncome       != null ? Number(monthlyIncome) : null,
    preferred_language:           preferredLanguage   || 'en',
    financial_interests:          JSON.stringify(safeArray(financialInterests)),
    spending_categories:          JSON.stringify(safeArray(spendingCategories)),
    financial_goals:              JSON.stringify(safeArray(financialGoals)),
    financial_experience:         financialExperience || null,
    ai_preferences:               JSON.stringify(safeArray(aiPreferences)),
    savings_habit:                savingsHabit        || null,
    investment_preference:        investmentPreference || null,
    expense_reminder_enabled:     expenseReminderEnabled !== undefined ? Boolean(expenseReminderEnabled) : true,
    expense_reminder_time:        expenseReminderTime || '21:00',
    micro_expense_prompts_enabled: microExpensePromptsEnabled !== undefined ? Boolean(microExpensePromptsEnabled) : true,
    timezone:                     timezone || 'Asia/Kolkata',
    is_onboarded:                 true,
  };

  const updatedUser = await userRepository.updateProfile(userId, fields);
  if (!updatedUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId).catch(() => null);
  return toSafeUser(updatedUser);
}

async function updateExpensePreferences(userId, { expenseReminderEnabled, expenseReminderTime, microExpensePromptsEnabled, timezone }) {
  const fields = {};
  if (expenseReminderEnabled !== undefined) fields.expense_reminder_enabled = expenseReminderEnabled;
  if (expenseReminderTime !== undefined) fields.expense_reminder_time = expenseReminderTime || null;
  if (microExpensePromptsEnabled !== undefined) fields.micro_expense_prompts_enabled = microExpensePromptsEnabled;
  if (timezone !== undefined) fields.timezone = timezone || 'Asia/Kolkata';
  const updatedUser = await userRepository.updateProfile(userId, fields);
  if (!updatedUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }
  return toSafeUser(updatedUser);
}

module.exports = { getProfile, updateProfile, completeOnboarding, updateExpensePreferences };
