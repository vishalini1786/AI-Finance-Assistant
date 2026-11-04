// projectService.js
const projectRepository = require('../repositories/projectRepository');
const projectExpenseRepository = require('../repositories/projectExpenseRepository');
const projectCategoryService = require('./projectCategoryService');

// Helper to format project with calculated fields
function formatProject(project) {
  const targetBudget = parseFloat(project.target_budget) || 0;
  const totalSpent = parseFloat(project.total_spent) || 0;
  const remainingBudget = targetBudget - totalSpent;
  let utilizationPercentage = 0;
  
  if (targetBudget > 0) {
    utilizationPercentage = (totalSpent / targetBudget) * 100;
  } else if (totalSpent > 0) {
    utilizationPercentage = 100;
  }

  return {
    ...project,
    target_budget: targetBudget,
    total_spent: totalSpent,
    remaining_budget: remainingBudget,
    utilization_percentage: Number(utilizationPercentage.toFixed(2)),
    is_over_budget: totalSpent > targetBudget
  };
}

async function createProject(userId, projectData) {
  const { projectName, description, targetBudget, startDate, targetDate, status, categories } = projectData;
  const project = await projectRepository.createProject({
    userId,
    projectName,
    description,
    targetBudget,
    startDate,
    targetDate,
    status
  });

  // If initial categories were supplied, create them
  let createdCategories = [];
  if (Array.isArray(categories) && categories.length > 0) {
    const validNames = [...new Set(categories.map(c => c.trim()).filter(Boolean))];
    if (validNames.length > 0) {
      createdCategories = await projectCategoryService.bulkCreateCategories(
        project.project_id,
        userId,
        validNames
      );
    }
  }

  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId, { pageContext: 'PROJECTS' }).catch(() => null);
  return formatProject({ ...project, total_spent: 0, categories: createdCategories });
}

async function getProjects(userId) {
  const projects = await projectRepository.getProjectsByUser(userId);
  return projects.map(formatProject);
}

async function getProjectById(projectId, userId) {
  const project = await projectRepository.getProjectById(projectId, userId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }
  
  const expenses = await projectExpenseRepository.getProjectExpenses(projectId, userId);
  const projectCategoryRepository = require('../repositories/projectCategoryRepository');
  let categories = [];
  try {
    categories = await projectCategoryRepository.getCategoriesForProject(projectId, userId);
  } catch (catErr) {
    console.error('Warning: could not fetch categories from project_categories:', catErr.message);
  }

  // If project has existing expenses with categories not yet in project_categories,
  // surface them seamlessly so the project page never breaks or shows missing categories
  if (expenses && expenses.length > 0) {
    const existingCatNames = new Set(categories.map(c => c.name.toLowerCase()));
    for (const exp of expenses) {
      if (exp.category && !existingCatNames.has(exp.category.toLowerCase())) {
        existingCatNames.add(exp.category.toLowerCase());
        // Try auto-saving into project_categories for future consistency
        projectCategoryRepository.createCategory({
          projectId: Number(projectId),
          userId: Number(userId),
          name: exp.category
        }).then(created => {
          if (created) categories.push(created);
        }).catch(() => null);

        categories.push({
          category_id: `legacy-${exp.category}`,
          project_id: Number(projectId),
          user_id: Number(userId),
          name: exp.category
        });
      }
    }
  }
  
  return {
    ...formatProject(project),
    expenses,
    categories
  };
}

async function updateProject(projectId, userId, fields) {
  // Verify ownership implicitly via repository
  const project = await projectRepository.updateProject(projectId, userId, {
    project_name: fields.projectName,
    description: fields.description,
    target_budget: fields.targetBudget,
    start_date: fields.startDate,
    target_date: fields.targetDate,
    status: fields.status
  });
  
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }
  
  // Re-fetch to get updated total_spent and categories
  return getProjectById(projectId, userId);
}

async function deleteProject(projectId, userId) {
  const project = await projectRepository.deleteProject(projectId, userId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }
  return project;
}

async function getProjectSummary(userId) {
  const summary = await projectRepository.getProjectSummary(userId);
  const totalRemaining = summary.totalTargetBudget - summary.totalSpent;
  return {
    ...summary,
    totalRemaining
  };
}

// ---- Project Expenses ----

async function createProjectExpense(projectId, userId, expenseData) {
  // First verify project belongs to user
  const project = await projectRepository.getProjectById(projectId, userId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }

  const { expenseName, category, amount, expenseDate, paymentMode, description } = expenseData;

  // Validate that the category belongs to this project (backend ownership check).
  // This prevents cross-project or cross-user category injection.
  await projectCategoryService.assertCategoryBelongsToProject(category, projectId, userId);

  const created = await projectExpenseRepository.createProjectExpense({
    projectId,
    userId,
    expenseName,
    category,
    amount,
    expenseDate,
    paymentMode,
    description
  });
  const aiInsightService = require('./aiInsightService');
  aiInsightService.refreshInsightsForUser(userId, { pageContext: 'PROJECTS' }).catch(() => null);
  return created;
}

async function getProjectExpenses(projectId, userId) {
  // Verify project ownership
  const project = await projectRepository.getProjectById(projectId, userId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }
  return await projectExpenseRepository.getProjectExpenses(projectId, userId);
}

async function updateProjectExpense(expenseId, projectId, userId, fields) {
  // Verify project ownership
  const project = await projectRepository.getProjectById(projectId, userId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }

  // Validate category ownership if it's being changed
  if (fields.category) {
    await projectCategoryService.assertCategoryBelongsToProject(fields.category, projectId, userId);
  }

  const expense = await projectExpenseRepository.updateProjectExpense(expenseId, projectId, userId, {
    expense_name: fields.expenseName,
    category: fields.category,
    amount: fields.amount,
    expense_date: fields.expenseDate,
    payment_mode: fields.paymentMode,
    description: fields.description
  });
  
  if (!expense) {
    const error = new Error('Project expense not found');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }
  
  return expense;
}

async function deleteProjectExpense(expenseId, projectId, userId) {
  const normalizedExpenseId = Number(expenseId);
  const normalizedProjectId = Number(projectId);

  if (!Number.isInteger(normalizedExpenseId) || !Number.isInteger(normalizedProjectId)) {
    const error = new Error('Project expense not found');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }

  const expense = await projectExpenseRepository.deleteProjectExpense(normalizedExpenseId, normalizedProjectId, userId);
  if (!expense) {
    const error = new Error('Project expense not found');
    error.statusCode = 404;
    error.expose = true;
    throw error;
  }
  return expense;
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectSummary,
  createProjectExpense,
  getProjectExpenses,
  updateProjectExpense,
  deleteProjectExpense
};
