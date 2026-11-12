'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  UserPlus,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { api, markSessionActive } from '@/lib/api';
import { normalizeEgyptianPhone } from '@/lib/phone';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  // البريد اختياري دلوقتي — الحساب بيتعمل برقم الموبايل
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-black rounded-xl flex items-center justify-center mx-auto mb-6 shadow-2xl relative group overflow-hidden">
            <div className="absolute inset-0 bg-brand-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Image
              src="/brand/logo.png"
              alt="MNMKNK"
              width={48}
              height={48}
              className="w-12 h-12 object-contain relative z-10"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">إنشاء حساب</h1>
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">
            اعمل حسابك برقم موبايلك — بدون بريد إلكتروني
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            try {
              const normalized = normalizeEgyptianPhone(phone);
              if (!normalized) {
                throw new Error('رقم موبايل مصري غير صحيح — اكتب الرقم زي 01012345678');
              }
              await api.post('/auth/signup', {
                name,
                phone: normalized,
                password,
                role: 'CUSTOMER',
                ...(showEmail && email.trim() ? { email: email.trim() } : {}),
              });
              // كوكيز الجلسة بترجع مع الرد — علّم الجلسة نشطة فوراً عشان
              // بوابة "سجل عشان تطلب" تسحب السلة المعلقة على طول.
              markSessionActive();
              try {
                sessionStorage.setItem('mnmknk_welcome', JSON.stringify({ type: 'signup', name }));
              } catch {
                /* ignore */
              }
              const returnTo =
                typeof window !== 'undefined' &&
                new URLSearchParams(window.location.search).get('returnTo');
              router.push(returnTo || '/');
            } catch (err: any) {
              setError(err?.message || 'فشل إنشاء الحساب. حاول مرة أخرى');
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-semibold mb-2">الاسم</label>
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-4 font-semibold focus:border-brand-cyan outline-none transition-colors"
                placeholder="اسمك"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">رقم الموبايل</label>
            <div className="flex" dir="ltr">
              <span className="inline-flex items-center justify-center min-w-[64px] px-3 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm select-none">
                +20
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-r-xl py-4 font-semibold focus:border-brand-cyan outline-none transition-colors"
                placeholder="01012345678"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
              رقم موبايلك هو وسيلة الدخول والتواصل بخصوص طلباتك — يتحفظ بكود الدولة +20
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-4 font-semibold focus:border-brand-cyan outline-none transition-colors"
                placeholder="كلمة المرور"
                required
              />
            </div>
          </div>

          {/* بريد اختياري مطوي — للحسابات اللي عايزة تستقبل الفواتير والإشعارات بالبريد */}
          <div>
            <button
              type="button"
              onClick={() => setShowEmail((v) => !v)}
              className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-xs hover:text-brand-cyan transition-colors"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showEmail ? 'rotate-180' : ''}`}
              />
              إضافة بريد إلكتروني (اختياري)
            </button>
            {showEmail && (
              <div className="relative mt-2">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-4 font-semibold focus:border-brand-cyan outline-none transition-colors"
                  placeholder="بريدك الإلكتروني (اختياري)"
                />
              </div>
            )}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm font-semibold bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-brand-gradient text-white font-semibold hover:shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            {loading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link
            href="/login"
            className="block text-brand-cyan font-semibold text-sm hover:underline"
          >
            لديك حساب؟ سجل دخولك
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 font-semibold text-xs hover:text-slate-600 mt-4"
          >
            <ArrowLeft className="w-3 h-3" />
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
