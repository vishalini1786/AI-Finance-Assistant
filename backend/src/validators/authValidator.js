// authValidator.js
// Plain functions that check req.body and return an array of
// human-readable error strings. Empty array = valid.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts Indian and international formats: +91-9876543210, 9876543210, etc.
const PHONE_REGEX = /^[+]?[\d\s\-().]{7,20}$/;
const MIN_PASSWORD_LENGTH = 8;

function validateRegister(body) {
  const errors = [];
  const { name, email, password, phone } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    errors.push('A valid email is required');
  }

  if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  // Phone is optional, but if provided it must be valid
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.push('Please enter a valid phone number');
  }

  return errors;
}

function validateLogin(body) {
  const errors = [];
  const { email, password } = body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    errors.push('A valid email is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  }

  return errors;
}

module.exports = { validateRegister, validateLogin };
