'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Check,
  Minus,
  Plus,
  ShoppingCart,
  Flame,
  Clock,
  Scale,
  FileDown,
  Calendar,
  CalendarCheck,
  Sparkles,
  Layers,
  Utensils,
  StickyNote,
} from 'lucide-react';
import { useSiteCart } from '@/lib/site-cart';
import { productStockState } from '@/lib/stock';
import { formatPrice } from '@/lib/utils';

interface VariantOption {
  id: string;
  name?: string;
  label?: string;
  price?: number;
}

interface MenuVariantGroup {
  id: string;
  name: string;
  sizes?: VariantOption[];
}

interface AddonOption {
  id: string;
  name: string;
  price?: number;
  imageUrl?: string;
  variants?: Array<{ id: string; label: string; price: number }>;
}

export function SiteProductActions({ product, shop }: { product: any; shop: any }) {
  const { addItem } = useSiteCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [customerNote, setCustomerNote] = useState('');

  const unavailable =
    product.isAvailable === false || product.isActive === false || product.is_active === false;
  // أصناف التجزئة بتتبع المخزون → نفاد يمنع الطلب والعدّاد بسقف المتبقي.
  // أصناف المنيو/الخدمات (trackStock=false) مفتوحة بلا سقف.
  const stockState = productStockState(product);
  const soldOut = !unavailable && stockState.soldOut;
  const maxQuantity = stockState.maxQuantity;

  // 1. استخراج مجموعات الأحجام/الأنواع (menuVariants / sizes / colors)
  const menuVariants: MenuVariantGroup[] = useMemo(() => {
    const raw = product?.menuVariants || product?.menu_variants;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return [];
  }, [product]);

  const simpleSizes: string[] = useMemo(() => {
    const raw = product?.sizes;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((s) => (typeof s === 'string' ? s : s?.name || s?.label || String(s)));
    }
    return [];
  }, [product]);

  const colors: string[] = useMemo(() => {
    const raw = product?.colors;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((c) => (typeof c === 'string' ? c : c?.name || c?.label || String(c)));
    }
    return [];
  }, [product]);

  // 2. استخراج الإضافات (addons)
  const normalizedAddons: AddonOption[] = useMemo(() => {
    const raw = product?.addons || product?.extras;
    if (!Array.isArray(raw) || raw.length === 0) return [];

    const list: AddonOption[] = [];
    raw.forEach((item: any) => {
      // إذا كانت مجموعة إضافات تحتوي على options
      if (item?.options && Array.isArray(item.options)) {
        item.options.forEach((opt: any) => {
          if (opt && (opt.name || opt.title)) {
            list.push({
              id: String(opt.id || opt.name),
              name: String(opt.name || opt.title),
              price: Number(opt.price || 0),
              imageUrl: opt.imageUrl,
              variants: Array.isArray(opt.variants) ? opt.variants : undefined,
            });
          }
        });
      } else if (item && (item.name || item.title)) {
        // إذا كانت إضافة مباشرة
        list.push({
          id: String(item.id || item.name),
          name: String(item.name || item.title),
          price: Number(item.price || 0),
          imageUrl: item.imageUrl,
          variants: Array.isArray(item.variants) ? item.variants : undefined,
        });
      }
    });
    return list;
  }, [product]);

  // 3. الحالة المحددة (Selected state)
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);
  const currentGroup = menuVariants[selectedGroupIdx] || menuVariants[0];

  const defaultSize = useMemo(() => {
    if (currentGroup?.sizes && currentGroup.sizes.length > 0) {
      return currentGroup.sizes[0];
    }
    return null;
  }, [currentGroup]);

  const [selectedSizeId, setSelectedSizeId] = useState<string>(() => defaultSize?.id || '');
  const [selectedSimpleSize, setSelectedSimpleSize] = useState<string>(() => simpleSizes[0] || '');
  const [selectedColor, setSelectedColor] = useState<string>(() => colors[0] || '');

  // الإضافات المختارة: خريطة addonId -> { name, price, variantLabel? }
  const [selectedAddons, setSelectedAddons] = useState<
    Record<string, { name: string; price: number; variantLabel?: string }>
  >({});

  // 4. حساب السعر الفعلي
  const basePrice = Number(product.price || 0);

  const activeSizePrice = useMemo(() => {
    if (currentGroup?.sizes && currentGroup.sizes.length > 0) {
      const found =
        currentGroup.sizes.find((s) => s.id === selectedSizeId) || currentGroup.sizes[0];
      if (found && typeof found.price === 'number' && found.price > 0) {
        return found.price;
      }
    }
    return basePrice;
  }, [currentGroup, selectedSizeId, basePrice]);

  const addonsTotal = useMemo(() => {
    return Object.values(selectedAddons).reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  }, [selectedAddons]);

  const unitTotal = activeSizePrice + addonsTotal;
  const grandTotal = unitTotal * quantity;

  // 5. تبديل اختيار الإضافة
  const toggleAddon = (
    addon: AddonOption,
    variant?: { id: string; label: string; price: number }
  ) => {
    setSelectedAddons((prev) => {
      const next = { ...prev };
      const key = addon.id;
      if (next[key] && (!variant || next[key].variantLabel === variant.label)) {
        delete next[key];
      } else {
        const finalPrice = variant?.price ?? addon.price ?? 0;
        next[key] = {
          name: addon.name,
          price: finalPrice,
          variantLabel: variant?.label,
        };
      }
      return next;
    });
  };

  // 6. إضافة للسلة
  const addToCart = () => {
    if (unavailable) return;

    // تجهيز كائن variantSelection
    let variantSelection: any = null;
    if (currentGroup?.sizes && currentGroup.sizes.length > 0) {
      const curSize =
        currentGroup.sizes.find((s) => s.id === selectedSizeId) || currentGroup.sizes[0];
      const typeLabel = currentGroup.id !== 'base' ? currentGroup.name : '';
      const sizeLabel = curSize?.label || curSize?.name || '';
      variantSelection = {
        type: typeLabel,
        size: sizeLabel,
        typeLabel,
        sizeLabel,
        label: [typeLabel, sizeLabel].filter(Boolean).join(' - '),
        price: curSize?.price,
      };
    } else if (selectedSimpleSize || selectedColor) {
      variantSelection = {
        size: selectedSimpleSize || undefined,
        color: selectedColor || undefined,
        label: [selectedSimpleSize, selectedColor].filter(Boolean).join(' / '),
      };
    }

    // تجهيز قائمة الإضافات
    const addonsPayload = Object.values(selectedAddons).map((a) => ({
      name: a.name,
      price: a.price,
      variant: a.variantLabel || undefined,
    }));

    if (customerNote.trim()) {
      addonsPayload.push({
        name: `ملاحظة: ${customerNote.trim()}`,
        price: 0,
        variant: undefined,
      });
    }

    addItem(product, shop, {
      variantSelection,
      addons: addonsPayload.length > 0 ? addonsPayload : undefined,
      quantity,
      calculatedPrice: unitTotal,
    });

    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  // بيانات extraData الإضافية
  const extra = product?.extraData || {};
  const isDigital = product.unit === 'digital' || extra.digital || extra.digitalProduct;
  const isBooking = product.unit === 'booking' || extra.booking || extra.bookingDetails;
  const calories = extra.calories;
  const prepTime = extra.preparationTime || extra.prepTime;
  const weight = extra.weight;
  const brand = product.brand || extra.brand;

  return (
    <div className="w-full space-y-6">
      {/* ── شارات المواصفات السريعة (سعرات، تحضير، وزن، ماركة) ── */}
      {(calories || prepTime || weight || brand) && (
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {brand && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              الماركة: {brand}
            </span>
          )}
          {calories && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-orange-50 text-orange-700 text-xs font-bold border border-orange-100">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              {calories} سعرة حرارية
            </span>
          )}
          {prepTime && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              تجهيز: {prepTime} دقيقة
            </span>
          )}
          {weight && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              <Scale className="w-3.5 h-3.5 text-slate-500" />
              الوزن: {weight} كجم
            </span>
          )}
        </div>
      )}

      {/* ── بطاقة المنتج الرقمي إن وجد ── */}
      {isDigital && (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
            <FileDown className="w-4 h-4 text-emerald-600" />
            <span>منتج رقمي (تحميل وتفعيل فوري)</span>
          </div>
          <p className="text-xs font-semibold text-emerald-700 leading-relaxed">
            {extra.digital?.instructions ||
              extra.instructions ||
              'يتم تسليم وتوفير رابط تحميل الملف أو كود الترخيص مباشرة بعد إتمام عملية الطلب.'}
          </p>
          {extra.digital?.fileType && (
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              صيغة الملف: {String(extra.digital.fileType).toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* ── بطاقة الحجوزات والخدمات إن وجد ── */}
      {isBooking && (
        <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-200 space-y-2">
          <div className="flex items-center gap-2 text-violet-800 font-extrabold text-sm">
            <Calendar className="w-4 h-4 text-violet-600" />
            <span>تفاصيل الحجز والخدمة</span>
          </div>
          <p className="text-xs font-semibold text-violet-700 leading-relaxed">
            {extra.booking?.duration
              ? `مدة الجلسة / الحجز: ${extra.booking.duration}`
              : 'خدمة حجز مسبق — يتم تنسيق وتأكيد الموعد المناسب بعد الطلب مباشرة.'}
          </p>
          {extra.booking?.capacity && (
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[11px] font-bold">
              السعة: {extra.booking.capacity} أفراد
            </span>
          )}
        </div>
      )}

      {/* ── اختيار النوع (إذا كان هناك أكثر من مجموعة/نوع menuVariant) ── */}
      {menuVariants.length > 1 && (
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
            <Layers className="w-3.5 h-3.5 text-brand-purple" />
            اختر الصنف / النوع:
          </label>
          <div className="flex flex-wrap gap-2">
            {menuVariants.map((grp, idx) => {
              const active = idx === selectedGroupIdx;
              return (
                <button
                  key={grp.id || idx}
                  type="button"
                  onClick={() => {
                    setSelectedGroupIdx(idx);
                    if (grp.sizes && grp.sizes[0]) {
                      setSelectedSizeId(grp.sizes[0].id);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {grp.name || `نوع ${idx + 1}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── اختيار المقاس / الحجم (Restaurant Sizes) ── */}
      {currentGroup?.sizes && currentGroup.sizes.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
              <Utensils className="w-3.5 h-3.5 text-amber-600" />
              اختر الحجم:
            </label>
            <span className="text-[11px] font-bold text-slate-400">مطلوب تحديد الحجم</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {currentGroup.sizes.map((s) => {
              const active = s.id === (selectedSizeId || currentGroup.sizes?.[0]?.id);
              const sizePrice = typeof s.price === 'number' && s.price > 0 ? s.price : basePrice;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSizeId(s.id)}
                  className={`p-3 rounded-2xl text-right transition-all border flex flex-col justify-between ${
                    active
                      ? 'border-brand-cyan bg-brand-cyan/5 ring-2 ring-brand-cyan/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="font-extrabold text-xs text-slate-900">
                    {s.label || s.name || s.id}
                  </span>
                  <span className="text-xs font-black text-brand-cyan mt-1">
                    {formatPrice(sizePrice)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── المقاسات البسيطة (الملابس والأزياء) إن لم توجد menuVariants ── */}
      {menuVariants.length === 0 && simpleSizes.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-700 block">اختر المقاس:</label>
          <div className="flex flex-wrap gap-2">
            {simpleSizes.map((sz) => {
              const active = sz === selectedSimpleSize;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSimpleSize(sz)}
                  className={`min-w-11 h-10 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── الألوان إن وجدت ── */}
      {colors.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-700 block">اختر اللون:</label>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const active = c === selectedColor;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── قسم الإضافات (Addons & Extras) ── */}
      {normalizedAddons.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              إضافات على الطلب (اختياري):
            </label>
            <span className="text-[11px] font-bold text-slate-400">يمكنك اختيار أكثر من إضافة</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {normalizedAddons.map((addon) => {
              const isSelected = Boolean(selectedAddons[addon.id]);
              const hasSubVariants = Array.isArray(addon.variants) && addon.variants.length > 0;

              return (
                <div
                  key={addon.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (hasSubVariants && addon.variants?.[0]) {
                            toggleAddon(addon, addon.variants[0]);
                          } else {
                            toggleAddon(addon);
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-900">{addon.name}</span>
                    </label>

                    {!hasSubVariants && (
                      <span className="text-xs font-extrabold text-emerald-700">
                        {addon.price && addon.price > 0
                          ? `+ ${formatPrice(addon.price)}`
                          : 'مجاناً'}
                      </span>
                    )}
                  </div>

                  {/* إذا كان للإضافة أحجام/خيارات فرعية (مثل بطاطس: صغير / كبير) */}
                  {hasSubVariants && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-2 mr-7">
                      {addon.variants?.map((v) => {
                        const isSubActive =
                          isSelected && selectedAddons[addon.id]?.variantLabel === v.label;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => toggleAddon(addon, v)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                              isSubActive
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            {v.label} (+ {formatPrice(v.price)})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── خانة الملاحظات الخاصة بالطلب (كاتشب زيادة، بدون بصل، إلخ) ── */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5 text-slate-400" />
          ملاحظة على هذا الصنف (اختياري):
        </label>
        <input
          type="text"
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          placeholder="مثال: كاتشب زيادة، بدون بصل، خفيف شطة..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold placeholder:text-slate-400 outline-none focus:border-brand-cyan transition-colors"
        />
      </div>

      {/* ── شريط الإضافة والكمية والسعر الإجمالي ── */}
      <div className="pt-2">
        {unavailable ? (
          <p
            role="status"
            className="rounded-xl bg-slate-100 p-4 font-bold text-slate-500 text-center"
          >
            المنتج غير متوفر حالياً
          </p>
        ) : soldOut ? (
          <p
            role="status"
            className="rounded-xl bg-amber-50 border border-amber-200 p-4 font-bold text-amber-600 text-center"
          >
            نفدت الكمية — متاح تاني لما التاجر يحدّث المخزون
          </p>
        ) : isBooking && shop?.slug ? (
          /* المنتج القابل للحجز بيمشي في تدفق الحجز الحقيقي (المواعيد المتاحة
             بتوقيت القاهرة) بدل السلة — نفس مسار صفحة /site/[slug]/book */
          <Link
            href={`/site/${shop.slug}/book?service=${encodeURIComponent(String(product.id ?? ''))}`}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-6 font-black text-white shadow-lg transition hover:-translate-y-0.5 active:translate-y-0"
            style={{ backgroundColor: 'var(--site-primary, #7c3aed)' }}
          >
            <CalendarCheck className="h-5 w-5" />
            احجز موعدك الآن
          </Link>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {/* عداد الكمية */}
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                aria-label="تقليل الكمية"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-7 text-center text-base font-black text-slate-900">
                {quantity}
                {maxQuantity ? (
                  <span className="block text-[10px] font-bold text-slate-400">
                    متاح {maxQuantity}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((value) =>
                    maxQuantity ? Math.min(value + 1, maxQuantity) : value + 1
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                aria-label="زيادة الكمية"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* زر الإضافة للسلة مع الإجمالي */}
            <button
              type="button"
              onClick={addToCart}
              className="flex-1 inline-flex min-h-14 items-center justify-between gap-3 rounded-2xl px-6 font-black text-white shadow-lg transition hover:-translate-y-0.5 active:translate-y-0"
              style={{ backgroundColor: 'var(--site-primary, #ea580c)' }}
            >
              <span className="flex items-center gap-2 text-sm">
                {added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                {added ? 'تمت الإضافة للسلة' : 'إضافة إلى السلة'}
              </span>
              <span className="text-base font-black tabular-nums">{formatPrice(grandTotal)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
