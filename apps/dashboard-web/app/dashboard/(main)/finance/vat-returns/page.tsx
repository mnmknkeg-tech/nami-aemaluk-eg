'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, FileText, RefreshCw, Send, Percent } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type TaxReturn = {
  id: string; shop_id: string; period_year: number; period_month: number;
  output_tax: number; input_tax: number; net_tax: number;
  sales_total: number; purchases_total: number;
  status: 'draft' | 'submitted'; generated_at: string; submitted_at: string;
};

const MONTHS_AR = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function VatReturnsPage() {
  const [returns, setReturns] = useState<TaxReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() === 0 ? 12 : new Date().getMonth()); // previous month
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      setShopId(sid);
      const res = await apiRequest(`/accounting/tax-returns/shop/${sid}`);
      setReturns(Array.isArray(res) ? res : (res?.data || []));
    } catch { setReturns([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setBusy(true);
    try {
      await apiRequest(`/accounting/tax-returns/shop/${shopId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ year, month }),
      });
      await load();
    } catch (e: any) { alert(e?.message || 'خطأ'); } finally { setBusy(false); }
  };

  const submit = async (r: TaxReturn) => {
    if (!confirm(`تقديم إقرار ${MONTHS_AR[r.period_month]} ${r.period_year}؟ الصافي المستحق: ${r.net_tax.toLocaleString()} EGP`)) return;
    setBusy(true);
    try {
      await apiRequest(`/accounting/tax-returns/${r.id}/submit`, { method: 'POST' });
      await load();
    } catch (e: any) { alert(e?.message || 'خطأ'); } finally { setBusy(false); }
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white">
          <Percent size={22} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">الإقرار الضريبي (VAT 14%)</h1>
          <p className="text-sm text-slate-500 font-bold">ضريبة القيمة المضافة الشهرية — ضريبة المبيعات ناقص ضريبة المشتريات</p>
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
        <button onClick={generate} disabled={busy} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-xl">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} توليد / تحديث الإقرار
        </button>
        <button onClick={load} className="flex items-center gap-2 border border-slate-200 text-slate-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-50">
          <RefreshCw size={15} /> تحديث
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-teal-500" /></div>
        ) : returns.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-bold">لا إقرارات — ولّد إقرار أول شهر</div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-black">
                <th className="px-3 py-3 text-right">الفترة</th>
                <th className="px-3 py-3 text-left">المبيعات</th>
                <th className="px-3 py-3 text-left">ضريبة المبيعات (مخرجات)</th>
                <th className="px-3 py-3 text-left">المشتريات</th>
                <th className="px-3 py-3 text-left">ضريبة المشتريات (مدخلات)</th>
                <th className="px-3 py-3 text-left">الصافي المستحق</th>
                <th className="px-3 py-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-black text-slate-800">{MONTHS_AR[r.period_month]} {r.period_year}</td>
                  <td className="px-3 py-2.5 text-left font-mono tabular-nums text-slate-600">{fmt(r.sales_total)}</td>
                  <td className="px-3 py-2.5 text-left font-mono tabular-nums text-emerald-700 font-bold">{fmt(r.output_tax)}</td>
                  <td className="px-3 py-2.5 text-left font-mono tabular-nums text-slate-600">{fmt(r.purchases_total)}</td>
                  <td className="px-3 py-2.5 text-left font-mono tabular-nums text-blue-700 font-bold">{fmt(r.input_tax)}</td>
                  <td className="px-3 py-2.5 text-left font-mono tabular-nums font-black text-slate-900">{fmt(r.net_tax)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${r.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.status === 'submitted' ? 'مقدَّم ✓' : 'مسودة'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 font-bold">
        * الإقرار بيُحسب من الفواتير المرحَّلة (sale = ضريبة مخرجات، purchase = ضريبة مدخلات).
        ** اضغط "تقديم" بعد المراجعة لتثبيت الإقرار — ملاحظة: التقديم مسودة في هذا الإصدار، الربط المباشر مع بوابة الضرائب الإلكترونية (ETA) في مرحلة لاحقة.
      </p>
    </div>
  );
}