'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { LoyaltyReward, LoyaltySettings } from './types';

export interface LoyaltyRewardModalProps {
  setRewardModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rewardForm: LoyaltyReward;
  setRewardForm: React.Dispatch<React.SetStateAction<LoyaltyReward>>;
  settings: LoyaltySettings;
  DEFAULT_REWARDS: any;
  setSettings: React.Dispatch<React.SetStateAction<LoyaltySettings>>;
  saveSettings: any;
}

const LoyaltyRewardModal: React.FC<LoyaltyRewardModalProps> = ({
  setRewardModalOpen,
  rewardForm,
  setRewardForm,
  settings,
  DEFAULT_REWARDS,
  setSettings,
  saveSettings,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
      onClick={() => setRewardModalOpen(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-black text-sm text-slate-900">إضافة مكافأة جديدة لكتالوج الولاء</h3>
          <button
            onClick={() => setRewardModalOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">عنوان المكافأة</label>
            <input
              type="text"
              value={rewardForm.title}
              onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
              placeholder="مثال: خصم 50 ج.م على طلبك القادم"
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نوع المكافأة</label>
            <select
              value={rewardForm.type}
              onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value as any })}
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="fixed_discount">خصم مالي ثابت (ج.م)</option>
              <option value="percent_discount">خصم نسبي (%)</option>
              <option value="free_shipping">شحن مجاني</option>
              <option value="free_gift">منتج هدية مجاني</option>
            </select>
          </div>

          {rewardForm.type !== 'free_shipping' && rewardForm.type !== 'free_gift' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">قيمة الخصم</label>
              <input
                type="number"
                min="1"
                value={rewardForm.value}
                onChange={(e) =>
                  setRewardForm({ ...rewardForm, value: parseFloat(e.target.value) || 0 })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              النقاط المطلوبة للاستبدال
            </label>
            <input
              type="number"
              min="10"
              value={rewardForm.pointsCost}
              onChange={(e) =>
                setRewardForm({ ...rewardForm, pointsCost: parseInt(e.target.value) || 0 })
              }
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setRewardModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => {
              if (!rewardForm.title) return;
              const currentRewards = settings.rules.rewards || DEFAULT_REWARDS;
              const updated = [...currentRewards, rewardForm];
              const newSettings = {
                ...settings,
                rules: { ...settings.rules, rewards: updated },
              };
              setSettings(newSettings);
              saveSettings(newSettings);
              setRewardModalOpen(false);
            }}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors"
          >
            إضافة المكافأة
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyRewardModal;
