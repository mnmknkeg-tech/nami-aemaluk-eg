'use client';

import { motion } from 'framer-motion';
import { Loader2, Search, Ruler, SlidersHorizontal, Star } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

type Props = {
  products: any[];
  filteredProducts: any[];
  pagedProducts: any[];
  isArabic: boolean;
  getProductStock: (p: any) => number;
  getProductEffectivePrice: (p: any) => number;
  isFashion: boolean;
  isRestaurant: boolean;
  shopAddonsDef: any[];
  addToCart: (p: any, qty: number) => void;
  setConfigProduct: (p: any) => void;
  setSelectedAddons: (a: any[]) => void;
  setIsConfigOpen: (v: boolean) => void;
  handleToggleQuickKey: (id: string) => void;
  quickKeyIds: string[];
  productsPage: number;
  setProductsPage: Dispatch<SetStateAction<number>>;
  totalProductPages: number;
};

const MotionDiv = motion.div as any;

export default function PosProductGrid({
  products,
  filteredProducts,
  pagedProducts,
  isArabic,
  getProductStock,
  getProductEffectivePrice,
  isFashion,
  isRestaurant,
  shopAddonsDef,
  addToCart,
  setConfigProduct,
  setSelectedAddons,
  setIsConfigOpen,
  handleToggleQuickKey,
  quickKeyIds,
  productsPage,
  setProductsPage,
  totalProductPages,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-3 pb-[calc(env(safe-area-inset-bottom,0px)+8.5rem)] md:p-4 md:pb-4">
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-300">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="font-black text-sm">
            {isArabic ? 'جاري تحميل المنتجات...' : 'Loading products...'}
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-300">
          <Search size={48} className="mb-3 opacity-30" />
          <p className="font-black text-sm">
            {isArabic ? 'لا توجد منتجات مطابقة' : 'No matching products'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
            {pagedProducts.map((p) => {
              const stock = getProductStock(p);
              const isOutOfStock = stock <= 0;
              const hasVariants =
                p?.menuVariants?.length > 0 ||
                p?.menu_variants?.length > 0 ||
                (isFashion && (p?.sizes?.length > 1 || p?.colors?.length > 0));
              const showConfig =
                p?.menuVariants?.length > 0 ||
                p?.menu_variants?.length > 0 ||
                (isFashion && (p?.sizes?.length > 1 || p?.colors?.length > 0)) ||
                (isRestaurant && shopAddonsDef.length > 0);
              return (
                <MotionDiv
                  key={p.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => !isOutOfStock && addToCart(p, 1)}
                  className={`relative active:scale-[0.97] ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} aspect-square`}
                >
                  <div
                    className={`w-full h-full rounded-lg md:rounded-[1.4rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#BD00FF] transition-all group overflow-hidden relative`}
                  >
                    {hasVariants && (
                      <div className="absolute top-1 right-1 z-10">
                        <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-lg shadow-sm border border-slate-100">
                          <Ruler size={14} className="text-[#BD00FF]" />
                        </div>
                      </div>
                    )}
                    {showConfig && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfigProduct(p);
                          setSelectedAddons([]);
                          setIsConfigOpen(true);
                        }}
                        className="absolute top-1 left-1 z-10 bg-white/90 backdrop-blur-md p-1.5 rounded-lg shadow-sm border border-slate-100 hover:border-[#BD00FF] hover:text-[#BD00FF] transition-colors"
                      >
                        <SlidersHorizontal size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleQuickKey(p.id);
                      }}
                      className={`absolute bottom-1 left-1 z-10 p-1 rounded-lg transition-all ${quickKeyIds.includes(p.id) ? 'bg-amber-400 text-white' : 'bg-white/70 text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100'}`}
                      title={isArabic ? 'زر سريع' : 'Quick key'}
                    >
                      <Star size={12} className={quickKeyIds.includes(p.id) ? 'fill-white' : ''} />
                    </button>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <img
                      src={p.imageUrl || p.image_url || '/brand/logo-business.png'}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-3 text-right">
                      <h3 className="text-white font-black text-[9px] md:text-sm line-clamp-2 leading-tight mb-0.5">
                        {p.name}
                      </h3>
                      <div className="flex items-center justify-between flex-row-reverse">
                        <span className="text-[#00E5FF] font-black text-[9px] md:text-sm">
                          ج.م {getProductEffectivePrice(p).toFixed(2)}
                        </span>
                        {stock !== Infinity && (
                          <span
                            className={`text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isOutOfStock ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60'}`}
                          >
                            {isOutOfStock ? (isArabic ? 'نفذ' : 'Out') : `${stock}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </MotionDiv>
              );
            })}
          </div>
          {totalProductPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 mb-2">
              <button
                type="button"
                onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
                disabled={productsPage <= 1}
                className="px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs font-black disabled:opacity-40 hover:bg-slate-50"
              >
                {isArabic ? 'السابق' : 'Prev'}
              </button>
              <span className="text-xs font-black text-slate-500 px-3">
                {productsPage} / {totalProductPages}{' '}
                <span className="text-slate-300">({filteredProducts.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setProductsPage((p) => Math.min(totalProductPages, p + 1))}
                disabled={productsPage >= totalProductPages}
                className="px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs font-black disabled:opacity-40 hover:bg-slate-50"
              >
                {isArabic ? 'التالي' : 'Next'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
