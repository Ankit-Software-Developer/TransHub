// frontend/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach bearer token from localStorage if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('transporter_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor for automatic token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('transporter_refresh_token');
        if (refreshToken) {
          try {
            const refreshRes = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh`, {
              refreshToken,
            });
            const newAccessToken = refreshRes.data.data.accessToken;
            const newRefreshToken = refreshRes.data.data.refreshToken;
            localStorage.setItem('transporter_access_token', newAccessToken);
            localStorage.setItem('transporter_refresh_token', newRefreshToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          } catch (refreshErr) {
            localStorage.removeItem('transporter_access_token');
            localStorage.removeItem('transporter_refresh_token');
            localStorage.removeItem('transporter_user');
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          }
        } else {
          localStorage.removeItem('transporter_access_token');
          localStorage.removeItem('transporter_refresh_token');
          localStorage.removeItem('transporter_user');
          if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register') && window.location.pathname !== '/') {
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
