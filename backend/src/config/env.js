
// env.js
require('dotenv').config();

const requiredVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

function sanitizeServiceUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'PLACEHOLDER' || trimmed === 'null' || trimmed === 'undefined') return null;
  try {
    let toParse = trimmed;
    if (!toParse.startsWith('http://') && !toParse.startsWith('https://')) {
      toParse = toParse.includes('.onrender.com') ? `https://${toParse}` : `http://${toParse}`;
    }
    const parsed = new URL(toParse);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return toParse.replace(/\/+$/, '');
  } catch {
    return null;
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
    ssl: process.env.DB_SSL ? process.env.DB_SSL === 'true' : undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  aiServiceUrl: sanitizeServiceUrl(process.env.AI_SERVICE_URL),

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || null,
    model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  },
};

