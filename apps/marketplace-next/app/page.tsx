import { Metadata } from 'next';
import Link from 'next/link';
import { Tag, TrendingUp, Sparkles, LayoutGrid, Store, ArrowLeft } from 'lucide-react';
import { getOffers, getSeasonalOffers, getLatestProducts, getShops } from '@/lib/services';
import { VISIBLE_ACTIVITIES, siteConfig } from '@/lib/config';
import { getActivityTheme } from '@/lib/activity-catalog';
import { SectionHeader, ActivityCard } from '@/components/SectionHeader';
import { ProductRail } from '@/components/ProductRail';

import { HeroSlider } from '@/components/HeroSlider';
import { AppDownloadBanner } from '@/components/AppDownloadBanner';
import { HeroSearch } from '@/components/HeroSearch';
import { WelcomeBanner } from '@/components/WelcomeBanner';
import { WelcomeToast } from '@/components/WelcomeToast';
import { serializeJsonLd } from '@/lib/jsonld';

export const metadata: Metadata = {
  title: `${siteConfig.name} - ${siteConfig.nameArabic}`,
  description: siteConfig.description,
  alternates: { canonical: '/' },
};

export const revalidate = 300;

// ترتيب وطريقة عرض "تسوّق على مزاجك" — كل وضع له نصه وزر "ابدأ" الخاص به.
const MODE_ORDER = [
  'products',
  'menu',
  'booking',
  'request_quote',
  'services',
  'classifieds',
] as const;

const MODE_META: Record<(typeof MODE_ORDER)[number], { kicker: string; title: string }> = {
  products: { kicker: 'تسوق', title: 'تسوّق بالسعر' },
  menu: { kicker: 'أكل وشرب', title: 'منيو المطاعم' },
  booking: { kicker: 'حجوزات', title: 'احجز موعدك' },
  request_quote: { kicker: 'بدون سعر', title: 'احجز واحنا نكلمك' },
  services: { kicker: 'خدمات', title: 'خدمات لحد باب البيت' },
  classifieds: { kicker: 'إعلانات', title: 'عقارات وسيارات' },
};

