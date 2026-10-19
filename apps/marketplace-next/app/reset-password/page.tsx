'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tight mb-2">إعادة تعيين كلمة المرور</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-bold text-slate-600 dark:text-slate-300">تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني</p>
            <Link href="/login" className="inline-flex items-center gap-2 text-brand-cyan font-black text-sm hover:underline">
              <ArrowLeft className="w-4 h-4" />
              العودة لتسجيل الدخول
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            try {
              await api.post('/auth/password/forgot', { email });
              setSuccess(true);
            } catch (err: any) {
              setError(err?.message || 'فشل إرسال الرابط. حاول مرة أخرى');
            } finally {
              setLoading(false);
            }
          }}>
            <div>
              <label className="block text-sm font-black mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pr-12 pl-4 py-4 font-bold focus:border-brand-cyan outline-none transition-colors" placeholder="بريدك الإلكتروني" />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-brand-gradient text-white font-black hover:shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
              {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 font-bold text-xs hover:text-slate-600">
            <ArrowLeft className="w-3 h-3" />
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
