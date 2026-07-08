import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000')) + '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const session = JSON.parse(localStorage.getItem('emailshield_session') || '{}');
    if (session?.token) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
