// frontend/components/ui/AlertModalProvider.js
'use client';

import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { useTheme } from '../ThemeProvider';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X,
  Pause,
  ArrowRight
} from 'lucide-react';

const ToastContext = createContext({
  showAlert: () => {},
  showToast: () => {},
  dismissToast: () => {},
  toasts: [],
});

export const useAlert = () => useContext(ToastContext);
export const useToast = () => useContext(ToastContext);

export function AlertModalProvider({ children }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [toasts, setToasts] = useState([]);
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pauseToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isPaused: true } : t))
    );
  }, []);

  const resumeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isPaused: false } : t))
    );
  }, []);

  const showToast = useCallback((options) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const duration = 5000; // 5 seconds default

    let title = 'Operational Notice';
    let message = '';
    let type = 'info';
    let confirmText = 'Got It';

    if (typeof options === 'string') {
      message = options;
      const lower = options.toLowerCase();

      if (
        lower.includes('error') || 
        lower.includes('fail') || 
        lower.includes('denied') || 
        lower.includes('not authorized')
      ) {
        type = 'error';
        title = 'Action Required';
      } else if (
        lower.includes('success') || 
        lower.includes('confirmed') || 
        lower.includes('uploaded') || 
        lower.includes('created') ||
        lower.includes('saved')
      ) {
        type = 'success';
        title = 'Operation Successful';
      } else if (
        lower.includes('warning') || 
        lower.includes('mandatory') || 
        lower.includes('please fill') || 
        lower.includes('please enter') ||
        lower.includes('please select') ||
        lower.includes('cannot delete') ||
        lower.includes('linked to') ||
        lower.includes('exceeds')
      ) {
        type = 'warning';
        title = lower.includes('cannot delete') || lower.includes('linked to') 
          ? 'Operational Notice' 
          : 'Validation Warning';
      } else {
        type = 'info';
        title = 'Operational Notice';
      }
    } else if (options && typeof options === 'object') {
      message = options.message || '';
      type = options.type || 'info';
      title = options.title || (
        type === 'success' ? 'Operation Successful' :
        type === 'error' ? 'Action Required' :
        type === 'warning' ? 'Operational Notice' : 'Operational Notice'
      );
      confirmText = options.confirmText || 'Got It';
    }

    const newToast = {
      id,
      title,
      message,
      type,
      confirmText,
      duration,
      remaining: duration,
      isPaused: false,
      createdAt: Date.now(),
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 active toasts
    return id;
  }, []);

  // Backward compatibility: showAlert maps directly to showToast
  const showAlert = showToast;

  // Active countdown timer: runs every 100ms and pauses on hover
  useEffect(() => {
    const interval = setInterval(() => {
      setToasts((prevToasts) => {
        let changed = false;
        const updated = prevToasts
          .map((t) => {
            if (t.isPaused) return t;
            changed = true;
            const newRemaining = t.remaining - 100;
            return {
              ...t,
              remaining: Math.max(0, newRemaining),
            };
          })
          .filter((t) => t.remaining > 0);

        return changed ? updated : prevToasts;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Safely override window.alert in browser environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert;
      window.alert = (msg) => {
        showToast(String(msg || ''));
      };

      return () => {
        window.alert = originalAlert;
      };
    }
  }, [showToast]);

  // Style helpers per toast type
  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'info':
      default:
        return <Bell className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getToastBorder = (type) => {
    switch (type) {
      case 'success':
        return isDark ? 'border-emerald-500/40' : 'border-emerald-300';
      case 'warning':
        return isDark ? 'border-amber-500/40' : 'border-amber-300';
      case 'error':
        return isDark ? 'border-rose-500/40' : 'border-rose-300';
      case 'info':
      default:
        return isDark ? 'border-blue-500/40' : 'border-blue-300';
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'success':
        return isDark 
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return isDark 
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
          : 'bg-amber-50 text-amber-800 border-amber-200';
      case 'error':
        return isDark 
          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
          : 'bg-rose-50 text-rose-700 border-rose-200';
      case 'info':
      default:
        return isDark 
          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' 
          : 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getProgressBarColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-emerald-500 to-teal-400';
      case 'warning':
        return 'bg-gradient-to-r from-amber-500 to-orange-400';
      case 'error':
        return 'bg-gradient-to-r from-rose-500 to-red-400';
      case 'info':
      default:
        return 'bg-gradient-to-r from-blue-500 to-cyan-400';
    }
  };

  return (
    <ToastContext.Provider value={{ showAlert, showToast, dismissToast, toasts }}>
      {children}

      {/* Modern Floating Toast Notification Container (Top-Right) */}
      <div 
        aria-live="polite"
        className="fixed top-5 right-4 sm:right-6 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const progressPercent = Math.max(0, Math.min(100, (toast.remaining / toast.duration) * 100));

          return (
            <div
              key={toast.id}
              onMouseEnter={() => pauseToast(toast.id)}
              onMouseLeave={() => resumeToast(toast.id)}
              className={`pointer-events-auto relative rounded-2xl border overflow-hidden shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
                getToastBorder(toast.type)
              } ${
                isDark
                  ? 'bg-[#0B1020]/95 text-slate-100 shadow-blue-950/40'
                  : 'bg-white/95 text-slate-900 shadow-slate-300/60'
              }`}
            >
              <div className="p-4 sm:p-4.5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${getBadgeStyle(toast.type)}`}>
                      {getToastIcon(toast.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold tracking-tight truncate">
                          {toast.title}
                        </h4>
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${getBadgeStyle(toast.type)}`}>
                          {toast.type}
                        </span>
                        {toast.isPaused && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                            <Pause className="w-2.5 h-2.5" />
                            Paused
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Close (X) button */}
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className={`p-1 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                      isDark
                        ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                    title="Dismiss notification"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Message Content */}
                <div className={`mt-2 text-xs leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  <p className="whitespace-pre-wrap">{toast.message}</p>
                </div>

                {/* Quick dismiss action button */}
                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
                      toast.type === 'error'
                        ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 dark:text-rose-300 border border-rose-500/30'
                        : toast.type === 'warning'
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                        : toast.type === 'success'
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                    }`}
                  >
                    <span>{toast.confirmText || 'Got It'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 5-Second Countdown Progress Bar (Pauses on Hover) */}
              <div className="w-full h-1 bg-slate-200/50 dark:bg-slate-800/60 overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ease-linear ${getProgressBarColor(toast.type)}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export default AlertModalProvider;
