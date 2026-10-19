'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, Search, AlertCircle, ChevronLeft, Download, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type Customer = { id: string; name?: string; fullName?: string; phone?: string };
type OrderRow = { id: string; status: string; total: number; createdAt?: string; customerId?: string; customer?: { id?: string; name?: string } };

export default function StatementsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const shop = await apiRequest('/shops/me');
      const sid = shop?.id;
      const custs = sid ? await apiRequest(`/customers/shop/${sid}`) : [];
      setCustomers(Array.isArray(custs) ? custs : []);
      try {
        const ords = await apiRequest('/orders/me');
        setOrders(Array.isArray(ords) ? ords : []);
      } catch { setOrders([]); }
    } catch {
      setError('تعذر تحميل العملاء — تأكد أن السيرفر شغال وحاول تاني.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const purchasesByCustomer = useMemo(() => {
    const map = new Map<string, { count: number; total: number; orders: OrderRow[] }>();
    for (const o of orders) {
      const cid = o.customerId || o.customer?.id;
      if (!cid) continue;
      const entry = map.get(cid) || { count: 0, total: 0, orders: [] };
      entry.count += 1;
      entry.total += Number(o.total ?? 0);
      entry.orders.push(o);
      map.set(cid, entry);
    }
    return map;
  }, [orders]);

  const rows = useMemo(() => customers.map((c) => ({
    customer: c,
    ...(purchasesByCustomer.get(c.id) || { count: 0, total: 0, orders: [] }),
  })).filter((r) => !search || (r.customer.name || r.customer.fullName || '').toLowerCase().includes(search.toLowerCase())), [customers, purchasesByCustomer, search]);

  const totalAll = rows.reduce((s, r) => s + r.total, 0);

  const exportCSV = useCallback(() => {
    const csv = [
      ['العميل', 'عدد العمليات', 'إجمالي المشتريات'].join(','),
      ...rows.map((r) => [
        r.customer.name || r.customer.fullName || 'عميل',
        r.count,
        r.total,
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `customer-statements-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [rows]);

  return (
    <div
      className="min-h-full bg-[#F4F5F7] text-slate-900"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* هيدر موحد: عنوان + وصف — الإجراءات في الطرف المقابل */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div>
            {selected ? (
              <>
                <h1 className="text-xl font-bold text-slate-900">كشف حساب: {selected.name || selected.fullName || 'عميل'}</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selected.phone || '—'} · إجمالي المشتريات ج.م {(purchasesByCustomer.get(selected.id)?.total || 0).toLocaleString()} · {purchasesByCustomer.get(selected.id)?.count || 0} عملية
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-slate-900">كشوف الحساب</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  مشتريات كل عميل من عندك — اختار عميل وشوف كشف حسابه بالتفصيل
                  {customers.length > 0 && <span className="font-semibold"> — {customers.length} عميل</span>}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selected ? (
              <button
                onClick={() => setSelected(null)}
                className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <ChevronLeft size={14} />
                رجوع لكل العملاء
              </button>
            ) : (
              <>
                <button
                  onClick={load}
                  disabled={loading}
                  className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  تحديث
                </button>
                <button
                  onClick={exportCSV}
                  className="h-10 px-4 rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Download size={13} />
                  تصدير
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[12px] font-bold">
            <AlertCircle size={15} />
            {error}
          </div>
        </div>
      )}

      {selected ? (
        /* كشف حساب عميل محدد */
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-right">
                <thead className="sticky top-0 bg-slate-50/80 backdrop-blur">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">العملية</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">الحالة</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">المبلغ</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {(purchasesByCustomer.get(selected.id)?.orders || []).map((o) => (
                    <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-3 text-xs font-bold text-slate-900 tabular-nums">{String(o.id).slice(0, 8)}</td>
                      <td className="px-3 py-3 text-[11px] font-bold text-slate-500">{o.status}</td>
                      <td className="px-3 py-3 text-xs font-bold text-slate-900 tabular-nums">ج.م {Number(o.total ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-[11px] font-semibold text-slate-400">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-EG') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* شريط الفلاتر: بحث + إحصائيات سريعة */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4">
            <div className="bg-white border border-slate-200 rounded-xl">
              <div className="px-2 sm:px-3 py-2 flex gap-0.5 items-center overflow-x-auto">
                <span className="shrink-0 text-[11px] font-bold text-slate-500 px-3 py-1 rounded-full bg-slate-100">{customers.length} عميل</span>
                <span className="shrink-0 text-[11px] font-bold text-slate-500 px-3 py-1 rounded-full bg-slate-100">إجمالي المشتريات: ج.م {totalAll.toLocaleString()}</span>
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

          {/* جدول العملاء */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-4 pb-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
              ) : rows.length === 0 ? (
                <div className="text-center py-16">
                  <Search size={36} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400">لا يوجد عملاء بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">العميل</th>
                        <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">عدد العمليات</th>
                        <th className="px-3 py-2.5 text-[11px] font-bold text-slate-500">إجمالي المشتريات</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.customer.id} onClick={() => setSelected(r.customer)}
                          className="border-b border-slate-100 hover:bg-slate-50/70 cursor-pointer transition-colors">
                          <td className="px-3 py-3 text-xs font-bold text-slate-900">{r.customer.name || r.customer.fullName || 'عميل'}</td>
                          <td className="px-3 py-3 text-xs font-semibold text-slate-600 tabular-nums">{r.count}</td>
                          <td className="px-3 py-3 text-xs font-bold text-slate-900 tabular-nums">ج.م {r.total.toLocaleString()}</td>
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/dashboard/crm/${r.customer.id}`} className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1" title="الملف الكامل">
                              الملف الكامل <ChevronLeft size={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
