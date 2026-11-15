'use client';

import { Image as ImageIcon, Flame } from 'lucide-react';

interface LivePreviewPanelProps {
  imageUrl: string;
  name: string;
  price: string;
  discountPrice?: number | null;
  calories?: number | null;
  subtitle?: string;
  promoTitle?: string;
}

export default function LivePreviewPanel({
  imageUrl,
  name,
  price,
  discountPrice,
  calories,
  subtitle,
  promoTitle,
}: LivePreviewPanelProps) {
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

      {name.trim() ? <p className="text-sm font-black text-slate-900 mb-1">{name.trim()}</p> : null}

      {price ? (
        <p className="text-sm font-black text-teal-600 mb-2">
          ج.م {Number(price).toFixed(2)}
          {discountPrice ? (
            <span className="text-[11px] font-bold text-slate-400 line-through mr-2">
              ج.م {Number(discountPrice).toFixed(2)}
            </span>
          ) : null}
        </p>
      ) : null}

      {calories ? (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold mb-2">
          <Flame size={12} className="text-amber-500" />
          <span>{calories} سعرة حرارية</span>
        </div>
      ) : null}

      {subtitle || promoTitle ? (
        <p className="text-[11px] font-bold text-slate-400 leading-relaxed mb-2">
          {[promoTitle, subtitle].filter(Boolean).join(' — ')}
        </p>
      ) : null}

      {!name.trim() && !price && (
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
