'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { api, extractList } from '@/lib/api';

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: { name: string; quantity: number; price?: number }[];
}

/**
 * خط سير الطلب — نفس ترتيب صفحة التتبع (/track/[id]) عشان التجربة موحّدة.
 * بنستخدمه في شريط التقدم المصغر جوّه كارت الطلب.
 */
const ORDER_STEPS: { key: string; label: string }[] = [
  { key: 'PENDING', label: 'تم إنشاء الطلب' },
  { key: 'CONFIRMED', label: 'تم التأكيد' },
  { key: 'PREPARING', label: 'جاري التجهيز' },
  { key: 'OUT_FOR_DELIVERY', label: 'في الطريق إليك' },
  { key: 'DELIVERED', label: 'تم التوصيل' },
];

/**
 * Order history — content only. The header, sidebar and the shared user
 * fetch live in app/profile/layout.tsx so tab switches render instantly.
 */
export default function ProfileOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const ordersData = await api.get('/orders/me');
        // /orders/me is paginated: `{data: null, meta: {...}}` for a new user —
        // extractList coerces every envelope shape into a real array.
        setOrders(extractList<Order>(ordersData));
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (String(status || '').toUpperCase()) {
      case 'DELIVERED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'CANCELLED':
      case 'REFUNDED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusText = (status: string) => {
    // Backend statuses are uppercase: PENDING/CONFIRMED/PREPARING/READY/
    // OUT_FOR_DELIVERY/DELIVERED/CANCELLED/REFUNDED.
    switch (String(status || '').toUpperCase()) {
      case 'PENDING':
        return 'قيد المراجعة';
      case 'CONFIRMED':
        return 'تم التأكيد';
      case 'PREPARING':
        return 'جاري التجهيز';
      case 'READY':
        return 'جاهز';
      case 'OUT_FOR_DELIVERY':
        return 'في الطريق';
      case 'DELIVERED':
        return 'مكتمل';
      case 'CANCELLED':
        return 'ملغي';
      case 'REFUNDED':
        return 'تم الإرجاع';
      default:
        return status;
    }
  };

  const filteredOrders = orders.filter((o) => {
    const s = String(o.status || '').toUpperCase();
    if (filter === 'all') return true;
    if (filter === 'completed') return s === 'DELIVERED';
    if (filter === 'cancelled') return s === 'CANCELLED' || s === 'REFUNDED';
    if (filter === 'pending')
      return s === 'PENDING' || s === 'CONFIRMED' || s === 'PREPARING' || s === 'READY';
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">سجل الطلبات</h2>
          <p className="text-sm text-slate-500 mt-1">تتبع وإدارة جميع طلباتك السابقة والحالية</p>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'completed', 'cancelled'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === key
                  ? 'bg-brand-cyan text-black'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {key === 'all' && 'الكل'}
              {key === 'pending' && 'قيد التنفيذ'}
              {key === 'completed' && 'مكتمل'}
              {key === 'cancelled' && 'ملغي'}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order, oi) => (
            <div
              key={order.id}
              className="animate-fade-up p-4 md:p-5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 hover:border-brand-cyan/40 hover:shadow-lg dark:hover:shadow-cyan-950/20 transition-all duration-300"
              style={{ animationDelay: `${Math.min(oi, 5) * 70}ms` }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/60 pb-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center shrink-0">
                    {getStatusIcon(order.status)}
                  </div>
                  <div>
                    <span className="font-bold text-sm block">طلب #{order.id.slice(0, 8)}</span>
                    <span className="text-xs text-slate-400 font-semibold">
                      {new Date(order.createdAt || Date.now()).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <span className="text-base font-black text-brand-cyan">
                    {order.total?.toLocaleString('ar-EG') || 0} ج.م
                  </span>
                  <span className="text-xs block text-slate-400 font-semibold">
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>

              {/* شريط التقدم المصغر — نفس خط سير صفحة التتبع */}
              {(() => {
                const s = String(order.status || '').toUpperCase();
                const stepIdx = ORDER_STEPS.findIndex((st) => st.key === s);
                if (stepIdx < 0) return null; // ملغي/مرجّع — الحالة ظاهرة بالنص والأيقونة فوق
                return (
                  <div className="mt-3 mb-1" aria-hidden>
                    <div className="flex items-center gap-1">
                      {ORDER_STEPS.map((st, i) => (
                        <div
                          key={st.key}
                          title={st.label}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                            i <= stepIdx ? 'bg-brand-gradient' : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-1.5">
                      الخطوة {stepIdx + 1} من {ORDER_STEPS.length} — {ORDER_STEPS[stepIdx].label}
                    </p>
                  </div>
                );
              })()}

              {order.items && order.items.length > 0 && (
                <div className="space-y-1.5">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400"
                    >
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      {item.price && (
                        <span>{(item.price * item.quantity).toLocaleString('ar-EG')} ج.م</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* تتبّع الطلب */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
                <Link
                  href={`/track/${order.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-cyan hover:gap-2.5 transition-all"
                >
                  تتبّع الطلب
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-black text-slate-700 dark:text-slate-300">لا توجد طلبات في هذا القسم</p>
          <p className="text-slate-400 text-sm font-semibold mt-1 mb-5">
            ابدأ رحلتك واكتشف أقرب المتاجر ليك
          </p>
          <Link
            href="/dalil"
            className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-cyan text-black font-bold text-sm hover:bg-cyan-400 transition-colors"
          >
            ابدأ التسوق الآن <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
