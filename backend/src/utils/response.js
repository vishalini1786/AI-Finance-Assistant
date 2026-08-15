// response.js
// Keeps every API response in the exact same shape, as required by
// the project spec:
//
// Success: { success: true,  message: "...", data: {} }
// Error:   { success: false, message: "...", error: "..." }

function sendSuccess(res, { statusCode = 200, message = 'Success', data = {} } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function sendError(res, { statusCode = 500, message = 'Something went wrong', error = null } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
  });
}

module.exports = { sendSuccess, sendError };
