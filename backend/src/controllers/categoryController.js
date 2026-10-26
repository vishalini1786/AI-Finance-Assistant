// categoryController.js

const categoryRepository = require('../repositories/categoryRepository');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess, sendError } = require('../utils/response');

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await categoryRepository.findAllByUser(req.userId);
  return sendSuccess(res, { message: 'Categories fetched successfully', data: { categories } });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, priority } = req.body;
  
  if (!name || name.trim() === '') {
    return sendError(res, { statusCode: 400, message: 'Category name is required' });
  }

  const cleanName = name.trim();

  // Check if a global or personal category already exists (case-insensitive and trimmed)
  const existing = await categoryRepository.findByNameAndUser(cleanName, req.userId);
  if (existing) {
    if (existing.user_id === null) {
      // Re-use existing global category instead of creating a redundant duplicate
      return sendSuccess(res, {
        statusCode: 200,
        message: `Using existing global category "${existing.name}"`,
        data: { category: existing, reused: true }
      });
    }
    return sendError(res, {
      statusCode: 409,
      message: `A category named "${cleanName}" already exists in your account.`
    });
  }

  try {
    const category = await categoryRepository.create({
      name: cleanName,
      description,
      priority,
      userId: req.userId
    });
    return sendSuccess(res, { statusCode: 201, message: 'Category created successfully', data: { category } });
  } catch (error) {
    if (error.code === '23505') { // unique violation
      return sendError(res, { statusCode: 409, message: 'A category with this name already exists' });
    }
    throw error;
  }
});

module.exports = { getAllCategories, createCategory };
