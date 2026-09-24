import api from './api';

async function getCategories() {
  const res = await api.get('/categories');
  return res.data.data.categories;
}

export default { getCategories };
