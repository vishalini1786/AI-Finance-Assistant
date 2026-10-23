// adminController.js
// Handles all HTTP request/response logic for admin-only routes.
// Business logic delegates to adminRepository.

const {
  getAllUsers,
  countUsers,
  setUserRole,
  deleteUser,
  deleteUsersBulk,
  getPlatformStats,
  getUserGrowthByMonth,
  getDocumentStats,
  getRecentDocuments,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getRecentActivity,
  getTableRowCounts,
} = require('../repositories/adminRepository');

const { sendSuccess, sendError } = require('../utils/response');

// ── Overview ──────────────────────────────────────────────────────

async function overview(req, res) {
  try {
    const [stats, growth, activity] = await Promise.all([
      getPlatformStats(),
      getUserGrowthByMonth(),
      getRecentActivity(20),
    ]);
    return sendSuccess(res, {
      message: 'Admin overview fetched',
      data: { stats, growth, activity },
    });
  } catch (err) {
    return sendError(res, { message: 'Failed to fetch overview', error: err.message });
  }
}

// ── User Management ───────────────────────────────────────────────

async function listUsers(req, res) {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);
    const search = (req.query.search || '').trim();

    const [users, total] = await Promise.all([
      getAllUsers({ limit, offset, search }),
      countUsers(search),
    ]);

    return sendSuccess(res, {
      message: 'Users fetched',
      data: { users, total, limit, offset },
    });
  } catch (err) {
    return sendError(res, { message: 'Failed to fetch users', error: err.message });
  }
}

async function updateUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role }   = req.body;

    if (!['user', 'admin'].includes(role)) {
      return sendError(res, { statusCode: 400, message: 'Invalid role. Must be "user" or "admin".' });
    }

    // Prevent admin from demoting themselves
    if (parseInt(userId, 10) === req.userId) {
      return sendError(res, { statusCode: 400, message: 'You cannot change your own role.' });
    }

    const updated = await setUserRole(userId, role);
    if (!updated) {
      return sendError(res, { statusCode: 404, message: 'User not found' });
    }
    return sendSuccess(res, { message: `User role updated to ${role}`, data: updated });
  } catch (err) {
    return sendError(res, { message: 'Failed to update role', error: err.message });
  }
}

async function removeUser(req, res) {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(userId, 10) === req.userId) {
      return sendError(res, { statusCode: 400, message: 'You cannot delete your own account from the admin panel.' });
    }

    const deleted = await deleteUser(userId);
    if (!deleted) {
      return sendError(res, { statusCode: 404, message: 'User not found' });
    }
    return sendSuccess(res, { message: 'User deleted', data: deleted });
  } catch (err) {
    return sendError(res, { message: 'Failed to delete user', error: err.message });
  }
}

async function bulkRemoveUsers(req, res) {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return sendError(res, { statusCode: 400, message: 'Please provide a non-empty array of user IDs to delete.' });
    }

    // Filter out the admin's own ID
    const sanitizedIds = userIds.filter((id) => parseInt(id, 10) !== req.userId);
    if (sanitizedIds.length === 0) {
      return sendError(res, { statusCode: 400, message: 'Cannot delete your own active administrator account.' });
    }

    const result = await deleteUsersBulk(sanitizedIds, req.userId);

    return sendSuccess(res, {
      message: `Successfully deleted ${result.deletedCount} user(s).`,
      data: {
        deletedCount: result.deletedCount,
        deletedUsers: result.deletedUsers,
      },
    });
  } catch (err) {
    return sendError(res, { message: 'Failed to bulk delete users', error: err.message });
  }
}


// ── System Health ─────────────────────────────────────────────────

