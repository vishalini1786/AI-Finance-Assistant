// database.js
// Creates ONE reusable PostgreSQL connection pool for the whole app.
// Never create a new Pool (or Client) per request - that's slow and
// can exhaust the database's connection limit.

const { Pool } = require('pg');
const env = require('./env');
// Determine SSL configuration for Supabase:
// Supabase requires SSL encryption. When connecting to Supabase or in production,
// enable SSL with rejectUnauthorized: false unless explicitly set otherwise.
const useSSL = env.db.ssl !== undefined
  ? env.db.ssl
  : (env.db.host.includes('supabase') || env.nodeEnv === 'production');

const sslConfig = useSSL ? { rejectUnauthorized: false } : false;

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  ssl: sslConfig,

  // Reasonable defaults for a small student project.
  max: 10, // max simultaneous clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  // This fires for errors on idle clients in the pool, not for
  // errors on individual queries (those are caught where you query).
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

// Safe, read-only initial connectivity test (runs SELECT 1)
pool.query('SELECT 1 AS health_check')
  .then(() => {
    if (env.nodeEnv === 'development') {
      console.log('✓ Successfully connected to Supabase PostgreSQL database.');
    }
  })
  .catch((err) => {
    console.error('✗ Initial database connection check failed:', err.message);
  });

// Quick helper so repositories can just do: const db = require('../config/database');
// and call db.query(sql, params) without worrying about connect/release.
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (env.nodeEnv === 'development') {
    console.log('executed query', { text, duration, rows: result.rowCount });
  }

  return result;
}

module.exports = {
  query,
  pool, // exported in case a repository needs a transaction (client.connect())
};
