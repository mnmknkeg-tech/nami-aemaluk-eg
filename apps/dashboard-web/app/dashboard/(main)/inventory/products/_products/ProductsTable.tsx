'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Package, Loader2, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { normalizeImageUrl } from '@ray-eg/shared/utils/image-url';
import { getProductEditPath } from './editPaths';
import type { Product, VisibilityMenuState } from './types';

type Props = {
  products: Product[];
  togglingId: string;
  visibilityMenu: VisibilityMenuState;
  setVisibilityMenu: Dispatch<SetStateAction<VisibilityMenuState>>;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onImagePreview: (src: string) => void;
};

export default function ProductsTable({
  products,
  togglingId,
  visibilityMenu,
  setVisibilityMenu,
  onEdit,
  onDelete,
  onImagePreview,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="hidden md:grid grid-cols-12 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="col-span-2 text-right text-xs font-bold text-slate-500">الصورة</div>
        <div className="col-span-4 text-right text-xs font-bold text-slate-500">المنتج</div>
        <div className="col-span-1 text-right text-xs font-bold text-slate-500">السعر</div>
        <div className="col-span-1 text-right text-xs font-bold text-slate-500">المخزون</div>
        <div className="col-span-2 text-center text-xs font-bold text-slate-500">الظهور</div>
        <div className="col-span-2 text-right text-xs font-bold text-slate-500">إجراءات</div>
      </div>
      {products.map((product) => {
        const imgSrc = normalizeImageUrl(product.imageUrl || product.image_url);
        const onSite = product.isActive !== false;
        const onApp = product.appActive !== false;
        const isHiddenEverywhere = !onSite && !onApp;
        const isBusy = togglingId === product.id;
        const categoryName =
          typeof product.category === 'string' ? product.category : product.category?.name || 'عام';

        return (
          <div
            key={product.id}
            className={`grid grid-cols-12 px-4 py-3 items-center border-b border-slate-100 hover:bg-slate-50 transition-colors ${isHiddenEverywhere ? 'opacity-60' : ''}`}
            onClick={() => {
              if (visibilityMenu?.productId === product.id) setVisibilityMenu(null);
            }}
          >
            <div className="col-span-2 flex items-center justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!imgSrc) return;
                  onImagePreview(imgSrc);
                }}
                className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-slate-300 transition-colors"
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package size={16} />
                  </div>
                )}
              </button>
            </div>
            <div className="col-span-4 pr-3 text-right min-w-0">
              <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                {product.name}
              </div>
              <div className="text-xs font-medium text-slate-400 mt-0.5">{categoryName}</div>
            </div>
            <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm truncate">
              ج.م {Number(product.price || 0).toLocaleString()}
            </div>
            <div className="col-span-1 font-semibold text-slate-900 text-xs sm:text-sm">
              <span className={Number(product.stock ?? 0) <= 5 ? 'text-amber-600' : ''}>
                {product.stock ?? 0}
              </span>
            </div>

            {/* ===== Visibility compact badge + dropdown ===== */}
            <div className="col-span-2 flex items-center justify-center">
              <div className="relative">
                {/* Status indicator dots */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (visibilityMenu?.productId === product.id) {
                      setVisibilityMenu(null);
                      return;
                    }
                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                    setVisibilityMenu({
                      productId: product.id,
                      x: rect.right,
                      y: rect.bottom,
                      buttonHeight: rect.height,
                    });
                  }}
                  disabled={isBusy}
                  title="إعدادات الظهور"
                  className={`h-8 px-2.5 rounded-xl flex items-center gap-2 border transition-all disabled:opacity-50 ${
                    isHiddenEverywhere
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : onSite && onApp
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                  } hover:shadow-sm`}
                >
                  {isBusy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <>
                      <span
                        className={`w-2 h-2 rounded-full ${onSite ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      />
                      <span
                        className={`w-2 h-2 rounded-full ${onApp ? 'bg-blue-500' : 'bg-slate-300'}`}
                      />
                    </>
                  )}
                  <MoreHorizontal size={13} className="text-current opacity-60" />
                </button>

                {/* placeholder - dropdown is rendered via fixed portal below */}
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-end gap-1.5">
              <button
                onClick={() => onEdit(product)}
                title="تعديل المنتج"
                className="h-8 w-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => onDelete(product.id)}
                title="حذف المنتج"
                className="h-8 w-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
