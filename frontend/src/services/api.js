// api.js
// Shared Axios client for all frontend services.
import axios from 'axios';

function normalizeBaseUrl(url) {
  if (!url) return '';
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean += '/api';
  }
  return clean;
}

const rawConfiguredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const configuredBaseUrl = rawConfiguredUrl ? normalizeBaseUrl(rawConfiguredUrl) : '';
const developmentBaseUrl = 'http://localhost:5000/api';
const productionBaseUrl = 'https://ai-finance-assistant-80lk.onrender.com/api';
const BASE_URL = configuredBaseUrl || (import.meta.env.DEV ? developmentBaseUrl : productionBaseUrl);

// Vite embeds this public URL into the built assets. Guard production builds
// against accidentally shipping a localhost or insecure HTTP API endpoint.
if (import.meta.env.PROD) {
  let productionApiUrl;
  try {
    productionApiUrl = new URL(BASE_URL);
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute HTTPS URL in production.');
  }

  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (productionApiUrl.protocol !== 'https:' || localHosts.has(productionApiUrl.hostname.toLowerCase())) {
    throw new Error('VITE_API_BASE_URL must use the HTTPS production API in production builds.');
  }
  if (productionApiUrl.username || productionApiUrl.password) {
    throw new Error('VITE_API_BASE_URL must not contain credentials.');
  }
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the JWT (if present) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finman_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = Boolean(localStorage.getItem('finman_token'));
      localStorage.removeItem('finman_token');

      // Keep invalid-credential errors on the login and account recovery pages
      // visible to the user; redirect only when an existing session expired.
      const requestUrl = error.config?.url || '';
      const publicAuthRequest = /\/auth\/(?:login|register|google|forgot-password|reset-password)(?:\?|$)/i.test(requestUrl);
      if (
        hadToken &&
        !publicAuthRequest &&
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        window.location.assign('/login');
      }
    }

    if (!error.response) {
      error.message = error.code === 'ECONNABORTED'
        ? 'The FinMan API request timed out. Please try again.'
        : 'Unable to reach the FinMan API. Check your connection and try again.';
    }

    return Promise.reject(error);
  }
);

export default api;
