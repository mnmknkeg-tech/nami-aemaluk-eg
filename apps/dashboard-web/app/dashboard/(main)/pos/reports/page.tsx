'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, Loader2, TrendingUp, ShoppingBag, DollarSign, Receipt, Clock, ShoppingCart, ChevronRight, Download, ChevronLeft, Users, Calendar } from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { exportToCsv, paginate } from '@/lib/pos-utils';

const isArabic = true;

type RangeKey = 'today' | 'yesterday' | 'last7days' | 'last30days';

const POSReportsPage: React.FC = () => {
  const { shop } = useShop();
  const shopId = shop?.id || '';
  const [orders, setOrders] = useState<any[]>([]);
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<RangeKey>('today');
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPageSize = 25;

  const loadReport = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now);
      if (range === 'today') from.setHours(0, 0, 0, 0);
      else if (range === 'yesterday') { from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0); }
      else if (range === 'last7days') { from.setDate(from.getDate() - 7); from.setHours(0, 0, 0, 0); }
      else { from.setDate(from.getDate() - 30); from.setHours(0, 0, 0, 0); }
      const to = new Date(now);
      if (range === 'yesterday') { to.setDate(to.getDate() - 1); to.setHours(23, 59, 59, 999); }

      const [ordersData, summaryData] = await Promise.allSettled([
        apiRequest(`/shops/${shopId}/orders`),
        apiRequest(`/shops/${shopId}/shifts/summary?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`),
      ]);

      const filtered = ordersData.status === 'fulfilled'
        ? (Array.isArray(ordersData.value) ? ordersData.value : (ordersData.value?.orders ? ordersData.value.orders : [])).filter((o: any) => {
            const created = new Date(o?.createdAt || 0);
            return created >= from && created <= to && (o?.source === 'pos' || o?.source === 'POS');
          })
        : [];
      setOrders(filtered);
      if (summaryData.status === 'fulfilled' && summaryData.value) setShiftSummary(summaryData.value);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [shopId, range]);

  useEffect(() => { loadReport(); }, [loadReport]);
  useEffect(() => { setOrdersPage(1); }, [range]);

  const totalSales = orders.reduce((sum, o) => sum + Number(o?.total || 0), 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '0.00');

  const paymentBreakdown = orders.reduce((acc, o) => {
    const method = String(o?.paymentMethod || 'COD').toUpperCase();
    acc[method] = (acc[method] || 0) + Number(o?.total || 0);
    return acc;
  }, {} as Record<string, number>);

  // Hourly distribution for the bar chart
  const hourlyBuckets = useMemo(() => {
    const buckets = new Array(24).fill(0);
    orders.forEach((o) => {
      const d = new Date(o?.createdAt || 0);
      const h = d.getHours();
      if (h >= 0 && h < 24) buckets[h] += Number(o?.total || 0);
    });
    return buckets;
  }, [orders]);
  const maxHourly = Math.max(1, ...hourlyBuckets);

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    orders.forEach((o) => {
      (Array.isArray(o?.items) ? o.items : []).forEach((it: any) => {
        const name = String(it?.name || it?.productName || '—');
        const qty = Number(it?.quantity || 0);
        const revenue = Number(it?.price || 0) * qty;
        const cur = map.get(name) || { name, qty: 0, revenue: 0 };
        cur.qty += qty; cur.revenue += revenue;
        map.set(name, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [orders]);

  // Cashier performance (group by cashierId from notes or order metadata)
  const cashierPerformance = useMemo(() => {
    const map = new Map<string, { cashierId: string; orders: number; sales: number }>();
    orders.forEach((o) => {
      const notes = String(o?.notes || '');
      let cid = String(o?.cashierId || o?.cashier_id || '');
      if (!cid) {
        const m = notes.match(/cashier:([^\|]+)/);
        cid = m ? m[1] : 'unknown';
      }
      const cur = map.get(cid) || { cashierId: cid, orders: 0, sales: 0 };
      cur.orders += 1; cur.sales += Number(o?.total || 0);
      map.set(cid, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [orders]);

  // Daily breakdown (for weekly/monthly view)
  const dailyBreakdown = useMemo(() => {
    const map = new Map<string, { date: string; orders: number; sales: number }>();
    orders.forEach((o) => {
      const d = new Date(o?.createdAt || 0);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const cur = map.get(key) || { date: key, orders: 0, sales: 0 };
      cur.orders += 1; cur.sales += Number(o?.total || 0);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [orders]);
  const maxDailySales = Math.max(1, ...dailyBreakdown.map((d) => d.sales));

  const rangeLabels: Record<RangeKey, string> = { today: 'اليوم', yesterday: 'أمس', last7days: 'آخر ٧ أيام', last30days: 'آخر ٣٠ يوم' };

  const pagedOrders = useMemo(() => paginate(orders, ordersPage, ordersPageSize), [orders, ordersPage]);
  const totalOrderPages = Math.max(1, Math.ceil(orders.length / ordersPageSize));

  const handleExportCsv = () => {
    const rows = orders.map((o) => ({
      'رقم الفاتورة': o?.orderNumber || o?.id || '',
      'التاريخ': o?.createdAt ? new Date(o.createdAt).toLocaleString('ar-EG') : '',
      'العميل': o?.customerName || o?.customer_name || '',
      'الهاتف': o?.customerPhone || o?.customer_phone || '',
      'الإجمالي': Number(o?.total || 0).toFixed(2),
      'طريقة الدفع': o?.paymentMethod || 'COD',
      'الحالة': o?.status || '',
    }));
    exportToCsv(`pos-report-${range}-${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const handleExportProductsCsv = () => {
    const rows = topProducts.map((p) => ({
      'المنتج': p.name,
      'الكمية المباعة': p.qty,
      'الإيراد': p.revenue.toFixed(2),
    }));
    exportToCsv(`pos-top-products-${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 shadow-sm min-h-[60vh]">
      <div className="flex flex-col gap-4 md:gap-6 mb-6 md:flex-row md:items-center md:justify-between md:flex-row-reverse">
        <div className="text-right">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-black flex items-center gap-2">
            <ShoppingCart size={24} className="text-[#BD00FF]" />
            {isArabic ? 'تقارير الكاشير' : 'POS Reports'}
          </h3>
          <p className="mt-1 text-xs sm:text-sm font-bold text-slate-400">{isArabic ? 'تقارير نقطة البيع + تصدير + رسوم بيانية' : 'Point of sale reports + export + charts'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={handleExportCsv} disabled={orders.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-black text-sm hover:bg-emerald-600 transition-all disabled:opacity-50">
            <Download size={16} />
            {isArabic ? 'تصدير CSV' : 'Export CSV'}
          </button>
          <Link href="/dashboard/pos" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-black transition-all w-fit">
            <ChevronRight size={16} className="rotate-180" />
            {isArabic ? 'العودة للكاشير' : 'Back to POS'}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['today', 'yesterday', 'last7days', 'last30days'] as RangeKey[]).map((r) => (
          <button key={r} type="button" onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-full font-black text-[11px] ${range === r ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'}`}>{rangeLabels[r]}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <div className="p-3 md:p-4 rounded-2xl bg-cyan-50 border border-cyan-100">
              <div className="w-8 h-8 rounded-xl bg-cyan-100 flex items-center justify-center mb-2"><DollarSign size={16} className="text-cyan-600" /></div>
              <div className="text-[10px] text-cyan-600 font-black mb-0.5">{isArabic ? 'المبيعات' : 'Sales'}</div>
              <div className="font-black text-cyan-700 text-sm md:text-base">ج.م {fmt(totalSales)}</div>
            </div>
            <div className="p-3 md:p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center mb-2"><Receipt size={16} className="text-emerald-600" /></div>
              <div className="text-[10px] text-emerald-600 font-black mb-0.5">{isArabic ? 'الفواتير' : 'Orders'}</div>
              <div className="font-black text-emerald-700 text-sm md:text-base">{totalOrders}</div>
            </div>
            <div className="p-3 md:p-4 rounded-2xl bg-purple-50 border border-purple-100">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center mb-2"><TrendingUp size={16} className="text-purple-600" /></div>
              <div className="text-[10px] text-purple-600 font-black mb-0.5">{isArabic ? 'المتوسط' : 'Avg'}</div>
              <div className="font-black text-purple-700 text-sm md:text-base">ج.م {fmt(avgOrder)}</div>
            </div>
          </div>

          {/* Hourly bar chart (pure CSS, no external deps) */}
          {orders.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5"><BarChart3 size={14} />{isArabic ? 'توزيع المبيعات حسب الساعة' : 'Sales by hour'}</h4>
              <div className="flex items-end gap-1 h-32 overflow-x-auto">
                {hourlyBuckets.map((val, h) => (
                  <div key={h} className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: '20px' }}>
                    <div
                      className="w-3 md:w-4 rounded-t bg-gradient-to-t from-[#BD00FF] to-[#00E5FF]"
                      style={{ height: `${Math.max(2, (val / maxHourly) * 100)}%` }}
                      title={`${h}:00 — ج.م ${val.toFixed(2)}`}
                    />
                    <span className="text-[8px] text-slate-400 font-bold">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shifts summary */}
          {shiftSummary && Number(shiftSummary?.totalShifts || 0) > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <h4 className="text-xs font-black text-blue-700 mb-3 flex items-center gap-1.5"><Clock size={14} />{isArabic ? 'ملخص الورديات' : 'Shifts Summary'}</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center"><div className="text-[10px] text-blue-500 font-black">{isArabic ? 'الإجمالي' : 'Total'}</div><div className="font-black text-blue-700 text-sm">{shiftSummary.totalShifts}</div></div>
                <div className="text-center"><div className="text-[10px] text-emerald-500 font-black">{isArabic ? 'مفتوحة' : 'Open'}</div><div className="font-black text-emerald-700 text-sm">{shiftSummary.openCount}</div></div>
                <div className="text-center"><div className="text-[10px] text-slate-500 font-black">{isArabic ? 'مغلقة' : 'Closed'}</div><div className="font-black text-slate-700 text-sm">{shiftSummary.closedCount}</div></div>
              </div>
              <div className="mt-2 pt-2 border-t border-blue-100 flex justify-between text-xs font-bold">
                <span className="text-slate-600">{isArabic ? 'مبيعات الورديات' : 'Shift Sales'}</span>
                <span className="text-slate-900">ج.م {fmt(Number(shiftSummary.totalSales || 0))}</span>
              </div>
            </div>
          )}

          {/* Payment methods breakdown */}
          {Object.keys(paymentBreakdown).length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5"><ShoppingBag size={14} />{isArabic ? 'تفصيل طرق الدفع' : 'Payment Methods Breakdown'}</h4>
              <div className="space-y-2">
                {Object.entries(paymentBreakdown).map(([method, amount]) => {
                  const pct = totalSales > 0 ? (Number(amount) / totalSales) * 100 : 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold"><span className="text-slate-600">{method}</span><span className="text-slate-900">ج.م {fmt(Number(amount))} ({pct.toFixed(1)}%)</span></div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#BD00FF] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top products */}
          {topProducts.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5"><TrendingUp size={14} />{isArabic ? 'أفضل المنتجات' : 'Top Products'}</h4>
                <button type="button" onClick={handleExportProductsCsv} className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1"><Download size={11} /> CSV</button>
              </div>
              <div className="space-y-2">
                {topProducts.map((p, idx) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 w-5">{idx + 1}</span>
                    <span className="flex-1 text-xs font-bold text-slate-700 truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{p.qty}×</span>
                    <span className="text-xs font-black text-[#BD00FF]">ج.م {p.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily breakdown chart (for weekly/monthly) */}
          {(range === 'last7days' || range === 'last30days') && dailyBreakdown.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5"><Calendar size={14} />{isArabic ? 'توزيع المبيعات اليومية' : 'Daily Sales Breakdown'}</h4>
              <div className="flex items-end gap-1 h-32 overflow-x-auto">
                {dailyBreakdown.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: '28px' }}>
                    <div className="w-5 rounded-t bg-gradient-to-t from-blue-500 to-cyan-400" style={{ height: `${Math.max(2, (d.sales / maxDailySales) * 100)}%` }} title={`${d.date} — ج.م ${d.sales.toFixed(2)}`} />
                    <span className="text-[8px] text-slate-400 font-bold">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cashier performance */}
          {cashierPerformance.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5"><Users size={14} />{isArabic ? 'أداء الكاشير' : 'Cashier Performance'}</h4>
              <div className="space-y-2">
                {cashierPerformance.map((c, idx) => {
                  const maxSales = Math.max(1, ...cashierPerformance.map((x) => x.sales));
                  const pct = (c.sales / maxSales) * 100;
                  return (
                    <div key={c.cashierId} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600 flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>
                          {c.cashierId}
                        </span>
                        <span className="text-slate-900">{c.orders} {isArabic ? 'فاتورة' : 'orders'} · ج.م {fmt(c.sales)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#BD00FF] to-[#00E5FF] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Orders list with pagination */}
          {orders.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-700">{isArabic ? 'الفواتير' : 'Orders'} ({orders.length})</h4>
              {pagedOrders.map((order) => (
                <div key={order?.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-xs text-slate-900">#{order?.orderNumber || order?.id?.slice(-6) || '—'}</div>
                    <div className="text-[10px] text-slate-400 font-bold">
                      {order?.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG') : '—'}
                      {(order?.customerName || order?.customer_name) ? ` · ${order.customerName || order.customer_name}` : ''}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="font-black text-sm text-[#BD00FF]">ج.م {Number(order?.total || 0).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 font-bold">{order?.paymentMethod || 'COD'}</div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalOrderPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button type="button" onClick={() => setOrdersPage((p) => Math.max(1, p - 1))} disabled={ordersPage <= 1}
                    className="p-2 rounded-xl bg-white border border-slate-100 disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={16} /></button>
                  <span className="text-xs font-black text-slate-500 px-3">{ordersPage} / {totalOrderPages}</span>
                  <button type="button" onClick={() => setOrdersPage((p) => Math.min(totalOrderPages, p + 1))} disabled={ordersPage >= totalOrderPages}
                    className="p-2 rounded-xl bg-white border border-slate-100 disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={16} /></button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default POSReportsPage;
