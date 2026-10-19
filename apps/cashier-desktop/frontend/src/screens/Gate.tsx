// شاشة القفل (البوابة) — نسخة مطابقة لبوابة POS الداشبورد:
// وردية جديدة: عهدة افتتاحية + كاشير + رقم سري → فتح الوردية وتسجيلها
// وردية مفتوحة: كاشير + رقم سري → استكمال
// الأدمن: يكتب الرقم السري الخاص بيه من الخانة العلوية → دخول كامل الصلاحيات
import { useEffect, useState } from 'react';
import {
  Play,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  LogIn,
} from 'lucide-react';
import { api, onEvent, type GateInfo, type SyncStatus } from '../lib/api';

export default function Gate({
  onEnter,
  onForget,
}: {
  onEnter: () => void;
  onForget: () => void;
}) {
  const [gate, setGate] = useState<GateInfo | null>(null);
  const [openingCash, setOpeningCash] = useState(0);
  const [cashierId, setCashierId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sync, setSync] = useState<SyncStatus | null>(null);

  const load = async () => {
    const [g, s] = await Promise.all([api.getGate(), api.getSyncStatus()]);
    setGate(g);
    setSync(s);
    if (g.mode === 'none') onEnter();
  };

  useEffect(() => {
    load();
    const off = onEvent('sync:status', (st: SyncStatus) => setSync(st));
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitCashier = async () => {
    if (!gate || submitting) return;
    setError('');
    if (gate.mode === 'open' && gate.cashiers.length > 0 && !cashierId) {
      setError('اختار الكاشير الأول');
      return;
    }
    setSubmitting(true);
    try {
      await api.gateSubmit(cashierId, pin, Math.max(0, openingCash));
      onEnter();
    } catch (e: any) {
      setError(String(e?.message || e).replace(/^\d+:\s*/, ''));
    } finally {
      setSubmitting(false);
    }
  };

  const submitAdmin = async () => {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await api.gateAdmin(pin);
      onEnter();
    } catch (e: any) {
      setError(String(e?.message || e).replace(/^\d+:\s*/, ''));
    } finally {
      setSubmitting(false);
    }
  };

  if (!gate) {
    return (
      <div className="h-full bg-slate-900/95 flex items-center justify-center" dir="rtl">
        <Loader2 size={28} className="animate-spin text-white/60" />
      </div>
    );
  }

  const gateMode = gate.mode;
  const hasCashiers = gate.cashiers.length > 0;

  return (
    <div className="h-full bg-slate-900/95 flex items-center justify-center p-4 relative" dir="rtl">
      {/* sync indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 text-xs font-black">
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            sync?.online ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
          }`}
        >
          {sync?.online ? <Wifi size={13} /> : <WifiOff size={13} />}
          {sync?.online ? 'متصل' : 'أوفلاين'}
        </span>
        {(sync?.pending ?? 0) > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-400 flex items-center gap-1.5">
            <RefreshCw size={12} />
            {sync?.pending} في انتظار المزامنة
          </span>
        )}
      </div>

      <div className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#BD00FF]/10 flex items-center justify-center mb-3">
            {gateMode === 'open' ? (
              <Play size={26} className="text-[#BD00FF]" />
            ) : (
              <Lock size={26} className="text-[#BD00FF]" />
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {gateMode === 'open' ? 'ابدأ الوردية' : 'سجّل الكاشير'}
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {gateMode === 'open'
              ? 'افتح وردية جديدة لتبدأ البيع'
              : 'الوردية مفتوحة — سجّل دخولك لتكمل البيع'}
          </p>
          <p className="text-[11px] font-black text-slate-300 mt-1">{gate.shopName}</p>
        </div>

        {/* admin shortcut — same card, separate action */}
        {gate.hasAdminPin && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500">
              <ShieldCheck size={13} className="text-[#BD00FF]" />
              دخول أدمن (رقم سري الأدمن)
            </div>
            <div className="flex gap-2">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="الرقم السري"
                className="flex-1 bg-white border rounded-xl py-2.5 px-3 outline-none text-sm font-black text-center tracking-[0.4em] focus:ring-2 focus:ring-[#BD00FF]"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={submitAdmin}
                disabled={submitting || !pin}
                className="px-4 rounded-xl bg-[#1A1A1A] text-white text-xs font-black hover:bg-black transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                <LogIn size={14} />
                دخول
              </button>
            </div>
          </div>
        )}

        {gateMode === 'open' && (
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500">العهدة الافتتاحية</label>
            <input
              type="number"
              min={0}
              value={openingCash || ''}
              onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
              placeholder="مبلغ العهدة"
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center focus:ring-2 focus:ring-[#BD00FF]"
            />
          </div>
        )}

        {gateMode !== 'open' || hasCashiers ? (
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500">اسم الكاشير</label>
            <select
              value={cashierId}
              onChange={(e) => setCashierId(e.target.value)}
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-right focus:ring-2 focus:ring-[#BD00FF]"
            >
              <option value="">اختار الكاشير...</option>
              {gate.cashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500">الرقم السري</label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && submitCashier()}
              placeholder="أدخل الرقم السري"
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center tracking-[0.4em] focus:ring-2 focus:ring-[#BD00FF]"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-600"
              tabIndex={-1}
              aria-label="إظهار الرقم السري"
            >
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={submitCashier}
          disabled={submitting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-[#BD00FF] to-[#8A00C2] text-white font-black text-sm shadow-lg shadow-[#BD00FF]/25 hover:from-[#8A00C2] hover:to-[#BD00FF] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Play size={18} />
          )}
          {gateMode === 'open' ? 'فتح الوردية ودخول الكاشير' : 'دخول'}
        </button>

        {gateMode === 'open' && !hasCashiers && (
          <button
            type="button"
            onClick={async () => {
              setSubmitting(true);
              try {
                await api.gateSubmit('', '', Math.max(0, openingCash));
                onEnter();
              } catch (e: any) {
                setError(String(e?.message || e));
              } finally {
                setSubmitting(false);
              }
            }}
            className="w-full text-center text-xs font-black text-slate-400 hover:text-slate-600 underline"
          >
            فتح بدون كاشير
          </button>
        )}

        {gateMode === 'open' && hasCashiers && gate.cashiers.length === 0 && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold text-center">
            مفيش كاشير عنده صلاحية فتح الوردية — عدّل الصلاحيات من إعدادات الكاشير في الداشبورد
          </div>
        )}

        <button
          type="button"
          onClick={onForget}
          className="w-full text-center text-[10px] font-black text-slate-300 hover:text-red-400 transition-colors"
          title="نسيان ربط السيرفر"
        >
          إعادة ربط السيرفر
        </button>
      </div>
    </div>
  );
}
