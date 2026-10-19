import { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MapPin, MessageCircle, Store } from 'lucide-react';
import { api } from '@/lib/api';
import { getProducts } from '@/lib/services';
import { ProductCard } from '@/components/ProductCard';
import { siteConfig } from '@/lib/config';
import {
  mapSiteProduct,
  type SiteProduct,
  type SiteSubscriptionPlan,
  type Website,
} from '@ray-eg/shared/builder';
import { SiteCartBridge } from '@/components/SiteCartBridge';
import { serializeJsonLd } from '@/lib/jsonld';
import { sanitizeCssValue } from '@/lib/sanitize';

export const revalidate = 120;

type BuilderConfig = Record<string, any>;

type PublicWebsite = {
  published: boolean;
  publishedAt?: string;
  shop: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  config: BuilderConfig;
};

async function getWebsite(slug: string): Promise<PublicWebsite | null> {
  try {
    const data = await api.get<any>(`/shops/${slug}/website`, {
      revalidate: 120,
      tags: [`site:${slug}`],
    });
    if (data?.data?.shop) {
      return data.data;
    }
  } catch {
    // API offline or unknown slug — render an honest 404, never a fake shop.
  }
  return null;
}

async function getSubscriptionPlans(shopId: string): Promise<SiteSubscriptionPlan[]> {
  try {
    const res = await api.get<any>(`/public/shops/${shopId}/subscriptions/plans`, {
      revalidate: 60,
      tags: [`sub-plans:${shopId}`],
    });
    if (res?.data && Array.isArray(res.data)) {
      return res.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        description: p.description,
        billingCycle: p.billing_cycle,
        durationDays: p.duration_days,
        price: p.price,
        currency: p.currency || 'EGP',
        features: Array.isArray(p.features) ? p.features : [],
        trialDays: p.trial_days,
        isFeatured: p.is_featured,
        color: p.color,
      }));
    }
  } catch {
    // API offline or error — fallback gracefully
  }
  return [];
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getWebsite(slug);
  if (!site) return { title: 'الموقع غير موجود', robots: { index: false } };

  const c = site.config || {};
  const website: Website | undefined = c.website;
  const homeMeta =
    website?.pages?.find((p) => p.metadata?.isHomePage)?.metadata || website?.pages?.[0]?.metadata;

  const title = `${homeMeta?.ogTitle || homeMeta?.title || site.shop.name} | ${siteConfig.name}`;
  const description =
    homeMeta?.ogDescription ||
    homeMeta?.description ||
    c.homeIntroText ||
    c.bannerSubtitle ||
    `${site.shop.name} - تسوق أونلاين من ${site.shop.name} على منصة ${siteConfig.name}`;
  const image = homeMeta?.ogImage || c.bannerUrl || site.shop.logoUrl || siteConfig.ogImage;

  return {
    title,
    description,
    alternates: { canonical: `/site/${site.shop.slug}` },
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
      type: 'website',
      locale: 'ar_EG',
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function PublishedSitePage({ params }: Props) {
  const { slug } = await params;
  const site = await getWebsite(slug);
  if (!site) notFound();

  const c = site.config || {};
  const website: Website | undefined = c.website;

  // Fetch products + subscription plans in parallel for best performance
  const [products, subscriptionPlans] = await Promise.all([
    getProducts(site.shop.id, 100, 'site'),
    getSubscriptionPlans(site.shop.id),
  ]);

  // عرض المنتجات النشطة فقط والتي لم يقم التاجر بإخفائها من صفحة المنتجات
  const activeOnlyProducts = (products || []).filter(
    (p: any) => p.isActive !== false && p.is_active !== false
  );
  const siteProducts: SiteProduct[] = activeOnlyProducts.map((p: any) =>
    mapSiteProduct({
      ...p,
      shopId: site.shop.id,
      shopSlug: site.shop.slug,
      shopName: site.shop.name,
    })
  );

  const shopCtx = {
    id: site.shop.id,
    name: site.shop.name,
    slug: site.shop.slug,
    logoUrl: site.shop.logoUrl,
    phone: site.shop.phone,
    email: site.shop.email,
    address: site.shop.address,
    whatsapp: (c as any).website?.contact?.whatsapp || site.shop.phone,
  };

  // New-generation sites: render the exact builder component tree.
  if (website?.pages?.length && website?.components && Object.keys(website.components).length > 0) {
    return (
      <SiteCartBridge
        website={website}
        shop={shopCtx}
        products={siteProducts}
        subscriptionPlans={subscriptionPlans}
      />
    );
  }

  // Legacy sites (flat banner/keys config) keep the classic template.
  return <LegacyPublishedSiteView site={site} products={siteProducts} />;
}

// ---------------------------------------------------------------------------
// Legacy template — flat keys: bannerUrl, bannerTitle, homeIntroText, colors…
// ---------------------------------------------------------------------------

function LegacyPublishedSiteView({
  site,
  products,
}: {
  site: PublicWebsite;
  products: SiteProduct[];
}) {
  const c = site.config || {};
  const theme = (c as any).website?.theme || {};
  const tColors = theme.colors || {};
  const tTypo = theme.typography || {};
  const tRadius = theme.radius || {};
  const tShadows = theme.shadows || {};

  const primary = c.primaryColor || tColors.primary || '#1d4ed8';
  const headerBg = c.headerBackgroundColor || tColors.surface || '#f8fafc';
  const headerText = c.headerTextColor || tColors.textPrimary || '#0f172a';
  const pageBg = c.pageBackgroundColor || tColors.background || '#ffffff';
  const bannerUrl = c.bannerUrl;
  const footerBg = c.footerBackgroundColor || tColors.surface || '#f8fafc';
  const footerText = c.footerTextColor || tColors.textPrimary || '#0f172a';

  // Theme values are merchant-controlled and interpolated into a <style> tag
  // below — sanitize every one of them (tag/rule breakout prevention).
  const fontBody = sanitizeCssValue(tTypo.fontBody, 'inherit');
  const fontHeading = sanitizeCssValue(tTypo.fontHeading, 'inherit');
  const rSm = sanitizeCssValue(tRadius.sm, '6px');
  const rMd = sanitizeCssValue(tRadius.md, '10px');
  const rLg = sanitizeCssValue(tRadius.lg, '16px');
  const rXl = sanitizeCssValue(tRadius.xl, '24px');
  const shadowSm = sanitizeCssValue(tShadows.sm, '0 1px 2px 0 rgba(0, 0, 0, 0.05)');
  const shadowMd = sanitizeCssValue(
    tShadows.md,
    '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)'
  );
  const cardRadius = c.productsLayout === 'horizontal' ? rLg : rMd;

  const waPhone = (site.shop.phone || '').replace(/[^0-9]/g, '');
  const waLink = waPhone
    ? `https://wa.me/${waPhone.startsWith('20') ? waPhone : '2' + waPhone}?text=${encodeURIComponent(
        `مرحبًا، أريد الاستفسار عن منتجات ${site.shop.name}`
      )}`
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: site.shop.name,
    url: `${siteConfig.url}/site/${site.shop.slug}`,
    image: bannerUrl || site.shop.logoUrl,
    telephone: site.shop.phone,
    address: site.shop.address,
  };

  return (
    <div dir="rtl" className="pub-site min-h-screen" style={{ backgroundColor: pageBg }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .pub-site { font-family: ${fontBody}; }
            .pub-site h1, .pub-site h2, .pub-site h3 { font-family: ${fontHeading}; }
            .pub-site .pub-wa { border-radius: ${rMd}; box-shadow: ${shadowSm}; }
            .pub-site .pub-logo { border-radius: ${rMd}; }
            .pub-site .pub-badge { border-radius: ${rSm}; box-shadow: ${shadowSm}; }
            .pub-site .pub-hero-title { border-radius: ${rXl}; }
            .pub-site .pub-card { border-radius: ${cardRadius}; box-shadow: ${shadowSm}; transition: box-shadow .2s; }
            .pub-site .pub-card:hover { box-shadow: ${shadowMd}; }
          `,
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur border-b border-black/5"
        style={{ backgroundColor: `${headerBg}F2`, color: headerText }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            {site.shop.logoUrl ? (
              <Image
                src={site.shop.logoUrl}
                alt={site.shop.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-xl object-cover shrink-0 pub-logo"
              />
            ) : (
              <div
                className="w-10 h-10 flex items-center justify-center shrink-0 pub-logo"
                style={{ backgroundColor: primary }}
              >
                <Store size={20} className="text-white" />
              </div>
            )}
            <span className="font-black text-lg truncate">{site.shop.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="pub-wa flex items-center gap-1.5 px-4 py-2 text-white text-sm font-bold hover:opacity-90 transition"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle size={16} />
                <span className="hidden sm:inline">اطلب واتساب</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero banner */}
      {bannerUrl && (
        <section className="relative w-full h-[42vh] min-h-[280px] max-h-[480px]">
          <Image
            src={bannerUrl}
            alt={site.shop.name}
            fill
            priority
            className="object-cover"
            style={{ objectPosition: `${c.bannerPosX || 50}% ${c.bannerPosY || 50}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 text-white text-right">
            <h1 className="text-3xl sm:text-5xl font-black drop-shadow-lg">
              {c.bannerTitle || site.shop.name}
            </h1>
            {(c.bannerSubtitle || c.homeIntroText) && (
              <p className="mt-2 text-sm sm:text-lg text-white/90 max-w-2xl drop-shadow">
                {c.bannerSubtitle || c.homeIntroText}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Products */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            {c.allProductsPageName || 'منتجاتنا'}
          </h2>
          <span className="text-sm font-bold text-slate-400">{products.length} منتج</span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 text-slate-400 font-bold">
            لا توجد منتجات متاحة حاليًا
          </div>
        ) : (
          <div
            className={`grid gap-4 sm:gap-6 ${
              c.productsLayout === 'horizontal'
                ? 'grid-cols-1'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {products.map((p) => (
              <div key={p.id} className="pub-card">
                <ProductCard product={p as any} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="border-t border-black/5 mt-8"
        style={{ backgroundColor: footerBg, color: footerText }}
      >
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="font-black text-base">{site.shop.name}</div>
          {site.shop.address && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin size={14} />
              <span>{site.shop.address}</span>
            </div>
          )}
          <div className="text-slate-400 text-xs">مشغل بواسطة {siteConfig.name}</div>
        </div>
      </footer>
    </div>
  );
}
