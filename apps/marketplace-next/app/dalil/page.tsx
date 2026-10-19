import { Metadata } from 'next';
import { Store, LayoutGrid, Sparkles } from 'lucide-react';
import { getShops } from '@/lib/services';
import { DalilClient } from '@/components/DalilClient';
import { getActivityGroupSections, siteConfig } from '@/lib/config';
import { ACTIVITY_GROUP_LABELS, getActivityTheme } from '@/lib/activity-catalog';
import { SectionHeader, ActivityCard } from '@/components/SectionHeader';
import { serializeJsonLd } from '@/lib/jsonld';

export const metadata: Metadata = {
  title: 'دليل المتاجر',
  description: 'دليل المتاجر والأنشطة التجارية على منصة من مكانك',
  alternates: { canonical: '/dalil' },
  openGraph: {
    title: 'دليل المتاجر - من مكانك',
    description: 'دليل المتاجر والأنشطة التجارية على منصة من مكانك',
    url: '/dalil',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'دليل المتاجر - من مكانك',
    description: 'دليل المتاجر والأنشطة التجارية على منصة من مكانك',
  },
};

export const revalidate = 300;

export default async function DalilPage() {
  const shops = await getShops(100);

  // عدد المتاجر لكل قسم — بيظهر في كروت الأقسام.
  const shopCountByActivity = new Map<string, number>();
  for (const shop of shops) {
    if (!shop.activity) continue;
    shopCountByActivity.set(shop.activity, (shopCountByActivity.get(shop.activity) ?? 0) + 1);
  }
  const countShopsFor = (query: string) =>
    query.split(',').reduce((n, q) => n + (shopCountByActivity.get(q.trim()) ?? 0), 0) || undefined;

  const groupSections = getActivityGroupSections();

  const dalilLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'دليل المتاجر - من مكانك',
    url: `${siteConfig.url}/dalil`,
    description: 'دليل المتاجر والأنشطة التجارية على منصة من مكانك',
    isPartOf: { '@type': 'WebSite', name: siteConfig.name, url: siteConfig.url },
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(dalilLd) }}
      />

      {/* ===== هيرو الدليل ===== */}
      <div className="relative overflow-hidden rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 mb-8 md:mb-12 bg-gradient-to-br from-brand-black via-slate-900 to-slate-950">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-16 right-0 w-72 h-72 bg-brand-cyan rounded-full blur-3xl" />
          <div className="absolute -bottom-24 left-10 w-72 h-72 bg-brand-purple rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center gap-4 md:gap-6">
          <span className="w-14 h-14 md:w-20 md:h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
            <Store className="w-7 h-7 md:w-10 md:h-10 text-brand-cyan" />
          </span>
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-brand-cyan text-[11px] md:text-xs font-black mb-2">
              {shops.length} متجر • {groupSections.length} مجموعات
            </span>
            <h1 className="text-2xl md:text-5xl font-black tracking-tight text-white">
              دليل المتاجر
            </h1>
            <p className="text-white/70 font-bold text-xs md:text-base mt-1.5">
              كل الأقسام والمتاجر المسجلة في من مكانك — اختار قسمك وابدأ
            </p>
          </div>
        </div>
      </div>

      {/* ===== الأقسام مجمّعة بلون كل قسم ===== */}
      <section aria-label="الأقسام" className="mb-10 md:mb-14">
        <SectionHeader
          kicker="الأقسام"
          title="اختار القسم"
          subtitle="كل قسم بلونه وبطريقة الشراء الخاصة به"
          icon={<LayoutGrid className="w-5 h-5" />}
          accent="#00B8D4"
        />
        <div className="space-y-8 md:space-y-10">
          {groupSections.map((section) => {
            const groupTheme = getActivityTheme(section.activities[0]?.id ?? '');
            return (
              <div key={section.group}>
                <div className="flex items-center gap-2.5 mb-3.5">
                  <span
                    className="w-2.5 h-6 rounded-full shrink-0"
                    style={{
                      background: `linear-gradient(to bottom, ${groupTheme.from}, ${groupTheme.to})`,
                    }}
                  />
                  <h3 className="font-black text-base md:text-xl text-slate-900 dark:text-white">
                    {ACTIVITY_GROUP_LABELS[section.group].ar}
                  </h3>
                  <span className="text-[11px] md:text-xs font-bold text-slate-400">
                    {section.activities.length} قسم
                  </span>
                </div>
                {/* عمودين على الموبايل بدل تلاتة عشان الكروت تبقى مقروءة والأسماء ما تتكسرش */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 items-stretch">
                  {section.activities.map((a) => (
                    <ActivityCard key={a.id} activity={a} shopCount={countShopsFor(a.query)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== كل المتاجر ===== */}
      <SectionHeader
        kicker="المتاجر"
        title="كل المتاجر"
        subtitle="ابحث وفلتر ووصل لأي متجر في ثواني"
        icon={<Sparkles className="w-5 h-5" />}
        accent="#BD00FF"
      />

      <DalilClient shops={shops} />
    </div>
  );
}
