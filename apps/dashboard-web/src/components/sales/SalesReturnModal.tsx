'use client';

import React from 'react';
import { XCircle, X, Plus, Minus, RotateCcw } from 'lucide-react';
import { type Order } from './salesShared';

export interface SalesReturnModalProps {
  returnProcessing: boolean;
  setReturnModal: React.Dispatch<React.SetStateAction<Order | null>>;
  returnModal: Order | null;
  setReturnMode: React.Dispatch<React.SetStateAction<'full' | 'partial'>>;
  returnMode: 'full' | 'partial';
  returnSelection: Record<string, number>;
  adjustReturnQty: any;
  setReturnQty: any;
  partialRefundAmount: any;
  returnReason: string;
  setReturnReason: React.Dispatch<React.SetStateAction<string>>;
  returnToStock: boolean;
  setReturnToStock: React.Dispatch<React.SetStateAction<boolean>>;
  returnError: string;
  processReturn: any;
  returnModalItems: any;
}

const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  returnProcessing,
  setReturnModal,
  returnModal,
  setReturnMode,
  returnMode,
  returnSelection,
  adjustReturnQty,
  setReturnQty,
  partialRefundAmount,
  returnReason,
  setReturnReason,
  returnToStock,
  setReturnToStock,
  returnError,
  processReturn,
  returnModalItems,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !returnProcessing && setReturnModal(null)}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-[15px] font-extrabold text-slate-900">
            مرتجع الطلب{' '}
            <span className="text-slate-400 font-bold">
              #
              {String(returnModal.id || '')
                .slice(0, 8)
                .toUpperCase()}
            </span>
          </h2>
          <button
            onClick={() => !returnProcessing && setReturnModal(null)}
            className="p-2 hover:bg-slate-50 rounded-lg"
            disabled={returnProcessing}
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* مفتاح الوضع: كامل / جزئي */}
          <div className="flex gap-2 p-1 bg-slate-50 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setReturnMode('full')}
              className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${returnMode === 'full' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              مرتجع كامل
            </button>
            <button
              type="button"
              onClick={() => setReturnMode('partial')}
              className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${returnMode === 'partial' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              مرتجع جزئي
            </button>
          </div>

          {/* ملخص الطلب والأصناف */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex justify-between items-center mb-1">
              <div className="text-[11px] font-bold text-slate-400 tabular-nums">
                {new Date(
                  returnModal.createdAt || returnModal.created_at || Date.now()
                ).toLocaleString('ar-EG')}
              </div>
              <div className="font-black text-lg text-slate-900 tabular-nums">
                ج.م {Number(returnModal.total || 0).toLocaleString('ar-EG')}
              </div>
            </div>
            {(Array.isArray(returnModal.items) ? returnModal.items : []).length === 0 ? (
              <div className="text-xs font-bold text-slate-400 py-2">
                لا توجد أصناف مسجلة على الطلب
              </div>
            ) : (
              (Array.isArray(returnModal.items) ? returnModal.items : []).map(
                (item: any, idx: number) => {
                  const key = String(item?.id || item?.productId || `item_${idx}`);
                  const maxQty = Number(item?.quantity ?? item?.qty ?? 0);
                  const unitPrice = Number(item?.price ?? item?.unitPrice ?? 0);
                  const retQty = Number(returnSelection[key] || 0);
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 py-2 border-t border-slate-100"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-slate-700 truncate">
                          {item?.product?.name || item?.name || item?.productName || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold tabular-nums">
                          الكمية: {maxQty} · السعر: {unitPrice.toLocaleString('ar-EG')}
                        </div>
                      </div>
                      {returnMode === 'partial' && (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => adjustReturnQty(key, -1, maxQty)}
                            className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            value={retQty}
                            onChange={(e) => setReturnQty(key, Number(e.target.value), maxQty)}
                            className="w-12 text-center font-black text-xs outline-none bg-transparent"
                            min={0}
                            max={maxQty}
                          />
                          <button
                            type="button"
                            onClick={() => adjustReturnQty(key, 1, maxQty)}
                            className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                      <div className="text-left text-xs font-black text-slate-600 w-20 shrink-0 tabular-nums">
                        ج.م{' '}
                        {(unitPrice * (returnMode === 'partial' ? retQty : maxQty)).toLocaleString(
                          'ar-EG'
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* السبب + إرجاع المخزن */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-3">
            {returnMode === 'partial' && (
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-slate-700">إجمالي المرتجع</span>
                <span className="font-black text-lg text-red-600 tabular-nums">
                  ج.م {partialRefundAmount.toLocaleString('ar-EG')}
                </span>
              </div>
            )}
            {returnMode === 'full' && (
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-slate-700">المبلغ المسترجع</span>
                <span className="font-black text-lg text-red-600 tabular-nums">
                  ج.م {Number(returnModal.total || 0).toLocaleString('ar-EG')}
                </span>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500">السبب</label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="سبب المرتجع..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none text-sm font-bold focus:outline-none focus:border-slate-400"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={returnToStock}
                onChange={(e) => setReturnToStock(e.target.checked)}
                className="w-4 h-4 accent-slate-900"
              />
              إرجاع الأصناف للمخزن
            </label>
          </div>

          {returnError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-bold">
              <XCircle size={16} />
              {returnError}
            </div>
          )}

          <button
            type="button"
            onClick={processReturn}
            disabled={
              returnProcessing || (returnMode === 'partial' && returnModalItems.length === 0)
            }
            className="w-full py-3.5 rounded-xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            {returnProcessing
              ? 'جاري المعالجة...'
              : returnMode === 'full'
                ? `تأكيد المرتجع الكامل — ج.م ${Number(returnModal.total || 0).toLocaleString('ar-EG')}`
                : `تأكيد المرتجع الجزئي — ج.م ${partialRefundAmount.toLocaleString('ar-EG')}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesReturnModal;
