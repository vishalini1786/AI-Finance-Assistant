// projectController.js
const projectService = require('../services/projectService');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess } = require('../utils/response');

const getProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getProjects(req.userId);
  return sendSuccess(res, { data: { projects } });
});

const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.projectId, req.userId);
  return sendSuccess(res, { data: { project } });
});

const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.userId, req.body);
  return sendSuccess(res, { statusCode: 201, message: 'Project created successfully', data: { project } });
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(req.params.projectId, req.userId, req.body);
  return sendSuccess(res, { message: 'Project updated successfully', data: { project } });
});

const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.projectId, req.userId);
  return sendSuccess(res, { message: 'Project deleted successfully' });
});

const getProjectSummary = asyncHandler(async (req, res) => {
  const summary = await projectService.getProjectSummary(req.userId);
  return sendSuccess(res, { data: { summary } });
});

const getProjectExpenses = asyncHandler(async (req, res) => {
  const expenses = await projectService.getProjectExpenses(req.params.projectId, req.userId);
  return sendSuccess(res, { data: { expenses } });
});

const createProjectExpense = asyncHandler(async (req, res) => {
  const expense = await projectService.createProjectExpense(req.params.projectId, req.userId, req.body);
  return sendSuccess(res, { statusCode: 201, message: 'Project expense created', data: { expense } });
});

const updateProjectExpense = asyncHandler(async (req, res) => {
  const expense = await projectService.updateProjectExpense(req.params.expenseId, req.params.projectId, req.userId, req.body);
  return sendSuccess(res, { message: 'Project expense updated', data: { expense } });
});

const deleteProjectExpense = asyncHandler(async (req, res) => {
  await projectService.deleteProjectExpense(req.params.expenseId, req.params.projectId, req.userId);
  return sendSuccess(res, { message: 'Project expense deleted' });
});

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectSummary,
  getProjectExpenses,
  createProjectExpense,
  updateProjectExpense,
  deleteProjectExpense
};
