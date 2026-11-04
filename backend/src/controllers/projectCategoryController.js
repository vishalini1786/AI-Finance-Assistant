// projectCategoryController.js
const projectCategoryService = require('../services/projectCategoryService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await projectCategoryService.getCategories(req.params.projectId, req.userId);
  return sendSuccess(res, { data: { categories } });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const category = await projectCategoryService.createCategory(req.params.projectId, req.userId, name);
  return sendSuccess(res, { statusCode: 201, message: 'Category created', data: { category } });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const category = await projectCategoryService.updateCategory(
    req.params.categoryId,
    req.params.projectId,
    req.userId,
    name
  );
  return sendSuccess(res, { message: 'Category updated', data: { category } });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const result = await projectCategoryService.deleteCategory(
    req.params.categoryId,
    req.params.projectId,
    req.userId
  );
  return sendSuccess(res, { message: result.message });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };

