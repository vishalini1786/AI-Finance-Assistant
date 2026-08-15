// userRepository.js
// All raw SQL for the `users` table lives here. Nowhere else in the
// app should write SQL that touches `users` directly.

const db = require('../config/database');

async function findByEmail(email) {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

async function findById(userId) {
  const result = await db.query(
    'SELECT * FROM users WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, email, passwordHash]
  );
  return result.rows[0];
}

async function updateProfile(userId, fields) {
  // Build the SET clause dynamically but SAFELY, using parameterized
  // placeholders only - never string-concatenate user input into SQL.
  const allowedFields = [
    'name',
    'phone',
    'occupation',
    'preferred_language',
    'monthly_income',
    'profile_picture',
    'theme_preference',
  ];

  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(fields[key]);
      paramIndex += 1;
    }
  }

  if (setClauses.length === 0) {
    // Nothing to update - just return the current row.
    return findById(userId);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await db.query(
    `UPDATE users SET ${setClauses.join(', ')}
     WHERE user_id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

module.exports = { findByEmail, findById, createUser, updateProfile };
