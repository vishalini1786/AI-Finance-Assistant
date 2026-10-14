// projectRepository.js
const db = require('../config/database');

async function createProject({ userId, projectName, description, targetBudget, startDate, targetDate, status }) {
  const result = await db.query(
    `INSERT INTO project_workspaces (user_id, project_name, description, target_budget, start_date, target_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, projectName, description, targetBudget, startDate, targetDate, status || 'ACTIVE']
  );
  return result.rows[0];
}

async function getProjectsByUser(userId) {
  const result = await db.query(
    `SELECT pw.project_id, pw.user_id, pw.project_name, pw.description, pw.target_budget, TO_CHAR(pw.start_date, 'YYYY-MM-DD') AS start_date, TO_CHAR(pw.target_date, 'YYYY-MM-DD') AS target_date, pw.status, pw.created_at, pw.updated_at,
            COALESCE(SUM(pe.amount), 0) AS total_spent
     FROM project_workspaces pw
     LEFT JOIN project_expenses pe
        ON pw.project_id = pe.project_id
        AND pe.user_id = pw.user_id
     WHERE pw.user_id = $1
     GROUP BY pw.project_id
     ORDER BY pw.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getProjectById(projectId, userId) {
  const result = await db.query(
    `SELECT pw.project_id, pw.user_id, pw.project_name, pw.description, pw.target_budget, TO_CHAR(pw.start_date, 'YYYY-MM-DD') AS start_date, TO_CHAR(pw.target_date, 'YYYY-MM-DD') AS target_date, pw.status, pw.created_at, pw.updated_at,
            COALESCE(SUM(pe.amount), 0) AS total_spent
     FROM project_workspaces pw
     LEFT JOIN project_expenses pe
        ON pw.project_id = pe.project_id
        AND pe.user_id = pw.user_id
     WHERE pw.project_id = $1 AND pw.user_id = $2
     GROUP BY pw.project_id`,
    [projectId, userId]
  );
  return result.rows[0] || null;
}

async function updateProject(projectId, userId, fields) {
  const allowedFields = ['project_name', 'description', 'target_budget', 'start_date', 'target_date', 'status'];
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

  if (setClauses.length === 0) return getProjectById(projectId, userId);

  setClauses.push(`updated_at = NOW()`);
  values.push(projectId, userId);

  const result = await db.query(
    `UPDATE project_workspaces SET ${setClauses.join(', ')}
     WHERE project_id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

async function deleteProject(projectId, userId) {
  const result = await db.query(
    `DELETE FROM project_workspaces WHERE project_id = $1 AND user_id = $2 RETURNING *`,
    [projectId, userId]
  );
  return result.rows[0] || null;
}

async function getProjectSummary(userId) {
  const result = await db.query(
    `SELECT 
        COUNT(DISTINCT pw.project_id) FILTER (WHERE pw.status = 'ACTIVE') as active_projects,
        COALESCE(SUM(pw.target_budget), 0) as total_target_budget,
        COALESCE((SELECT SUM(amount) FROM project_expenses WHERE user_id = $1), 0) as total_spent
     FROM project_workspaces pw
     WHERE pw.user_id = $1`,
    [userId]
  );
  
  const summary = result.rows[0];
  return {
    activeProjects: parseInt(summary.active_projects || 0, 10),
    totalTargetBudget: parseFloat(summary.total_target_budget || 0),
    totalSpent: parseFloat(summary.total_spent || 0)
  };
}

module.exports = {
  createProject,
  getProjectsByUser,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectSummary
};
