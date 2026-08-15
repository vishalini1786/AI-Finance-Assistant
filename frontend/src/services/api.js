// api.js
// Single shared Axios instance for the whole frontend. Every other
// service file (authService, incomeService, ...) imports THIS file
// instead of creating its own axios instance.

import axios from 'axios';

// Point this at your Express backend. Override with a .env value
// (VITE_API_BASE_URL) if your setup uses Vite.
const BASE_URL = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the JWT (if we have one) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finman_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend says our token is invalid/expired, clear it and
// send the user back to login. Adjust the redirect to match your
// router setup.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('finman_token');
      localStorage.removeItem('finman_user');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
