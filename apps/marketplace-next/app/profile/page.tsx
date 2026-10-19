'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Settings,
  LogOut,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { api, clearStoredAuthToken, isSessionActive } from '@/lib/api';
import { ProfileShellSkeleton } from '@/components/Skeleton';

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: { name: string; quantity: number }[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSessionActive()) {
      router.push('/login');
      return;
    }

    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userData = await api.get('/auth/me');
      setUser((userData as any)?.user ?? (userData as any)?.data?.user ?? userData);

      const ordersData = await api.get('/orders/me');
      setOrders(((ordersData as any)?.data ?? ordersData ?? []) as Order[]);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredAuthToken();
    router.push('/');
  };

  if (loading) {
    return <ProfileShellSkeleton rows={4} />;
  }

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
        return 'قيد المعالجة';
      case 'processing':
        return 'جاري التحضير';
      case 'shipped':
        return 'قيد الشحن';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 md:pb-12">
      {/* Header */}
      <div className="bg-brand-black text-white py-8 px-4 md:px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-brand-cyan/20 rounded-xl flex items-center justify-center">
              <User className="w-10 h-10 text-brand-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.name || 'مستخدم'}</h1>
              <p className="text-white/60 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <nav className="space-y-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-cyan/10 text-brand-cyan font-semibold"
                >
                  <User className="w-5 h-5" />
                  <span>الملف الشخصي</span>
                </Link>
                <Link
                  href="/profile/orders"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>طلباتي</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
                </Link>
                <Link
                  href="/profile/wishlist"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <Heart className="w-5 h-5" />
                  <span>المفضلة</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
                </Link>
                <Link
                  href="/profile/addresses"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  <span>العناوين</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
                </Link>
                <Link
                  href="/profile/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span>الإعدادات</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-semibold transition-colors mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  <span>تسجيل الخروج</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-5 h-5 text-brand-cyan" />
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                    الطلبات
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {orders.length}
                </div>
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
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                    مكتمل
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {orders.filter((o) => o.status === 'completed').length}
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
                          <span className="text-sm font-semibold">
                            {getStatusText(order.status)}
                          </span>
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
                    لا توجد طلبات بعد
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
          </div>
        </div>
      </div>
    </div>
  );
}
