import { apiRequestWithMeta, buildQueryString, PageMeta } from './client';

export type Order = Record<string, any>;

export type OrderQuery = {
  page?: number;
  limit?: number;
  shopId?: string;
  from?: string;
  to?: string;
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
