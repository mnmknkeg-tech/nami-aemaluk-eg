'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogIn, Mail, Lock, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { api, markSessionActive } from '@/lib/api';
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          <h1 className="text-3xl font-bold tracking-tight mb-2">تسجيل الدخول</h1>
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">
            أهلاً بعودتك! سجل دخولك للمتابعة
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            try {
              const res = await api.post<any>('/auth/login', { email, password });
              const data = res?.data || res;
              const token =
                data?.token?.accessToken ||
                data?.accessToken ||
                data?.token ||
                res?.accessToken ||
                res?.token;
              if (token) {
                // Cookie-first: the response's HttpOnly cookies are the
                // credential — localStorage only keeps the non-secret UI flag.
                markSessionActive();
                try {
                  sessionStorage.setItem('mnmknk_welcome', JSON.stringify({ type: 'login' }));
                } catch {
                  /* ignore */
                }
                router.push('/');
              } else {
                setError('استجابة غير صحيحة من الخادم');
              }
            } catch (err: any) {
              setError(err?.message || 'فشل تسجيل الدخول. تحقق من بياناتك');
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-semibold mb-2">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-4 font-semibold focus:border-brand-cyan outline-none transition-colors"
                placeholder="بريدك الإلكتروني"
              />
            </div>
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
              />
            </div>
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <Link
            href="/signup"
            className="block text-brand-cyan font-semibold text-sm hover:underline"
          >
            ليس لديك حساب؟ سجل الآن
          </Link>
          <Link
            href="/reset-password"
            className="block text-slate-500 font-semibold text-xs hover:text-slate-600"
          >
            نسيت كلمة المرور؟
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
