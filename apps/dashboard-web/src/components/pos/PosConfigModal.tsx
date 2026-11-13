'use client';

import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

type Props = Record<string, any>;

export default function PosConfigModal({
  cart,
  configProduct,
  getProductEffectivePrice,
  isArabic,
  isConfigOpen,
  isFashion,
  isRestaurant,
  selectedAddons,
  selectedFashionColorValue,
  selectedFashionSize,
  selectedMenuSizeId,
  selectedMenuTypeId,
  setCart,
  setIsConfigOpen,
  setSelectedAddons,
  setSelectedFashionColorValue,
  setSelectedFashionSize,
  setSelectedMenuSizeId,
  setSelectedMenuTypeId,
  shopAddonsDef,
}: Props) {
  return (
    <>
      <AnimatePresence>
        {isConfigOpen && configProduct && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black/40 flex items-center justify-center p-4"
          >
            <MotionDiv
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-6 max-h-[85vh] overflow-y-auto"
            >
              <h3 className="text-xl font-black mb-4">{configProduct.name}</h3>

              {/* Menu variants */}
              {(() => {
                const mv = (configProduct?.menuVariants ?? configProduct?.menu_variants) as any[];
                if (!Array.isArray(mv) || mv.length === 0) return null;
                const typeOptions = mv
                  .map((t: any) => ({
                    id: String(t?.id || '').trim(),
                    label:
                      String(t?.name || t?.label || '').trim() || (isArabic ? 'النوع' : 'Type'),
                    sizes: Array.isArray(t?.sizes) ? t.sizes : [],
                  }))
                  .filter((t: any) => t.id);
                const selectedType =
                  typeOptions.find((t: any) => t.id === String(selectedMenuTypeId || '').trim()) ||
                  typeOptions[0];
                const sizeOptions = Array.isArray(selectedType?.sizes)
                  ? selectedType.sizes
                      .map((s: any) => ({
                        id: String(s?.id || '').trim(),
                        label:
                          String(s?.label || s?.name || '').trim() || (isArabic ? 'الحجم' : 'Size'),
                        price: Number(s?.price),
                      }))
                      .filter((s: any) => s.id)
                  : [];
                const effectiveSizeId =
                  String(selectedMenuSizeId || '').trim() ||
                  String(sizeOptions[0]?.id || '').trim();

                return (
                  <div className="space-y-3 mb-5">
                    <div className="font-black text-sm text-slate-900">
                      {isArabic ? 'اختر الحجم' : 'Choose Size'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {typeOptions.map((t: any) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedMenuTypeId(t.id);
                            const first = Array.isArray(t?.sizes) ? t.sizes[0] : undefined;
                            setSelectedMenuSizeId(String(first?.id || '').trim());
                          }}
                          className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${String(selectedType?.id) === String(t.id) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {sizeOptions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((s: any) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedMenuSizeId(s.id)}
                            className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${String(effectiveSizeId) === String(s.id) ? 'bg-[#00E5FF] text-slate-900 border-[#00E5FF]' : 'bg-white text-slate-700 border-slate-200'}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Fashion colors/sizes */}
              {isFashion && (
                <div className="space-y-3 mb-5">
                  {Array.isArray(configProduct?.colors) && configProduct.colors.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-black text-sm text-slate-900">
                        {isArabic ? 'اللون' : 'Color'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {configProduct.colors.map((c: any) => (
                          <button
                            key={String(c?.value || c?.id)}
                            type="button"
                            onClick={() => setSelectedFashionColorValue(String(c?.value || ''))}
                            className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${String(selectedFashionColorValue) === String(c?.value) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                          >
                            {String(
                              c?.name || c?.label || c?.value || (isArabic ? 'لون' : 'Color')
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(configProduct?.sizes) && configProduct.sizes.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-black text-sm text-slate-900">
                        {isArabic ? 'المقاس' : 'Size'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {configProduct.sizes.map((s: any) => (
                          <button
                            key={String(s?.label || s?.id)}
                            type="button"
                            onClick={() =>
                              setSelectedFashionSize(String(s?.label || s?.name || ''))
                            }
                            className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${String(selectedFashionSize) === String(s?.label || s?.name) ? 'bg-[#00E5FF] text-slate-900 border-[#00E5FF]' : 'bg-white text-slate-700 border-slate-200'}`}
                          >
                            {String(s?.label || s?.name || (isArabic ? 'مقاس' : 'Size'))}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Addons */}
              {isRestaurant && shopAddonsDef.length > 0 && (
                <div className="space-y-3 mb-5">
                  <div className="font-black text-sm text-slate-900">
                    {isArabic ? 'الإضافات' : 'Addons'}
                  </div>
                  <div className="space-y-3">
                    {shopAddonsDef.map((g: any) => {
                      const groupId = String(g?.id || '').trim();
                      const groupName = String(g?.name || g?.label || '').trim();
                      const opts = Array.isArray(g?.options) ? g.options : [];
                      if (!groupId || opts.length === 0) return null;
                      return (
                        <div
                          key={groupId}
                          className="p-3 rounded-2xl border border-slate-100 bg-slate-50 space-y-2"
                        >
                          <div className="font-black text-xs text-slate-700 mb-1">
                            {groupName || (isArabic ? 'مجموعة' : 'Group')}
                          </div>
                          {opts.map((opt: any) => {
                            const optId = String(opt?.id || '').trim();
                            if (!optId) return null;
                            const variants = Array.isArray(opt?.variants) ? opt.variants : [];
                            if (variants.length === 0) return null;
                            const selectedVariantId = selectedAddons.find(
                              (x) => String(x?.optionId) === optId
                            )?.variantId;
                            return (
                              <div
                                key={optId}
                                className="bg-white p-2.5 rounded-xl border border-slate-150 flex flex-col gap-1.5"
                              >
                                <div className="font-bold text-xs text-slate-800 text-right">
                                  {String(opt?.name || opt?.label || opt?.title || '').trim() ||
                                    optId}
                                </div>
                                <div className="flex flex-wrap gap-1.5 justify-end">
                                  {variants.map((v: any) => {
                                    const vid = String(v?.id || '').trim();
                                    if (!vid) return null;
                                    const isSelected = String(selectedVariantId || '') === vid;
                                    const vPrice =
                                      typeof v?.price === 'number'
                                        ? v.price
                                        : Number(v?.price || 0);
                                    return (
                                      <button
                                        key={vid}
                                        type="button"
                                        onClick={() =>
                                          setSelectedAddons((prev) => {
                                            const next = (prev || []).filter(
                                              (x) => String(x?.optionId) !== optId
                                            );
                                            if (isSelected) return next;
                                            return [...next, { optionId: optId, variantId: vid }];
                                          })
                                        }
                                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-black transition-all ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}
                                      >
                                        {String(v?.label || v?.name || '').trim() || vid}
                                        {Number.isFinite(vPrice) && vPrice > 0
                                          ? ` (+${vPrice})`
                                          : ''}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add to cart button */}
              {(() => {
                const mv = (configProduct?.menuVariants ?? configProduct?.menu_variants) as any[];
                const hasMenuVariants = Array.isArray(mv) && mv.length > 0;
                let price = getProductEffectivePrice(configProduct);
                let variantSelection: any = undefined;
                if (hasMenuVariants) {
                  const type =
                    mv.find(
                      (t: any) =>
                        String(t?.id || '').trim() === String(selectedMenuTypeId || '').trim()
                    ) || mv[0];
                  const sizes = Array.isArray(type?.sizes) ? type.sizes : [];
                  const size =
                    sizes.find(
                      (s: any) =>
                        String(s?.id || '').trim() === String(selectedMenuSizeId || '').trim()
                    ) || sizes[0];
                  const sizePrice = Number(size?.price);
                  if (Number.isFinite(sizePrice) && sizePrice > 0) price = sizePrice;
                  if (type && size)
                    variantSelection = {
                      typeId: String(type?.id || '').trim(),
                      sizeId: String(size?.id || '').trim(),
                      menuSizeLabel: String(size?.label || size?.name || '').trim(),
                    };
                }
                if (isFashion) {
                  const colorObj = Array.isArray(configProduct?.colors)
                    ? configProduct.colors.find(
                        (c: any) =>
                          String(c?.value || '') === String(selectedFashionColorValue || '')
                      )
                    : undefined;
                  variantSelection = {
                    ...(variantSelection || {}),
                    kind: 'fashion',
                    colorName: String(colorObj?.name || '').trim(),
                    colorValue: String(selectedFashionColorValue || ''),
                    size: String(selectedFashionSize || ''),
                  };
                }
                const addonsPrice = (() => {
                  if (!isRestaurant) return 0;
                  const priceMap = new Map<string, number>();
                  for (const g of shopAddonsDef)
                    for (const opt of g?.options || [])
                      for (const v of opt?.variants || []) {
                        const vid = String(v?.id || '').trim();
                        const p = Number(v?.price || 0);
                        if (vid && Number.isFinite(p))
                          priceMap.set(`${String(opt?.id).trim()}:${vid}`, p);
                      }
                  return (selectedAddons || []).reduce(
                    (sum, a) =>
                      sum +
                      (priceMap.get(
                        `${String(a?.optionId).trim()}:${String(a?.variantId).trim()}`
                      ) || 0),
                    0
                  );
                })();
                const finalPrice = price + addonsPrice;

                return (
                  <>
                    <div className="text-sm font-black text-[#BD00FF] mb-3">
                      ج.م {finalPrice.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const lineId = `${configProduct.id}-${Date.now()}`;
                        const suffix = (() => {
                          const parts: string[] = [];
                          if (variantSelection?.menuSizeLabel)
                            parts.push(String(variantSelection.menuSizeLabel));
                          if (variantSelection?.size) parts.push(String(variantSelection.size));
                          if (variantSelection?.colorName)
                            parts.push(String(variantSelection.colorName));
                          return parts.length ? ` (${parts.join(' - ')})` : '';
                        })();
                        setCart((prev) => [
                          ...prev,
                          {
                            id: lineId,
                            productId: configProduct.id,
                            name: `${configProduct.name}${suffix}`,
                            price: finalPrice,
                            quantity: 1,
                            addons: selectedAddons,
                            variantSelection,
                          },
                        ]);
                        setIsConfigOpen(false);
                      }}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black"
                    >
                      {isArabic ? 'أضف للسلة' : 'Add to Cart'}
                    </button>
                  </>
                );
              })()}
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="w-full mt-2 py-2 text-slate-400 font-bold"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
}
