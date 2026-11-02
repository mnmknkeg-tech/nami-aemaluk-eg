import { apiRequestWithMeta, buildQueryString, PageMeta } from './client';

// ---------------------------------------------------------------------------
// Server-side pagination (cursor-based)
//  - `limit` max is enforced by the backend (50 per page)
//  - `cursor` is an opaque record ID (not an offset) — stable across
//    deletions/reordering and safe for concurrent tab usage.
//  - `page` is DEPRECATED and ignored by the backend.
// ---------------------------------------------------------------------------
export type Product = {
  id: string;
  shopId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  status: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProductQuery = {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name' | 'oldest';
  // @deprecated — backend ignores; use cursor + limit
  page?: number;
  limit?: number; // max 50 (backend enforces)
  cursor?: string; // opaque record ID from previous response.meta.cursor
  includeImageMap?: boolean;
};

export type ProductsResult = {
  products: Product[];
  meta: PageMeta | null;
};

function normalize(list: any): Product[] {
  if (!list) return [];
  if (Array.isArray(list)) return list as Product[];
  if (Array.isArray(list.products)) return list.products as Product[];
  if (Array.isArray(list.data)) return list.data as Product[];
  if (Array.isArray(list.items)) return list.items as Product[];
  return [];
}

export async function fetchManageProducts(
  shopId: string,
  query: ProductQuery = {}
): Promise<ProductsResult> {
  const qs = buildQueryString({ ...query, shopId });
  const { data, meta } = await apiRequestWithMeta<any>(`/products/manage/by-shop/${shopId}${qs}`);
  return { products: normalize(data), meta };
}

export async function fetchPublicProducts(query: ProductQuery = {}): Promise<ProductsResult> {
  const qs = buildQueryString(query);
  const { data, meta } = await apiRequestWithMeta<any>(`/products${qs}`);
  return { products: normalize(data), meta };
}
