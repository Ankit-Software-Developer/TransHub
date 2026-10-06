// frontend/services/api.js
import axios from 'axios';

export const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== 'undefined') {
    // 1. If a custom API URL is explicitly configured in localStorage
    const customApiUrl = localStorage.getItem('transporter_api_url');
    if (customApiUrl) return customApiUrl;

    // 2. If NEXT_PUBLIC_API_URL was set to a real external domain/IP (not localhost)
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }

    // 3. In browser, use same origin /api/v1 (Next.js rewrites proxy to backend port 5000)
    const { protocol, host } = window.location;
    return `${protocol}//${host}/api/v1`;
  }

  return envUrl || 'http://localhost:5000/api/v1';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach bearer token from localStorage if available
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
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
            const refreshRes = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {
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
