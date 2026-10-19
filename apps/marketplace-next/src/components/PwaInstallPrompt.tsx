'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import Image from 'next/image';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'pwa-install-dismissed';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed? don't show
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      return;
    }
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      // Show after a short delay so it doesn't interrupt the first paint
      setTimeout(() => setVisible(true), 3000);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem(DISMISS_KEY, '1');
    };

    // Register service worker for offline support and PWA installability
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.debug('SW registration skipped or failed:', err);
        });
      });
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISS_KEY, '1');
    }
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:right-auto md:left-6 md:w-96 z-[95] animate-fade-in">
      <div className="bg-white dark:bg-brand-black rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-brand-black flex items-center justify-center shrink-0 overflow-hidden">
          <Image src="/brand/logo.png" alt="MNMKNK" width={32} height={32} className="w-8 h-8 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-900 dark:text-white">ثبّت تطبيق من مكانك</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            وصول أسرع وتجربة كأنها تطبيق حقيقي على جهازك
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-purple text-white text-xs font-bold hover:opacity-90 transition-all shadow-lg"
        >
          <Download className="w-4 h-4" />
          تثبيت
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}