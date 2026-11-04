// server.js
// Entry point. Loads env vars (via config/env.js, imported inside
// app.js's dependency chain and here for the port), then starts the
// HTTP server.

const env = require('./config/env');
const app = require('./app');
const logger = require('./utils/logger');
const { startReminderScheduler } = require('./services/reminderScheduler');

const server = app.listen(env.port, '0.0.0.0', () => {
  logger.info(`FinMan backend running on http://localhost:${env.port}`);
  logger.info(`Environment: ${env.nodeEnv}`);
  startReminderScheduler();
});

// Gracefully log unexpected background errors without dropping the HTTP listener.
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection (non-fatal):', err?.message || err);
});
