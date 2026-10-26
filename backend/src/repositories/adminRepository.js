// adminRepository.js
// All raw SQL for admin-only queries.
// Never expose these endpoints to regular user routes.

const db = require('../config/database');

// ── User Management ───────────────────────────────────────────────

async function getAllUsers({ limit = 50, offset = 0, search = '' }) {
  const searchParam = `%${search}%`;
  const result = await db.query(
    `SELECT
       user_id, name, email, phone, occupation,
       monthly_income, role, is_onboarded,
       theme_preference, preferred_language,
       created_at, updated_at
     FROM users
     WHERE ($1 = '%%' OR name ILIKE $1 OR email ILIKE $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [searchParam, limit, offset]
  );
  return result.rows;
}

async function countUsers(search = '') {
  const searchParam = `%${search}%`;
  const result = await db.query(
    `SELECT COUNT(*) AS total FROM users
     WHERE ($1 = '%%' OR name ILIKE $1 OR email ILIKE $1)`,
    [searchParam]
  );
  return parseInt(result.rows[0].total, 10);
}

async function setUserRole(userId, role) {
  const result = await db.query(
    `UPDATE users SET role = $1, updated_at = NOW()
     WHERE user_id = $2
     RETURNING user_id, name, email, role, updated_at`,
    [role, userId]
  );
  return result.rows[0] || null;
}

async function deleteUser(userId) {
  // CASCADE deletes all user data (incomes, expenses, etc.)
  const result = await db.query(
    `DELETE FROM users WHERE user_id = $1 RETURNING user_id, name, email`,
    [userId]
  );
  return result.rows[0] || null;
}

async function deleteUsersBulk(userIds, callingAdminId) {
  // Deduplicate and filter positive integers
  const cleanIds = Array.from(new Set(
    (userIds || [])
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id) && id > 0 && id !== parseInt(callingAdminId, 10))
  ));

  if (cleanIds.length === 0) {
    return { deletedCount: 0, deletedUsers: [] };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Execute bulk deletion safely with parameterization
    const result = await client.query(
      `DELETE FROM users
       WHERE user_id = ANY($1::int[])
         AND user_id != $2
       RETURNING user_id, name, email`,
      [cleanIds, callingAdminId]
    );

    await client.query('COMMIT');

    return {
      deletedCount: result.rowCount,
      deletedUsers: result.rows,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}


// ── Platform Overview Stats ───────────────────────────────────────

async function getPlatformStats() {
  const result = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM users)                                AS total_users,
      (SELECT COUNT(*) FROM users WHERE role = 'admin')           AS total_admins,
      (SELECT COUNT(*) FROM users WHERE is_onboarded = TRUE)      AS onboarded_users,
      (SELECT COUNT(*) FROM users
         WHERE created_at >= NOW() - INTERVAL '7 days')           AS new_users_7d,
      (SELECT COUNT(*) FROM incomes)                              AS total_incomes,
      (SELECT COUNT(*) FROM expenses)                             AS total_expenses,
      (SELECT COALESCE(SUM(amount), 0) FROM expenses)             AS total_expense_amount,
      (SELECT COALESCE(SUM(amount), 0) FROM incomes)              AS total_income_amount,
      (SELECT COUNT(*) FROM financial_documents)                  AS total_documents,
      (SELECT COUNT(*) FROM project_workspaces)                   AS total_projects,
      (SELECT COUNT(*) FROM financial_goals)                      AS total_goals,
      (SELECT COUNT(*) FROM budgets)                              AS total_budgets,
      (SELECT COUNT(*) FROM expenses
         WHERE created_at >= NOW() - INTERVAL '30 days')          AS expenses_30d,
      (SELECT COUNT(*) FROM incomes
         WHERE created_at >= NOW() - INTERVAL '30 days')          AS incomes_30d
  `);
  return result.rows[0];
}

// ── User Growth (last 12 months, 1 row per month) ─────────────────

