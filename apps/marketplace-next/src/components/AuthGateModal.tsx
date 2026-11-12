'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  LogIn,
  Lock,
  User,
  Loader2,
  AlertCircle,
  Smartphone,
  ShoppingBag,
  X,
} from 'lucide-react';
// Relative (not '@/…'): pulled into the ROOT tsc program via cart.tsx, where
// the root tsconfig maps '@/*' to packages/shared/src — app-level alias
// imports break that typecheck.
import { api, markSessionActive } from '../lib/api';
import { normalizeEgyptianPhone } from '../lib/phone';

type GateMode = 'signup' | 'login';

/**
 * بوابة "سجل برقم موبايلك عشان تطلب" — بتظهر أول ما زائر يضيف منتج للسلة
 * وهو مش مسجل. بعد إنشاء الحساب أو الدخول، المنتج المعلّق بيتضاف للسلة
 * تلقائياً وكأن مفيش حاجة حصلت.
 */
export function AuthGateModal({
  open,
  onClose,
  onAuthSuccess,
}: {
  open: boolean;
  onClose: () => void;
  /** بيتنادى بعد نجاح إنشاء الحساب أو الدخول (الجلسة مفعلة وقتها). */
  onAuthSuccess: () => void;
}) {
  const [mode, setMode] = useState<GateMode>('signup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // تصفير الفورم كل مرة تفتح البوابة
  useEffect(() => {
    if (open) {
      setMode('signup');
      setName('');
      setPhone('');
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [open]);

  // قفل سكرول الخلفية والهروب بزر Esc
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
        const normalized = normalizeEgyptianPhone(phone);
        if (!normalized) {
          throw new Error('رقم موبايل مصري غير صحيح — اكتب الرقم زي 01012345678');
        }
        if (mode === 'signup') {
          await api.post('/auth/signup', {
            name: name.trim(),
            phone: normalized,
            password,
            role: 'CUSTOMER',
          });
        } else {
          await api.post('/auth/login', { phone: normalized, password });
        }
        // كوكيز الجلسة HttpOnly بترجع مع الرد — علّم الجلسة نشطة وبلّغ
        // الناف بار إن الحالة اتغيرت.
        markSessionActive();
        window.dispatchEvent(new Event('ray-session-changed'));
        onAuthSuccess();
        onClose();
      } catch (err: any) {
        setError(err?.message || 'حصل خطأ — حاول تاني');
      } finally {
        setLoading(false);
      }
    },
    [mode, name, phone, password, onAuthSuccess, onClose]
  );

  if (!open) return null;

  const inputBase =
    'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 font-semibold focus:border-brand-cyan outline-none transition-colors text-sm';

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      {/* الخلفية المعتمة — الضغط عليها يقفل */}
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute top-4 left-4 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-cyan/10 flex items-center justify-center">
            <Smartphone className="w-7 h-7 text-brand-cyan" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            سجل برقم موبايلك عشان تطلب
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1.5 leading-relaxed">
            الطلب في الماركت محتاج حساب — بنستخدم رقم موبايلك للتواصل وتأكيد الطلبات وكود الدولة +20
            بيضاف تلقائياً. منتجك بيتضاف للسلة فوراً بعد التسجيل.
          </p>
        </div>

        {/* مبدّل: حساب جديد / دخول */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              mode === 'signup'
                ? 'bg-white dark:bg-slate-900 text-brand-cyan shadow-sm'
                : 'text-slate-500'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            حساب جديد
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-brand-cyan shadow-sm'
                : 'text-slate-500'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            تسجيل الدخول
          </button>
        </div>

        <form className="space-y-3" onSubmit={submit}>
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputBase} pr-10`}
                placeholder="اسمك"
                required
              />
            </div>
          )}
          <div className="flex" dir="ltr">
            <span className="inline-flex items-center justify-center min-w-[58px] px-3 rounded-r-xl border border-l-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm select-none">
              +20
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${inputBase} rounded-l-none`}
              placeholder="01012345678"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputBase} pr-10`}
              placeholder="كلمة المرور"
              required
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs font-semibold bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-brand-gradient text-white font-bold text-sm hover:shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signup' ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading ? 'لحظة...' : mode === 'signup' ? 'اعمل الحساب وأضف للسلة' : 'دخول وأضف للسلة'}
          </button>
        </form>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold mt-4 justify-center">
          <ShoppingBag className="w-3.5 h-3.5" />
          سجل مرة واحدة بس — بعد كده الطلب بيبقى بضغطة
        </div>
        <Link
          href="/privacy"
          className="block text-center text-[10px] text-slate-400 hover:text-brand-cyan font-semibold mt-1"
        >
          بياناتك في أمان — اقرأ سياسة الخصوصية
        </Link>
      </div>
    </div>
  );
}
