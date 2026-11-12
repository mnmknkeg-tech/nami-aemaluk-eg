import { Package, Search } from 'lucide-react';
import type { Product } from '../../lib/api';
import { money } from './types';

type Props = {
  products: Product[];
  pagedProducts: Product[];
  filteredCount: number;
  serverUrl: string;
  page: number;
  totalPages: number;
  setPage: (update: (page: number) => number) => void;
  onAdd: (product: Product, quantity: number) => void;
};

export default function ProductGrid({
  products,
  pagedProducts,
  filteredCount,
  serverUrl,
  page,
  totalPages,
  setPage,
  onAdd,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6">
      {pagedProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-300">
          {products.length === 0 ? (
            <>
              <Package size={48} className="mb-3 opacity-30" />
              <p className="font-black text-sm">
                مفيش منتجات — افتح التطبيق والنت شغال مرة واحدة لتحميل المنتجات
              </p>
            </>
          ) : (
            <>
              <Search size={48} className="mb-3 opacity-30" />
              <p className="font-black text-sm">لا توجد منتجات مطابقة</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
            {pagedProducts.map((product) => {
              const isOutOfStock = product.trackStock && product.stock <= 0;
              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && onAdd(product, 1)}
                  className={`relative active:scale-[0.97] transition-transform ${
                    isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } aspect-square`}
                >
                  <div className="w-full h-full rounded-lg md:rounded-[1.4rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#BD00FF] transition-all group overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[1]" />
                    <img
                      src={
                        product.imageUrl
                          ? product.imageUrl.startsWith('http')
                            ? product.imageUrl
                            : serverUrl + product.imageUrl
                          : 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
                      }
                      alt={product.name}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 bg-slate-200 ${product.imageUrl ? '' : 'opacity-0'}`}
                      loading="lazy"
                      onError={(event) => {
                        (event.target as HTMLImageElement).style.visibility = 'hidden';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-3 text-right z-[2]">
                      <h3 className="text-white font-black text-[9px] md:text-sm line-clamp-2 leading-tight mb-0.5">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between flex-row-reverse">
                        <span className="text-[#00E5FF] font-black text-[9px] md:text-sm">
                          ج.م {money(product.price)}
                        </span>
                        {product.trackStock && (
                          <span
                            className={`text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isOutOfStock
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-white/10 text-white/60'
                            }`}
                          >
                            {isOutOfStock ? 'نفذ' : `${product.stock}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 mb-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs font-black disabled:opacity-40 hover:bg-slate-50"
              >
                السابق
              </button>
              <span className="text-xs font-black text-slate-500 px-3">
                {page} / {totalPages} <span className="text-slate-300">({filteredCount})</span>
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs font-black disabled:opacity-40 hover:bg-slate-50"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