export default async function HomePage() {
  const [latestProducts, offers, seasonalOffers, shops] = await Promise.all([
    getLatestProducts(48),
    getOffers(),
    getSeasonalOffers(),
    getShops(300).catch(() => []),
  ]);
  const featuredProducts = latestProducts.slice(0, 12);
  const newArrivals = latestProducts.slice(12, 24);
  const featuredOffers = offers;
  const activeSeasonal = seasonalOffers
    .filter((s) => s.status === 'active' || new Date(s.endDate) >= new Date())
    .slice(0, 3);

  // عدد المتاجر لكل قسم — بيظهر تحت اسم القسم في كروت الرئيسية.
  const shopCountByActivity = new Map<string, number>();
  for (const shop of shops) {
    if (!shop.activity) continue;
    shopCountByActivity.set(shop.activity, (shopCountByActivity.get(shop.activity) ?? 0) + 1);
  }
  const countShopsFor = (query: string) =>
    query.split(',').reduce((n, q) => n + (shopCountByActivity.get(q.trim()) ?? 0), 0) || undefined;

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${siteConfig.name} - ${siteConfig.nameArabic}`,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: 'ar',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/dalil?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    alternateName: siteConfig.nameArabic,
    url: siteConfig.url,
    logo: `${siteConfig.url}/brand/logo.png`,
    description: siteConfig.description,
    sameAs: ['https://www.facebook.com/MNMKNK'],
  };

  return (
    <div className="overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(orgJsonLd) }}
      />

      {/* Welcome toast after login/signup */}
      <WelcomeToast />

      {/* Hero Section */}
      <section className="relative w-full">
        {/* Hero search — the header turns solid as soon as this reaches the top */}
        <div
          id="hero-search"
          className="max-w-[1400px] mx-auto px-4 md:px-6 pt-1 md:pt-2 pb-4 md:pb-6"
        >
          <HeroSearch />
        </div>

        {/* Rounded welcome banner */}
        <div className="px-4 md:px-6 pb-2">
          <div className="relative max-w-[1400px] mx-auto rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/60 dark:shadow-black/40">
            <div className="relative w-full aspect-[5/4] sm:aspect-[2/1] overflow-hidden">
              <HeroSlider />
            </div>
            <WelcomeBanner />
          </div>
        </div>

        {/* Screen-reader only title for SEO */}
        <h1 className="sr-only">من مكانك - المنصة الأولى للتجارة الذكية في مصر</h1>
      </section>

      {/* ===== تسوّق حسب القسم — كل قسم بلونه ===== */}
      <section aria-label="الأقسام" className="pt-6 md:pt-10 pb-2">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <SectionHeader
            kicker="الأقسام"
            title="تسوّق حسب القسم"
            subtitle="كل قسم ليه طريقته: سعر وسلة، منيو، حجز موعد، أو احجز واحنا نكلمك"
            icon={<LayoutGrid className="w-5 h-5" />}
            viewAllHref="/dalil"
            viewAllLabel="كل الأقسام والمتاجر"
            accent="#00B8D4"
          />
          {/* عمودين على الموبايل بدل تلاتة عشان الكروت تبقى مقروءة والأسماء ما تتكسرش */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 items-stretch">
            {VISIBLE_ACTIVITIES.slice(0, 8).map((a) => (
              <ActivityCard key={a.id} activity={a} shopCount={countShopsFor(a.query)} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== مختارات مميزة ===== */}
      <section className="py-8 md:py-14 bg-gradient-to-b from-white to-slate-50 dark:from-brand-black dark:to-slate-950/60">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <ProductRail
            title="مختارات مميزة"
            subtitle="منتجات مختارة بعناية من أفضل المتاجر"
            icon={<Sparkles className="w-5 h-5 text-brand-purple" />}
            products={featuredProducts}
            viewAllHref="/offers"
            viewAllLabel="تصفح المزيد"
            initialCount={6}
            step={6}
          />
        </div>
      </section>

      {/* ===== تسوّق على مزاجك — حسب طريقة الشراء ===== */}
      <section aria-label="تسوّق على مزاجك" className="py-8 md:py-14">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <SectionHeader
            kicker="اختار طريقتك"
            title="تسوّق على مزاجك"
            subtitle="سعر وسلة، منيو مطعم، حجز عيادة، أو احجز القطعة واحنا نكلمك"
            icon={<Store className="w-5 h-5" />}
            accent="#BD00FF"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {MODE_ORDER.map((mode) => {
              const meta = MODE_META[mode];
              const modeActivities = VISIBLE_ACTIVITIES.filter((a) => a.mode === mode).slice(0, 3);
              if (modeActivities.length === 0) return null;
              const theme = getActivityTheme(modeActivities[0].id);
              return (
                <Link
                  key={mode}
                  href={mode === 'products' ? '/offers' : `/activity/${modeActivities[0].id}`}
                  className="group relative overflow-hidden rounded-3xl p-4 md:p-6 min-h-[150px] md:min-h-[175px] flex flex-col justify-between border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-card-hover hover:-translate-y-1 transition-all"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ background: `linear-gradient(to left, ${theme.from}, ${theme.to})` }}
                  />
                  <span
                    className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: theme.accent }}
                  />
                  <div className="relative">
                    <span
                      className="inline-block px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-black mb-2"
                      style={{ backgroundColor: `${theme.accent}1A`, color: theme.accent }}
                    >
                      {meta.kicker}
                    </span>
                    <h3 className="font-black text-base md:text-xl text-slate-900 dark:text-white">
                      {meta.title}
                    </h3>
                    <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 font-bold mt-1.5 leading-relaxed">
                      {modeActivities.map((a) => a.label.ar).join(' • ')}
                    </p>
                  </div>
                  <span
                    className="relative inline-flex items-center gap-1.5 text-xs md:text-sm font-black mt-4 group-hover:gap-3 transition-all"
                    style={{ color: theme.accent }}
                  >
                    ابدأ من هنا
                    <ArrowLeft className="w-4 h-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== عروض موسمية ===== */}
      {activeSeasonal.length > 0 && (
        <section className="py-10 md:py-14 bg-slate-50 dark:bg-slate-950/50">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6">
            <SectionHeader
              kicker="لفترة محدودة"
              title="عروض خاصة لا تفوتها"
              subtitle="خليها فرصة تلقط أحلى الأسعار قبل ما تخلص"
              icon={<Tag className="w-5 h-5" />}
              viewAllHref="/offers"
              viewAllLabel="كل العروض"
              accent="#F59E0B"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {activeSeasonal.map((offer) => (
                <Link
                  key={offer.id}
                  href="/offers"
                  className="group relative overflow-hidden rounded-2xl p-6 md:p-8 min-h-[160px] flex flex-col justify-between hover:scale-[1.02] transition-transform"
                  style={{ backgroundColor: offer.bannerColor || '#1A1A1A' }}
                >
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10">
                    <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-xs font-bold mb-3">
                      {offer.occasion}
                    </span>
                    <h3 className="text-white font-black text-xl md:text-2xl mb-2">{offer.name}</h3>
                    {offer.description && (
                      <p className="text-white/70 text-sm font-semibold line-clamp-2">
                        {offer.description}
                      </p>
                    )}
                  </div>
                  <div className="relative z-10 flex items-center justify-between mt-4">
                    <span className="text-white font-black text-2xl">
                      {offer.discountType === 'percentage'
                        ? `${offer.discountValue}%`
                        : `${offer.discountValue} ج.م`}
                    </span>
                    <span className="text-white/60 text-xs font-semibold">
                      حتى {new Date(offer.endDate).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Offers Section */}
      {featuredOffers.length > 0 && (
        <section className="py-8 md:py-16 bg-slate-50 dark:bg-slate-950/50">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6">
            <ProductRail
              title="أحدث العروض والخصومات"
              subtitle="أفضل التخفيضات المتاحة الآن"
              icon={<Tag className="w-5 h-5 text-amber-500" />}
              products={featuredOffers}
              viewAllHref="/offers"
              viewAllLabel="عرض جميع العروض"
              initialCount={8}
              step={6}
            />
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-8 md:py-16 bg-white dark:bg-brand-black">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6">
            <ProductRail
              title="وصل حديثاً"
              subtitle="أجدد المنتجات المضافة للمنصة"
              icon={<TrendingUp className="w-5 h-5 text-brand-purple" />}
              products={newArrivals}
              viewAllHref="/offers"
              viewAllLabel="عرض الكل"
              initialCount={8}
              step={6}
            />
          </div>
        </section>
      )}

      {/* App Download Banner */}
      <AppDownloadBanner />
    </div>
  );
}
