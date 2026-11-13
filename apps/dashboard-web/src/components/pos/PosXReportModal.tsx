'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X } from 'lucide-react';

export type PosReportData = {
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  cardSales: number;
  walletSales: number;
  creditSales: number;
  totalTips: number;
  totalReturns: number;
  netCash: number;
  totalVat: number;
  totalDiscounts: number;
  openingAmount: number;
  cashIn: number;
  cashOut: number;
  topProducts: { name: string; qty: number; revenue: number }[];
};

type Props = {
  show: boolean;
  onClose: () => void;
  reportData: PosReportData;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosXReportModal({ show, onClose, reportData, isArabic }: Props) {
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
                <FileText size={18} className="text-blue-500" />{' '}
                {isArabic ? 'تقرير منتصف اليوم (X)' : 'X-Report'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs font-bold">
              <div className="flex justify-between p-2 rounded-lg bg-blue-50">
                <span className="text-blue-600">
                  {isArabic ? 'إجمالي المبيعات' : 'Total sales'}
                </span>
                <span className="text-blue-700 font-black">
                  ج.م {reportData.totalSales.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                <span>{isArabic ? 'عدد الفواتير' : 'Orders'}</span>
                <span className="font-black">{reportData.totalOrders}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                <span>{isArabic ? 'كاش' : 'Cash'}</span>
                <span>ج.م {reportData.cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                <span>{isArabic ? 'بطاقة' : 'Card'}</span>
                <span>ج.م {reportData.cardSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                <span>{isArabic ? 'محفظة' : 'Wallet'}</span>
                <span>ج.م {reportData.walletSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                <span>{isArabic ? 'آجل' : 'Credit'}</span>
                <span>ج.م {reportData.creditSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-emerald-50">
                <span className="text-emerald-600">{isArabic ? 'إكراميات' : 'Tips'}</span>
                <span className="text-emerald-700">ج.م {reportData.totalTips.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-red-50">
                <span className="text-red-600">{isArabic ? 'مرتجعات' : 'Returns'}</span>
                <span className="text-red-700">ج.م {reportData.totalReturns.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-amber-700 font-black">
                  {isArabic ? 'الصندوق المتوقع' : 'Expected cash'}
                </span>
                <span className="text-amber-800 font-black">
                  ج.م {reportData.netCash.toFixed(2)}
                </span>
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
