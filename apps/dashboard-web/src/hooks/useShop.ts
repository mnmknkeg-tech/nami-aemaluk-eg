'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/auth';

type Shop = {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: string;
  phone?: string;
  email?: string;
  governorate?: string;
  city?: string;
  address?: string;
  openingHours?: string;
};

export const SHOP_QUERY_KEY = ['shop', 'me'] as const;

/**
 * The dashboard fires /shops/me from ~160 component/page sites on every
 * mount. React Query (already a root dependency with the app's
 * QueryProvider mounted) collapses them into one shared cache entry with
 * a 30s stale window, focus revalidation and a single retry — same
 * signature as the old useEffect hook so call sites stay untouched.
 */
export function useShop() {
  const query = useQuery({
    queryKey: SHOP_QUERY_KEY,
    queryFn: () => apiRequest<Shop>('/shops/me'),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const shop = query.data?.id ? query.data : null;

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    shop,
    loading: query.isLoading,
    error: query.isError
      ? ((query.error as Error)?.message || 'Failed to fetch shop data')
      : null,
    refetch,
  };
}

export type { Shop };

