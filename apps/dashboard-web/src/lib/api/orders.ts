import { apiRequestWithMeta, buildQueryString, PageMeta } from './client';

// ---------------------------------------------------------------------------
// Server-side pagination (cursor-based)
//  - `limit` max is enforced by the backend (50 per page)
//  - `cursor` is an opaque record ID (not an offset) — stable across
//    deletions/reordering and safe for concurrent tab usage.
//  - `page` is DEPRECATED and ignored by the backend.
// ---------------------------------------------------------------------------
export type Order = {
  id: string;
  orderedAt: string;
  total: number;
  status: string;
  items: Array<{ productName: string; quantity: number; price: number }>;
  customer: { name: string; phone: string };
  paymentMethod: string;
  paymentStatus: string;
  billingAddress: string;
  shippingAddress: string;
  notes?: string;
  itemsCount: number;
  shippingFee: number;
  tax: number;
  subTotal: number;
};

export type OrderQuery = {
  search?: string;
  shopId?: string;
  from?: string;
  to?: string;
  // @deprecated — backend ignores; use cursor + limit
  page?: number;
  limit?: number; // max 50 (backend enforces)
  cursor?: string; // opaque record ID from previous response.meta.cursor
};

export type OrdersResult = {
  orders: Order[];
  meta: PageMeta | null;
};

function normalizeOrders(raw: any): Order[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Order[];
  if (Array.isArray(raw.orders)) return raw.orders as Order[];
  if (Array.isArray(raw.data)) return raw.data as Order[];
  if (Array.isArray(raw.items)) return raw.items as Order[];
  return [];
}

function metaFrom(raw: any): PageMeta | null {
  if (raw?.meta) return raw.meta as PageMeta;
  return null;
}

export async function fetchMyOrders(query: OrderQuery = {}): Promise<OrdersResult> {
  const qs = buildQueryString(query);
  const { data, meta, raw } = await apiRequestWithMeta<any>(`/orders/me${qs}`);
  return { orders: normalizeOrders(data), meta: meta || metaFrom(raw) };
}

export async function fetchShopOrders(
  shopId: string,
  query: OrderQuery = {}
): Promise<OrdersResult> {
  const qs = buildQueryString({ ...query, shopId });
  const { data, meta, raw } = await apiRequestWithMeta<any>(`/orders${qs}`);
  return { orders: normalizeOrders(data), meta: meta || metaFrom(raw) };
}

export async function fetchAdminOrders(query: OrderQuery = {}): Promise<OrdersResult> {
  const qs = buildQueryString(query);
  const { data, meta, raw } = await apiRequestWithMeta<any>(`/orders/admin${qs}`);
  return { orders: normalizeOrders(data), meta: meta || metaFrom(raw) };
}
