/**
 * Thin compatibility facade over the unified core (lib/api/core.ts).
 *
 * This client used to carry its own copy of the refresh/401 logic (a third
 * parallel implementation) — every path now goes through the core's single
 * single-flight refresh, shared GET cache and guarded session-expired event.
 * Public signatures are unchanged for the existing call sites.
 */
import {
  apiRequest as coreApiRequest,
  apiRequestWithMeta as coreApiRequestWithMeta,
  clearApiCache,
  refreshSession,
} from './core';

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface ApiResult<T> {
  data: T;
  meta: PageMeta | null;
  raw: any;
}

export function buildQueryString(params: Record<string, any>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Silent cookie → access-token exchange (shared single-flight in core). */
export async function refreshAccessToken(): Promise<string | null> {
  return refreshSession();
}

export async function apiRequestWithMeta<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const result = await coreApiRequestWithMeta<T>(path, options);
  return {
    data: result.data,
    meta: (result.meta as PageMeta) || null,
    raw: result.raw,
  };
}

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  return coreApiRequest<T>(path, options);
}

export { clearApiCache };

