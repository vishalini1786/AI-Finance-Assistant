// userValidator.js
// Validation rules for user profile and onboarding endpoints.

const VALID_LANGUAGES = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa'];

function validateOnboarding(body) {
  const errors = [];
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
  } = body;

  // occupation is required (maps to DB occupation column)
  if (occupation && (typeof occupation !== 'string' || occupation.trim().length === 0)) {
    errors.push('Occupation must be a non-empty string');
  }

  // monthlyIncome must be a non-negative number if provided
  if (monthlyIncome !== undefined && monthlyIncome !== null) {
    const income = Number(monthlyIncome);
    if (isNaN(income) || income < 0) {
      errors.push('Monthly income must be a non-negative number');
    }
  }

  // preferredLanguage must be in our supported list if provided
  if (preferredLanguage && !VALID_LANGUAGES.includes(preferredLanguage)) {
    errors.push(`Preferred language must be one of: ${VALID_LANGUAGES.join(', ')}`);
  }

  // Array fields must actually be arrays if provided
  const arrayFields = [
    { key: 'financialInterests', val: financialInterests },
    { key: 'spendingCategories', val: spendingCategories },
    { key: 'financialGoals', val: financialGoals },
    { key: 'aiPreferences', val: aiPreferences },
  ];
  for (const { key, val } of arrayFields) {
    if (val !== undefined && !Array.isArray(val)) {
      errors.push(`${key} must be an array`);
    }
  }

  // String fields that must be strings if provided
  const stringFields = [
    { key: 'financialExperience', val: financialExperience },
    { key: 'savingsHabit', val: savingsHabit },
    { key: 'investmentPreference', val: investmentPreference },
  ];
  for (const { key, val } of stringFields) {
    if (val !== undefined && val !== null && typeof val !== 'string') {
      errors.push(`${key} must be a string`);
    }
  }

  return errors;
}

module.exports = { validateOnboarding };
