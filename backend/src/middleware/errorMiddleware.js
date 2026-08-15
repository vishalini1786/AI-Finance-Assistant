// errorMiddleware.js
// Centralized error handler. Any controller that calls next(err)
// (or throws inside an async handler wrapped with asyncHandler)
// ends up here, so error responses stay consistent everywhere and
// we never leak stack traces or DB details to the client.

const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

// Wrap async route handlers so thrown errors/rejected promises are
// forwarded to this middleware instead of crashing the server.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler - for routes that don't match anything.
function notFoundHandler(req, res) {
  return sendError(res, {
    statusCode: 404,
    message: 'Route not found',
    error: `${req.method} ${req.originalUrl} does not exist`,
  });
}

// Must have exactly 4 arguments for Express to treat it as an
// error-handling middleware.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', err);

  // Known "operational" errors can set a statusCode/message themselves.
  const statusCode = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';

  // PostgreSQL unique violation -> friendlier message
  if (err.code === '23505') {
    return sendError(res, {
      statusCode: 409,
      message: 'A record with this value already exists',
      error: 'Duplicate entry',
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return sendError(res, {
      statusCode: 400,
      message: 'Related record does not exist',
      error: 'Foreign key constraint failed',
    });
  }

  return sendError(res, {
    statusCode,
    message,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

module.exports = { asyncHandler, notFoundHandler, errorHandler };
