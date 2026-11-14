import type { MetadataRoute } from 'next';

// خريطة صفحات «نمّي أعمالك» — المسارات العامة الموثّقة فقط.
// كل مسار هنا اتحقق منه لايف (200) يوم 2026-11-14.
// مستبعد عمداً: /legacy (معطّلة)، /home و /new (بدائل مؤقتة للرئيسية)،
// /login /signup /dashboard /builder (مناطق داخلية).
const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://nami-aemaluk-eg.vercel.app';

const PUBLIC_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
}[] = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/features', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/solutions', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/innovations', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/activities', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/men-makanak', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/ai-chat', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'yearly' },
  { path: '/blog', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/help', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/download-app', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${BASE}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
