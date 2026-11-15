'use client';

import { Image as ImageIcon } from 'lucide-react';
import type { ProductExtraData } from '@/components/products/ExtendedProductSections';
import type { FashionSizeItem } from './types';

type Props = {
  imageUrl: string;
  extraImagePreviews: string[];
  name: string;
  basePrice: string;
  extraData: ProductExtraData;
  selectedColors: Array<{ name: string; value: string }>;
  fashionSizeItems: FashionSizeItem[];
};

export default function ClothingLivePreview({
  imageUrl,
  extraImagePreviews,
  name,
  basePrice,
  extraData,
  selectedColors,
  fashionSizeItems,
}: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 lg:sticky lg:top-4 text-center border border-slate-200/80 shadow-xs order-2 lg:order-1">
      <div className="w-full aspect-square rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center mb-4">
        {imageUrl ? (
          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
            <ImageIcon size={44} />
          </div>
        )}
      </div>

      {/* Extra thumbnails preview */}
      {extraImagePreviews.length > 0 && (
        <div className="flex gap-1.5 justify-center mb-3 overflow-x-auto py-1">
          {extraImagePreviews.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          ))}
        </div>
      )}

      {name.trim() ? <p className="text-sm font-black text-slate-900 mb-1">{name.trim()}</p> : null}
      {basePrice ? (
        <p className="text-sm font-black text-teal-600 mb-2">
          ج.م {Number(basePrice).toFixed(2)}
          {extraData.discountPrice ? (
            <span className="text-[11px] font-bold text-slate-400 line-through mr-2">
              ج.م {Number(extraData.discountPrice).toFixed(2)}
            </span>
          ) : null}
        </p>
      ) : null}
      {extraData.subtitle || extraData.promoTitle ? (
        <p className="text-[11px] font-bold text-slate-400 leading-relaxed mb-2">
          {[extraData.promoTitle, extraData.subtitle].filter(Boolean).join(' — ')}
        </p>
      ) : null}

      {/* Colors preview */}
      {selectedColors.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center my-2">
          {selectedColors.map((c) => (
            <span
              key={c.value}
              className="w-4 h-4 rounded-full border border-slate-200 inline-block"
              style={{ background: c.value }}
              title={c.name}
            />
          ))}
        </div>
      )}

      {/* Sizes preview */}
      {fashionSizeItems.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center my-1">
          {fashionSizeItems.map((s, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600"
            >
              {s.label}
            </span>
          ))}
        </div>
      )}

      {!name.trim() && !basePrice && (
        <div className="text-center py-2">
          <p className="text-xs font-black text-slate-700 mb-1.5">أضف المعلومات الأساسية</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            تُظهر المعاينة الصورة، الاسم، السعر، السعر المخفض, العنوان الفرعي والترويجي. ستتمكن من
            معاينة صفحة المنتج الكاملة على ثيم متجرك بعد الحفظ.
          </p>
        </div>
      )}
    </div>
  );
}
