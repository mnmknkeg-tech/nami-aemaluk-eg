'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileCheck, Loader2, Search, AlertCircle, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/auth';

type OrderRow = {
  id: string;
  status: string;
  total: number;
  customerName?: string;
  createdAt?: string;
  paymentMethod?: string;
};

// Sales orders = orders still in fulfillment (confirmed/preparing/ready)
const OPEN_STATUSES = ['CONFIRMED', 'PREPARING', 'READY', 'PENDING'];

export default function SalesOrdersPage() {
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
      setOrders(list.filter((o) => OPEN_STATUSES.includes(String(o?.status).toUpperCase())));
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

  const totalValue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileCheck size={22} className="text-emerald-600" />
            أوامر البيع
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">الطلبات المؤكدة اللي لسه في مرحلة التنفيذ — بتتحول لفاتورة عند التسليم</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50 transition-colors">
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <Clock size={16} className="text-amber-600 mb-2" />
          <div className="text-lg font-black text-slate-900">{orders.length}</div>
          <div className="text-[10px] font-bold text-slate-400">أوامر بيع مفتوحة</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <CheckCircle2 size={16} className="text-emerald-600 mb-2" />
          <div className="text-lg font-black text-slate-900">ج.م {totalValue.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-slate-400">قيمة الأوامر المفتوحة</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <FileCheck size={16} className="text-cyan-600 mb-2" />
          <div className="text-lg font-black text-slate-900">{orders.filter((o) => String(o.status).toUpperCase() === 'CONFIRMED').length}</div>
          <div className="text-[10px] font-bold text-slate-400">مؤكدة وجاهزة للتحضير</div>
        </div>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث برقم الأمر أو العميل..."
              className="w-full bg-slate-50 rounded-xl py-2 pr-9 pl-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileCheck size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">لا توجد أوامر بيع مفتوحة حالياً</p>
            <p className="text-[11px] font-bold text-slate-300 mt-1">الطلبات المؤكدة من المتجر أو الفواتير بتظهر هنا تلقائياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400">
                  <th className="px-4 py-3">رقم الأمر</th>
                  <th className="px-4 py-3">العميل</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">الإجمالي</th>
                  <th className="px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-black text-slate-900">{String(o.id).slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600">{o.customerName || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black px-2 py-1 rounded-md bg-amber-50 text-amber-700">
                        {o.status === 'CONFIRMED' ? 'مؤكد' : o.status === 'PREPARING' ? 'جاري التحضير' : o.status === 'READY' ? 'جاهز' : 'قيد المراجعة'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-black text-slate-900">ج.م {Number(o.total ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-400">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-EG') : '-'}
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
