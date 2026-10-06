// frontend/components/ThemeProvider.js
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  mounted: false,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light');
  const [mounted, setMounted] = useState(false);

  const applyTheme = (newTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }
  };

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('transporter_theme');
      let initialTheme = 'light';
      if (savedTheme === 'light' || savedTheme === 'dark') {
        initialTheme = savedTheme;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initialTheme = 'dark';
      }
      setThemeState(initialTheme);
      applyTheme(initialTheme);
      useStore.getState().setTheme?.(initialTheme);
    } catch (e) {
      applyTheme('light');
    }
    setMounted(true);
  }, []);

  // Sync theme changes across all open browser tabs and windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'transporter_theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
        useStore.getState().setTheme?.(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('transporter_theme', newTheme);
      document.cookie = `transporter_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {}
    applyTheme(newTheme);
    useStore.getState().setTheme?.(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
