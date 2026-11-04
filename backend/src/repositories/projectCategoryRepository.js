// projectCategoryRepository.js
const db = require('../config/database');

async function createCategory({ projectId, userId, name }) {
  const result = await db.query(
    `INSERT INTO project_categories (project_id, user_id, name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [projectId, userId, name.trim()]
  );
  return result.rows[0];
}

async function getCategoriesForProject(projectId, userId) {
  const result = await db.query(
    `SELECT category_id, project_id, user_id, name, created_at
     FROM project_categories
     WHERE project_id = $1 AND user_id = $2
     ORDER BY name ASC`,
    [projectId, userId]
  );
  return result.rows;
}

async function getCategoryById(categoryId, projectId, userId) {
  const result = await db.query(
    `SELECT category_id, project_id, user_id, name, created_at
     FROM project_categories
     WHERE category_id = $1 AND project_id = $2 AND user_id = $3`,
    [categoryId, projectId, userId]
  );
  return result.rows[0] || null;
}

async function getCategoryByName(name, projectId, userId) {
  const result = await db.query(
    `SELECT category_id, project_id, user_id, name, created_at
     FROM project_categories
     WHERE LOWER(name) = LOWER($1) AND project_id = $2 AND user_id = $3`,
    [name.trim(), projectId, userId]
  );
  return result.rows[0] || null;
}

async function updateCategory(categoryId, projectId, userId, newName) {
  const result = await db.query(
    `UPDATE project_categories
     SET name = $1
     WHERE category_id = $2 AND project_id = $3 AND user_id = $4
     RETURNING *`,
    [newName.trim(), categoryId, projectId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Delete a category only if no project expenses reference its name.
 * Returns { deleted: true } on success.
 * Returns { deleted: false, usageCount } if the category is in use.
 */
async function deleteCategory(categoryId, projectId, userId) {
  // Resolve the category name first (ownership-checked)
  const cat = await getCategoryById(categoryId, projectId, userId);
  if (!cat) return null; // not found / not owned

  // Check if any project_expenses reference this category name
  const usageResult = await db.query(
    `SELECT COUNT(*) AS usage_count
     FROM project_expenses
     WHERE project_id = $1 AND user_id = $2 AND category = $3`,
    [projectId, userId, cat.name]
  );
  const usageCount = parseInt(usageResult.rows[0].usage_count, 10);

  if (usageCount > 0) {
    return { deleted: false, usageCount, name: cat.name };
  }

  await db.query(
    `DELETE FROM project_categories
     WHERE category_id = $1 AND project_id = $2 AND user_id = $3`,
    [categoryId, projectId, userId]
  );
  return { deleted: true };
}

/**
 * Create many categories in a single transaction.
 * Skips duplicates silently (ON CONFLICT DO NOTHING).
 */
async function bulkCreateCategories(projectId, userId, names) {
  if (!names || names.length === 0) return [];
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const name of names) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const result = await client.query(
        `INSERT INTO project_categories (project_id, user_id, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, name) DO NOTHING
         RETURNING *`,
        [projectId, userId, trimmed]
      );
      if (result.rows[0]) created.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createCategory,
  getCategoriesForProject,
  getCategoryById,
  getCategoryByName,
  updateCategory,
  deleteCategory,
  bulkCreateCategories,
};

