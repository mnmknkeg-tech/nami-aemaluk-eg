'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function SuggestionsForm() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  return (
    <form
      className="space-y-4 bg-slate-50 dark:bg-slate-900 p-8 rounded-4xl"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);
        try {
          await api.post('/suggestions', { message });
          setSuccess(true);
          setMessage('');
        } catch (err: any) {
          setError(err?.message || 'فشل إرسال الاقتراح. حاول مرة أخرى');
        } finally {
          setLoading(false);
        }
      }}
    >
      <textarea
        rows={6}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 font-bold focus:border-brand-cyan outline-none transition-colors resize-none"
        placeholder="اكتب اقتراحك هنا..."
      />
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-green-500 text-sm font-bold bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          تم إرسال اقتراحك بنجاح! شكراً لك
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-brand-gradient text-white font-black hover:shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        {loading ? 'جاري الإرسال...' : 'إرسال الاقتراح'}
      </button>
    </form>
  );
}
