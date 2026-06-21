import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'https://www.ctes.hu.edu.so/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hucems_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
