'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Table2, X, Plus } from 'lucide-react';
import type { RestaurantTable } from '@/lib/pos-utils';

type Props = {
  show: boolean;
  onClose: () => void;
  tables: RestaurantTable[];
  selectedTableId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  isArabic: boolean;
};

const MotionDiv = motion.div as any;

export default function PosTablesModal({
  show,
  onClose,
  tables,
  selectedTableId,
  onSelect,
  onAdd,
  isArabic,
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
                <Table2 size={18} /> {isArabic ? 'الطاولات' : 'Tables'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {tables.length === 0 ? (
              <div className="text-center text-slate-400 py-8 font-bold text-sm">
                {isArabic ? 'لا توجد طاولات' : 'No tables'}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${selectedTableId === t.id ? 'border-[#BD00FF] bg-[#BD00FF]/5' : t.status === 'free' ? 'border-slate-100 bg-slate-50 hover:bg-slate-100' : t.status === 'occupied' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
                  >
                    <div className="font-black text-sm">{t.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 mt-1">
                      {t.seats} {isArabic ? 'كرسي' : 'seats'}
                    </div>
                    <div
                      className={`text-[9px] font-black mt-1 ${t.status === 'free' ? 'text-emerald-600' : t.status === 'occupied' ? 'text-red-500' : 'text-amber-600'}`}
                    >
                      {t.status === 'free'
                        ? isArabic
                          ? 'فارغة'
                          : 'Free'
                        : t.status === 'occupied'
                          ? isArabic
                            ? 'مشغولة'
                            : 'Occupied'
                          : isArabic
                            ? 'محجوزة'
                            : 'Reserved'}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={onAdd}
              className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center gap-2"
            >
              <Plus size={14} /> {isArabic ? 'إضافة طاولة' : 'Add table'}
            </button>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
