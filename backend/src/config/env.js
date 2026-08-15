// env.js
// Loads and validates environment variables in one place so the rest
// of the app never touches process.env directly.

require('dotenv').config();

const requiredVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

// Fail fast and loudly if something important is missing.
// This is much easier to debug than a random crash later.
for (const key of requiredVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    console.error('Did you create backend/.env from backend/.env.example?');
    process.exit(1);
  }
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  aiServiceUrl: process.env.AI_SERVICE_URL || null,
};
