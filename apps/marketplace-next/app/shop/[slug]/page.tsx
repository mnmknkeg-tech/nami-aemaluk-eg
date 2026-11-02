import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Phone, Star, Store, Globe, MessageCircle, ArrowLeft } from 'lucide-react';
import { getShopBySlug, getProducts, getShops, type Shop } from '@/lib/services';
import { ProductCard } from '@/components/ProductCard';
import { ShopProducts } from '@/components/ShopProducts';
import ShareButton from '@/components/ShareButton';
import { FollowButton } from '@/components/FollowButton';
import { ReviewsSection } from '@/components/ReviewsSection';
import { siteConfig } from '@/lib/config';
import ShopRenderer from '@/components/ShopRenderer';
import { serializeJsonLd } from '@/lib/jsonld';

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const shops = await getShops(100);
    return shops.map((shop) => ({ slug: shop.slug }));
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) return { title: 'متجر غير موجود' };

  const title = `${shop.name} | ${siteConfig.name}`;
  const description = shop.bio || `${shop.name} - متجر على منصة ${siteConfig.name}`;
  const image = shop.coverImage || shop.banner || shop.logo || siteConfig.ogImage;

  return {
    title,
    description,
    alternates: { canonical: `/shop/${shop.slug}` },
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  // Only products the merchant kept VISIBLE from the dashboard products page
  // appear on the storefront (same rule as published /site/ pages).
  const allProducts = await getProducts(shop.id, 100);
  const products = allProducts.filter(
    (p) => (p as any).isActive !== false && (p as any).is_active !== false
  );
  const design = shop.pageDesign || {};
  const primaryColor = design.primaryColor || '#00E5FF';
  const bgColor = design.pageBackgroundColor || design.backgroundColor || '#FFFFFF';
  const headerBg = design.headerBackgroundColor || '#FFFFFF';
  const headerText = design.headerTextColor || '#0F172A';
  const bannerUrl = design.bannerUrl || shop.coverImage || shop.banner;
  const bannerIsVideo = design.bannerIsVideo || false;
  const logoUrl = design.logoUrl || shop.logo;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.name,
    description: shop.bio || `${shop.name} - متجر على منصة ${siteConfig.name}`,
    url: `${siteConfig.url}/shop/${shop.slug}`,
    image: shop.coverImage || shop.banner || shop.logo,
    logo: shop.logo,
    telephone: shop.phone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: shop.city,
      addressRegion: shop.district,
      streetAddress: shop.address,
      addressCountry: 'EG',
    },
    aggregateRating: shop.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: shop.rating,
          reviewCount: shop.reviewCount || 0,
        }
      : undefined,
    ...(shop.socialLinks ? { sameAs: Object.values(shop.socialLinks) } : {}),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: 'الدليل', item: `${siteConfig.url}/dalil` },
      {
        '@type': 'ListItem',
        position: 3,
        name: shop.name,
        item: `${siteConfig.url}/shop/${shop.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />

      {/* If the shop has a builder config, render with the unified builder layout
          (same as the live preview in dashboard-web). Otherwise fall back to the
          legacy hardcoded layout below. */}
      {shop.builderConfig ? (
        <ShopRenderer shop={shop} products={products} />
      ) : (
        <LegacyShopLayout
          shop={shop}
          products={products}
          design={design}
          primaryColor={primaryColor}
          bgColor={bgColor}
        />
      )}
    </>
  );
}

function LegacyShopLayout({
  shop,
  products,
  design,
  primaryColor,
  bgColor,
}: {
  shop: Shop;
  products: Awaited<ReturnType<typeof getProducts>>;
  design: Record<string, any>;
  primaryColor: string;
  bgColor: string;
}) {
  const headerBg = design.headerBackgroundColor || '#FFFFFF';
  const headerText = design.headerTextColor || '#0F172A';
  const bannerUrl = design.bannerUrl || shop.coverImage || shop.banner;
  const bannerIsVideo = design.bannerIsVideo || false;
  const logoUrl = design.logoUrl || shop.logo;

  return (
    <>
      {/* Cover Banner */}
      <div
        className="relative h-48 md:h-72 lg:h-80 bg-brand-black overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        {bannerUrl ? (
          bannerIsVideo ? (
            <video
              src={bannerUrl}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <Image
              src={bannerUrl}
              alt={shop.name || 'متجر'}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${primaryColor}33, ${primaryColor}11)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Shop Header */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 -mt-20 md:-mt-24 relative z-10">
        <div
          className="rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 md:p-8"
          style={{ backgroundColor: headerBg, color: headerText }}
        >
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Logo */}
            <div
              className="w-24 h-24 md:w-32 md:h-32 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg"
              style={{ backgroundColor: primaryColor + '22' }}
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={shop.name || 'متجر'}
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Store className="w-10 h-10" style={{ color: primaryColor }} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1
                  className="text-2xl md:text-4xl font-bold tracking-tight"
                  style={{ color: headerText }}
                >
                  {shop.name}
                </h1>
                {shop.isVerified && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Star className="w-3.5 h-3.5 text-black fill-black" />
                  </div>
                )}
              </div>

              {shop.bio && (
                <p
                  className="font-semibold text-sm md:text-base mb-4 max-w-2xl"
                  style={{ color: headerText, opacity: 0.7 }}
                >
                  {shop.bio}
                </p>
              )}

              <div
                className="flex flex-wrap items-center gap-4 text-sm font-semibold"
                style={{ color: headerText, opacity: 0.6 }}
              >
                {shop.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" style={{ color: primaryColor }} />
                    {shop.city}
                    {shop.district ? ` - ${shop.district}` : ''}
                  </span>
                )}
                {shop.rating != null && shop.rating > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-500" />
                    {shop.rating.toFixed(1)}
                    {shop.reviewCount ? ` (${shop.reviewCount})` : ''}
                  </span>
                )}
                {shop.followerCount != null && shop.followerCount > 0 && (
                  <span>{shop.followerCount} متابع</span>
                )}
                {shop.productCount != null && shop.productCount > 0 && (
                  <span>{shop.productCount} منتج</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <FollowButton shopId={shop.id} shopSlug={shop.slug} />
              {shop.phone && (
                <a
                  href={`tel:${shop.phone}`}
                  className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-brand-cyan/10 transition-all"
                  aria-label="اتصل"
                >
                  <Phone className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </a>
              )}
              {shop.whatsapp && (
                <a
                  href={`https://wa.me/${shop.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-lg bg-green-500/10 flex items-center justify-center hover:bg-green-500/20 transition-all"
                  aria-label="واتساب"
                >
                  <MessageCircle className="w-5 h-5 text-green-500" />
                </a>
              )}
              <ShareButton
                path={`/shop/${shop.slug}`}
                title={shop.name}
                className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-brand-purple/10 transition-all"
                iconClassName="w-5 h-5 text-slate-700 dark:text-slate-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div
        className="max-w-[1400px] mx-auto px-4 md:px-6 py-12 md:py-16"
        style={{ backgroundColor: bgColor }}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            المنتجات
            {products.length > 0 && (
              <span className="text-slate-500 text-lg mr-2">({products.length})</span>
            )}
          </h2>
          <Link
            href="/dalil"
            className="flex items-center gap-2 font-semibold text-sm hover:gap-3 transition-all"
            style={{ color: primaryColor }}
          >
            العودة
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {products.length > 0 ? (
          <ShopProducts products={products} primaryColor={primaryColor} />
        ) : (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-semibold text-lg">لا توجد منتجات حالياً</p>
          </div>
        )}
      </div>

      {/* Shop Reviews */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pb-12 md:pb-16">
        <ReviewsSection type="shop" targetId={shop.id} />
      </div>
    </>
  );
}
