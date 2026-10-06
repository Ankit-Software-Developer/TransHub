// frontend/components/ui/AlertModalProvider.js
'use client';

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useTheme } from '../ThemeProvider';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X,
  ShieldAlert
} from 'lucide-react';

const AlertContext = createContext({
  showAlert: () => {},
});

export const useAlert = () => useContext(AlertContext);

export function AlertModalProvider({ children }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // 'info' | 'success' | 'warning' | 'error'
    confirmText: 'Acknowledge',
  });

  const showAlert = useCallback((options) => {
    if (typeof options === 'string') {
      let type = 'info';
      let title = 'Operational Notice';

      if (options.toLowerCase().includes('error') || options.toLowerCase().includes('fail') || options.toLowerCase().includes('denied')) {
        type = 'error';
        title = 'Action Required';
      } else if (options.toLowerCase().includes('success') || options.toLowerCase().includes('confirmed') || options.toLowerCase().includes('uploaded')) {
        type = 'success';
        title = 'Operation Successful';
      } else if (options.toLowerCase().includes('warning') || options.toLowerCase().includes('mandatory') || options.toLowerCase().includes('please fill')) {
        type = 'warning';
        title = 'Validation Warning';
      } else if (options.toLowerCase().includes('operational alerts')) {
        type = 'info';
        title = 'Operational Alerts';
      }

      setAlertState({
        isOpen: true,
        title,
        message: options,
        type,
        confirmText: 'Got It',
      });
    } else {
      setAlertState({
        isOpen: true,
        title: options.title || 'Notification',
        message: options.message || '',
        type: options.type || 'info',
        confirmText: options.confirmText || 'Got It',
      });
    }
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Safely override window.alert in browser environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert;
      window.alert = (msg) => {
        showAlert(String(msg || ''));
      };

      return () => {
        window.alert = originalAlert;
      };
    }
  }, [showAlert]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && alertState.isOpen) {
        closeAlert();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alertState.isOpen, closeAlert]);

  // Icon mapping
  const getIcon = () => {
    switch (alertState.type) {
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-rose-500" />;
      case 'info':
      default:
        return <Bell className="w-6 h-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (alertState.type) {
      case 'success':
        return 'border-emerald-500/30';
      case 'warning':
        return 'border-amber-500/30';
      case 'error':
        return 'border-rose-500/30';
      case 'info':
      default:
        return 'border-blue-500/30';
    }
  };

  const getBadgeStyle = () => {
    switch (alertState.type) {
      case 'success':
        return isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return isDark ? 'bg-amber-950/60 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'error':
        return isDark ? 'bg-rose-950/60 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200';
      case 'info':
      default:
        return isDark ? 'bg-blue-950/60 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}

      {/* Modal Dialog for Custom In-App Alerts */}
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ${
          alertState.isOpen
            ? 'pointer-events-auto visible opacity-100'
            : 'pointer-events-none invisible opacity-0'
        }`}
      >
        {/* Backdrop overlay */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
          onClick={closeAlert}
        />

        {/* Alert Card Dialog */}
        <div
          className={`relative w-full max-w-md rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all duration-200 transform ${
            alertState.isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'
          } ${getBorderColor()} ${
            isDark
              ? 'bg-[#0B1020] text-slate-100 shadow-blue-950/50'
              : 'bg-white text-slate-900 shadow-xl'
          }`}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getBadgeStyle()}`}>
                {getIcon()}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold tracking-tight">
                  {alertState.title}
                </h3>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mt-0.5 ${getBadgeStyle()}`}>
                  {alertState.type}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={closeAlert}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message Body */}
          <div className={`text-xs sm:text-sm leading-relaxed my-4 ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            <p className="whitespace-pre-wrap">{alertState.message}</p>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeAlert}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all active:scale-95 cursor-pointer"
            >
              {alertState.confirmText}
            </button>
          </div>
        </div>
      </div>
    </AlertContext.Provider>
  );
}
