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
  ArrowRight,
} from 'lucide-react';
import { api, clearStoredAuthToken, isSessionActive } from '@/lib/api';
import { ProfileShellSkeleton } from '@/components/Skeleton';

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: { name: string; quantity: number; price?: number }[];
}

export default function ProfileOrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    if (!isSessionActive()) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        const userData = await api.get('/auth/me');
        setUser((userData as any)?.user ?? (userData as any)?.data?.user ?? userData);

        const ordersData = await api.get('/orders/me');
        setOrders(((ordersData as any)?.data ?? ordersData ?? []) as Order[]);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogout = () => {
    clearStoredAuthToken();
    router.push('/');
  };

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

  const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return o.status === 'completed';
    if (filter === 'cancelled') return o.status === 'cancelled';
    if (filter === 'pending') return o.status === 'pending' || o.status === 'processing';
    return true;
  });

  if (loading) {
    return <ProfileShellSkeleton rows={5} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 md:pb-12">
      {/* Header */}
      <div className="relative bg-brand-black text-white py-8 md:py-10 px-4 md:px-6 overflow-hidden">
        {/* توهّج ناعم بهوية المنصة (cyan ↔ purple) */}
        <div
          aria-hidden
          className="absolute top-0 right-0 w-[420px] h-[420px] bg-brand-cyan/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute bottom-0 left-0 w-[380px] h-[380px] bg-brand-purple/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3 pointer-events-none"
        />
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <User className="w-8 h-8 md:w-10 md:h-10 text-brand-cyan" />
            </div>
            <div>
              <p className="text-brand-cyan text-[11px] font-black tracking-widest uppercase mb-1">
                حسابي
              </p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {user?.name || 'مستخدم'}
              </h1>
              <p className="text-white/60 text-sm font-semibold mt-0.5">{user?.email}</p>
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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>الملف الشخصي</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
                </Link>
                <Link
                  href="/profile/orders"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-cyan/10 text-brand-cyan font-semibold"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>طلباتي</span>
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
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold">سجل الطلبات</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    تتبع وإدارة جميع طلباتك السابقة والحالية
                  </p>
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
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 md:p-5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 hover:border-brand-cyan/40 hover:shadow-lg dark:hover:shadow-cyan-950/20 transition-all duration-300"
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
          </div>
        </div>
      </div>
    </div>
  );
}
