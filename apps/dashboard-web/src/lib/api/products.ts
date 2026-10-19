import { apiRequestWithMeta, buildQueryString, PageMeta } from './client';

export type Product = {
  id: string;
  name: string;
  price: number;
  stock?: number;
  category?: string | { name?: string; id?: string };
  imageUrl?: string;
  image_url?: string;
  description?: string;
  isActive?: boolean;
  unit?: string;
  colors?: any[];
  sizes?: any[];
  createdAt?: string;
};

export type ProductQuery = {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name' | 'oldest';
  page?: number;
  limit?: number;
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
  const { data, meta } = await apiRequestWithMeta<any>(
    `/products/manage/by-shop/${shopId}${qs}`
  );
  return { products: normalize(data), meta };
}

export async function fetchPublicProducts(
  query: ProductQuery = {}
): Promise<ProductsResult> {
  const qs = buildQueryString(query);
  const { data, meta } = await apiRequestWithMeta<any>(`/products${qs}`);
  return { products: normalize(data), meta };
}
