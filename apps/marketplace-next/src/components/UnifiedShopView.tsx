'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Globe,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react';
import type { Shop, Product } from '@/lib/services';
import { ShopProducts } from '@/components/ShopProducts';
import ShareButton from '@/components/ShareButton';
import { FollowButton } from '@/components/FollowButton';
import { ReviewsSection } from '@/components/ReviewsSection';

/**
 * UnifiedShopView — الثيم الموحد لتطبيق "من مكانك".
 *
 * كل المتاجر جوّه التطبيق بتظهر بنفس الهوية: خلفية كريمي دافئة، كروت بيضاء
 * مدوّرة، أزرار برتقالية — بعيد تمامًا عن ثيم موقع التاجر الأصلي (الشكل
 * الأصلي لسه متاح عبر /shop/[slug]?view=site وده اللي الخريطة بتفتحه).
 *
 * محتوى التاجر (البنر، اللوجو، المنتجات) بيفضل بتاعه — لكن الإطار والألوان
 * كلها بتاعة التطبيق عشان هوية واحدة وثيم واحد.
 */

interface UnifiedShopViewProps {
  shop: Shop;
  products: Product[];
  /** هل التاجر عنده موقع منشور؟ ساعتها بنضيف زر «الموقع الرسمي» يفتح الشكل الأصلي. */
  hasOfficialSite?: boolean;
}

