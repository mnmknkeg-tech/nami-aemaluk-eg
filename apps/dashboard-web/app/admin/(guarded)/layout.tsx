'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Settings,
  LogOut,
  Bell,
  Menu,
  MessageSquare,
  CreditCard,
  Store,
  BarChart3,
  FileText,
  Truck,
  Headphones,
  Eye,
  Wallet,
  Percent,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/settings/ToastProvider';
import { Spinner } from '@/components/admin/ui';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'نظرة عامة', icon: LayoutDashboard },
  { href: '/admin/finance', label: 'مالية المنصة', icon: Wallet },
  { href: '/admin/tax', label: 'الالتزامات الضريبية', icon: Percent },
  { href: '/admin/approvals', label: 'الموافقات', icon: ShieldAlert },
  { href: '/admin/shops', label: 'المتاجر', icon: Store },
  { href: '/admin/users', label: 'المستخدمون', icon: Users },
  { href: '/admin/orders', label: 'العمليات', icon: CreditCard },
  { href: '/admin/delivery', label: 'التوصيل', icon: Truck },
  { href: '/admin/feedback', label: 'التقييمات', icon: MessageSquare },
  { href: '/admin/customer-service', label: 'خدمة العملاء', icon: Headphones },
  { href: '/admin/analytics', label: 'التحليلات', icon: BarChart3 },
  { href: '/admin/visitors', label: 'زيارات الموقع', icon: Eye },
  { href: '/admin/audit-log', label: 'سجل العمليات', icon: ScrollText },
  { href: '/admin/notifications', label: 'الإشعارات', icon: Bell },
  { href: '/admin/content', label: 'المحتوى', icon: FileText },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
];

export default function GuardedAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [checked, setChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    const role = String(user?.role || '').toLowerCase();
    if (role !== 'admin') {
      const returnTo = typeof window !== 'undefined' ? window.location.pathname : '';
      const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
      router.replace(`/admin/gate${qs}`);
      return;
    }
    setChecked(true);
  }, [user, loading, router]);

  const handleLogout = async () => {
    logout();
    router.replace('/login');
  };

  // عنوان الصفحة الحالية يظهر في الهيدر بدل نص ثابت
  const currentLabel = useMemo(
    () => NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label || 'لوحة الأدمن',
    [pathname]
  );

  if (!checked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size={40} />
      </div>
    );
  }

  const initial = String(user?.name || user?.email || 'A')
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-right font-sans"
      dir="rtl"
    >
      {/* Sidebar Overlay (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`w-72 bg-white border-l border-slate-200 text-slate-800 flex flex-col fixed inset-y-0 right-0 z-[110] shadow-sm transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-8 py-7 flex items-center gap-3 border-b border-slate-100">
          <span className="text-xl font-black tracking-tight text-slate-900">
            نمّي <span className="text-cyan-600">ROOT</span>
          </span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              // Link مع prefetch — تنقل فوري من غير إعادة تحميل الصفحة بالكامل
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold',
                  active
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon size={18} className={active ? 'text-cyan-300' : 'text-slate-400'} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-bold text-sm"
          >
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:mr-72 overflow-x-hidden min-h-screen flex flex-col">
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2.5 bg-slate-100 rounded-xl text-slate-700"
              aria-label="فتح القائمة"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-sm font-black text-slate-900">{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="w-5 h-5 text-slate-400" />
            <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center font-black text-cyan-300 text-sm">
              {initial}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </main>
    </div>
  );
}
