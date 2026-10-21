// adminMiddleware.js
// Extends authMiddleware — must run AFTER authMiddleware so that
// req.userId is already set. Fetches the user from PostgreSQL and
// verifies that their role is 'admin'. Rejects non-admins with 403.

const { findById } = require('../repositories/userRepository');
const { sendError } = require('../utils/response');

async function adminMiddleware(req, res, next) {
  try {
    const user = await findById(req.userId);

    if (!user) {
      return sendError(res, {
        statusCode: 401,
        message: 'Authentication failed',
        error: 'User not found',
      });
    }

    if (user.role !== 'admin') {
      return sendError(res, {
        statusCode: 403,
        message: 'Forbidden',
        error: 'Admin access required',
      });
    }

    // Attach full user to req for controllers that need it.
    req.adminUser = user;
    next();
  } catch (err) {
    return sendError(res, {
      statusCode: 500,
      message: 'Server error',
      error: err.message,
    });
  }
}

module.exports = adminMiddleware;
