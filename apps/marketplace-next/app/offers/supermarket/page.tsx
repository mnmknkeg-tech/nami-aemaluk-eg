import { Metadata } from 'next';
import { ShoppingCart } from 'lucide-react';
import { getOffers } from '@/lib/services';
import { ProductCard } from '@/components/ProductCard';

export const metadata: Metadata = { title: 'عروض السوبر ماركت' };
export const revalidate = 300;

export default async function SupermarketOffersPage() {
  const offers = await getOffers('supermarket');
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12 md:py-16">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-green-500/10 rounded-3xl flex items-center justify-center">
          <ShoppingCart className="w-7 h-7 text-green-500" />
        </div>
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">عروض السوبر ماركت</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm md:text-base mt-1">أحدث عروض السوبر ماركت</p>
        </div>
      </div>
      {offers.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {offers.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="text-center py-20">
          <ShoppingCart className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-black text-lg">لا توجد عروض سوبر ماركت حالياً</p>
          <p className="text-slate-400 font-bold text-sm mt-2">تابعنا للحصول على أحدث العروض</p>
        </div>
      )}
    </div>
  );
}
