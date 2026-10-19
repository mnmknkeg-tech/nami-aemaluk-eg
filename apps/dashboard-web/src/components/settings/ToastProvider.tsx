'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type Toast = {
  id: number;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'info';
};

type ToastContextType = {
  toast: (t: Omit<Toast, 'id'>) => void;
  toasts: Toast[];
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  toasts: [],
  dismiss: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
      <div className="fixed bottom-4 left-4 z-[9999] space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-5 py-4 rounded-xl shadow-lg border text-right transition-all animate-in slide-in-from-bottom-2 ${
              t.variant === 'destructive'
                ? 'bg-red-50 border-red-200 text-red-700'
                : t.variant === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : t.variant === 'info'
                    ? 'bg-sky-50 border-sky-200 text-sky-700'
                    : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <p className="font-bold text-sm">{t.title}</p>
            {t.description && <p className="text-xs mt-1 opacity-80">{t.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
