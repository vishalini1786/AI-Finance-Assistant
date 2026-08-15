// password.js
// Small wrapper around bcrypt so the rest of the app never imports
// bcrypt directly. Keeps hashing logic in one place.

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password before storing it.
 * @param {string} plainPassword
 * @returns {Promise<string>} bcrypt hash
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a stored bcrypt hash.
 * @param {string} plainPassword
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = { hashPassword, comparePassword };
