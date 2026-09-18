import axios from 'axios';

let defaultApiUrl = 'http://localhost:8000';
if (typeof window !== 'undefined') {
  defaultApiUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || defaultApiUrl,
  timeout: 10000,
});

// Interceptor to add JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
