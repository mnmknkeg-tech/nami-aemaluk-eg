'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import TopNav from '@/components/TopNav';
import OrderBellWatcher from '@/components/OrderBellWatcher';
import RouteProgress from '@/components/RouteProgress';
import { RecentlyViewedTracker } from '@/hooks/useRecentlyViewed';
import { useAuth } from '@/lib/auth';
import { isLocalOnlyPathname } from '@/lib/localOnlySections';
import CreateShopGate from '@/components/CreateShopGate';
import { SettingsModalProvider } from '@/hooks/useSettingsModal';
import { ToastProvider } from '@/components/settings/ToastProvider';
import SettingsModal from '@/components/settings/SettingsModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  // The top header nav is the default experience; the sidebar is opt-in
  // via the toggle and resets back to header on every fresh entry.
  const [navMode, setNavMode] = useState<'sidebar' | 'header'>('header');

  const toggleNavMode = useCallback(() => {
    setNavMode((current) => (current === 'sidebar' ? 'header' : 'sidebar'));
  }, []);

  // Every navigation starts from the top of the scroll container
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Market-launch switch: local-only sections (finance, accounting, HR, team,
  // analytics, AI) are unreachable in production — even by direct URL.
  const localOnlyRoute = isLocalOnlyPathname(pathname);

  useEffect(() => {
    if (localOnlyRoute) router.replace('/dashboard');
  }, [localOnlyRoute, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
      </div>
    );
  }

  // While the local-only redirect above kicks in, keep the shell blank instead
  // of flashing a page that is not released yet.
  if (localOnlyRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
      </div>
    );
  }

  const headerMode = navMode === 'header';

  if (headerMode) {
    return (
      <SettingsModalProvider>
        <ToastProvider>
          <CreateShopGate skip={user?.role === 'ADMIN'}>
            <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
              {/* Global order bell watcher — rings on new website / POS orders */}
              <OrderBellWatcher />
              <RecentlyViewedTracker />
              <Suspense fallback={null}>
                <RouteProgress />
              </Suspense>

              <TopNav onMenuClick={() => setMobileSidebarOpen(true)} onSwitchNav={toggleNavMode} />

              {/* Mobile sidebar overlay (shared with sidebar mode) */}
              <AnimatePresence>
                {mobileSidebarOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40 bg-black/40 md:hidden"
                      onClick={() => setMobileSidebarOpen(false)}
                    />
                    <motion.div
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed right-0 top-0 bottom-0 z-50 md:hidden"
                    >
                      <Sidebar onClose={() => setMobileSidebarOpen(false)} />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Full-width content — no side menu in header mode */}
              <main ref={mainRef} className="flex-1 overflow-y-auto">
                {children}
              </main>

              {/* Mini settings modal — available across all dashboard pages */}
              <SettingsModal />
            </div>
          </CreateShopGate>
        </ToastProvider>
      </SettingsModalProvider>
    );
  }

  return (
    <SettingsModalProvider>
      <ToastProvider>
        <CreateShopGate skip={user?.role === 'ADMIN'}>
          <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Global order bell watcher — rings on new website / POS orders */}
            <OrderBellWatcher />
            <RecentlyViewedTracker />
            <Suspense fallback={null}>
              <RouteProgress />
            </Suspense>

            {/* Desktop sidebar */}
            <div className="hidden md:flex">
              <Sidebar />
            </div>

            {/* Mobile sidebar overlay */}
            <AnimatePresence>
              {mobileSidebarOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/40 md:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                  />
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed right-0 top-0 bottom-0 z-50 md:hidden"
                  >
                    <Sidebar onClose={() => setMobileSidebarOpen(false)} />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header onMenuClick={() => setMobileSidebarOpen(true)} onSwitchNav={toggleNavMode} />
              <main ref={mainRef} className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>

            {/* Mini settings modal */}
            <SettingsModal />
          </div>
        </CreateShopGate>
      </ToastProvider>
    </SettingsModalProvider>
  );
}
