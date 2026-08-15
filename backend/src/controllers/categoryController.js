// categoryController.js

const categoryRepository = require('../repositories/categoryRepository');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await categoryRepository.findAll();
  return sendSuccess(res, { message: 'Categories fetched successfully', data: { categories } });
});

module.exports = { getAllCategories };
