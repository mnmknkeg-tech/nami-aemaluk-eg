'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Lock, Unlock, RefreshCw, LockKeyhole } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type Period = {
  id: string; shop_id: string; name: string;
  start_date: string; end_date: string;
  status: 'open' | 'closed'; closed_by: string; closed_at: string; created_at: string;
};

const MONTHS_AR = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function FiscalPeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      setShopId(sid);
      const res = await apiRequest(`/accounting/fiscal-periods/shop/${sid}`);
      setPeriods(Array.isArray(res) ? res : (res?.data || []));
    } catch { setPeriods([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      await apiRequest(`/accounting/fiscal-periods/shop/${shopId}`, {
        method: 'POST',
        body: JSON.stringify({ year, month }),
      });
      await load();
    } catch (e: any) { alert(e?.message || 'خطأ'); } finally { setBusy(false); }
  };

  const close = async (p: Period) => {
    if (!confirm('إقفال الفترة؟ لن يمكن الترحيل لأي قيود داخلها بعد الآن.')) return;
    setBusy(true);
    try {
      await apiRequest(`/accounting/fiscal-periods/${p.id}/close`, { method: 'POST' });
      await load();
    } catch (e: any) { alert(e?.message || 'خطأ'); } finally { setBusy(false); }
  };

  const reopen = async (p: Period) => {
    if (!confirm('إعادة فتح الفترة؟ سيُسمح بالترحيل داخلها مجددًا.')) return;
    setBusy(true);
    try {
      await apiRequest(`/accounting/fiscal-periods/${p.id}/reopen`, { method: 'POST' });
      await load();
    } catch (e: any) { alert(e?.message || 'خطأ'); } finally { setBusy(false); }
  };

  const fmtDate = (n: string) => n;

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center text-white">
          <LockKeyhole size={22} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">الفترات المالية</h1>
          <p className="text-sm text-slate-500 font-bold">إقفال الشهور المحاسبية لمنع أي ترحيل داخلها بعد المراجعة</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs font-black text-slate-600 block mb-1">السنة</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold w-24" dir="ltr" />
        </div>
        <div>
          <label className="text-xs font-black text-slate-600 block mb-1">الشهر</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold bg-white">
            {MONTHS_AR.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <button onClick={create} disabled={busy} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-xl">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} إنشاء فترة
        </button>
        <button onClick={load} className="flex items-center gap-2 border border-slate-200 text-slate-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-50">
          <RefreshCw size={15} /> تحديث
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-rose-500" /></div>
        ) : periods.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-bold">لا فترات — أنشئ فترة للبدء (مثال: يناير 2026)</div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-black">
                <th className="px-3 py-3 text-right">الفترة</th>
                <th className="px-3 py-3 text-right">من</th>
                <th className="px-3 py-3 text-right">إلى</th>
                <th className="px-3 py-3 text-right">الحالة</th>
                <th className="px-3 py-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-black text-slate-800">{MONTHS_AR[Number(p.name.split('-')[1])] || p.name} {p.name.split('-')[0]}</td>
                  <td className="px-3 py-2.5 text-slate-600 font-bold" dir="ltr">{p.start_date}</td>
                  <td className="px-3 py-2.5 text-slate-600 font-bold" dir="ltr">{p.end_date}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${p.status === 'closed' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.status === 'closed' ? '🔒 مقفولة' : 'مفتوحة'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {p.status === 'open' ? (
                      <button onClick={() => close(p)} className="flex items-center gap-1 text-xs font-black text-rose-700 hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg">
                        <Lock size={12} /> إقفال
                      </button>
                    ) : (
                      <button onClick={() => reopen(p)} className="flex items-center gap-1 text-xs font-black text-amber-700 hover:bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                        <Unlock size={12} /> إعادة فتح
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}