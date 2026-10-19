'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Slim top progress bar shown while an in-app navigation is in flight
 * (same idea as nprogress, but zero-dependency and tuned to the brand cyan).
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef('');

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const start = () => {
    if (visible) return;
    setVisible(true);
    setProgress(8);
    stopTick();
    tickRef.current = setInterval(() => {
      setProgress((p) => (p < 12 ? p + 3 : p < 40 ? p + 2.5 : p < 80 ? p + 0.8 : p));
    }, 180);
  };

  const finish = () => {
    stopTick();
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
  };

  // Any left-click on a same-origin link that changes the URL starts the bar
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      const target = url.pathname + url.search;
      if (target === window.location.pathname + window.location.search) return;
      urlRef.current = target;
      start();
    };
    const onPop = () => start();
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPop);
      stopTick();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation completed (URL changed) → finish the bar
  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    if (visible && urlRef.current && url === urlRef.current) finish();
    else if (visible) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 right-0 left-0 z-[100] pointer-events-none"
        >
          <div
            className="h-0.5 bg-gradient-to-l from-[#00E5FF] to-[#BD00FF] shadow-[0_0_8px_rgba(0,229,255,0.6)] transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
