'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  ShieldCheck,
  Loader2,
  AlertCircle,
  KeyRound,
  X,
  Store,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth, apiRequest } from '@/lib/auth';
import { BUSINESS_SIGNUP_URL } from '@/lib/appUrls';

const GoogleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.19 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.962 3.038l5.657-5.657C34.895 6.053 29.686 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691 12.88 19.51C14.659 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.962 3.038l5.657-5.657C34.895 6.053 29.686 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.076 0 9.909-1.948 13.48-5.12l-6.219-5.263C29.2 35.091 26.715 36 24 36c-5.167 0-9.617-3.321-11.29-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.225-2.231 4.146-4.042 5.617l.003-.002 6.219 5.263C36.98 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<any>(null);

  const adminTapState = useRef({ count: 0, lastAt: 0 });

  const [returnTo, setReturnTo] = useState('');
  const [followShopId, setFollowShopId] = useState('');
  const isBusinessLogin = true;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(params.get('returnTo') || '');
    setFollowShopId(params.get('followShopId') || '');
  }, []);

  const handleAdminSecretTap = () => {
    const now = Date.now();
    const lastAt = adminTapState.current.lastAt;
    const nextCount = now - lastAt > 1200 ? 1 : adminTapState.current.count + 1;
    adminTapState.current.count = nextCount;
    adminTapState.current.lastAt = now;
    if (nextCount >= 5) {
      adminTapState.current.count = 0;
      adminTapState.current.lastAt = 0;
      router.push('/admin/gate');
    }
  };

  const handleGoogleLogin = () => {
    const q = new URLSearchParams();
    if (returnTo) q.set('returnTo', returnTo);
    if (followShopId) q.set('followShopId', followShopId);
    q.set('target', '/dashboard');
    const qs = q.toString();
    window.location.href = `/api/v1/auth/google${qs ? `?${qs}` : ''}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await login(email, password);
      const role = String(response?.user?.role || '').toLowerCase();

      if (followShopId) {
        try {
          await apiRequest(`/shops/${followShopId}/follow`, { method: 'POST' });
        } catch {}
      }

      if (role === 'admin') {
        router.push(returnTo && returnTo.startsWith('/admin') ? returnTo : '/admin/dashboard');
      } else if (role === 'merchant') {
        try {
          const shop = await apiRequest('/shops/me');
          const status = String(shop?.status || '').toLowerCase();
          if (status && status !== 'approved') {
            router.push('/pending');
            return;
          }
        } catch {}
        router.push(returnTo || '/dashboard');
      } else if (role === 'courier') {
        router.push('/courier/orders');
      } else {
        router.push(returnTo || '/dashboard');
      }
    } catch (err: any) {
      const status = typeof err?.status === 'number' ? err.status : undefined;
      if (status === 403) {
        router.push('/pending');
        return;
      }
      setError(err?.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const e = String(forgotEmail || '').trim();
    if (!e) return;
    setForgotLoading(true);
    setForgotResult(null);
    try {
      const res = await apiRequest('/auth/password/forgot', {
        method: 'POST',
        body: JSON.stringify({ email: e }),
      });
      setForgotResult(res);
    } catch (err: any) {
      setError(err?.message || 'فشل إرسال رابط إعادة التعيين');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-20 flex items-center justify-center min-h-[80vh]">
      <AnimatePresence>
        {isForgotModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => {
              if (!forgotLoading) {
                setForgotModalOpen(false);
                setForgotResult(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="w-full max-w-xl bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 md:p-10 text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between flex-row-reverse gap-4 mb-6">
                <div className="text-right">
                  <h3 className="text-2xl font-black tracking-tight">نسيت كلمة المرور؟</h3>
                  <p className="text-slate-400 font-bold text-sm mt-1">
                    أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين
                  </p>
                </div>
                <button
                  type="button"
                  disabled={forgotLoading}
                  onClick={() => {
                    setForgotModalOpen(false);
                    setForgotResult(null);
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full disabled:opacity-60"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mr-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    disabled={forgotLoading}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 outline-none focus:bg-white focus:border-[#00E5FF]/20 transition-all font-black text-right"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@email.com"
                  />
                </div>

                {forgotResult?.ok && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="text-sm font-black text-slate-700">تم إرسال الطلب</div>
                    <div className="text-[12px] font-bold text-slate-500 mt-2">
                      تحقق من بريدك الإلكتروني للحصول على تعليمات إعادة التعيين
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={forgotLoading}
                  onClick={handleForgotPassword}
                  className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {forgotLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <KeyRound size={18} className="text-[#00E5FF]" />
                  )}
                  {forgotLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white border border-slate-100 p-8 md:p-16 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] text-right text-slate-900"
      >
        <div className="flex flex-col items-center text-center mb-12">
          <div
            onPointerDown={handleAdminSecretTap}
            className="w-20 h-20 bg-[#1A1A1A] rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl relative group overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00E5FF] to-[#BD00FF] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Image
              src="/brand/logo-business.png"
              alt="نمّي أعمالك"
              width={56}
              height={56}
              className="relative z-10 w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-4">
            أهلاً بك في <span className="text-[#00E5FF]">نمّي أعمالك</span>
          </h1>
          <p className="text-slate-400 font-bold text-sm">سجّل دخولك للوصول إلى لوحة التحكم</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 border-r-4 border-red-500 p-4 mb-8 flex items-center gap-3 flex-row-reverse text-red-600 font-bold text-sm"
            >
              <AlertCircle size={20} />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mr-4">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              disabled={loading}
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-5 px-6 outline-none focus:bg-white focus:border-[#00E5FF]/20 transition-all font-black text-right"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center flex-row-reverse mr-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                كلمة المرور
              </label>
              <button
                type="button"
                onClick={() => setForgotModalOpen(true)}
                className="text-[10px] font-black text-[#BD00FF]"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-5 pr-6 pl-16 outline-none focus:bg-white focus:border-[#00E5FF]/20 transition-all font-black text-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-3"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ShieldCheck size={24} className="text-[#00E5FF]" />
            )}
            {loading ? 'جاري التحقق...' : 'تسجيل دخول آمن'}
          </button>
        </form>

        <div className="mt-6">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-[2rem] font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            <GoogleIcon size={20} />
            تسجيل الدخول عبر جوجل
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-50 space-y-4">
          <p className="text-center text-slate-400 font-bold text-xs mb-4">ليس لديك حساب؟</p>
          <div className="grid grid-cols-1 gap-4">
            <a
              href={BUSINESS_SIGNUP_URL}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all text-slate-900"
            >
              <Store size={20} className="text-[#BD00FF]" />
              <span className="font-black text-[10px]">إنشاء حساب تاجر</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
