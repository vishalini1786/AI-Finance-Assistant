// logger.js
// A very small logger. Kept simple on purpose (this is a student
// project) - swap for a library like winston/pino later if needed.

function info(message, meta) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
}

function error(message, err) {
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, err || '');
}

function warn(message, meta) {
  console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
}

module.exports = { info, error, warn };