async function getUserGrowthByMonth() {
  const result = await db.query(`
    WITH months AS (
      SELECT DATE_TRUNC('month', NOW() - (n || ' months')::interval) AS month_date
      FROM generate_series(11, 0, -1) AS n
    )
    SELECT
      TO_CHAR(m.month_date, 'Mon') AS month_short,
      TO_CHAR(m.month_date, 'Mon YYYY') AS month,
      m.month_date,
      COUNT(u.user_id) AS new_users
    FROM months m
    LEFT JOIN users u ON DATE_TRUNC('month', u.created_at) = m.month_date
    GROUP BY m.month_date
    ORDER BY m.month_date ASC
  `);
  return result.rows;
}

// ── Document / OCR Stats ──────────────────────────────────────────

async function getDocumentStats() {
  const result = await db.query(`
    SELECT
      document_type,
      processing_status,
      COUNT(*) AS count
    FROM financial_documents
    GROUP BY document_type, processing_status
    ORDER BY document_type, processing_status
  `);
  return result.rows;
}

async function getRecentDocuments(limit = 20) {
  const result = await db.query(
    `SELECT
       fd.document_id, fd.file_name, fd.document_type,
       fd.processing_status, fd.upload_date,
       u.name AS user_name, u.email AS user_email
     FROM financial_documents fd
     JOIN users u ON u.user_id = fd.user_id
     ORDER BY fd.upload_date DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ── Category Management (Global) ──────────────────────────────────

async function getAllCategories() {
  const result = await db.query(
    `SELECT c.category_id, c.name, c.description, c.priority, c.created_at, c.user_id,
            u.name AS creator_name, u.email AS creator_email,
            (c.user_id IS NULL) AS is_global,
            (SELECT COUNT(*) FROM expenses e WHERE e.category_id = c.category_id)::int AS expense_count,
            (SELECT COUNT(*) FROM budgets b WHERE b.category_id = c.category_id)::int AS budget_count,
            (SELECT COUNT(*) FROM recurring_payments r WHERE r.category_id = c.category_id)::int AS recurring_count
     FROM categories c
     LEFT JOIN users u ON c.user_id = u.user_id
     ORDER BY c.user_id IS NOT NULL, LOWER(TRIM(c.name)) ASC`
  );
  return result.rows;
}

async function createCategory({ name, description }) {
  const cleanName = (name || '').trim();
  const result = await db.query(
    `INSERT INTO categories (name, description, user_id)
     VALUES ($1, $2, NULL)
     RETURNING *`,
    [cleanName, description || null]
  );
  return result.rows[0];
}

async function updateCategory(categoryId, { name, description }) {
  const cleanName = name !== undefined ? name.trim() : null;
  const result = await db.query(
    `UPDATE categories
     SET name = COALESCE($1, name),
         description = COALESCE($2, description)
     WHERE category_id = $3
     RETURNING *`,
    [cleanName, description, categoryId]
  );
  return result.rows[0] || null;
}

async function deleteCategory(categoryId, reassignToCategoryId = null) {
  // Check if category exists
  const catRes = await db.query('SELECT * FROM categories WHERE category_id = $1', [categoryId]);
  if (catRes.rows.length === 0) return null;
  const targetCategory = catRes.rows[0];

  // Inspect dependent financial records
  const depCheck = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM expenses WHERE category_id = $1)::int AS expense_count,
       (SELECT COUNT(*) FROM budgets WHERE category_id = $1)::int AS budget_count,
       (SELECT COUNT(*) FROM recurring_payments WHERE category_id = $1)::int AS recurring_count`,
    [categoryId]
  );
  const { expense_count, budget_count, recurring_count } = depCheck.rows[0];
  const totalDeps = expense_count + budget_count + recurring_count;

  if (totalDeps > 0) {
    if (!reassignToCategoryId) {
      const reasons = [];
      if (expense_count > 0) reasons.push(`${expense_count} expense transaction(s)`);
      if (budget_count > 0) reasons.push(`${budget_count} budget envelope(s)`);
      if (recurring_count > 0) reasons.push(`${recurring_count} recurring payment(s)`);

      const err = new Error(
        `Cannot delete "${targetCategory.name}" because it is currently linked to ${reasons.join(', ')}. Please reassign these records to another category before deleting.`
      );
      err.statusCode = 400;
      throw err;
    }

    if (parseInt(reassignToCategoryId, 10) === parseInt(categoryId, 10)) {
      const err = new Error('Replacement category cannot be the same category being deleted.');
      err.statusCode = 400;
      throw err;
    }

    // Verify replacement category exists
    const repRes = await db.query('SELECT * FROM categories WHERE category_id = $1', [reassignToCategoryId]);
    if (repRes.rows.length === 0) {
      const err = new Error('Selected replacement category does not exist.');
      err.statusCode = 400;
      throw err;
    }

    // Safely reassign records in database transaction to protect financial history
    const pool = db.pool;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE expenses SET category_id = $1 WHERE category_id = $2', [reassignToCategoryId, categoryId]);
      await client.query('UPDATE recurring_payments SET category_id = $1 WHERE category_id = $2', [reassignToCategoryId, categoryId]);

      // For budgets: If replacement budget already exists for that user and month/year, merge amounts; otherwise update category_id
      const existingBudgets = await client.query('SELECT * FROM budgets WHERE category_id = $1', [categoryId]);
      for (const b of existingBudgets.rows) {
        const conflict = await client.query(
          'SELECT budget_id, budget_amount FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4',
          [b.user_id, reassignToCategoryId, b.month, b.year]
        );
        if (conflict.rows.length > 0) {
          await client.query(
            'UPDATE budgets SET budget_amount = budget_amount + $1 WHERE budget_id = $2',
            [b.budget_amount, conflict.rows[0].budget_id]
          );
          await client.query('DELETE FROM budgets WHERE budget_id = $1', [b.budget_id]);
        } else {
          await client.query('UPDATE budgets SET category_id = $1 WHERE budget_id = $2', [reassignToCategoryId, b.budget_id]);
        }
      }

      const delRes = await client.query('DELETE FROM categories WHERE category_id = $1 RETURNING *', [categoryId]);
      await client.query('COMMIT');
      return { ...delRes.rows[0], reassignedCount: totalDeps };
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  }

  // No active dependencies: safe to delete directly
  const result = await db.query(
    `DELETE FROM categories WHERE category_id = $1 RETURNING *`,
    [categoryId]
  );
  return result.rows[0] || null;
}

