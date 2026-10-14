// categoryRepository.js
// Categories are shared/predefined (seeded), so this repository is
// read-only for Phase 1.

const db = require('../config/database');

async function findAllByUser(userId) {
  const result = await db.query(
    'SELECT * FROM categories WHERE user_id IS NULL OR user_id = $1 ORDER BY name ASC',
    [userId]
  );
  return result.rows;
}

async function create({ name, description, priority, userId }) {
  const result = await db.query(
    `INSERT INTO categories (name, description, priority, user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, description, priority || 'FLEXIBLE', userId]
  );
  return result.rows[0];
}

async function findById(categoryId) {
  const result = await db.query(
    'SELECT * FROM categories WHERE category_id = $1',
    [categoryId]
  );
  return result.rows[0] || null;
}

module.exports = { findAllByUser, findById, create };
