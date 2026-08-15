// authService.js

import api from './api';

async function register({ name, email, password }) {
  const res = await api.post('/auth/register', { name, email, password });
  const { user, token } = res.data.data;
  localStorage.setItem('finman_token', token);
  localStorage.setItem('finman_user', JSON.stringify(user));
  return user;
}

async function login({ email, password }) {
  const res = await api.post('/auth/login', { email, password });
  const { user, token } = res.data.data;
  localStorage.setItem('finman_token', token);
  localStorage.setItem('finman_user', JSON.stringify(user));
  return user;
}

function logout() {
  localStorage.removeItem('finman_token');
  localStorage.removeItem('finman_user');
}

async function getCurrentUser() {
  const res = await api.get('/auth/me');
  return res.data.data.user;
}

function isAuthenticated() {
  return Boolean(localStorage.getItem('finman_token'));
}

export default { register, login, logout, getCurrentUser, isAuthenticated };
