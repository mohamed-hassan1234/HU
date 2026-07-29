import axios from 'axios';

const defaultApiBaseUrl = import.meta.env.DEV
  ? 'http://localhost:5020/api'
  : '/api';

const apiBaseUrl = (import.meta.env.VITE_API_URL || defaultApiBaseUrl).replace(/\/+$/, '');

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
