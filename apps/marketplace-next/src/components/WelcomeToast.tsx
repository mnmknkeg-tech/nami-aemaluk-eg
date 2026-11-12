'use client';

import { useEffect, useRef, useState } from 'react';
import { X, PartyPopper, Trash2 } from 'lucide-react';
import { APP_SCOPE, getStoredAuthToken } from '@/lib/api';

const FLAG_KEY = 'mnmknk_welcome';

interface WelcomeData {
  type: 'login' | 'signup' | 'deleted';
  name?: string;
}

/**
 * Welcome toast that appears at the top of the page (above the hero banner)
 * right after login or signup. The auth pages set a sessionStorage flag,
 * redirect to the home page, and this component picks it up and shows the toast.
 */
export function WelcomeToast() {
  const [data, setData] = useState<WelcomeData | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      // Account deletion confirmation — settings redirects here with ?deleted=1
      const params = new URLSearchParams(window.location.search);
      if (params.get('deleted') === '1') {
        window.history.replaceState({}, '', '/');
        setData({ type: 'deleted' });
        setVisible(true);
        timerRef.current = setTimeout(() => setVisible(false), 9000);
        return;
      }

      const raw = sessionStorage.getItem(FLAG_KEY);
      if (!raw) return;
      sessionStorage.removeItem(FLAG_KEY);
      const parsed = JSON.parse(raw) as WelcomeData;
      if (!parsed || (parsed.type !== 'login' && parsed.type !== 'signup')) return;

      setData(parsed);
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), 7000);

      // If the name wasn't stored, try to resolve it from the session
      if (!parsed.name) {
        const token = getStoredAuthToken();
        fetch('/api/v1/auth/me', {
          credentials: 'include',
          headers: {
            'X-App-Scope': APP_SCOPE,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((body) => {
            if (cancelled) return;
            const name =
              body?.data?.user?.name || body?.user?.name || body?.data?.name || body?.name;
            if (name) setData((prev) => (prev ? { ...prev, name } : prev));
          })
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!data || !visible) return null;

  const isSignup = data.type === 'signup';
  const isDeleted = data.type === 'deleted';
  const firstName = data.name ? data.name.split(' ')[0] : '';

  return (
    <div className="fixed top-20 md:top-24 inset-x-0 z-[90] flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto w-full max-w-sm flex items-start gap-3 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-4 animate-slide-down ${
          isDeleted
            ? 'border border-amber-200 dark:border-amber-500/30'
            : 'border border-emerald-200 dark:border-emerald-500/30'
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDeleted ? 'bg-amber-100 dark:bg-amber-500/15' : 'bg-emerald-100 dark:bg-emerald-500/15'}`}
        >
          {isDeleted ? (
            <Trash2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <PartyPopper className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {isDeleted ? (
            <>
              <p className="font-bold text-sm text-slate-900 dark:text-white">تم جدولة حذف حسابك</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                هتقدر ترجع بسهولة — سجل دخولك تاني خلال 30 يوم والحذف بيتلغى تلقائياً
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {isSignup
                  ? 'تم إنشاء حسابك بنجاح 🎉'
                  : firstName
                    ? `أهلاً بعودتك يا ${firstName} 👋`
                    : 'أهلاً بعودتك 👋'}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isSignup
                  ? 'سجل دخولك الآن وابدأ التسوق من مكانك'
                  : 'سعداء برؤيتك مجدداً في من مكانك'}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="إغلاق"
          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