async function systemHealth(req, res) {
  try {
    const tableCounts = await getTableRowCounts();
    const uptime      = process.uptime();
    const memory      = process.memoryUsage();
    return sendSuccess(res, {
      message: 'System health fetched',
      data: {
        tableCounts,
        uptime: Math.floor(uptime),
        memoryMB: {
          heapUsed:  (memory.heapUsed  / 1024 / 1024).toFixed(1),
          heapTotal: (memory.heapTotal / 1024 / 1024).toFixed(1),
          rss:       (memory.rss       / 1024 / 1024).toFixed(1),
        },
        nodeVersion: process.version,
        env:         process.env.NODE_ENV || 'development',
      },
    });
  } catch (err) {
    return sendError(res, { message: 'Failed to fetch system health', error: err.message });
  }
}

const documentService = require('../services/documentService');

// ── OCR / Documents ───────────────────────────────────────────────

async function documentMonitor(req, res) {
  try {
    const [stats, recent, ocrStatus] = await Promise.all([
      getDocumentStats(),
      getRecentDocuments(30),
      documentService.getOcrDiagnostics().catch(() => null),
    ]);
    return sendSuccess(res, {
      message: 'Document stats fetched',
      data: { stats, recent, ocrStatus },
    });
  } catch (err) {
    return sendError(res, { message: 'Failed to fetch document data', error: err.message });
  }
}

const geminiService = require('../services/geminiService');

// ── AI / Service Monitoring ──────────────────────────────────────────

async function aiMonitoring(req, res) {
  try {
    if (req.query.check === 'true') {
      await geminiService.runHealthCheck(true);
    }
    const diag = geminiService.getGeminiDiagnostics();
    return sendSuccess(res, {
      message: 'AI monitoring data fetched',
      data: diag,
    });
  } catch (err) {
    return sendError(res, { message: 'Failed to fetch AI monitoring data', error: err.message });
  }
}

// ── Audit Logs ────────────────────────────────────────────────────

async function auditLogs(req, res) {
  try {
    const limit    = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const activity = await getRecentActivity(limit);
    return sendSuccess(res, { message: 'Audit logs fetched', data: { activity } });
  } catch (err) {
    return sendError(res, { message: 'Failed to fetch audit logs', error: err.message });
  }
}

// ── Global Categories ─────────────────────────────────────────────

async function listCategories(req, res) {
  try {
    const categories = await getAllCategories();
    return sendSuccess(res, { message: 'Categories fetched', data: { categories } });
  } catch (err) {
    return sendError(res, { message: 'Failed to fetch categories', error: err.message });
  }
}

async function addCategory(req, res) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return sendError(res, { statusCode: 400, message: 'Category name is required' });
    }
    const cleanName = name.trim();
    const category = await createCategory({ name: cleanName, description });
    return sendSuccess(res, { statusCode: 201, message: 'Category created', data: category });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return sendError(res, { statusCode: 409, message: 'A global category with this name already exists' });
    }
    return sendError(res, { statusCode: err.statusCode || 500, message: err.message || 'Failed to create category' });
  }
}

async function editCategory(req, res) {
  try {
    const { categoryId } = req.params;
    const { name, description } = req.body;
    const updated = await updateCategory(categoryId, { name, description });
    if (!updated) {
      return sendError(res, { statusCode: 404, message: 'Category not found' });
    }
    return sendSuccess(res, { message: 'Category updated', data: updated });
  } catch (err) {
    if (err.code === '23505') {
      return sendError(res, { statusCode: 409, message: 'A category with this name already exists' });
    }
    return sendError(res, { statusCode: err.statusCode || 500, message: err.message || 'Failed to update category' });
  }
}

async function removeCategory(req, res) {
  try {
    const { categoryId } = req.params;
    const reassignToCategoryId = req.body?.reassignToCategoryId || req.query?.reassignTo || null;
    const deleted = await deleteCategory(categoryId, reassignToCategoryId);
    if (!deleted) {
      return sendError(res, { statusCode: 404, message: 'Category not found' });
    }
    return sendSuccess(res, { message: 'Category deleted successfully', data: deleted });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to delete category',
    });
  }
}

module.exports = {
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
};
