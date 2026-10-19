'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Progressive reveal used by the product rail and the product grid.
 *
 * Long catalogues used to mount every card at once (the offers page rendered
 * them all), which tanks the first paint and the scroll. Here only
 * `initialCount` items exist at first and each "عرض المزيد" tap appends `step`
 * more, so the DOM never grows with the whole catalogue.
 *
 * A filter/sort change must reset the counter — pass a `resetKey` that changes
 * whenever the underlying list identity changes (e.g. the active filter).
 */
export function useChunkedList(
  total: number,
  {
    initialCount = 12,
    step = 12,
    resetKey,
  }: { initialCount?: number; step?: number; resetKey?: string } = {}
) {
  const [visible, setVisible] = useState(initialCount);

  useEffect(() => {
    setVisible(initialCount);
  }, [initialCount, resetKey]);

  const shownCount = Math.min(visible, total);
  const remaining = Math.max(0, total - shownCount);

  const showMore = useCallback(() => {
    setVisible((current) => current + step);
  }, [step]);

  return { shownCount, remaining, hasMore: remaining > 0, showMore };
}
