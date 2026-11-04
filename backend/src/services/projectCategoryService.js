// projectCategoryService.js
const projectCategoryRepository = require('../repositories/projectCategoryRepository');
const projectRepository = require('../repositories/projectRepository');

/** Verify the project belongs to the user; throw 404 otherwise. */
async function assertProjectOwnership(projectId, userId) {
  const project = await projectRepository.getProjectById(projectId, userId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }
  return project;
}

async function getCategories(projectId, userId) {
  await assertProjectOwnership(projectId, userId);
  return projectCategoryRepository.getCategoriesForProject(projectId, userId);
}

async function createCategory(projectId, userId, name) {
  await assertProjectOwnership(projectId, userId);

  const trimmed = name.trim();
  if (!trimmed) {
    const err = new Error('Category name cannot be empty');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  // Check duplicate (case-insensitive)
  const existing = await projectCategoryRepository.getCategoryByName(trimmed, projectId, userId);
  if (existing) {
    const err = new Error(`Category "${trimmed}" already exists in this project`);
    err.statusCode = 409;
    err.expose = true;
    throw err;
  }

  return projectCategoryRepository.createCategory({ projectId, userId, name: trimmed });
}

async function updateCategory(categoryId, projectId, userId, newName) {
  await assertProjectOwnership(projectId, userId);

  const trimmed = newName.trim();
  if (!trimmed) {
    const err = new Error('Category name cannot be empty');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }

  // Check duplicate against other categories
  const existing = await projectCategoryRepository.getCategoryByName(trimmed, projectId, userId);
  if (existing && existing.category_id !== Number(categoryId)) {
    const err = new Error(`Category "${trimmed}" already exists in this project`);
    err.statusCode = 409;
    err.expose = true;
    throw err;
  }

  const updated = await projectCategoryRepository.updateCategory(categoryId, projectId, userId, trimmed);
  if (!updated) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }
  return updated;
}

async function deleteCategory(categoryId, projectId, userId) {
  await assertProjectOwnership(projectId, userId);

  const result = await projectCategoryRepository.deleteCategory(categoryId, projectId, userId);
  if (result === null) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }
  if (!result.deleted) {
    const err = new Error(
      `Cannot delete category "${result.name}" — it is used by ${result.usageCount} expense(s). ` +
      `Reassign those expenses to another category first.`
    );
    err.statusCode = 409;
    err.expose = true;
    throw err;
  }
  return { message: 'Category deleted successfully' };
}

async function bulkCreateCategories(projectId, userId, names) {
  return projectCategoryRepository.bulkCreateCategories(projectId, userId, names);
}

/**
 * Validate that a given category name belongs to the specified project and user.
 * Used before saving a project expense.
 */
async function assertCategoryBelongsToProject(categoryName, projectId, userId) {
  const trimmed = (categoryName || '').trim();
  if (!trimmed) {
    const err = new Error('Category is required');
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }
  const cat = await projectCategoryRepository.getCategoryByName(trimmed, projectId, userId);
  if (!cat) {
    const err = new Error(
      `Category "${trimmed}" does not belong to this project. Please add it to the project first.`
    );
    err.statusCode = 400;
    err.expose = true;
    throw err;
  }
  return cat;
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkCreateCategories,
  assertCategoryBelongsToProject,
};

