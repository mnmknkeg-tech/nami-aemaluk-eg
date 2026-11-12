import { api } from './api';
import { normalizeImageUrl } from '@ray-eg/shared/utils/image-url';

export interface Shop {
  id: string;
  slug: string;
  name: string;
  bio?: string;
  logo?: string;
  logoUrl?: string;
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

export interface PublishedWebsite {
  published: boolean;
  publishedAt?: string;
  shop: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    phone?: string;
    address?: string;
  };
  config: Record<string, any>;
}

/** Never promote a draft into public renderer input, even if supplied by mistake. */
export function getPublicBuilderConfig(
  website: PublishedWebsite | null | undefined
): Record<string, any> | undefined {
  if (!website?.published || !website.config || typeof website.config !== 'object') {
    return undefined;
  }
  return website.config;
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
  /** تتبع المخزون — منتجات التجزئة true، أصناف المنيو/الخدمات false */
  trackStock?: boolean;
  /** المتبقي في المخزون — موجود فقط للأصناف التي تتبع المخزون */
  stock?: number;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  /** Optional override for the card link (e.g. shop-level offers). */
  href?: string;
}

function normalizeShop(raw: any): Shop {
  const shop = (raw?.data ?? raw) || {};
  const logoUrl = normalizeImageUrl(shop.logoUrl || shop.logo_url || shop.logo) || undefined;
  return { ...shop, logoUrl, logo: normalizeImageUrl(shop.logo) || logoUrl } as Shop;
}

