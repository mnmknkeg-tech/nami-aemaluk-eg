import { MetadataRoute } from 'next';
import { siteConfig, VISIBLE_ACTIVITIES } from '@/lib/config';
import { getShops, getProducts } from '@/lib/services';
import { api } from '@/lib/api';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/dalil`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/offers`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    {
      url: `${baseUrl}/offers/restaurants`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/offers/fashion`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/offers/supermarket`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    { url: `${baseUrl}/map`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/courier`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    {
      url: `${baseUrl}/customer-service`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/return-policy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/download-app`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    { url: `${baseUrl}/suggestions`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/wishlist`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
    {
      url: `${baseUrl}/notifications`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.4,
    },
    { url: `${baseUrl}/checkout`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/profile`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    // Builder pages
    { url: `${baseUrl}/builder`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    {
      url: `${baseUrl}/builder/templates`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/builder/themes`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const activityPages: MetadataRoute.Sitemap = VISIBLE_ACTIVITIES.map((a) => ({
    url: `${baseUrl}/activity/${a.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const blogSlugs = [
    'start-your-online-store',
    'inventory-management-secrets',
    'why-you-need-all-in-one-platform',
    'digital-marketing-for-merchants',
    'mobile-first-store-design',
    'secure-your-store-data',
  ];
  const blogPages: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  let shopPages: MetadataRoute.Sitemap = [];
  const productPages: MetadataRoute.Sitemap = [];
  try {
    const shops = await getShops(500);
    shopPages = shops.map((shop) => ({
      url: `${baseUrl}/shop/${shop.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    for (const shop of shops.slice(0, 50)) {
      try {
        const products = await getProducts(shop.id, 50);
        productPages.push(
          ...products.map((p) => ({
            url: `${baseUrl}/product/${p.id}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }))
        );
      } catch {}
    }
  } catch {}

  let sitePages: MetadataRoute.Sitemap = [];
  try {
    const res = await api.get<any>('/shops/published-slugs', {
      revalidate: 3600,
      tags: ['published-slugs'],
    });
    const slugs: string[] = Array.isArray(res?.data) ? res.data : [];
    sitePages = slugs.map((slug) => ({
      url: `${baseUrl}/site/${slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));
  } catch {}

  return [
    ...staticPages,
    ...activityPages,
    ...blogPages,
    ...shopPages,
    ...productPages,
    ...sitePages,
  ];
}
