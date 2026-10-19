// شاشة الربط / تأكيد الحساب — أول مرة لربط الكاشير بحساب التاجر،
// وكل تلت شهور بيطلب تأكيد الحساب من جديد للأمان (بيانات الكاشير المحلية مش بتتلمس).
import { useState } from 'react';
import { Loader2, Server, Mail, Lock, Plug, CloudOff, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';

export default function Setup({
  relink,
  shopName,
  onDone,
}: {
  relink?: boolean;
  shopName?: string;
  onDone: () => void;
}) {
  const [serverUrl, setServerUrl] = useState('http://localhost:4000');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('اكتب الإيميل وكلمة السر');
      return;
    }
    setBusy(true);
    try {
      await api.connect(serverUrl.trim(), email.trim(), password);
      onDone();
    } catch (e: any) {
      setError(String(e?.message || e).replace(/^.*:\s*/, ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="h-full bg-slate-50 flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4 my-auto">
        <div className="text-center">
          <div
            className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 ${
              relink ? 'bg-amber-100' : 'bg-[#BD00FF]/10'
            }`}
          >
            {relink ? (
              <ShieldCheck size={26} className="text-amber-600" />
            ) : (
              <Plug size={26} className="text-[#BD00FF]" />
            )}
          </div>
          <h1 className="text-xl font-black text-slate-900">
            {relink ? 'تأكيد حساب التاجر' : 'ربط الكاشير بالسيرفر'}
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {relink
              ? `${shopName || 'المحل'} — لأمان الحساب لازم تأكيد الدخول كل تلت شهور. الفواتير المحفوظة محليًا زي ما هي وهتتزامن بعد التأكيد.`
              : 'مرة واحدة بس — بعد كده الكاشير يشتغل بدون نت ويزامن لوحده'}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500">رابط السيرفر</label>
          <div className="relative">
            <Server
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:4000"
              dir="ltr"
              className="w-full bg-slate-50 border rounded-xl py-3 pr-10 pl-4 outline-none text-sm font-black text-right focus:ring-2 focus:ring-[#BD00FF]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500">إيميل التاجر</label>
          <div className="relative">
            <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="merchant@example.com"
              dir="ltr"
              className="w-full bg-slate-50 border rounded-xl py-3 pr-10 pl-4 outline-none text-sm font-black text-right focus:ring-2 focus:ring-[#BD00FF]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500">كلمة السر</label>
          <div className="relative">
            <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="••••••••"
              dir="ltr"
              className="w-full bg-slate-50 border rounded-xl py-3 pr-10 pl-4 outline-none text-sm font-black text-right focus:ring-2 focus:ring-[#BD00FF]"
            />
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-[#BD00FF] to-[#8A00C2] text-white font-black text-sm shadow-lg shadow-[#BD00FF]/25 hover:from-[#8A00C2] hover:to-[#BD00FF] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Plug size={18} />}
          {relink ? 'تأكيد الحساب ودخول' : 'اتصال وبدء الاستخدام'}
        </button>

        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold flex items-start gap-1.5">
          <CloudOff size={14} className="shrink-0 mt-0.5" />
          <span>لو النت مقطوع وقت التشغيل، التطبيق يفتح عادي على آخر بيانات متزامنة.</span>
        </div>
      </div>
    </div>
  );
}
