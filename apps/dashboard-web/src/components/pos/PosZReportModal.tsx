'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import type { PosReportData } from './PosXReportModal';

type Props = {
  show: boolean;
  onClose: () => void;
  reportData: PosReportData;
  isArabic: boolean;
  /** Chain to the drawer-declaration modal (Z-report → close day → declare). */
  onDeclareDrawer: () => void;
};

const MotionDiv = motion.div as any;

export default function PosZReportModal({
  show,
  onClose,
  reportData,
  isArabic,
  onDeclareDrawer,
}: Props) {
  return (
    <AnimatePresence>
      {show && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <MotionDiv
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            className="w-full max-w-md bg-white rounded-[2rem] p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e: any) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-row-reverse">
              <h3 className="text-lg font-black flex items-center gap-2">
                <FileText size={18} className="text-red-500" />{' '}
                {isArabic ? 'تقرير نهاية اليوم (Z)' : 'Z-Report'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs font-bold">
              <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                <div className="text-[10px] font-black text-red-600 mb-2">
                  {isArabic ? 'ملخص اليوم' : 'Day Summary'}
                </div>
                <div className="flex justify-between mb-1">
                  <span>{isArabic ? 'إجمالي المبيعات' : 'Total sales'}</span>
                  <span className="font-black">ج.م {reportData.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>{isArabic ? 'عدد الفواتير' : 'Orders'}</span>
                  <span>{reportData.totalOrders}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>{isArabic ? 'ضريبة محصلة' : 'VAT collected'}</span>
                  <span>ج.م {reportData.totalVat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>{isArabic ? 'خصومات' : 'Discounts'}</span>
                  <span>ج.م {reportData.totalDiscounts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>{isArabic ? 'إكراميات' : 'Tips'}</span>
                  <span>ج.م {reportData.totalTips.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>{isArabic ? 'مرتجعات' : 'Returns'}</span>
                  <span>ج.م {reportData.totalReturns.toFixed(2)}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-black text-slate-500 mb-2">
                  {isArabic ? 'الصندوق' : 'Cash Drawer'}
                </div>
                <div className="flex justify-between mb-1">
                  <span>{isArabic ? 'عهدة افتتاح' : 'Opening'}</span>
                  <span>ج.م {reportData.openingAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1 text-emerald-600">
                  <span>{isArabic ? 'مبيعات كاش' : 'Cash sales'}</span>
                  <span>+ ج.م {reportData.cashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1 text-emerald-600">
                  <span>{isArabic ? 'إيداع نقدي' : 'Cash in'}</span>
                  <span>+ ج.م {reportData.cashIn.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1 text-red-600">
                  <span>{isArabic ? 'مصروف نقدي' : 'Cash out'}</span>
                  <span>- ج.م {reportData.cashOut.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1 text-red-600">
                  <span>{isArabic ? 'مرتجعات' : 'Returns'}</span>
                  <span>- ج.م {reportData.totalReturns.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-black">
                  <span>{isArabic ? 'الصافي المتوقع' : 'Expected net'}</span>
                  <span className="text-amber-700">ج.م {reportData.netCash.toFixed(2)}</span>
                </div>
              </div>
              {reportData.topProducts.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-black text-slate-500 mb-2">
                    {isArabic ? 'أفضل المنتجات' : 'Top Products'}
                  </div>
                  {reportData.topProducts.slice(0, 5).map((p, i) => (
                    <div key={p.name} className="flex justify-between text-[10px] py-0.5">
                      <span>
                        {i + 1}. {p.name}
                      </span>
                      <span className="text-[#BD00FF]">
                        {p.qty}× / ج.م {p.revenue.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={onDeclareDrawer}
                className="w-full py-3 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600"
              >
                {isArabic ? 'إغلاق اليوم + جرد الصندوق' : 'Close Day + Declare Drawer'}
              </button>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
