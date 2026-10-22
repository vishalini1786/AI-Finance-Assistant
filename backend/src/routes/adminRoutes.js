// adminRoutes.js
// All routes are protected by authMiddleware + adminMiddleware.
// Only users with role = 'admin' can access these endpoints.

const express  = require('express');
const authMiddleware  = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const {
  overview,
  listUsers,
  updateUserRole,
  removeUser,
  bulkRemoveUsers,
  systemHealth,
  documentMonitor,
  aiMonitoring,
  auditLogs,
  listCategories,
  addCategory,
  editCategory,
  removeCategory,
} = require('../controllers/adminController');

const router = express.Router();

// Apply auth + admin guard to every route in this file
router.use(authMiddleware, adminMiddleware);

// ── Overview ──────────────────────────────────────────────────────
router.get('/overview', overview);

// ── User Management ───────────────────────────────────────────────
router.get('/users',                listUsers);
router.delete('/users/bulk',         bulkRemoveUsers);
router.patch('/users/:userId/role', updateUserRole);
router.delete('/users/:userId',     removeUser);

// ── System Health ─────────────────────────────────────────────────
router.get('/health', systemHealth);

// ── OCR / Documents ───────────────────────────────────────────────
router.get('/documents', documentMonitor);

// ── AI Service Monitoring ─────────────────────────────────────────
router.get('/ai', aiMonitoring);

// ── Audit Logs ────────────────────────────────────────────────────
router.get('/audit-logs', auditLogs);

// ── Global Categories ─────────────────────────────────────────────
router.get('/categories',                  listCategories);
router.post('/categories',                 addCategory);
router.patch('/categories/:categoryId',    editCategory);
router.delete('/categories/:categoryId',   removeCategory);

module.exports = router;
