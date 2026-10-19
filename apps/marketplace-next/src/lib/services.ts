import { api } from './api';

export interface Shop {
  id: string;
  slug: string;
  name: string;
  bio?: string;
  logo?: string;
  banner?: string;
  city?: string;
  district?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  activity?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  followerCount?: number;
  isVerified?: boolean;
  isApproved?: boolean;
  isOpen?: boolean;
  socialLinks?: Record<string, string>;
  coverImage?: string;
  productCount?: number;
  pageDesign?: Record<string, any>;
  builderConfig?: Record<string, any>;
  /** إعدادات المتجر — منها layoutConfig.commerce اللي بتحدد طريقة البيع (سعر/سلة/حجز) */
  layoutConfig?: Record<string, any>;
  addons?: any[];
  isActive?: boolean;
}

export interface Product {
  id: string;
  shopId: string;
  shopName?: string;
  shopSlug?: string;
  name: string;
  description?: string;
  price?: number;
  oldPrice?: number;
  currency?: string;
  images?: string[];
  imageUrl?: string;
  category?: string;
  isAvailable?: boolean;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: string;
  publishedAt: string;
  readTime?: string;
}

/**
 * فهرس المتاجر — عليه قرار التاجر في `layoutConfig.commerce`.
 *
 * `fresh: true` بيلغي كاش السيرفر (Data Cache) عشان الصفحة تبان على طول بعد ما
 * التاجر يغيّر إعداده. من غيرها كان لازم يتغير يفضل باين لحد 5 دقايق (300 ثانية).
 */
export async function getShops(take = 100, fresh = false): Promise<Shop[]> {
  try {
    const data = await api.get<any>(`/shops?take=${take}`, {
      revalidate: fresh ? 0 : 300,
      tags: ['shops'],
    });
    return Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
  } catch {
    return [];
  }
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  try {
    const data = await api.get<any>(`/shops/${slug}`, { revalidate: 300, tags: [`shop:${slug}`] });
    return data?.data ?? data;
  } catch {
    return null;
  }
}

// surface: 'site' يعرض ما هو معروض في موقع المتجر فقط، والافتراضي (بدون قيمة)
// يعرض ما هو معروض في تطبيق الماركت (app_active) — كل سطح ليه علم مستقل عند التاجر.
export async function getProducts(
  shopId: string,
  limit = 12,
  surface?: 'site' | 'app'
): Promise<Product[]> {
  try {
    // The public catalog endpoint filters by shopId — /shops/:id/products
    // does not exist on the backend and always came back empty.
    const surfaceQs = surface ? `&surface=${surface}` : '';
    const data = await api.get<any>(`/products?shopId=${shopId}&limit=${limit}${surfaceQs}`, {
      revalidate: 300,
      tags: [`products:${shopId}`],
    });
    return Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
  } catch {
    return [];
  }
}

// أحدث المنتجات المعروضة في التطبيق — لتغذية أقسام الهوم الموحدة (بطاقة المنتج الموحدة).
export async function getLatestProducts(limit = 8): Promise<Product[]> {
  try {
    const data = await api.get<any>(`/products?limit=${limit}`, {
      revalidate: 300,
      tags: ['products:latest'],
    });
    return Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
  } catch {
    return [];
  }
}

// منتجات قسم معيّن (نشاط المتجر) — صفحات الأقسام في التطبيق بالبطاقة الموحدة.
export async function getProductsByActivity(activity: string, limit = 24): Promise<Product[]> {
  try {
    const data = await api.get<any>(
      `/products?shopActivity=${encodeURIComponent(activity)}&limit=${limit}`,
      {
        revalidate: 300,
        tags: [`products:activity:${activity}`],
      }
    );
    return Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
  } catch {
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const data = await api.get<any>(`/products/${id}`, {
      revalidate: 300,
      tags: [`product:${id}`],
    });
    return data?.data ?? data;
  } catch {
    return null;
  }
}

export async function getOffers(category?: string): Promise<Product[]> {
  try {
    const path = category ? `/offers?category=${category}` : '/offers';
    const data = await api.get<any>(path, { revalidate: 300, tags: ['offers'] });
    return Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
  } catch {
    return [];
  }
}

export interface SeasonalOffer {
  id: string;
  name: string;
  description?: string;
  occasion: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  categories: string[];
  startDate: string;
  endDate: string;
  bannerColor: string;
  shopName?: string;
  shopSlug?: string;
  status?: 'active' | 'inactive' | 'expired' | string;
}

export async function getSeasonalOffers(): Promise<SeasonalOffer[]> {
  try {
    const data = await api.get<any>('/marketing/seasonal-offers/public', {
      revalidate: 300,
      tags: ['seasonal-offers'],
    });
    return Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
  } catch {
    return [];
  }
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const data = await api.get<any>('/blog', { revalidate: 3600, tags: ['blog'] });
    return Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
  } catch {
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const data = await api.get<any>(`/blog/${slug}`, { revalidate: 3600, tags: [`blog:${slug}`] });
    return data?.data ?? data;
  } catch {
    return null;
  }
}

export interface ImageMapAnalyzeRequest {
  imageUrl: string;
  language?: string;
  width?: number;
  height?: number;
  hint?: string;
}

export interface ImageMapAnalyzeSection {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sortOrder: number;
}

export interface ImageMapAnalyzeHotspot {
  id: string;
  sectionId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rectangle' | 'circle' | string;
  metadata?: Record<string, unknown>;
}

export interface ImageMapAnalyzeResponse {
  imageUrl: string;
  mode: string;
  sections: ImageMapAnalyzeSection[];
  hotspots: ImageMapAnalyzeHotspot[];
  suggestions: string[];
}

export async function analyzeShopImageMap(
  shopId: string,
  payload: ImageMapAnalyzeRequest
): Promise<ImageMapAnalyzeResponse> {
  return api.post<ImageMapAnalyzeResponse>(`/shops/${shopId}/image-maps/analyze`, payload, {
    revalidate: 0,
  });
}
