'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Heart,
  MapPin,
  Settings,
  Package,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { api, extractList } from '@/lib/api';
import { useProfileUser } from './layout';

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: { name: string; quantity: number }[];
}

/**
 * Profile overview — content only. The header, sidebar and the shared user
 * fetch live in app/profile/layout.tsx so tab switches render instantly
 * without re-fetching the user or flashing a full-page skeleton.
 */
export default function ProfilePage() {
  const { user } = useProfileUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const ordersData = await api.get('/orders/me');
        // /orders/me is paginated: `{data: null, meta: {...}}` for a new user —
        // extractList coerces every envelope shape into a real array.
        setOrders(extractList<Order>(ordersData));
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      case 'pending':
        return 'قيد الانتظار';
      case 'processing':
        return 'قيد التجهيز';
      case 'shipped':
        return 'تم الشحن';
      case 'delivered':
        return 'تم التوصيل';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-5 h-5 text-brand-cyan" />
            <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
              الطلبات
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{orders.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
              المفضلة
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">0</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-green-500" />
            <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">مكتمل</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {orders.filter((o) => o.status === 'completed' || o.status === 'delivered').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
              قيد المعالجة
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {orders.filter((o) => o.status === 'pending' || o.status === 'processing').length}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-bold mb-4">أحدث الطلبات</h2>
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      طلب #{order.id.slice(-6)}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(order.status)}
                    <span className="text-sm font-semibold">{getStatusText(order.status)}</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {order.total} ج.م
                  </div>
                  <Link
                    href={`/track/${order.id}`}
                    className="text-xs font-bold text-brand-cyan hover:underline mt-1 inline-block"
                  >
                    تتبع الطلب
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold">
              {user ? 'لا توجد طلبات بعد' : 'لا توجد طلبات بعد'}
            </p>
            <Link
              href="/dalil"
              className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-brand-cyan text-black rounded-lg font-semibold hover:bg-cyan-400 transition-colors"
            >
              ابدأ التسوق
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-bold mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/dalil"
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-brand-cyan" />
            <span className="font-semibold">تصفح المتاجر</span>
          </Link>
          <Link
            href="/offers"
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Heart className="w-5 h-5 text-red-500" />
            <span className="font-semibold">العروض</span>
          </Link>
          <Link
            href="/map"
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MapPin className="w-5 h-5 text-green-500" />
            <span className="font-semibold">الخريطة</span>
          </Link>
          <Link
            href="/support"
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-5 h-5 text-purple-500" />
            <span className="font-semibold">الدعم الفني</span>
          </Link>
        </div>
      </div>
    </>
  );
}