// ── Audit / Recent Activity ───────────────────────────────────────

async function getRecentActivity(limit = 50) {
  // Combine recent users, expenses, and income as a simple activity log
  const result = await db.query(
    `(
       SELECT 'new_user' AS event_type,
              u.name AS actor, u.email AS detail,
              u.created_at AS event_time
       FROM users u
       ORDER BY u.created_at DESC
       LIMIT 20
     )
     UNION ALL
     (
       SELECT 'expense' AS event_type,
              u.name AS actor,
              CONCAT(e.description, ' — ₹', e.amount) AS detail,
              e.created_at AS event_time
       FROM expenses e
       JOIN users u ON u.user_id = e.user_id
       ORDER BY e.created_at DESC
       LIMIT 15
     )
     UNION ALL
     (
       SELECT 'income' AS event_type,
              u.name AS actor,
              CONCAT(i.source, ' — ₹', i.amount) AS detail,
              i.created_at AS event_time
       FROM incomes i
       JOIN users u ON u.user_id = i.user_id
       ORDER BY i.created_at DESC
       LIMIT 15
     )
     ORDER BY event_time DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ── System Health: table row counts ──────────────────────────────

async function getTableRowCounts() {
  const tables = [
    'users', 'categories', 'incomes', 'expenses',
    'budgets', 'financial_goals', 'financial_holdings',
    'financial_documents', 'document_transactions',
    'project_workspaces', 'project_expenses', 'notifications',
    'monthly_budget_plans', 'ai_insights', 'recurring_patterns',
    'recurring_payments', 'taxes', 'liabilities',
  ];

  const queries = tables.map((t) =>
    db.query(`SELECT '${t}' AS table_name, COUNT(*) AS row_count FROM ${t}`)
      .catch(() => ({ rows: [{ table_name: t, row_count: 'N/A' }] }))
  );

  const results = await Promise.all(queries);
  return results.map((r) => r.rows[0]);
}

module.exports = {
  getAllUsers,
  countUsers,
  setUserRole,
  deleteUser,
  deleteUsersBulk,
  getPlatformStats,
  getUserGrowthByMonth,
  getDocumentStats,
  getRecentDocuments,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getRecentActivity,
  getTableRowCounts,
};
