'use client';

/**
 * Image Map API service for dashboard-web
 *
 * Mirrors the endpoints used by the legacy dashboard (packages/shared/src/services/api.service.ts):
 *  - GET    /api/v1/shops/:shopId/image-maps/manage
 *  - POST   /api/v1/shops/:shopId/image-maps
 *  - PATCH  /api/v1/shops/:shopId/image-maps/:mapId/activate
 *  - PATCH  /api/v1/shops/:shopId/image-maps/:mapId/layout
 *  - POST   /api/v1/shops/:shopId/image-maps/analyze
 *  - POST   /api/v1/products/manage/by-shop/:shopId/import-drafts
 *  - GET    /api/v1/products/manage/by-shop/:shopId?includeImageMap=true
 *
 * All requests reuse the same auth scheme as `apiRequest` from @/lib/auth
 * (Bearer token from localStorage + credentials: 'include').
 */

import { readToken } from '@/lib/session-keys';

export interface Hotspot {
  id?: string;
  x: number;
  y: number;
  label?: string | null;
  productId?: string | null;
  priceOverride?: number | null;
  sortOrder?: number;
  sectionId?: string | null;
  width?: number | null;
  height?: number | null;
  aiMeta?: any | null;
}

export interface ImageMapSection {
  id?: string;
  name: string;
  sortOrder?: number;
  imageUrl?: string | null;
}

export interface ImageMap {
  id: string;
  title?: string;
  imageUrl?: string;
  image_url?: string;
  isActive?: boolean;
  is_active?: boolean;
  hotspots?: Hotspot[];
  sections?: ImageMapSection[];
}

export interface SaveLayoutPayload {
  imageUrl: string;
  title: string;
  sections: ImageMapSection[];
  hotspots: Hotspot[];
}

export interface ImportDraftItem {
  name: string;
  price: number;
  stock: number;
  category: string;
  productId?: string;
  description?: string | null;
}

export interface ImportDraftsResponse {
  created?: any[];
  updated?: any[];
}

export interface AnalyzeImageMapPayload {
  imageUrl: string;
  language?: string;
}

async function authedFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = readToken();
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err: any = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  // Some endpoints return the payload directly, others wrap it in { data }
  return data?.data !== undefined ? data.data : data;
}

export const ImageMapApi = {
  /** List all image maps for a shop (manage view, includes hotspots + sections). */
  listForManage: async (shopId: string): Promise<ImageMap[]> => {
    const sid = String(shopId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    const res = await authedFetch(`/shops/${encodeURIComponent(sid)}/image-maps/manage`);
    return Array.isArray(res) ? res : Array.isArray((res as any)?.items) ? (res as any).items : [];
  },

  /** Create a new image map (used when uploading the first image). */
  create: async (shopId: string, payload: Partial<ImageMap>): Promise<ImageMap> => {
    const sid = String(shopId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    return await authedFetch(`/shops/${encodeURIComponent(sid)}/image-maps`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Mark a specific map as the active one for the shop. */
  activate: async (shopId: string, mapId: string): Promise<ImageMap> => {
    const sid = String(shopId || '').trim();
    const mid = String(mapId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    if (!mid) throw new Error('Missing mapId');
    return await authedFetch(
      `/shops/${encodeURIComponent(sid)}/image-maps/${encodeURIComponent(mid)}/activate`,
      { method: 'PATCH', body: JSON.stringify({}) }
    );
  },

  /** Persist the full layout (imageUrl, title, sections, hotspots) of a map. */
  saveLayout: async (
    shopId: string,
    mapId: string,
    payload: SaveLayoutPayload
  ): Promise<ImageMap> => {
    const sid = String(shopId || '').trim();
    const mid = String(mapId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    if (!mid) throw new Error('Missing mapId');
    return await authedFetch(
      `/shops/${encodeURIComponent(sid)}/image-maps/${encodeURIComponent(mid)}/layout`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
  },

  /** Run AI analysis on an image to detect/suggest hotspots. */
  analyze: async (shopId: string, payload: AnalyzeImageMapPayload): Promise<any> => {
    const sid = String(shopId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    return await authedFetch(`/shops/${encodeURIComponent(sid)}/image-maps/analyze`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Fetch products for the manage view (optionally including image-map-linked ones). */
  listProductsForManage: async (
    shopId: string,
    opts: { page?: number; limit?: number; includeImageMap?: boolean } = {}
  ): Promise<any[]> => {
    const sid = String(shopId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    const params = new URLSearchParams();
    if (opts.page) params.set('page', String(opts.page));
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.includeImageMap) params.set('includeImageMap', 'true');
    const qs = params.toString();
    const res = await authedFetch(
      `/products/manage/by-shop/${encodeURIComponent(sid)}${qs ? `?${qs}` : ''}`
    );
    if (Array.isArray(res)) return res;
    if (Array.isArray((res as any)?.products)) return (res as any).products;
    if (Array.isArray((res as any)?.items)) return (res as any).items;
    return [];
  },

  /** Bulk upsert products derived from image-map hotspots (returns created/updated lists). */
  importDrafts: async (
    shopId: string,
    items: ImportDraftItem[],
    source: string = 'image_map'
  ): Promise<ImportDraftsResponse> => {
    const sid = String(shopId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    return await authedFetch(`/products/manage/by-shop/${encodeURIComponent(sid)}/import-drafts`, {
      method: 'POST',
      body: JSON.stringify({ source, items }),
    });
  },

  /** Upload a media file (image) and return { url, key }. */
  uploadMedia: async (file: File, shopId?: string): Promise<{ url: string; key?: string }> => {
    const token = readToken();
    const { compressForUpload } = await import('@/lib/upload-image');
    const toUpload = await compressForUpload(file, 'map');
    const form = new FormData();
    form.append('file', toUpload);
    if (shopId) form.append('shopId', shopId);
    const res = await fetch(`/api/v1/media/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err: any = new Error(data?.message || 'Upload failed');
      err.status = res.status;
      throw err;
    }
    const url = data?.url || data?.data?.url || data?.location || '';
    const key = data?.key || data?.data?.key || data?.Key || '';
    return { url, key };
  },
};

export default ImageMapApi;
