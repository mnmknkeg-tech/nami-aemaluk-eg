'use client';

import { createPortal } from 'react-dom';
import { Play, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { PosCashier } from '@/lib/posSettings';

type Props = {
  show: boolean;
  mode: 'open' | 'login' | 'none' | 'resume';
  openingCash: number;
  onOpeningCashChange: (v: number) => void;
  cashierId: string;
  onCashierIdChange: (v: string) => void;
  cashiers: PosCashier[];
  pin: string;
  onPinChange: (v: string) => void;
  showPin: boolean;
  onToggleShowPin: () => void;
  error: string;
  submitting: boolean;
  onSubmit: () => void;
  hasAdminPin: boolean;
  hasCashiers: boolean;
};

/** Full-screen blocking gate shown via createPortal until the shift/cashier session is ready. */
export default function PosGateModal({
  show,
  mode,
  openingCash,
  onOpeningCashChange,
  cashierId,
  onCashierIdChange,
  cashiers,
  pin,
  onPinChange,
  showPin,
  onToggleShowPin,
  error,
  submitting,
  onSubmit,
  hasAdminPin,
  hasCashiers,
}: Props) {
  if (!show || typeof document === 'undefined') return null;
  const showCashierFields = cashiers.length > 0 || hasAdminPin;
  return createPortal(
    <div
      className="fixed inset-0 z-[10050] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-sm bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6 space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#BD00FF]/10 flex items-center justify-center mb-3">
            {mode === 'open' ? (
              <Play size={26} className="text-[#BD00FF]" />
            ) : (
              <Lock size={26} className="text-[#BD00FF]" />
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {mode === 'open' ? 'ابدأ الوردية' : 'سجّل الكاشير'}
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {mode === 'open'
              ? 'افتح وردية جديدة لتبدأ البيع'
              : 'الوردية مفتوحة — سجّل دخولك لتكمل البيع'}
          </p>
        </div>

        {mode === 'open' && (
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500">العهدة الافتتاحية</label>
            <input
              type="number"
              min={0}
              value={openingCash || ''}
              onChange={(e) => onOpeningCashChange(Number(e.target.value) || 0)}
              placeholder="مبلغ العهدة"
              className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center focus:ring-2 focus:ring-[#BD00FF]"
            />
          </div>
        )}

        {showCashierFields && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">اسم الكاشير</label>
              <select
                value={cashierId}
                onChange={(e) => onCashierIdChange(e.target.value)}
                className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-right focus:ring-2 focus:ring-[#BD00FF]"
              >
                <option value="">اختار الكاشير...</option>
                <option value="__admin__">الإدارة (صاحب المحل)</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500">الرقم السري</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="أدخل الرقم السري"
                  className="w-full bg-slate-50 border rounded-xl py-3 px-4 outline-none text-sm font-black text-center tracking-[0.4em] focus:ring-2 focus:ring-[#BD00FF]"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={onToggleShowPin}
                  className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label="إظهار الرقم السري"
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-[#BD00FF] to-[#8A00C2] text-white font-black text-sm shadow-lg shadow-[#BD00FF]/25 hover:from-[#8A00C2] hover:to-[#BD00FF] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
          {mode === 'open' ? 'فتح الوردية ودخول الكاشير' : 'دخول'}
        </button>

        {mode === 'open' && !hasCashiers && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="w-full text-center text-xs font-black text-slate-400 hover:text-slate-600 underline"
          >
            فتح بدون كاشير
          </button>
        )}

        {mode === 'open' && hasCashiers && cashiers.length === 0 && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold text-center">
            مفيش كاشير عنده صلاحية فتح الوردية — عدّل الصلاحيات من{' '}
            <Link href="/dashboard/pos/settings" className="underline font-black">
              إعدادات الكاشير
            </Link>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
