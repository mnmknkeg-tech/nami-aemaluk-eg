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
  Trash2,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { api, clearStoredAuthToken, isSessionActive } from '@/lib/api';
import { useWishlist } from '@/lib/wishlist';
import { ProductCard } from '@/components/ProductCard';
import { ProductGridSkeleton, Skeleton } from '@/components/Skeleton';

export default function ProfileWishlistPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { items, clear, count } = useWishlist();

  useEffect(() => {
    if (!isSessionActive()) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        const userData = await api.get('/auth/me');
        setUser((userData as any)?.user ?? (userData as any)?.data?.user ?? userData);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 md:pb-12" aria-busy>
        <span className="sr-only">جاري التحميل...</span>
        {/* Header */}
        <div className="bg-brand-black text-white py-8 px-4 md:px-6">
          <div className="max-w-[1400px] mx-auto flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-xl bg-white/20 dark:bg-white/20" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 rounded-lg bg-white/20 dark:bg-white/20" />
              <Skeleton className="h-3.5 w-48 rounded-md bg-white/20 dark:bg-white/20" />
            </div>
          </div>
        </div>
        {/* Wishlist grid */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-5">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    );
  }

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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>الملف الشخصي</span>
                  <ChevronRight className="w-4 h-4 mr-auto" />
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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-cyan/10 text-brand-cyan font-semibold"
                >
                  <Heart className="w-5 h-5" />
                  <span>المفضلة</span>
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>قائمة المفضلة</span>
                    <span className="text-sm px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold">
                      {count}
                    </span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    المنتجات التي قمت بحفظها للشراء لاحقاً
                  </p>
                </div>
                {items.length > 0 && (
                  <button
                    onClick={clear}
                    className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    مسح الكل
                  </button>
                )}
              </div>

              {items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    لا توجد منتجات في المفضلة حالياً
                  </p>
                  <Link
                    href="/dalil"
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-cyan text-black font-bold text-sm"
                  >
                    تصفح المتاجر والمنتجات <ArrowRight className="w-4 h-4" />
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
