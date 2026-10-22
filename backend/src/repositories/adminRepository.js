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
    `SELECT category_id, name, description, created_at
     FROM categories
     ORDER BY name`
  );
  return result.rows;
}

async function createCategory({ name, description }) {
  const result = await db.query(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2)
     RETURNING *`,
    [name, description || null]
  );
  return result.rows[0];
}

async function updateCategory(categoryId, { name, description }) {
  const result = await db.query(
    `UPDATE categories
     SET name = COALESCE($1, name),
         description = COALESCE($2, description)
     WHERE category_id = $3
     RETURNING *`,
    [name, description, categoryId]
  );
  return result.rows[0] || null;
}

async function deleteCategory(categoryId) {
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
