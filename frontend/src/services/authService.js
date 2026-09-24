// authService.js
// All backend API calls related to authentication and user session.
// Uses the shared Axios instance from api.js which automatically
// attaches the JWT Bearer token to every request.

import api from './api';

/**
 * Register a new user. Backend creates the user in PostgreSQL with
 * bcrypt-hashed password. Returns user object + JWT token.
 */
async function register({ name, email, password, phone }) {
  const res = await api.post('/auth/register', { name, email, password, phone });
  const { user, token } = res.data.data;
  // Only store the JWT token — NOT user data. User data lives in PostgreSQL.
  localStorage.setItem('finman_token', token);
  return user;
}

/**
 * Login with email + password. Backend validates credentials and
 * returns a fresh JWT token. Returns the full user object from PostgreSQL.
 */
async function login({ email, password }) {
  const res = await api.post('/auth/login', { email, password });
  const { user, token } = res.data.data;
  localStorage.setItem('finman_token', token);
  return user;
}

/**
 * Clear the JWT token from localStorage.
 * User data is in PostgreSQL — nothing else to clear.
 */
function logout() {
  localStorage.removeItem('finman_token');
}

/**
 * Fetch the currently authenticated user's full profile from PostgreSQL.
 * Called on app load if a JWT token exists in localStorage.
 * This is the mechanism for session persistence after page refresh.
 */
async function getCurrentUser() {
  const res = await api.get('/auth/me');
  return res.data.data.user;
}

/**
 * Check whether a JWT token is stored (i.e. user is likely authenticated).
 * The token is verified by the backend on every protected request.
 */
function isAuthenticated() {
  return Boolean(localStorage.getItem('finman_token'));
}

/**
 * Submit all onboarding data to the backend. Backend persists everything
 * to PostgreSQL and sets is_onboarded = TRUE.
 * Returns the updated user object.
 */
async function completeOnboarding(onboardingData) {
  const res = await api.post('/users/onboarding', onboardingData);
  return res.data.data.user;
}

export default { register, login, logout, getCurrentUser, isAuthenticated, completeOnboarding };
