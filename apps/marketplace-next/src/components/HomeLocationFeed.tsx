'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, Store } from 'lucide-react';
import type { Shop, Product } from '@/lib/services';
import { ShopCard } from '@/components/ShopCard';
import { ProductRail } from '@/components/ProductRail';
import { useUserLocation } from '@/lib/user-location';
import { haversineKm, formatDistance, matchGovernorateName } from '@/lib/eg-geo';
import { VISIBLE_ACTIVITIES } from '@/lib/config';

/**
 * قسم "الأقرب ليك" في الرئيسية — بيتفاعل مع موقع المستخدم (المحافظة من
 * شيب الهيدر أو تحديد دقيق من الخريطة):
 *
 * 1) متاجر حولك — تابات صغيرة حسب النشاط + كروت متاجر مرتبة بالمسافة.
 * 2) الأقرب ليك — ريل منتجات من المتاجر القريبة أولاً (بدل العشوائي).
 *
 * من غير موقع: نفس القسمين بيظهروا بترتيب افتراضي مع دعوة لطيفة لتحديد الموقع.
 */

interface HomeLocationFeedProps {
  shops: Shop[];
  products: Product[];
}

function shopCoords(shop: Shop): { lat: number; lng: number } | null {
  const s = shop as Shop & { latitude?: number; longitude?: number; lat?: number; lng?: number };
  const lat = Number(s.latitude ?? s.lat);
  const lng = Number(s.longitude ?? s.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return { lat, lng };
  }
  // بديل: مركز المحافظة المسجلة في بيانات المتجر
  const gov = matchGovernorateName(String(shop.governorate || shop.city || ''));
  if (gov) return { lat: gov.lat, lng: gov.lng };
  return null;
}

