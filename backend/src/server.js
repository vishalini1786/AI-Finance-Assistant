// server.js
// Entry point. Loads env vars (via config/env.js, imported inside
// app.js's dependency chain and here for the port), then starts the
// HTTP server.

const env = require('./config/env');
const app = require('./app');
const logger = require('./utils/logger');

const server = app.listen(env.port, () => {
  logger.info(`FinMan backend running on http://localhost:${env.port}`);
  logger.info(`Environment: ${env.nodeEnv}`);
});

// Gracefully handle unexpected crashes instead of dying silently.
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection', err);
  server.close(() => process.exit(1));
});
