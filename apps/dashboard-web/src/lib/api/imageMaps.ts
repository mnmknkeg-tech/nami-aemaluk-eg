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
 * All requests go through the unified core (apiRequest / apiRequestWithMeta),
 * which owns the single-flight refresh, CSRF double-submit token, and the
 * single-use session-expired event. No separate fetch() call here.
 *
 * @module api/imageMaps
 */

import { apiRequest, apiRequestWithMeta } from '@/lib/api/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** List all image maps for a shop (manage view, includes hotspots + sections). */
export const ImageMapApi = {
  listForManage: async (shopId: string): Promise<ImageMap[]> => {
    const sid = String(shopId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    const res = await apiRequest<ImageMap[]>(`/shops/${encodeURIComponent(sid)}/image-maps/manage`);
    if (Array.isArray(res)) return res;
    // Try to extract from the response object if it has items
    if (
      typeof res === 'object' &&
      res !== null &&
      'items' in res &&
      Array.isArray((res as any).items)
    ) {
      return (res as any).items;
    }
    return [];
  },

  create: async (shopId: string, payload: Partial<ImageMap>): Promise<ImageMap> => {
    const sid = String(shopId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    return await apiRequest<ImageMap>(`/shops/${encodeURIComponent(sid)}/image-maps`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  activate: async (shopId: string, mapId: string): Promise<ImageMap> => {
    const sid = String(shopId || '').trim();
    const mid = String(mapId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    if (!mid) throw new Error('Missing mapId');
    return await apiRequest<ImageMap>(
      `/shops/${encodeURIComponent(sid)}/image-maps/${encodeURIComponent(mid)}/activate`,
      { method: 'PATCH', body: JSON.stringify({}) }
    );
  },

  saveLayout: async (
    shopId: string,
    mapId: string,
    payload: SaveLayoutPayload
  ): Promise<ImageMap> => {
    const sid = String(shopId || '').trim();
    const mid = String(mapId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    if (!mid) throw new Error('Missing mapId');
    return await apiRequest<ImageMap>(
      `/shops/${encodeURIComponent(sid)}/image-maps/${encodeURIComponent(mid)}/layout`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    );
  },

  uploadMedia: async (shopId: string, files: File[]): Promise<string[]> => {
    const sid = String(shopId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return (await apiRequest<string[]>(`/shops/${encodeURIComponent(sid)}/image-maps/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })) as string[];
  },

  analyze: async (shopId: string, payload: AnalyzeImageMapPayload): Promise<any> => {
    const sid = String(shopId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    return await apiRequest<any>(`/shops/${encodeURIComponent(sid)}/image-maps/analyze`, {
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
    const res = await apiRequestWithMeta<any>(
      `/products/manage/by-shop/${encodeURIComponent(sid)}${qs ? `?${qs}` : ''}`
    );
    const { data } = res;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.products)) return data.products;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },

  /** Bulk upsert products derived from image-map hotspots (returns created/updated lists). */
  importDrafts: async (
    shopId: string,
    drafts: ImportDraftItem[],
    type?: 'image_map' | 'product'
  ): Promise<ImportDraftsResponse> => {
    const sid = String(shopId || '').trim();
    if (!sid) throw new Error('Missing shopId');
    return (
      await apiRequestWithMeta<ImportDraftsResponse>(
        `/products/manage/by-shop/${encodeURIComponent(sid)}/import-drafts`,
        { method: 'POST', body: JSON.stringify({ drafts }) }
      )
    ).data;
  },
};
