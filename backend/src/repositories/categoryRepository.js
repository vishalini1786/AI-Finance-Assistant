// categoryRepository.js
// Categories are shared/predefined (seeded), so this repository is
// read-only for Phase 1.

const db = require('../config/database');

async function findAll() {
  const result = await db.query(
    'SELECT * FROM categories ORDER BY name ASC'
  );
  return result.rows;
}

async function findById(categoryId) {
  const result = await db.query(
    'SELECT * FROM categories WHERE category_id = $1',
    [categoryId]
  );
  return result.rows[0] || null;
}

module.exports = { findAll, findById };
