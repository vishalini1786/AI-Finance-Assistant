import api from './api';

async function getProfile() {
  const res = await api.get('/users/profile');
  return res.data.data.user;
}

async function updateProfile(payload) {
  const res = await api.put('/users/profile', payload);
  return res.data.data.user;
}

export default { getProfile, updateProfile };
