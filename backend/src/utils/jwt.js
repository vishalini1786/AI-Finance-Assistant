// jwt.js
// Small wrapper around jsonwebtoken so the rest of the app never
// imports jsonwebtoken directly.

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Create a signed JWT for a user.
 * We only ever put the user_id in the token - never the password hash
 * or other sensitive fields.
 * @param {number} userId
 * @returns {string} signed JWT
 */
function generateToken(userId) {
  return jwt.sign({ userId }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

/**
 * Verify a JWT and return its decoded payload.
 * Throws if the token is invalid or expired - callers should catch this.
 * @param {string} token
 * @returns {{ userId: number, iat: number, exp: number }}
 */
function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = { generateToken, verifyToken };
