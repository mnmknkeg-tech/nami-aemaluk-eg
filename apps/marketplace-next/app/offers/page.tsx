import { Metadata } from 'next';
import Link from 'next/link';
import { Tag, Sparkles, Shirt, Utensils, ShoppingCart } from 'lucide-react';
import { getOffers, getSeasonalOffers } from '@/lib/services';
import { ProductGrid } from '@/components/ProductGrid';
import { ProductGridSkeleton } from '@/components/Skeleton';

export const metadata: Metadata = {
  title: 'العروض',
  description: 'اكتشف أحدث العروض والخصومات من المتاجر على منصة من مكانك',
  alternates: { canonical: '/offers' },
  openGraph: {
    title: 'العروض - من مكانك',
    description: 'اكتشف أحدث العروض والخصومات من المتاجر على منصة من مكانك',
    url: '/offers',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'العروض - من مكانك',
    description: 'اكتشف أحدث العروض والخصومات من المتاجر على منصة من مكانك',
  },
};

export const revalidate = 300;

const CATEGORY_TABS = [
  { label: 'الكل', href: '/offers', icon: Tag, color: 'text-brand-cyan' },
  { label: 'أزياء', href: '/offers/fashion', icon: Shirt, color: 'text-pink-500' },
  { label: 'مطاعم', href: '/offers/restaurants', icon: Utensils, color: 'text-amber-500' },
  { label: 'سوبر ماركت', href: '/offers/supermarket', icon: ShoppingCart, color: 'text-green-500' },
];

export default async function OffersPage() {
  const [offers, seasonalOffers] = await Promise.all([getOffers(), getSeasonalOffers()]);

  const activeSeasonal = seasonalOffers.filter(
    (s) => s.status === 'active' || new Date(s.endDate) >= new Date()
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12 md:py-16">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-brand-cyan/10 rounded-xl flex items-center justify-center">
          <Tag className="w-7 h-7 text-brand-cyan" />
        </div>
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">العروض</h1>
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm md:text-base mt-1">
            أحدث الخصومات والعروض من المتاجر
          </p>
        </div>
      </div>

      {/* Seasonal Offers Banners */}
      {activeSeasonal.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-lg">عروض موسمية</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSeasonal.map((offer) => (
              <div
                key={offer.id}
                className="group relative overflow-hidden rounded-2xl p-6 min-h-[140px] flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer"
                style={{ backgroundColor: offer.bannerColor || '#1A1A1A' }}
              >
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl" />
                </div>
                <div className="relative z-10">
                  <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-xs font-bold mb-2">
                    {offer.occasion}
                  </span>
                  <h3 className="text-white font-black text-lg md:text-xl mb-1">{offer.name}</h3>
                  {offer.description && (
                    <p className="text-white/70 text-xs font-semibold line-clamp-2">
                      {offer.description}
                    </p>
                  )}
                </div>
                <div className="relative z-10 flex items-center justify-between mt-3">
                  <span className="text-white font-black text-xl">
                    {offer.discountType === 'percentage'
                      ? `${offer.discountValue}%`
                      : `${offer.discountValue} ج.م`}
                  </span>
                  <span className="text-white/60 text-[10px] font-semibold">
                    حتى {new Date(offer.endDate).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {CATEGORY_TABS.map((tab) => {
          const isActive = tab.href === '/offers';
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-cyan text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Products Grid with Progressive "عرض المزيد" */}
      {offers.length > 0 ? (
        <ProductGrid products={offers} initialCount={12} step={8} />
      ) : (
        <ProductGridSkeleton count={8} />
      )}
    </div>
  );
}
