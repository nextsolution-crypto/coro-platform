import axios from 'axios';
import { API_URL, CSRF_HEADER, CSRF_VALUE, clearSession, refreshSession } from './session';

/** Client API : session par cookie httpOnly, jamais de jeton dans le navigateur. */
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    [CSRF_HEADER]: CSRF_VALUE,
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = String(originalRequest?.url || '');
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !url.includes('/auth/')) {
      originalRequest._retry = true;
      if (await refreshSession()) return api(originalRequest);
      clearSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
