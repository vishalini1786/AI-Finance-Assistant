// projectService.js
import api from './api';

const projectService = {
  getProjects: async () => {
    const response = await api.get('/projects');
    return response.data.data.projects;
  },

  getProject: async (projectId) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data.data.project;
  },

  createProject: async (data) => {
    const response = await api.post('/projects', data);
    return response.data.data.project;
  },

  updateProject: async (projectId, data) => {
    const response = await api.put(`/projects/${projectId}`, data);
    return response.data.data.project;
  },

  deleteProject: async (projectId) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },

  getProjectSummary: async () => {
    const response = await api.get('/projects/summary');
    return response.data.data.summary;
  },

  getProjectExpenses: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/expenses`);
    return response.data.data.expenses;
  },

  createProjectExpense: async (projectId, data) => {
    const response = await api.post(`/projects/${projectId}/expenses`, data);
    return response.data.data.expense;
  },

  updateProjectExpense: async (projectId, expenseId, data) => {
    const response = await api.put(`/projects/${projectId}/expenses/${expenseId}`, data);
    return response.data.data.expense;
  },

  deleteProjectExpense: async (projectId, expenseId) => {
    const response = await api.delete(`/projects/${projectId}/expenses/${expenseId}`);
    return response.data;
  },

  // ---- Category Methods ----

  getProjectCategories: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/categories`);
    return response.data.data.categories;
  },

  createProjectCategory: async (projectId, name) => {
    const response = await api.post(`/projects/${projectId}/categories`, { name });
    return response.data.data.category;
  },

  updateProjectCategory: async (projectId, categoryId, name) => {
    const response = await api.put(`/projects/${projectId}/categories/${categoryId}`, { name });
    return response.data.data.category;
  },

  deleteProjectCategory: async (projectId, categoryId) => {
    const response = await api.delete(`/projects/${projectId}/categories/${categoryId}`);
    return response.data;
  },
};

export default projectService;
