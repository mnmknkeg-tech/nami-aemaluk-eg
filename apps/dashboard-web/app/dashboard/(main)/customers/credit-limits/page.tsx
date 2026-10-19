'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AlertTriangle, ShieldAlert, Save, Search } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { readLocalRecord, writeLocalRecord } from '@/lib/localStore';

type Customer = { id: string; name?: string; fullName?: string };
type OrderRow = { id: string; total: number; customerId?: string; customer?: { id?: string } };

type LimitStatus = 'all' | 'exceeded' | 'near' | 'safe';

export default function CreditLimitsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LimitStatus>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const shop = await apiRequest('/shops/me');
      const sid = shop?.id;
      const custs = sid ? await apiRequest(`/customers/shop/${sid}`) : [];
      setCustomers(Array.isArray(custs) ? custs : []);
      try {
        const ords = await apiRequest('/orders/me');
        setOrders(Array.isArray(ords) ? ords : []);
      } catch { setOrders([]); }
    } catch { /* keep empty */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    setLimits(readLocalRecord<{ limits: Record<string, string> }>('credit-limits').limits || {});
  }, [load]);

  const usageByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const cid = o.customerId || o.customer?.id;
      if (cid) map.set(cid, (map.get(cid) || 0) + Number(o.total ?? 0));
    }
    return map;
  }, [orders]);

  const saveLimits = () => {
    setSaving(true);
    writeLocalRecord('credit-limits', { limits });
    setTimeout(() => setSaving(false), 400);
  };

  const allRows = customers.map((c) => ({
    customer: c,
    usage: usageByCustomer.get(c.id) || 0,
    limit: Number(limits[c.id] || 0),
  })).filter((r) => r.limit > 0 || r.usage > 0);

  const statusOf = (r: { limit: number; usage: number }): 'exceeded' | 'near' | 'safe' | 'none' => {
    if (r.limit === 0) return 'none';
    if (r.usage > r.limit) return 'exceeded';
    return r.usage / r.limit > 0.75 ? 'near' : 'safe';
  };

  const counts = useMemo(() => {
    const exceeded = allRows.filter((r) => statusOf(r) === 'exceeded').length;
    const near = allRows.filter((r) => statusOf(r) === 'near').length;
    const safe = allRows.filter((r) => statusOf(r) === 'safe').length;
    return { all: allRows.length, exceeded, near, safe };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows]);

  const rows = allRows
    .filter((r) => {
      const st = statusOf(r);
      if (statusFilter === 'exceeded') return st === 'exceeded';
      if (statusFilter === 'near') return st === 'near';
      if (statusFilter === 'safe') return st === 'safe';
      return true;
    })
    .filter((r) => !search || (r.customer.name || r.customer.fullName || '').toLowerCase().includes(search.toLowerCase()));

  const exceededRows = allRows.filter((r) => statusOf(r) === 'exceeded');

  const TABS: { id: LimitStatus; label: string; count: number }[] = [
    { id: 'all', label: 'الكل', count: counts.all },
    { id: 'exceeded', label: 'تعدّى الحد', count: counts.exceeded },
    { id: 'near', label: 'قريب من الحد', count: counts.near },
    { id: 'safe', label: 'منتظم', count: counts.safe },
  ];

  return (
    <div
      className="min-h-full bg-[#F4F5F7] text-slate-900"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* هيدر موحد: عنوان + وصف — الإجراءات في الطرف المقابل */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">حدود الائتمان</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              حدد سقف البيع بالأجل لكل عميل — بيتحذر لو عدّى حدّه
              {counts.all > 0 && counts.exceeded > 0 && (
                <span className="text-red-600 font-semibold"> — {counts.exceeded} تعدّوا الحد</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveLimits}
              className="h-10 px-5 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-700 flex items-center gap-1.5"
            >
              <Save size={13} />
              {saving ? 'تم الحفظ ✓' : 'حفظ الحدود'}
            </button>
          </div>
        </div>
      </div>

      {/* تنبيه العملاء المتعدّين */}
      {exceededRows.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[12px] font-bold">
            <ShieldAlert size={15} className="shrink-0 mt-0.5" />
            {exceededRows.length} عميل تعدّوا حد الائتمان: {exceededRows.map((r) => r.customer.name || r.customer.fullName).join('، ')}
          </div>
        </div>
      )}

      {/* شريط الفلاتر: تابات الحالة بالأعداد + البحث */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-2 sm:px-3 py-2 flex gap-0.5 overflow-x-auto">
            {TABS.map((t) => {
              const isActive = statusFilter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setStatusFilter(t.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                  <span className={`text-[10px] tabular-nums px-1.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>{t.count}</span>
                </button>
              );
            })}
          </div>
          <div className="px-2 sm:px-3 pb-2 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن عميل..."
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-full py-2 pr-9 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* جدول حدود الائتمان */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
          ) : allRows.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-bold text-slate-400">لا يوجد عملاء بعد</p>
              <p className="text-[11px] font-bold text-slate-300 mt-1">حدد حدود الائتمان بعد ما يبدأ عملاؤك في الشراء</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16">
              <AlertTriangle size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">لا نتائج مطابقة للفلتر</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">العميل</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">المستخدم حالياً</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">حد الائتمان (ج.م)</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = statusOf(r);
                    const over = st === 'exceeded';
                    const pct = r.limit > 0 ? Math.min(100, Math.round((r.usage / r.limit) * 100)) : 0;
                    return (
                      <tr key={r.customer.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 py-3 text-xs font-bold text-slate-900">{r.customer.name || r.customer.fullName || 'عميل'}</td>
                        <td className="px-3 py-3">
                          <div className="text-xs font-bold text-slate-900 mb-1 tabular-nums">ج.م {r.usage.toLocaleString()}</div>
                          {r.limit > 0 && (
                            <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${over ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={limits[r.customer.id] ?? ''}
                            onChange={(e) => setLimits({ ...limits, [r.customer.id]: e.target.value })}
                            placeholder="بدون حد"
                            className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-200"
                          />
                        </td>
                        <td className="px-3 py-3">
                          {r.limit === 0 ? (
                            <span className="text-[10px] font-bold text-slate-400">—</span>
                          ) : over ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-50 text-red-600 flex items-center gap-1 w-fit">
                              <AlertTriangle size={11} /> تعدّى الحد
                            </span>
                          ) : st === 'near' ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-700">قريب من الحد</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">منتظم</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
