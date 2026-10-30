'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ToastVariant = 'default' | 'destructive' | 'success' | 'info';

export type Toast = {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastContextType = {
  toast: (t: Omit<Toast, 'id'>) => void;
  toasts: Toast[];
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => { },
  toasts: [],
  dismiss: () => { },
});

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      const duration = t.duration ?? 3000;
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  // Intercept window.alert so legacy alerts smoothly convert into modern top toasts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalAlert = window.alert;

    window.alert = (message?: any) => {
      const str = String(message ?? '').trim();
      if (!str) return;

      const isSuccess = /نجاح|تم|بنجاح|saved|success|added/i.test(str);
      const isError = /فشل|خطأ|غير مصرح|مطلوب|error|failed|invalid|cannot/i.test(str);

      toast({
        title: str,
        variant: isSuccess ? 'success' : isError ? 'destructive' : 'info',
        duration: 3200,
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}

      {/* Modern Top Toast Container */}
      <div
        dir="rtl"
        className="fixed top-5 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none flex flex-col items-center gap-2.5 w-full max-w-md px-4"
      >
        {toasts.map((t) => {
          const isSuccess = t.variant === 'success';
          const isError = t.variant === 'destructive';
          const isInfo = t.variant === 'info';

          return (
            <div
              key={t.id}
              role="alert"
              className={`w-full pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 border backdrop-blur-md ${isSuccess
                  ? 'bg-emerald-600/95 text-white border-emerald-400/40 shadow-emerald-950/25'
                  : isError
                    ? 'bg-rose-600/95 text-white border-rose-400/40 shadow-rose-950/25'
                    : isInfo
                      ? 'bg-sky-600/95 text-white border-sky-400/40 shadow-sky-950/25'
                      : 'bg-slate-900/95 text-white border-slate-700/60 shadow-slate-950/25'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  {isSuccess ? <CheckIcon /> : isError ? <ErrorIcon /> : <InfoIcon />}
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <p className="font-bold text-sm leading-snug">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-white/80 mt-0.5 leading-relaxed truncate">
                      {t.description}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors shrink-0"
                title="إغلاق"
              >
                <CloseIcon />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
