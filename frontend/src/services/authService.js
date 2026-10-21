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
 * Sign in with Google (either verified ID token credential or demo fallback).
 * Returns user object + custom application JWT token.
 */
async function googleLogin({ credential, demoEmail, demoName }) {
  const res = await api.post('/auth/google', { credential, demoEmail, demoName });
  const { user, token } = res.data.data;
  localStorage.setItem('finman_token', token);
  return user;
}

/**
 * Request password reset instructions via email.
 */
async function forgotPassword(email) {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
}

/**
 * Reset password using verification token.
 */
async function resetPassword({ token, password }) {
  const res = await api.post('/auth/reset-password', { token, password });
  return res.data;
}

/**
 * Clear the JWT token from localStorage.
 */
function logout() {
  localStorage.removeItem('finman_token');
}

/**
 * Fetch the currently authenticated user's full profile from PostgreSQL.
 */
async function getCurrentUser() {
  const res = await api.get('/auth/me');
  return res.data.data.user;
}

/**
 * Check whether a JWT token is stored.
 */
function isAuthenticated() {
  return Boolean(localStorage.getItem('finman_token'));
}

/**
 * Submit all onboarding data to the backend.
 */
async function completeOnboarding(onboardingData) {
  const res = await api.post('/users/onboarding', onboardingData);
  return res.data.data.user;
}

export default {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  logout,
  getCurrentUser,
  isAuthenticated,
  completeOnboarding,
};
