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

  return envUrl || 'http://localhost:5005/api/v1';
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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for automatic token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints (login, register, or refresh itself)
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('transporter_refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('transporter_access_token');
        localStorage.removeItem('transporter_refresh_token');
        localStorage.removeItem('transporter_user');
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register') && window.location.pathname !== '/') {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return Promise.reject(error);
      }

      // If already refreshing, queue this request until the new token is available
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = refreshRes.data?.data?.accessToken;
        const newRefreshToken = refreshRes.data?.data?.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('transporter_access_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('transporter_refresh_token', newRefreshToken);
          }
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return api(originalRequest);
        } else {
          throw new Error('No access token returned by refresh');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('transporter_access_token');
        localStorage.removeItem('transporter_refresh_token');
        localStorage.removeItem('transporter_user');
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register') && window.location.pathname !== '/') {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

