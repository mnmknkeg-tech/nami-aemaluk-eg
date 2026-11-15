import { SiteCartProvider } from '@/lib/site-cart';

/**
 * Layout موقع التاجر المنشور — سلة الموقع بتتركب هنا بالـ slug الصريح من
 * الراوت نفسه (سيرفر) مش من usePathname، عشان السلة تشتغل صح حتى لما الموقع
 * يُفتح من الدومين الفرعي/المخصص (الميدلوير بيعمل rewrite داخلي لـ
 * /site/:slug والمتصفح شايف مسار مختلف تمامًا).
 *
 * ده جزء قرار فصل موقع التاجر عن الماركت: سلة الموقع مستقلة تمامًا عن سلة
 * الماركت (mnmknk_cart) — تخزين منفصل، درَج منفصل، وcheckout مستقل
 * (SiteCheckout) بيبعت الطلبات للضيوف عبر /orders/public.
 */
export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SiteCartProvider slug={slug}>{children}</SiteCartProvider>;
}
