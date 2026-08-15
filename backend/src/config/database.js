// database.js
// Creates ONE reusable PostgreSQL connection pool for the whole app.
// Never create a new Pool (or Client) per request - that's slow and
// can exhaust the database's connection limit.

const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,

  // Reasonable defaults for a small student project.
  max: 10, // max simultaneous clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // This fires for errors on idle clients in the pool, not for
  // errors on individual queries (those are caught where you query).
  console.error('Unexpected PostgreSQL pool error:', err);
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
