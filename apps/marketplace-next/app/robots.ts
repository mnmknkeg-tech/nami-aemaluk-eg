import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/login',
          '/signup',
          '/reset-password',
          '/business',
          '/map/listing',
          '/checkout',
          '/profile',
          '/notifications',
          '/wishlist',
          '/track',
          // نتائج البحث سلاسل استعلامات مخصصة — noindex + منع الزحف
          '/search',
          // صفحات حساب المستخدم الخاصة
          '/account',
          '/bookings/track',
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
