// authValidator.js
// Plain functions that check req.body and return an array of
// human-readable error strings. Empty array = valid.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateRegister(body) {
  const errors = [];
  const { name, email, password } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    errors.push('A valid email is required');
  }

  if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
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
