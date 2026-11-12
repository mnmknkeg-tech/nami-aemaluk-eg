'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * تبديل التاجر/الجلسة يفرغ كاش React Query فورًا. بدونه تبقى بيانات التاجر
 * السابق في الشاشات المشتركة (shops/me والأزرار والمحتويات) حتى gcTime —
 * ولا تُصلح إلا بإعادة تحميل كاملة للصفحة. الحدث يطلقه AuthProvider عند
 * دخول/خروج/انتهاء جلسة.
 */
function AuthIdentityCacheReset() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const reset = () => {
      queryClient.clear();
    };
    window.addEventListener('ray-auth-identity-changed', reset);
    return () => window.removeEventListener('ray-auth-identity-changed', reset);
  }, [queryClient]);
  return null;
}

// Single shared TanStack Query provider. The defaults below are the
// request-budget guardrails: data is considered fresh for 60s, refetches don't
// fire on window focus, and a failed query retries once.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <AuthIdentityCacheReset />
      {children}
    </QueryClientProvider>
  );
}
