// authMiddleware.js
// Protects private routes. Reads the JWT from the Authorization header,
// verifies it, and attaches the authenticated user's id to req.userId.
//
// IMPORTANT: every controller must use req.userId (from the token),
// NEVER a userId sent in the request body/query. See project rule:
// "Never trust a UserID sent directly from the frontend."

const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, {
      statusCode: 401,
      message: 'Authentication required',
      error: 'Missing or malformed Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return sendError(res, {
      statusCode: 401,
      message: 'Authentication failed',
      error: 'Invalid or expired token',
    });
  }
}

module.exports = authMiddleware;
