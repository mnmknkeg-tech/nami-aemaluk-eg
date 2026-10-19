import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, Store, Tag, ArrowLeft, MessageCircle, Phone, CheckCircle } from 'lucide-react';
import { getProductById, getProducts, getShops } from '@/lib/services';
import { formatPrice, truncate } from '@/lib/utils';
import { siteConfig } from '@/lib/config';
import ShareButton from '@/components/ShareButton';
import { CommerceAction } from '@/components/CommerceAction';
import { resolveCommerce } from '@/lib/commerce';
import { ReviewsSection } from '@/components/ReviewsSection';
import { ProductCard } from '@/components/ProductCard';
import { serializeJsonLd } from '@/lib/jsonld';

// السعر وزرار الشراء هنا بيتحسبوا من قرار التاجر (layoutConfig.commerce)،
// يعني لازم الصفحة تتعرض لكل زيارة — ISR كان بيقدّم قرار قديم لحد 5 دقايق
// (مثلاً: التاجر خفى السعر والصفحة لسه بتوري السعر والسلة).
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: 'منتج غير موجود' };

  const title = `${product.name} | ${siteConfig.name}`;
  const description = truncate(product.description || product.name, 160);
  const image = product.imageUrl || product.images?.[0] || siteConfig.ogImage;

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.id}` },
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

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  // مفيش shopSlug في payload بتاع المنتج، فبنلاقي المتجر من فهرس المتاجر بنفسه
  // (نفس مصدر بيانات الكارت) عشان قرار التاجر في layoutConfig.commerce يتطبّق هنا كمان.
  const shop = product.shopId
    ? ((await getShops(300, true)).find((s) => s.id === product.shopId) ?? null)
    : null;
  // قرار البيع (سلة/حجز/تواصل + إظهار السعر) بييجي من اختيار التاجر في layoutConfig.commerce.
  const decision = resolveCommerce({ product, shop });
  const hasDiscount =
    decision.showPrice && !!product.oldPrice && product.oldPrice > (product.price || 0);
  const discountPercent = hasDiscount
    ? Math.round(((product.oldPrice! - (product.price || 0)) / product.oldPrice!) * 100)
    : 0;

  let relatedProducts: any[] = [];
  if (product.shopId) {
    try {
      const shopProducts = await getProducts(product.shopId, 12);
      relatedProducts = shopProducts.filter((p) => p.id !== product.id).slice(0, 4);
    } catch {}
  }

  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    url: `${siteConfig.url}/product/${product.id}`,
    image: product.imageUrl || product.images?.[0],
    brand: shop ? { '@type': 'Brand', name: shop.name } : undefined,
    offers: {
      '@type': 'Offer',
      // سعر مخفي عند التاجر ما ينفعش يتسرب في الـ structured data.
      price: decision.showPrice ? product.price : undefined,
      priceCurrency: product.currency || 'EGP',
      availability:
        product.isAvailable !== false
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: shop ? { '@type': 'Organization', name: shop.name } : undefined,
      url: `${siteConfig.url}/product/${product.id}`,
    },
  };
  if (product.rating && product.rating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount || 1,
    };
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
      ...(shop
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: shop.name,
              item: `${siteConfig.url}/shop/${shop.slug}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: shop ? 3 : 2,
        name: product.name,
        item: `${siteConfig.url}/product/${product.id}`,
      },
    ],
  };

  // Apply builder config product page styling if available.
  const builderConfig = (shop?.builderConfig || shop?.pageDesign || {}) as Record<string, any>;
  const pageBg =
    builderConfig.productPageBackgroundColor || builderConfig.pageBackgroundColor || undefined;
  const pageText = builderConfig.productPageTextColor || undefined;
  const priceColor = builderConfig.productPagePriceColor || builderConfig.primaryColor || undefined;
  const buttonColor =
    builderConfig.productPageButtonColor || builderConfig.primaryColor || undefined;

  return (
    <div
      className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12"
      style={{ backgroundColor: pageBg, color: pageText }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-6">
        <Link href="/" className="hover:text-brand-cyan transition-colors">
          الرئيسية
        </Link>
        <span>/</span>
        {shop && (
          <>
            <Link href={`/shop/${shop.slug}`} className="hover:text-brand-cyan transition-colors">
              {shop.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-600 dark:text-slate-300 truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        {/* Image */}
        <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
          <Image
            src={product.imageUrl || product.images?.[0] || '/placeholder-product.png'}
            alt={product.name || 'منتج'}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          {hasDiscount && (
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-red-500 rounded-lg text-sm font-semibold text-white shadow-lg">
              خصم {discountPercent}%
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {shop && (
            <Link href={`/shop/${shop.slug}`} className="flex items-center gap-2 mb-4 group">
              <div className="w-10 h-10 rounded-lg bg-brand-black flex items-center justify-center overflow-hidden">
                {shop.logo ? (
                  <Image
                    src={shop.logo}
                    alt={shop.name || 'متجر'}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <Store className="w-5 h-5 text-brand-cyan" />
                )}
              </div>
              <span className="font-semibold text-sm text-slate-700 dark:text-slate-300 group-hover:text-brand-cyan transition-colors">
                {shop.name}
              </span>
            </Link>
          )}

          <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-3">{product.name}</h1>

          {product.rating != null && product.rating > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s <= Math.round(product.rating!) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-slate-500">
                {product.rating!.toFixed(1)}
              </span>
            </div>
          )}

          {/* Price — التاجر ممكن يخفي السعر ويعرض "السعر عند الطلب" */}
          {decision.showPrice && product.price != null ? (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl md:text-4xl font-bold" style={{ color: priceColor }}>
                {formatPrice(product.price, product.currency)}
              </span>
              {hasDiscount && (
                <span className="text-lg text-slate-500 line-through font-semibold">
                  {formatPrice(product.oldPrice!, product.currency)}
                </span>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                السعر عند الطلب
              </span>
              {decision.booking === '24h' && (
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  رد خلال {decision.bookingWindowHours} ساعة
                </p>
              )}
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
              <p className="text-slate-600 dark:text-slate-400 font-semibold leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  <Tag className="w-3 h-3 inline ml-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Availability */}
          <div className="mb-6">
            {product.isAvailable !== false ? (
              <span className="flex items-center gap-2 text-green-500 font-semibold text-sm">
                <CheckCircle className="w-5 h-5" />
                متوفر الآن
              </span>
            ) : (
              <span className="flex items-center gap-2 text-red-500 font-semibold text-sm">
                غير متوفر حالياً
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-auto" data-testid="product-actions">
            {product.isAvailable !== false && (
              <CommerceAction
                decision={decision}
                product={product}
                shopId={product.shopId}
                shopName={shop?.name}
                variant="button"
                cartSize="lg"
                cartColor={buttonColor}
                showQuantityStepper={true}
              />
            )}
            {shop?.whatsapp && (
              <a
                href={`https://wa.me/${shop.whatsapp}?text=استفسار عن ${encodeURIComponent(product.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition-all shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                اطلب عبر واتساب
              </a>
            )}
            {shop?.phone && (
              <a
                href={`tel:${shop.phone}`}
                className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-brand-cyan/10 transition-all"
                aria-label="اتصل"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
            <ShareButton
              path={`/product/${product.id}`}
              title={product.name}
              className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-brand-purple/10 transition-all"
              iconClassName="w-5 h-5"
            />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-12 md:mt-16">
        <ReviewsSection type="product" targetId={product.id} />
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12 md:mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">منتجات ذات صلة</h2>
            {shop && (
              <Link
                href={`/shop/${shop.slug}`}
                className="text-sm font-bold text-brand-cyan hover:underline flex items-center gap-1"
              >
                عرض الكل
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((rp) => (
              // نفس المتجر بالظبط (شوف getProducts أعلاه) — بنمرّره عشان قرار التاجر
              // (السعر المخفي + زرار الحجز) يبان من أول HTML من غير فلاش قبل الهيدرايشن.
              <ProductCard key={rp.id} product={rp} shop={shop} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