function normalizeProduct(raw: any, index = 0): Product {
  const product = raw || {};
  const images = Array.isArray(product.images)
    ? product.images
        .map((item: any) =>
          typeof item === 'string'
            ? item
            : item?.url || item?.src || item?.imageUrl || item?.image_url || ''
        )
        .map((image: unknown) => normalizeImageUrl(image))
        .filter(Boolean)
    : [];
  const imageUrl =
    normalizeImageUrl(
      product.imageUrl ||
        product.image_url ||
        product.image ||
        product.thumbnailUrl ||
        product.thumbnail ||
        images[0] ||
        ''
    ) ||
    images[0] ||
    '';
  const category =
    typeof product.category === 'object'
      ? product.category?.name || product.category?.title || product.category?.label || ''
      : product.category || product.categoryName || product.category_name || '';
  return {
    ...product,
    name: product.name || product.title || `منتج ${index + 1}`,
    imageUrl,
    images: images.length ? images : imageUrl ? [imageUrl] : [],
    category: String(category).trim(),
  } as Product;
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

export async function getShopBySlug(slug: string, fresh = false): Promise<Shop | null> {
  try {
    const data = await api.get<any>(`/shops/${slug}`, {
      revalidate: fresh ? 0 : 300,
      tags: [`shop:${slug}`],
    });
    return data?.data ?? data;
  } catch {
    return null;
  }
}

/** Public content endpoint deliberately returns only builder_published_config. */
export async function getPublishedWebsiteBySlug(slug: string): Promise<PublishedWebsite | null> {
  try {
    const data = await api.get<any>(`/shops/${slug}/website`, {
      revalidate: 0,
      tags: [`site:${slug}`],
    });
    const website = data?.data?.shop ? data.data : data;
    return website?.shop ? (website as PublishedWebsite) : null;
  } catch {
    // A shop may have no published Builder snapshot; callers use legacy pageDesign.
    return null;
  }
}

// surface: 'site' يعرض ما هو معروض في موقع المتجر فقط، والافتراضي (بدون قيمة)
// يعرض ما هو معروض في تطبيق الماركت (app_active) — كل سطح ليه علم مستقل عند التاجر.
export async function getProducts(
  shopId: string,
  limit = 12,
  surface?: 'site' | 'app',
  fresh = false
): Promise<Product[]> {
  try {
    // The public catalog endpoint filters by shopId — /shops/:id/products
    // does not exist on the backend and always came back empty.
    const surfaceQs = surface ? `&surface=${surface}` : '';
    const data = await api.get<any>(`/products?shopId=${shopId}&limit=${limit}${surfaceQs}`, {
      revalidate: fresh ? 0 : 300,
      tags: [`products:${shopId}`],
    });
    const items = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
    return items.map((item: any, index: number) => normalizeProduct(item, index));
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

export function normalizeProductDetailResponse(response: any, expectedId: string): Product | null {
  const candidate = response?.data ?? response;
  const product = Array.isArray(candidate)
    ? candidate.find((item) => String(item?.id ?? '') === String(expectedId))
    : candidate;
  if (!product || typeof product !== 'object' || Array.isArray(product)) return null;
  if (String(product.id ?? '') !== String(expectedId)) return null;
  return product as Product;
}

export async function getProductById(
  id: string,
  opts?: { fresh?: boolean }
): Promise<Product | null> {
  try {
    const data = await api.get<any>(`/products/${id}`, {
      // fresh=true لصفحات التفاصيل: قرار الظهور عند التاجر لازم يشتغل فورًا —
      // منتج اتخفى من سطح ما لا يُسمح له بيفضل ظاهر من كاش قديم 5 دقايق.
      revalidate: opts?.fresh ? 0 : 300,
      tags: [`product:${id}`],
    });
    return normalizeProductDetailResponse(data, id);
  } catch {
    return null;
  }
}

/** Slug → backend shop-category enum (offers pages use friendly slugs). */
const OFFER_CATEGORY_MAP: Record<string, string> = {
  restaurants: 'RESTAURANT',
  restaurant: 'RESTAURANT',
  cafe: 'RESTAURANT',
  cafes: 'RESTAURANT',
  supermarket: 'RETAIL',
  market: 'RETAIL',
  grocery: 'RETAIL',
  retail: 'RETAIL',
  fashion: 'FASHION',
  electronics: 'ELECTRONICS',
  services: 'SERVICE',
  service: 'SERVICE',
  food: 'FOOD',
  foods: 'FOOD',
  health: 'HEALTH',
  pharmacy: 'HEALTH',
  other: 'OTHER',
};

/**
 * Backend OfferResponse → Product card shape.
 *
 * Offers carry `newPrice/oldPrice/title/imageUrl` (not the product fields the
 * cards read), so without this mapping every offer card rendered without a
 * price and linked to a non-existent `/product/{offerId}` page.
 */
function normalizeOfferToProduct(raw: any): Product {
  const offer = raw || {};
  const num = (v: any): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
    return undefined;
  };
  const oldPrice = num(offer.oldPrice ?? offer.old_price);
  const newPrice = num(offer.newPrice ?? offer.new_price);
  const productId = String(offer.productId ?? offer.product_id ?? '').trim();
  const shopSlug = String(offer.shopSlug ?? offer.shop_slug ?? '').trim();
  const image = normalizeImageUrl(offer.imageUrl || offer.image_url || '');
  return {
    ...offer,
    // Linked to the real product when the offer is tied to one; legacy
    // shop-level offers (no product) point to the shop page instead.
    id: productId || offer.id,
    href: productId ? undefined : shopSlug ? `/shop/${shopSlug}` : undefined,
    shopId: offer.shopId ?? offer.shop_id ?? '',
    shopName: offer.shopName ?? offer.shop_name ?? undefined,
    shopSlug: shopSlug || undefined,
    name: offer.title || offer.name || 'عرض خاص',
    description: offer.description || undefined,
    price: newPrice ?? oldPrice,
    oldPrice: oldPrice != null && newPrice != null && oldPrice > newPrice ? oldPrice : undefined,
    imageUrl: image || undefined,
    images: image ? [image] : undefined,
    category: offer.category || undefined,
  } as Product;
}

export async function getOffers(category?: string): Promise<Product[]> {
  try {
    const enumCategory = category
      ? (OFFER_CATEGORY_MAP[category.toLowerCase()] ?? category.toUpperCase())
      : '';
    const path = enumCategory ? `/offers?shopCategory=${enumCategory}` : '/offers';
    const data = await api.get<any>(path, { revalidate: 300, tags: ['offers'] });
    const list = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
    return Array.isArray(list) ? list.map(normalizeOfferToProduct) : [];
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
