import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Package, ArrowLeft, Store } from 'lucide-react';
import { getProductsByActivity, getShops } from '@/lib/services';
import { ProductCard } from '@/components/ProductCard';
import { activities, getMarketActivity, VISIBLE_ACTIVITIES } from '@/lib/config';
import { getActivityTheme, ACTIVITY_GROUP_LABELS } from '@/lib/activity-catalog';
import { SectionHeader } from '@/components/SectionHeader';
import { indexShopsById } from '@/lib/commerce';

export const revalidate = 300;

interface Props {
  params: Promise<{ activity: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { activity } = await params;
  const config = activities.find((a) => a.id === activity);
  const title = config ? `${config.label.ar} - الأقسام` : 'قسم غير موجود';
  const description = `استكشف منتجات ${config?.label.ar || ''} على منصة من مكانك`;
  return {
    title,
    description,
    alternates: { canonical: `/activity/${activity}` },
    openGraph: { title, description, url: `/activity/${activity}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export async function generateStaticParams() {
  return activities.map((a) => ({ activity: a.id }));
}

export default async function ActivityPage({ params }: Props) {
  const { activity } = await params;
  const config = getMarketActivity(activity);
  // الأقسام عناصر بتاعة متاجر، وطريقة العرض (سعر/سلة/حجز) بتتقرر من كل متجر على حدة.
  const [products, shops] = await Promise.all([
    getProductsByActivity(config?.query ?? activity, 24),
    getShops(300),
  ]);
  const shopsById = indexShopsById(shops);

  // هوية القسم — نفس اللون المستخدم في كروت وعناوين الرئيسية.
  const theme = getActivityTheme(config?.id ?? activity);
  const label = config?.label.ar || 'قسم';
  const groupLabel = config ? ACTIVITY_GROUP_LABELS[config.group]?.ar : undefined;

  // عدد المتاجر الفعلي في القسم (الـ query ممكن يكون فيه أكثر من نشاط).
  const activityKeys = (config?.query ?? activity).split(',').map((q) => q.trim());
  const shopCount = shops.filter((s) => s.activity && activityKeys.includes(s.activity)).length;

  // أقسام نفس المجموعة — سهولة التنقل مع الحفاظ على هوية كل قسم.
  const siblingActivities = config
    ? VISIBLE_ACTIVITIES.filter((a) => a.group === config.group && a.id !== config.id)
    : [];

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12">
      <Link
        href="/dalil"
        className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs md:text-sm mb-4 hover:gap-3 transition-all"
        style={{ color: theme.accent }}
      >
        <ArrowLeft className="w-4 h-4" />
        كل الأقسام
      </Link>

      {/* ===== هيرو القسم بهوية لونية خاصة ===== */}
      <div
        className="relative overflow-hidden rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 mb-8 md:mb-10"
        style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
      >
        <div className="absolute inset-0 opacity-25">
          <div className="absolute -top-16 -left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-20 right-0 w-72 h-72 bg-black/40 rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center gap-4 md:gap-6">
          <span className="w-16 h-16 md:w-24 md:h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
            <Image
              src={config?.image || '/images/activities/cars.svg'}
              alt={label}
              width={80}
              height={80}
              className="w-10 h-10 md:w-16 md:h-16 object-contain drop-shadow-lg"
            />
          </span>
          <div className="min-w-0">
            {groupLabel && (
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-[11px] md:text-xs font-black mb-2">
                {groupLabel}
              </span>
            )}
            <h1 className="text-2xl md:text-5xl font-black tracking-tight text-white drop-shadow-sm">
              {label}
            </h1>
            <p className="text-white/85 font-bold text-xs md:text-base mt-1.5">
              {products.length > 0 ? `${products.length} منتج` : 'منتجات هذا القسم'}
              {shopCount > 0 && (
                <>
                  {' • '}
                  <span className="inline-flex items-center gap-1 align-middle">
                    <Store className="w-3.5 h-3.5" />
                    {shopCount} متجر
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ===== أقسام نفس المجموعة ===== */}
      {siblingActivities.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 md:mb-10">
          {siblingActivities.map((a) => {
            const t = getActivityTheme(a.id);
            return (
              <Link
                key={a.id}
                href={`/activity/${a.id}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 font-black text-xs md:text-sm text-slate-700 dark:text-slate-200 hover:-translate-y-0.5 hover:shadow-card transition-all"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
                />
                {a.label.ar}
              </Link>
            );
          })}
        </div>
      )}

      {products.length > 0 && (
        <SectionHeader
          kicker={groupLabel}
          title={`منتجات ${label}`}
          subtitle="اختر من المتاجر المتاحة في القسم"
          icon={<Package className="w-5 h-5" />}
          accent={theme.accent}
        />
      )}

      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              shop={shopsById.get(product.shopId)}
              activity={config}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <span
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: theme.soft, color: theme.accent }}
          >
            <Package className="w-8 h-8" />
          </span>
          <p className="text-slate-500 dark:text-slate-400 font-black text-lg">
            لا توجد منتجات في {label} حالياً
          </p>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-1.5">
            القسم لسه بيستقبل متاجر — ارجع لنا قريب
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <Link
              href="/dalil"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white font-black text-sm hover:opacity-90 transition"
              style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
            >
              تصفح كل المتاجر
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 font-black text-sm text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition"
            >
              الرئيسية
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
