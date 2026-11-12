import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Star,
  Video,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getProductById, getProducts } from '@/lib/services';
import { getSiteProductImageUrl, mapSiteProduct } from '@ray-eg/shared/builder';
import { SiteProductActions } from '@/components/SiteProductActions';
import { SiteStoreProductCard } from '@/components/SiteStoreProductCard';
import { SafeProductImage } from '@/components/SafeProductImage';
import { ReviewsSection } from '@/components/ReviewsSection';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { params: Promise<{ slug: string; id: string }> };

async function getWebsite(slug: string) {
  try {
    const result = await api.get<any>(`/shops/${slug}/website`, {
      revalidate: 0,
      tags: [`site:${slug}`],
    });
    return result?.data?.shop ? result.data : null;
  } catch {
    return null;
  }
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const site = await getWebsite(slug);
  if (!site) return { title: 'المنتج غير موجود', robots: { index: false } };

  // جلب فريش عشان قرار الإخفاء يشتغل فورًا، مش من كاش قديم.
  const productDetails = await getProductById(id, { fresh: true });
  // كل سطح ليه علم مستقل: منتج مخفي من الموقع مينفعش يظهر هنا
  // حتى لو لسه معروض في التطبيق (appActive) — والفallback من قائمة
  // سطح الموقع أصلاً مش هيلاقيه مخفي لأن الـ API بيفلتره.
  if (productDetails && (productDetails as any).isActive === false) {
    return { title: 'المنتج غير موجود', robots: { index: false } };
  }
  const product =
    productDetails ||
    (await getProducts(site.shop.id, 100, 'site', true)).find(
      (item: any) => String(item.id) === String(id)
    );
  if (!product) return { title: 'المنتج غير موجود', robots: { index: false } };
  const imageUrl = getSiteProductImageUrl(product);

  const extra = (product as any)?.extraData || {};
  const seoTitle = extra.seoTitle || product.name;
  const seoDesc =
    extra.seoDescription || product.description || `تفاصيل ${product.name} من ${site.shop.name}`;
  const pageTitle = `${seoTitle} | ${site.shop.name}`;
  const icon = site.shop.logoUrl || undefined;
  const keywords = extra.seoKeywords
    ? String(extra.seoKeywords)
        .split(/[,،]+/)
        .map((k: string) => k.trim())
    : undefined;

  return {
    title: { absolute: pageTitle },
    description: seoDesc,
    keywords,
    icons: icon ? { icon, shortcut: icon, apple: icon } : undefined,
    alternates: { canonical: `/site/${site.shop.slug}/product/${product.id}` },
    openGraph: {
      title: pageTitle,
      description: seoDesc,
      siteName: site.shop.name,
      images: imageUrl ? [imageUrl] : [],
      locale: 'ar_EG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: seoDesc,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default async function MerchantProductPage({ params }: Props) {
  const { slug, id } = await params;
  const site = await getWebsite(slug);
  if (!site) notFound();

  // جلب تفاصيل المنتج العميقة لضمان وجود menuVariants, addons, extraData كاملة
  const productDetails = await getProductById(id, { fresh: true });
  // الظهور مستقل لكل سطح: مخفي من الموقع = 404 هنا حتى لو معروض في التطبيق.
  if (productDetails && (productDetails as any).isActive === false) notFound();
  const products = await getProducts(site.shop.id, 100, 'site', true);
  const product = productDetails || products.find((item: any) => String(item.id) === String(id));
  if (!product) notFound();
  const productImageUrl = getSiteProductImageUrl(product);

  const config = site.config || {};
  const theme = config.website?.theme || config.theme || {};
  const colors = theme.colors || {};
  const radius = theme.radius || {};
  const shadow = theme.shadows?.card || '0 10px 30px rgba(15, 23, 42, 0.08)';
  const primary = colors.primary || '#ea580c';

  const related = products
    .filter((item: any) => String(item.id) !== String(product.id))
    .slice(0, 4);

  const phone = String(config.website?.contact?.whatsapp || site.shop.phone || '').replace(
    /\D/g,
    ''
  );
  const whatsapp = phone
    ? `https://wa.me/${phone.startsWith('20') ? phone : `20${phone.replace(/^20/, '')}`}?text=${encodeURIComponent(`مرحبًا، أريد الاستفسار عن ${product.name}`)}`
    : null;
  const logo = site.shop.logoUrl;

  const extra = (product as any)?.extraData || {};
  const youtubeEmbedUrl = getYouTubeEmbedUrl(extra.youtubeUrl);

  const cartProduct = {
    ...mapSiteProduct({
      ...product,
      shopId: site.shop.id,
      shopSlug: site.shop.slug,
    }),
    ...product,
    image: productImageUrl,
    shopId: site.shop.id,
    shopSlug: site.shop.slug,
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    image: productImageUrl ? [productImageUrl] : [],
    brand: extra.brand
      ? { '@type': 'Brand', name: extra.brand }
      : { '@type': 'Brand', name: site.shop.name },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency || 'EGP',
      availability:
        product.isAvailable !== false
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen"
      style={
        {
          backgroundColor: colors.background || '#fff',
          color: colors.textPrimary || '#111827',
          fontFamily: theme.typography?.fontBody || 'Cairo, Tajawal, sans-serif',
          '--site-primary': primary,
          '--site-surface': colors.surface || '#f8fafc',
          '--site-radius': radius.lg || '24px',
          '--site-shadow': shadow,
        } as CSSProperties
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        {/* Navigation Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm font-bold text-slate-500">
          <Link href={`/site/${site.shop.slug}`} className="hover:text-slate-900 transition-colors">
            الرئيسية
          </Link>
          <ArrowRight className="h-4 w-4 text-slate-400" />
          <span className="text-slate-900 truncate">{product.name}</span>
        </nav>

        {/* Product Main Section */}
        <section className="grid gap-8 lg:grid-cols-2 lg:gap-14 items-start">
          {/* Product Media */}
          <div className="space-y-4">
            <div
              className="relative aspect-square overflow-hidden border bg-slate-50"
              style={{
                borderColor: colors.border || '#e2e8f0',
                borderRadius: 'var(--site-radius)',
                boxShadow: 'var(--site-shadow)',
              }}
            >
              <SafeProductImage
                src={productImageUrl}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            {/* فيديو يوتيوب إن وجد في الحقول الإضافية */}
            {youtubeEmbedUrl && (
              <div className="rounded-2xl border border-slate-200 p-4 bg-white shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <Video className="w-4 h-4 text-red-600" />
                  <span>فيديو استعراض المنتج</span>
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe
                    src={youtubeEmbedUrl}
                    title={product.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Product Details & Actions */}
          <div className="flex flex-col justify-center space-y-5">
            {/* Shop Badge */}
            <Link
              href={`/site/${site.shop.slug}`}
              className="inline-flex items-center gap-2.5 font-black text-sm"
              style={{ color: 'var(--site-primary)' }}
            >
              {logo ? (
                <Image
                  src={logo}
                  alt={site.shop.name}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <ShoppingBag className="h-5 w-5" />
              )}
              <span>{site.shop.name}</span>
            </Link>

            {/* Title */}
            <h1 className="text-3xl font-black md:text-5xl text-slate-900 leading-tight">
              {product.name}
            </h1>

            {/* Category / Unit / Availability */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                {product.category || 'عام'}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                <CheckCircle className="h-3.5 w-3.5" />
                {product.isAvailable === false ? 'غير متوفر حالياً' : 'متوفر للطلب'}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="whitespace-pre-wrap text-sm sm:text-base font-semibold leading-relaxed text-slate-600">
                {product.description}
              </p>
            )}

            {/* Interactive Configurator (Sizes, Variants, Addons, ExtraData, Note, Cart) */}
            <div className="pt-3 border-t border-slate-100">
              <SiteProductActions product={cartProduct} shop={site.shop} />
            </div>

            {/* WhatsApp Alternative Action */}
            {whatsapp && (
              <div className="pt-2">
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3.5 font-black text-white text-sm shadow-md transition-all"
                >
                  <MessageCircle className="h-5 w-5" />
                  طلب أو استفسار عبر واتساب
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Benefits Badges */}
        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Truck,
              title: 'توصيل موثوق وسريع',
              text: 'يتم تأكيد تفاصيل التوصيل معك ومتابعة حالة الطلب خطوة بخطوة.',
            },
            {
              icon: ShieldCheck,
              title: 'طلب مضمون ومباشر',
              text: 'بيانات طلبك تصل مباشرة إلى لوحة المتجر وتجهيز فوري.',
            },
            {
              icon: Star,
              title: 'جودة مضمونة',
              text: 'منتجات طازجة ومختارة بعناية لأفضل تجربة عميل.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <Icon className="mb-3 h-6 w-6" style={{ color: 'var(--site-primary)' }} />
              <h2 className="font-extrabold text-sm text-slate-900">{title}</h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{text}</p>
            </div>
          ))}
        </section>

        {/* Reviews Section */}
        <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs md:p-8">
          <ReviewsSection type="product" targetId={String(product.id)} />
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-black text-slate-900">
              منتجات أخرى من {site.shop.name}
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((item: any) => (
                <SiteStoreProductCard
                  key={item.id}
                  product={item}
                  siteSlug={site.shop.slug}
                  shop={site.shop}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
