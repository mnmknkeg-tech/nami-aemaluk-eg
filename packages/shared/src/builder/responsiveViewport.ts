'use client';

import { useEffect, useState } from 'react';
import type { ViewportBreakpoint } from './types';

export function getViewportBreakpoint(width: number): ViewportBreakpoint {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function subscribeToViewportChanges(
  target: Pick<Window, 'innerWidth' | 'addEventListener' | 'removeEventListener'>,
  onChange: (viewport: ViewportBreakpoint) => void
): () => void {
  const updateViewport = () => onChange(getViewportBreakpoint(target.innerWidth));
  updateViewport();
  target.addEventListener('resize', updateViewport);
  target.addEventListener('orientationchange', updateViewport);
  return () => {
    target.removeEventListener('resize', updateViewport);
    target.removeEventListener('orientationchange', updateViewport);
  };
}

/** SSR-safe viewport hook: desktop is stable for server and first client render. */
export function useResponsiveViewport(): ViewportBreakpoint {
  const [viewport, setViewport] = useState<ViewportBreakpoint>('desktop');

  useEffect(() => {
    return subscribeToViewportChanges(window, setViewport);
  }, []);

  return viewport;
}
