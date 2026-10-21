// adminService.js
// Thin wrapper around the admin API endpoints.
// All calls require the user to have role = 'admin' on the backend.

import api from './api';

const adminService = {
  // ── Overview ────────────────────────────────────────────────────
  getOverview: async () => {
    const res = await api.get('/admin/overview');
    return res.data.data;
  },

  // ── User Management ─────────────────────────────────────────────
  getUsers: async ({ limit = 50, offset = 0, search = '' } = {}) => {
    const res = await api.get('/admin/users', { params: { limit, offset, search } });
    return res.data.data;
  },

  updateUserRole: async (userId, role) => {
    const res = await api.patch(`/admin/users/${userId}/role`, { role });
    return res.data.data;
  },

  deleteUser: async (userId) => {
    const res = await api.delete(`/admin/users/${userId}`);
    return res.data.data;
  },

  // ── System Health ────────────────────────────────────────────────
  getSystemHealth: async () => {
    const res = await api.get('/admin/health');
    return res.data.data;
  },

  // ── Documents / OCR ─────────────────────────────────────────────
  getDocuments: async () => {
    const res = await api.get('/admin/documents');
    return res.data.data;
  },

  // ── AI Monitoring ────────────────────────────────────────────────
  getAiMonitoring: async () => {
    const res = await api.get('/admin/ai');
    return res.data.data;
  },

  // ── Audit Logs ───────────────────────────────────────────────────
  getAuditLogs: async (limit = 50) => {
    const res = await api.get('/admin/audit-logs', { params: { limit } });
    return res.data.data;
  },

  // ── Global Categories ────────────────────────────────────────────
  getCategories: async () => {
    const res = await api.get('/admin/categories');
    return res.data.data;
  },

  createCategory: async ({ name, description }) => {
    const res = await api.post('/admin/categories', { name, description });
    return res.data.data;
  },

  updateCategory: async (categoryId, { name, description }) => {
    const res = await api.patch(`/admin/categories/${categoryId}`, { name, description });
    return res.data.data;
  },

  deleteCategory: async (categoryId) => {
    const res = await api.delete(`/admin/categories/${categoryId}`);
    return res.data.data;
  },
};

export default adminService;
