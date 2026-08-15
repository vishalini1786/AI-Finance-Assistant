// authService.js
// Business logic for registration and login. Controllers call these
// functions; these functions call the repository for DB access.

const userRepository = require('../repositories/userRepository');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

// Strip password_hash before this ever reaches a controller/response.
function toSafeUser(userRow) {
  const { password_hash, ...safeUser } = userRow;
  return safeUser;
}

async function register({ name, email, password }) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    const err = new Error('An account with this email already exists');
    err.statusCode = 409;
    err.expose = true;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const newUser = await userRepository.createUser({ name, email, passwordHash });
  const token = generateToken(newUser.user_id);

  return { user: toSafeUser(newUser), token };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.expose = true;
    throw err;
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.expose = true;
    throw err;
  }

  const token = generateToken(user.user_id);
  return { user: toSafeUser(user), token };
}

async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }
  return toSafeUser(user);
}

module.exports = { register, login, getCurrentUser, toSafeUser };