export function HomeLocationFeed({ shops, products }: HomeLocationFeedProps) {
  const loc = useUserLocation();
  const [activeTab, setActiveTab] = useState('all');

  // مسافة كل متجر من موقع المستخدم (إن وُجد)
  const distances = useMemo(() => {
    const map = new Map<string, number | null>();
    if (!loc) return map;
    for (const shop of shops) {
      const c = shopCoords(shop);
      map.set(shop.id, c ? haversineKm(loc, c) : null);
    }
    return map;
  }, [shops, loc]);

  /** المتاجر مرتبة بالمسافة عند توفر الموقع، وإلا الترتيب الافتراضي. */
  const sortedShops = useMemo(() => {
    if (!loc) return shops;
    return [...shops].sort((a, b) => {
      const da = distances.get(a.id);
      const db = distances.get(b.id);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
  }, [shops, distances, loc]);

  /** تابات النشاطات — بس النشاطات اللي عندها متاجر فعلًا، بالترتيب اللي الأقرب أولاً. */
  const tabs = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const shop of sortedShops) {
      const act = VISIBLE_ACTIVITIES.find((a) => {
        const keys = (a.query || a.id).split(',').map((q) => q.trim());
        return shop.activity && keys.includes(shop.activity);
      });
      if (!act) continue;
      const existing = counts.get(act.id);
      counts.set(act.id, { label: act.label.ar, count: (existing?.count ?? 0) + 1 });
    }
    return Array.from(counts.entries())
      .sort((x, y) => y[1].count - x[1].count)
      .slice(0, 7)
      .map(([id, v]) => ({ id, ...v }));
  }, [sortedShops]);

  const filteredShops = useMemo(() => {
    if (activeTab === 'all') return sortedShops;
    const act = VISIBLE_ACTIVITIES.find((a) => a.id === activeTab);
    if (!act) return sortedShops;
    const keys = (act.query || act.id).split(',').map((q) => q.trim());
    return sortedShops.filter((s) => s.activity && keys.includes(s.activity));
  }, [sortedShops, activeTab]);

  /** منتجات مرتبة بالمسافة — منتج المتجر الأقرب ييجي الأول. */
  const nearbyProducts = useMemo(() => {
    if (!loc) return [];
    const distOf = (p: Product): number => {
      const shop = shops.find((s) => s.id === (p as any).shopId);
      if (!shop) return Number.POSITIVE_INFINITY;
      return distances.get(shop.id) ?? Number.POSITIVE_INFINITY;
    };
    return [...products]
      .sort((a, b) => distOf(a) - distOf(b))
      .filter((p) => Number.isFinite(distOf(p)));
  }, [products, shops, distances, loc]);

  const visibleShops = filteredShops.slice(0, 14);
  const hasNearby = loc != null;

  // لما المستخدم يحدد نشاط مش موجود في المتاجر الافتراضية نرجّع "الكل" تلقائيًا
  useEffect(() => {
    if (activeTab !== 'all' && tabs.length > 0 && !tabs.some((t) => t.id === activeTab)) {
      setActiveTab('all');
    }
  }, [tabs, activeTab]);

  if (shops.length === 0) return null;

  return (
    <>
      {/* ===== متاجر حولك — تابات صغيرة حسب النشاط ===== */}
      <section aria-label="متاجر حولك" className="py-8 md:py-12">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow-orange-sm">
                  <Store className="w-4 h-4 text-white" />
                </span>
                {hasNearby ? 'متاجر قريبة منك' : 'متاجر مميزة'}
              </h2>
              <p className="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                {hasNearby
                  ? `مرتبة حسب أقرب مسافة من ${loc?.label}`
                  : 'فعّل موقعك من فوق عشان نشوفلك الأقرب ليك الأول'}
              </p>
            </div>
            {!hasNearby && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-orange-soft text-brand-orange-dark text-[11px] font-black shrink-0">
                <Navigation className="w-3.5 h-3.5" />
                اختار موقعك من الشيب فوق
              </span>
            )}
          </div>

          {/* التابات الصغيرة — نفس نمط منيو المطاعم */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 mt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-black transition-all border ${
                activeTab === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
              }`}
            >
              الكل
            </button>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-black transition-all border ${
                  activeTab === t.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                {t.label}
                <span className="opacity-50 mr-1">({t.count})</span>
              </button>
            ))}
          </div>

          {visibleShops.length === 0 ? (
            <div className="text-center py-10 text-sm font-bold text-slate-400">
              مفيش متاجر في النشاط ده حاليًا
            </div>
          ) : (
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-3 [scrollbar-width:thin] snap-x">
              {visibleShops.map((shop) => {
                const km = distances.get(shop.id);
                return (
                  <div
                    key={shop.id}
                    className="relative shrink-0 w-[240px] md:w-[280px] snap-start"
                  >
                    <ShopCard shop={shop} />
                    {km != null && (
                      <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 shadow text-[10px] font-black text-brand-orange-dark border border-slate-100 dark:border-slate-800">
                        <MapPin className="w-3 h-3" />
                        {formatDistance(km)}
                      </span>
                    )}
                  </div>
                );
              })}
              <Link
                href="/dalil"
                className="shrink-0 w-[140px] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-brand-cyan hover:border-brand-cyan/50 transition-colors"
              >
                <Store className="w-6 h-6" />
                <span className="text-xs font-black">كل المتاجر</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ===== الأقرب ليك — منتجات المتاجر القريبة ===== */}
      {hasNearby && nearbyProducts.length > 0 && (
        <section className="py-8 md:py-12 bg-gradient-to-b from-white to-slate-50 dark:from-brand-black dark:to-slate-950/60">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6">
            <ProductRail
              title="الأقرب ليك"
              subtitle={`منتجات من أقرب المتاجر لموقعك — ${loc?.label}`}
              icon={<MapPin className="w-5 h-5 text-brand-purple" />}
              products={nearbyProducts.slice(0, 24)}
              viewAllHref="/offers"
              viewAllLabel="تصفح الكل"
              initialCount={6}
              step={6}
            />
          </div>
        </section>
      )}
    </>
  );
}
