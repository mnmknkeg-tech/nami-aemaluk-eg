'use client';

import React from 'react';
import { Gift, Trash2 } from 'lucide-react';
import type { LoyaltySettings } from './types';

export interface LoyaltyRewardsTabProps {
  settings: LoyaltySettings;
  DEFAULT_REWARDS: any;
  fmt: any;
  setSettings: React.Dispatch<React.SetStateAction<LoyaltySettings>>;
  saveSettings: any;
}

const LoyaltyRewardsTab: React.FC<LoyaltyRewardsTabProps> = ({
  settings,
  DEFAULT_REWARDS,
  fmt,
  setSettings,
  saveSettings,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900">كتالوج مكافآت النقاط</h3>
          <p className="text-xs text-slate-500">
            المكافآت التي يمكن لعملائك استبدال نقاطهم بها أثناء إتمام الطلب أو من حسابهم.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(settings.rules.rewards || DEFAULT_REWARDS).map((reward) => (
          <div
            key={reward.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-sm transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Gift size={20} />
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${reward.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}
                >
                  {reward.active ? 'مفعلة للاستبدال' : 'معطلة'}
                </span>
              </div>

              <h4 className="text-sm font-black text-slate-900 mb-1">{reward.title}</h4>
              <p className="text-xs text-slate-500 mb-4">
                {reward.type === 'fixed_discount' && `خصم مالي ثابت بقيمة ${reward.value} ج.م`}
                {reward.type === 'percent_discount' && `خصم نسبي بقيمة ${reward.value}% على السلة`}
                {reward.type === 'free_shipping' && `شحن مجاني على عنوان التوصيل`}
                {reward.type === 'free_gift' && `هدية عينية مجانية مضافة للسلة`}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold block">تكلفة الاستبدال</span>
                <span className="text-base font-black text-amber-600">
                  {fmt(reward.pointsCost)} نقطة
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const updated = (settings.rules.rewards || DEFAULT_REWARDS).map((r) =>
                      r.id === reward.id ? { ...r, active: !r.active } : r
                    );
                    const newSettings = {
                      ...settings,
                      rules: { ...settings.rules, rewards: updated },
                    };
                    setSettings(newSettings);
                    saveSettings(newSettings);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {reward.active ? 'تعطيل' : 'تفعيل'}
                </button>
                <button
                  onClick={() => {
                    const updated = (settings.rules.rewards || DEFAULT_REWARDS).filter(
                      (r) => r.id !== reward.id
                    );
                    const newSettings = {
                      ...settings,
                      rules: { ...settings.rules, rewards: updated },
                    };
                    setSettings(newSettings);
                    saveSettings(newSettings);
                  }}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoyaltyRewardsTab;
