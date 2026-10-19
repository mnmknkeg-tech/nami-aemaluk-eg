'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PackageCheck, Loader2, Search, AlertCircle, RefreshCw, Printer } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type OrderRow = {
  id: string;
  status: string;
  total: number;
  customerName?: string;
  createdAt?: string;
};

export default function DeliveryNotesPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/orders/me');
      const list = Array.isArray(data) ? data : [];
      setOrders(list.filter((o) => ['DELIVERED', 'OUT_FOR_DELIVERY', 'SHIPPED'].includes(String(o?.status).toUpperCase())));
    } catch {
      setError('تعذر تحميل الطلبات — تأكد أن السيرفر شغال وحاول تاني.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => orders.filter((o) =>
    !search || String(o.id).includes(search) || (o.customerName || '').includes(search)
  ), [orders, search]);

  const printNote = (o: OrderRow) => {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`
      <html dir="rtl"><head><title>إذن صرف - ${String(o.id).slice(0, 8)}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#111}
      h1{font-size:20px;border-bottom:2px solid #111;padding-bottom:8px}
      table{width:100%;margin-top:16px;border-collapse:collapse}
      td{padding:8px 4px;font-size:14px;border-bottom:1px solid #eee}
      .label{color:#666;font-weight:bold;width:140px}</style></head>
      <body>
        <h1>إذن صرف بضاعة</h1>
        <table>
          <tr><td class="label">رقم الإذن</td><td>${String(o.id).slice(0, 8)}</td></tr>
          <tr><td class="label">العميل</td><td>${o.customerName || '—'}</td></tr>
          <tr><td class="label">التاريخ</td><td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-EG') : '—'}</td></tr>
          <tr><td class="label">الإجمالي</td><td>ج.م ${Number(o.total ?? 0).toLocaleString()}</td></tr>
        </table>
        <p style="margin-top:48px;font-size:13px;color:#666">توقيع المستلم: ____________________ &nbsp;&nbsp; توقيع أمين المخزن: ____________________</p>
      </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <PackageCheck size={22} className="text-emerald-600" />
            أوراق الصرف
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">إذن صرف لكل طلب خرج من المخزن — اطبعه وخلّي العميل يمخّط عليه</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50 transition-colors">
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-xs font-bold text-red-600">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث برقم الإذن أو العميل..."
              className="w-full bg-slate-50 rounded-xl py-2 pr-9 pl-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <PackageCheck size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">لا توجد أوراق صرف حالياً</p>
            <p className="text-[11px] font-bold text-slate-300 mt-1">الطلبات اللي اتسلمت أو خرجت للتوصيل بتظهر هنا تلقائياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400">
                  <th className="px-4 py-3">رقم الإذن</th>
                  <th className="px-4 py-3">العميل</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">الإجمالي</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-black text-slate-900">{String(o.id).slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600">{o.customerName || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">
                        {String(o.status).toUpperCase() === 'DELIVERED' ? 'تم التسليم' : String(o.status).toUpperCase() === 'SHIPPED' ? 'تم الشحن' : 'خرج للتوصيل'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-black text-slate-900">ج.م {Number(o.total ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-400">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => printNote(o)} title="طباعة إذن الصرف"
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <Printer size={15} className="text-slate-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
