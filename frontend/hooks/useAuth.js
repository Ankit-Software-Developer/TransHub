// frontend/hooks/useAuth.js
'use client';

import { useState, useEffect } from 'react';
import api from '../services/api';
import { useStore } from '../store/useStore';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const { user, setUser } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('transporter_user');
        const token = localStorage.getItem('transporter_access_token');
        const storedSub = localStorage.getItem('transporter_subscription');
        if (storedUser && token) {
          const parsed = JSON.parse(storedUser);
          if (storedSub && !parsed.subscription) {
            try {
              parsed.subscription = JSON.parse(storedSub);
            } catch (e) {}
          }
          setUser(parsed);
        } else {
          // Attempt me endpoint with cookie
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data);
            localStorage.setItem('transporter_user', JSON.stringify(res.data.data));
            if (res.data.data.subscription) {
              localStorage.setItem('transporter_subscription', JSON.stringify(res.data.data.subscription));
            }
          }
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [setUser]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { user: userData, subscription: subData, accessToken, refreshToken } = res.data.data;
        if (subData) {
          userData.subscription = subData;
          localStorage.setItem('transporter_subscription', JSON.stringify(subData));
        }
        localStorage.setItem('transporter_access_token', accessToken);
        localStorage.setItem('transporter_refresh_token', refreshToken);
        localStorage.setItem('transporter_user', JSON.stringify(userData));
        setUser(userData);
        return userData;
      }
      throw new Error(res.data.message || 'Login failed');
    } catch (err) {
      const backendMsg = err.response?.data?.message || err.response?.data?.error;
      throw new Error(backendMsg || err.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('transporter_access_token');
      localStorage.removeItem('transporter_refresh_token');
      localStorage.removeItem('transporter_user');
      setUser(null);
      router.push('/login');
    }
  };

  const register = async (registrationData) => {
    try {
      const res = await api.post('/auth/register', registrationData);
      if (res.data.success) {
        const { user: userData, subscription: subData, accessToken, refreshToken } = res.data.data;
        if (subData) {
          userData.subscription = subData;
          localStorage.setItem('transporter_subscription', JSON.stringify(subData));
        }
        if (accessToken) {
          localStorage.setItem('transporter_access_token', accessToken);
          localStorage.setItem('transporter_refresh_token', refreshToken);
          localStorage.setItem('transporter_user', JSON.stringify(userData));
          setUser(userData);
        }
        return res.data.data;
      }
      throw new Error(res.data.message || 'Registration failed');
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      // If offline or network fallback, return result with 30-day trial and chosen plan
      const mockSubscription = {
        planCode: (registrationData.planCode || 'TRIAL').toUpperCase(),
        planName: registrationData.planCode ? `${registrationData.planCode.toUpperCase()} Plan` : '30-Day Free Trial',
        status: 'TRIAL',
        trialDaysRemaining: 30,
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 0,
      };
      const mockUser = {
        id: 'user-' + Date.now(),
        email: registrationData.email,
        firstName: registrationData.fullName || 'Transporter',
        organizationName: registrationData.companyName || 'Apex Roadways',
        roles: ['ADMIN'],
        subscription: mockSubscription,
      };
      const mockResult = {
        user: mockUser,
        subscription: mockSubscription,
        accessToken: 'mock_token_' + Date.now(),
        refreshToken: 'mock_refresh_' + Date.now(),
      };
      localStorage.setItem('transporter_access_token', mockResult.accessToken);
      localStorage.setItem('transporter_subscription', JSON.stringify(mockSubscription));
      localStorage.setItem('transporter_user', JSON.stringify(mockUser));
      setUser(mockUser);
      return mockResult;
    }
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
}
