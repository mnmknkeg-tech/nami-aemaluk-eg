'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Scale, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type TBRow = {
  account_id: string; code: string; name: string; type: string;
  debit_total: number; credit_total: number;
  debit_balance: number; credit_balance: number;
};
type TB = {
  shop_id: string; from_date: string; to_date: string;
  rows: TBRow[]; total_debit: number; total_credit: number; is_balanced: boolean;
};

export default function TrialBalancePage() {
  const [tb, setTb] = useState<TB | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async (f = from, t = to) => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      const params = new URLSearchParams();
      if (f) params.set('from', f);
      if (t) params.set('to', t);
      const res = await apiRequest(`/accounting/trial-balance/shop/${sid}?${params.toString()}`);
      setTb(res?.data || res || null);
    } catch { setTb(null); } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n: number) => n ? n.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—';

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
            <Scale size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">ميزان المراجعة</h1>
            <p className="text-sm text-slate-500 font-bold">أرصدة كل الحسابات من القيود المرحَّلة — يجب أن يتوازن</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
          <button onClick={() => load(from, to)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl">
            <RefreshCw size={15} /> تحديث
          </button>
        </div>
      </div>

      {tb && (
        <div className={`rounded-xl p-4 flex items-center gap-3 border ${tb.is_balanced ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          {tb.is_balanced ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertTriangle size={20} className="text-rose-500" />}
          <span className={`font-black text-sm ${tb.is_balanced ? 'text-emerald-700' : 'text-rose-700'}`}>
            {tb.is_balanced ? 'الميزان متوازن ✓' : 'الميزان غير متوازن — راجع القيود'}
          </span>
          <span className="font-mono text-xs font-bold text-slate-500 mr-auto" dir="ltr">
            {tb.total_debit.toLocaleString('en-US', { minimumFractionDigits: 2 })} / {tb.total_credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>
        ) : !tb || tb.rows.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-bold">لا توجد حركات مرحَّلة في الفترة المحددة</div>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-black">
                <th className="px-3 py-3 text-right">الكود</th>
                <th className="px-3 py-3 text-right">الحساب</th>
                <th className="px-3 py-3 text-left">إجمالي مدين</th>
                <th className="px-3 py-3 text-left">إجمالي دائن</th>
                <th className="px-3 py-3 text-left">رصيد مدين</th>
                <th className="px-3 py-3 text-left">رصيد دائن</th>
              </tr>
            </thead>
            <tbody>
              {tb.rows.map(r => (
                <tr key={r.account_id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500 font-bold">{r.code}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-800">{r.name}</td>
                  <td className="px-3 py-2.5 text-left font-mono tabular-nums text-slate-600">{fmt(r.debit_total)}</td>
                  <td className="px-3 py-2.5 text-left font-mono tabular-nums text-slate-600">{fmt(r.credit_total)}</td>
                  <td className="px-3 py-2.5 text-left font-mono tabular-nums font-black text-indigo-700">{fmt(r.debit_balance)}</td>
                  <td className="px-3 py-2.5 text-left font-mono tabular-nums font-black text-purple-700">{fmt(r.credit_balance)}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-black">
                <td className="px-3 py-3" colSpan={4}>الإجمالي</td>
                <td className="px-3 py-3 text-left font-mono tabular-nums text-indigo-800">{tb.total_debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-3 text-left font-mono tabular-nums text-purple-800">{tb.total_credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
