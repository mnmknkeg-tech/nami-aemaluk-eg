'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeImageUrl } from '@ray-eg/shared/utils/image-url';
import type { ShopImageMapData, ShopImageMapHotspot } from '@/lib/services';

// عند فشل رابط التخزين المباشر (نطاق R2/S3 العام معطل أو محجوب)، تُحمَّل
// الصورة عبر بروكسي البث العام في الباكند بنفس مفتاح الكائن.
const API_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://nami-aemaluk-eg-production.up.railway.app';

function mediaProxyUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${API_ORIGIN}/api/v1/media/serve${parsed.pathname}`;
  } catch {
    return null;
  }
}

const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;

/**
 * خريطة المتجر التفاعلية — صورة فضاء المتجر رفعها التاجر من محرر الخريطة،
 * وفوقها نقاط ضغط بنِسب مئوية تفتح صفحة المنتج المرتبطة عند الضغط.
 */
export function ShopImageMap({ map }: { map: ShopImageMapData }) {
  const router = useRouter();
  const [src, setSrc] = useState(() => normalizeImageUrl(map.imageUrl));
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  const onImgError = () => {
    const proxied = mediaProxyUrl(src);
    if (proxied && proxied !== src) setSrc(proxied);
    else setFailed(true);
  };

  const openHotspot = (h: ShopImageMapHotspot) => {
    if (h.productId) router.push(`/product/${h.productId}`);
  };

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 pt-12 md:pt-16" dir="rtl">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            خريطة المتجر التفاعلية
          </h2>
          {map.hotspots.length > 0 && (
            <span className="text-xs md:text-sm text-slate-500 font-semibold">
              اضغط على النقاط لاستعراض المنتجات
            </span>
          )}
        </div>

        <div className="flex justify-center">
          <div className="relative inline-block max-w-full">
            <img
              src={src}
              onError={onImgError}
              alt={map.name || 'خريطة المتجر'}
              className="block max-w-full max-h-[560px] w-auto rounded-2xl select-none"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            {map.hotspots.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => openHotspot(h)}
                title={h.label || 'منتج'}
                className={`absolute flex items-end justify-center border-2 border-white/90 shadow-lg bg-[#00E5FF]/25 hover:bg-[#00E5FF]/45 transition-colors ${
                  h.shape === 'circle' ? 'rounded-full' : 'rounded-lg'
                } ${h.productId ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  left: pct(h.x),
                  top: pct(h.y),
                  width: pct(h.width),
                  height: pct(h.height),
                }}
              >
                {(h.label || h.productId) && (
                  <span className="max-w-full truncate m-1 px-2 py-0.5 rounded-full bg-black/70 text-white text-[11px] font-bold">
                    {h.label || 'منتج'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
