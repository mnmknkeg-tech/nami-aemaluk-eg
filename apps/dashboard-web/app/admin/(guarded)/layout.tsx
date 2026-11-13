'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/settings/ToastProvider';
import { Spinner } from '@/components/admin/ui';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { ADMIN_NAV_ITEMS } from '@/components/admin/navigation';

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

  const handleLogout = () => {
    logout();
    window.location.replace('/login');
  };

  const currentLabel = useMemo(
    () => ADMIN_NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label || 'لوحة الأدمن',
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

      <AdminSidebar
        pathname={pathname}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <main className="flex-1 md:mr-72 overflow-x-hidden min-h-screen flex flex-col">
        <AdminHeader
          currentLabel={currentLabel}
          initial={initial}
          onMenuOpen={() => setSidebarOpen(true)}
        />
        <div className="p-4 md:p-8 flex-1">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </main>
    </div>
  );
}
