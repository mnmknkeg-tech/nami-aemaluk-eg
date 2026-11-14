'use client';

import React from 'react';
import { X, CreditCard } from 'lucide-react';
import type { LoyaltyCard } from './types';

export interface LoyaltyCardModalProps {
  setCardModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingCard: LoyaltyCard | null;
  cardForm: LoyaltyCard;
  setCardForm: React.Dispatch<React.SetStateAction<LoyaltyCard>>;
  handleSaveCard: any;
}

const LoyaltyCardModal: React.FC<LoyaltyCardModalProps> = ({
  setCardModalOpen,
  editingCard,
  cardForm,
  setCardForm,
  handleSaveCard,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
      onClick={() => setCardModalOpen(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-purple-600" />
            <h3 className="font-black text-sm text-slate-900">
              {editingCard ? 'تعديل كارت الولاء والأختام' : 'إنشاء كارت ولاء وأختام جديد'}
            </h3>
          </div>
          <button
            onClick={() => setCardModalOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم أو عنوان الكارت
            </label>
            <input
              type="text"
              value={cardForm.title}
              onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
              placeholder="مثال: كارت القهوة والمشروبات (6 أختام)"
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              وصف الكارت وشروطه للعملاء
            </label>
            <textarea
              rows={2}
              value={cardForm.description}
              onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
              placeholder="اجمع الأختام مع كل طلب واحصل على هديتك..."
              className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                عدد الأختام المطلوبة
              </label>
              <select
                value={cardForm.totalStamps}
                onChange={(e) =>
                  setCardForm({ ...cardForm, totalStamps: parseInt(e.target.value) || 6 })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {[4, 5, 6, 8, 10, 12, 15].map((n) => (
                  <option key={n} value={n}>
                    {n} أختام
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الحد الأدنى للطلب لنيل الختم (ج.م)
              </label>
              <input
                type="number"
                min="0"
                value={cardForm.minSpendPerStamp || 0}
                onChange={(e) =>
                  setCardForm({
                    ...cardForm,
                    minSpendPerStamp: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع المكافأة عند الإكمال
              </label>
              <select
                value={cardForm.rewardType}
                onChange={(e) => setCardForm({ ...cardForm, rewardType: e.target.value as any })}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="free_product">منتج أو مشروب مجاني</option>
                <option value="fixed_discount">خصم نقدي مباشر (ج.م)</option>
                <option value="percent_discount">خصم نسبي (%)</option>
                <option value="points">نقاط ولاء إضافية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نص المكافأة المختصر
              </label>
              <input
                type="text"
                value={cardForm.rewardText}
                onChange={(e) => setCardForm({ ...cardForm, rewardText: e.target.value })}
                placeholder="مثال: مشروب مجاني أو خصم 50 ج.م"
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {cardForm.rewardType !== 'free_product' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                قيمة الخصم أو عدد النقاط
              </label>
              <input
                type="number"
                min="1"
                value={cardForm.rewardValue}
                onChange={(e) =>
                  setCardForm({ ...cardForm, rewardValue: parseFloat(e.target.value) || 0 })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              التدرج اللوني وشكل الكارت
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'ذهبي عنبري', color: 'from-amber-600 via-amber-700 to-amber-900' },
                { label: 'أزرق نيلي', color: 'from-indigo-600 via-slate-800 to-slate-900' },
                { label: 'زمردي ملكي', color: 'from-emerald-600 via-teal-800 to-slate-900' },
                { label: 'بنفسجي VIP', color: 'from-purple-600 via-purple-800 to-slate-950' },
              ].map((clr) => (
                <button
                  key={clr.color}
                  type="button"
                  onClick={() => setCardForm({ ...cardForm, color: clr.color })}
                  className={`h-11 rounded-xl bg-gradient-to-r ${clr.color} text-[10px] font-bold text-white flex items-center justify-center border-2 transition-all ${
                    cardForm.color === clr.color
                      ? 'border-white ring-2 ring-purple-500'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  {clr.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setCardModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveCard}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors"
          >
            {editingCard ? 'حفظ التعديلات' : 'إصدار الكارت الآن'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyCardModal;