export function UnifiedShopView({ shop, products, hasOfficialSite }: UnifiedShopViewProps) {
  const router = useRouter();

  const design = (shop.pageDesign || {}) as Record<string, any>;
  const bannerUrl: string | undefined = design.bannerUrl || shop.coverImage || shop.banner;
  const bannerIsVideo: boolean = Boolean(design.bannerIsVideo);
  const logoUrl: string | undefined = shop.logo || shop.logoUrl || design.logoUrl;

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  const locationLabel = [shop.city, shop.district].filter(Boolean).join(' - ');

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-brand-orange-soft/70 via-brand-cream to-brand-cream text-brand-ink"
    >
      {/* ─── الشريط العلوي بهوية التطبيق ─── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/70">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <button
            onClick={goBack}
            aria-label="رجوع"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-brand-orange-soft flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowRight className="w-5 h-5 text-slate-700" />
          </button>
          <h1 className="flex-1 min-w-0 font-black text-sm md:text-base truncate text-slate-900">
            {shop.name || 'متجر'}
          </h1>
          {/* ختم هوية التطبيق — المتجر داخل «من مكانك» */}
          <Link
            href="/"
            className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-xl bg-brand-orange-soft/70 hover:bg-brand-orange-soft transition-colors"
            title="من مكانك"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="من مكانك" className="w-5 h-5 rounded-md object-cover" />
            <span className="hidden sm:inline text-[10px] font-black text-brand-orange-dark">
              من مكانك
            </span>
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5">
        {/* ─── البنر + اللوجو: تركيبة موحدة نظيفة لكل المتاجر ─── */}
        <div className="relative rounded-3xl overflow-hidden shadow-card bg-slate-200 h-44 md:h-64">
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
                sizes="(max-width: 768px) 100vw, 1024px"
                className="object-cover"
              />
            )
          ) : (
            /* بديل البنر: تدرج الهوية بتاعة التطبيق مع أيقونة متجر شفافة */
            <div className="absolute inset-0 bg-brand-gradient">
              <Store className="absolute -bottom-6 -left-6 w-40 h-40 text-white/15" strokeWidth={1.2} />
              <Store className="absolute top-6 right-10 w-16 h-16 text-white/10" strokeWidth={1.2} />
            </div>
          )}
          {/* تدرّج خفيف أسفل البنر يبرز اللوجو */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
          {/* اللوجو: كارت أبيض مدوّر قاعد على حافة البنر — نفس تركيبة كارت المتجر في التطبيق */}
          <div className="absolute bottom-4 right-4 w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white border border-white/60 shadow-lg p-1 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={shop.name || 'متجر'}
                width={96}
                height={96}
                className="object-cover w-full h-full rounded-xl"
              />
            ) : (
              <Store className="w-9 h-9 text-brand-orange" />
            )}
          </div>
          {shop.isVerified && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 shadow text-[11px] font-black text-brand-orange-dark">
              <Star className="w-3.5 h-3.5 fill-brand-orange text-brand-orange" />
              متجر موثّق
            </div>
          )}
        </div>

        {/* ─── كارت معلومات المتجر ─── */}
        <section className="bg-white rounded-3xl border border-slate-200/70 shadow-card p-5 md:p-6">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-xl md:text-2xl font-black text-slate-900">{shop.name}</h2>
            {shop.isVerified && (
              <span className="w-5 h-5 rounded-full bg-brand-gradient flex items-center justify-center shrink-0">
                <Star className="w-3 h-3 text-white fill-white" />
              </span>
            )}
          </div>

          {shop.bio && (
            <p className="text-sm font-semibold text-slate-500 leading-relaxed mb-4 max-w-2xl">
              {shop.bio}
            </p>
          )}

          {/* معلومات سريعة — شيبس بهوية التطبيق */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {locationLabel && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-orange-soft text-brand-orange-dark text-xs font-black">
                <MapPin className="w-3.5 h-3.5" />
                {locationLabel}
              </span>
            )}
            {shop.rating != null && shop.rating > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 text-xs font-black">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {shop.rating.toFixed(1)}
                {shop.reviewCount ? ` (${shop.reviewCount})` : ''}
              </span>
            )}
            {shop.followerCount != null && shop.followerCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">
                {shop.followerCount} متابع
              </span>
            )}
            {products.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black">
                <ShoppingBag className="w-3.5 h-3.5" />
                {products.length} منتج
              </span>
            )}
          </div>

          {/* أزرار التواصل — نفس ستايل التطبيق */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* زر المتابعة بمحاذاة ارتفاع باقي الأزرار */}
            <div className="[&>button]:h-11 [&>button]:px-5 [&>button]:rounded-xl [&>button]:text-sm">
              <FollowButton shopId={shop.id} shopSlug={shop.slug} />
            </div>
            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                aria-label="اتصل"
                title="اتصل"
                className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-brand-orange-soft flex items-center justify-center transition-colors"
              >
                <Phone className="w-5 h-5 text-slate-700" />
              </a>
            )}
            {shop.whatsapp && (
              <a
                href={`https://wa.me/${shop.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="واتساب"
                title="واتساب"
                className="w-11 h-11 rounded-xl bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-green-500" />
              </a>
            )}
            <ShareButton
              path={`/shop/${shop.slug}`}
              title={shop.name}
              className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-brand-orange-soft flex items-center justify-center transition-colors"
              iconClassName="w-5 h-5 text-slate-700"
            />
            {/* الشكل الأصلي لموقع التاجر — متاح دايمًا لما يكون عنده موقع منشور */}
            {hasOfficialSite && (
              <Link
                href={`/shop/${shop.slug}?view=site`}
                className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border-2 border-brand-orange/30 text-brand-orange-dark text-xs font-black hover:bg-brand-orange-soft transition-colors"
              >
                <Globe className="w-4 h-4" />
                الموقع الرسمي
              </Link>
            )}
          </div>
        </section>

        {/* ─── المنتجات ─── */}
        <section className="bg-white rounded-3xl border border-slate-200/70 shadow-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="flex items-center gap-2 text-lg md:text-xl font-black text-slate-900">
              <span className="w-8 h-8 rounded-xl bg-brand-orange-soft flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-brand-orange-dark" />
              </span>
              المنتجات
              {products.length > 0 && (
                <span className="text-xs font-black text-slate-400">({products.length})</span>
              )}
            </h3>
            <Link
              href="/dalil"
              className="text-xs font-black text-brand-orange-dark hover:underline"
            >
              استكشف متاجر تانية
            </Link>
          </div>

          {products.length > 0 ? (
            <ShopProducts products={products} primaryColor="#F97316" />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-brand-orange-soft flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-brand-orange" />
              </div>
              <p className="font-black text-slate-700">لا توجد منتجات بعد</p>
              <p className="text-xs font-semibold text-slate-400 mt-1.5">
                كل منتجات المتجر هتظهر هنا بألوان التطبيق الموحدة
              </p>
            </div>
          )}
        </section>

        {/* ─── التقييمات ─── */}
        <section className="bg-white rounded-3xl border border-slate-200/70 shadow-card p-5 md:p-6">
          <ReviewsSection type="shop" targetId={shop.id} />
        </section>

        {/* ختم الهوية الموحدة أسفل الصفحة */}
        <p className="text-center text-[11px] font-black text-slate-400 pt-1 pb-2">
          متجر داخل تطبيق من مكانك
        </p>
      </div>
    </div>
  );
}
