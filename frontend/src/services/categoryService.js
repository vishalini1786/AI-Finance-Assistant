import api from './api';

async function getCategories() {
  const res = await api.get('/categories');
  return res.data.data.categories;
}

async function createCategory(payload) {
  const res = await api.post('/categories', payload);
  return res.data.data.category;
}

export default { getCategories, createCategory };
