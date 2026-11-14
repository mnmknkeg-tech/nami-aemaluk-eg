'use client';

import React from 'react';
import { Crown, Coins, Loader2, ShieldCheck, Zap, Settings2, CreditCard } from 'lucide-react';
import type { LoyaltySettings } from './types';

export interface LoyaltySettingsTabProps {
  settings: LoyaltySettings;
  setSettings: React.Dispatch<React.SetStateAction<LoyaltySettings>>;
  saveSettings: any;
  DEFAULT_TIERS: any;
  savingSettings: boolean;
}

const LoyaltySettingsTab: React.FC<LoyaltySettingsTabProps> = ({
  settings,
  setSettings,
  saveSettings,
  DEFAULT_TIERS,
  savingSettings,
}) => {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Systems Activation & Toggle Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Zap size={18} className="text-amber-500" />
          التحكم في تفعيل وقفل أنظمة الولاء
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Toggle Points */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-amber-600" />
                <span className="text-xs font-bold text-slate-900">نظام النقاط والمستويات</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                كسب النقاط مع المشتريات واستبدالها بخصومات
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newPts = !settings.pointsEnabled;
                const updated = {
                  ...settings,
                  pointsEnabled: newPts,
                  enabled: newPts || settings.cardsEnabled,
                };
                setSettings(updated);
                saveSettings(updated);
              }}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                settings.pointsEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.pointsEnabled ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle Cards */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-purple-600" />
                <span className="text-xs font-bold text-slate-900">نظام كروت الولاء والأختام</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                بطاقات أختام رقمية ومكافآت عند اكتمال الأختام
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newCrd = !settings.cardsEnabled;
                const updated = {
                  ...settings,
                  cardsEnabled: newCrd,
                  enabled: settings.pointsEnabled || newCrd,
                };
                setSettings(updated);
                saveSettings(updated);
              }}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                settings.cardsEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.cardsEnabled ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* General Rules Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Settings2 size={18} className="text-indigo-600" />
          قواعد كسب واستبدال النقاط
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              معدل الكسب الأساسي (نقاط لكل 1 ج.م شراء)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={settings.pointsPerCurrency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    pointsPerCurrency: parseFloat(e.target.value) || 1,
                  })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                نقطة / 1 ج.م
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              مثال: 1 يعني إن كل 100 ج.م شراء تمنح العميل 100 نقطة.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              قيمة استبدال النقاط (كم ج.م مقابل كل 100 نقطة)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={settings.redeemValuePer100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    redeemValuePer100: parseInt(e.target.value) || 10,
                  })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                ج.م / 100 نقطة
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              مثال: 10 يعني كل 100 نقطة تخصم 10 ج.م من الفاتورة.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نقاط هدية ترحيبية عند تسجيل حساب جديد
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={settings.signupPoints}
                onChange={(e) =>
                  setSettings({ ...settings, signupPoints: parseInt(e.target.value) || 0 })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">نقطة</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              تُضاف تلقائياً لرصيد العميل بمجرد إنشاء الحساب.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              الحد الأدنى للنقاط المطلوب لبدء الاستبدال
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={settings.minRedeemPoints}
                onChange={(e) =>
                  setSettings({ ...settings, minRedeemPoints: parseInt(e.target.value) || 0 })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">نقطة</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              يمنع الاستبدال إذا كان رصيد العميل أقل من هذا الرقم.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              صلاحية النقاط (قبل انتهاء صلاحيتها)
            </label>
            <select
              value={settings.pointsExpiryMonths}
              onChange={(e) =>
                setSettings({ ...settings, pointsExpiryMonths: parseInt(e.target.value) || 12 })
              }
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={0}>لا تنتهي صلاحية النقاط مطلقاً</option>
              <option value={6}>تنتهي بعد 6 أشهر من تاريخ الكسب</option>
              <option value={12}>تنتهي بعد 12 شهرًا (سنة كاملة)</option>
              <option value={24}>تنتهي بعد سنتين</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نقاط مكافأة عند تقييم منتج
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={settings.rules.earnOnReview || 20}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rules: { ...settings.rules, earnOnReview: parseInt(e.target.value) || 0 },
                  })
                }
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">نقطة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tiers Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Crown size={18} className="text-amber-500" />
            تخصيص مستويات العضوية (Tiers)
          </h3>
        </div>

        <div className="space-y-4">
          {(settings.rules.tiers || DEFAULT_TIERS).map((tier, idx) => (
            <div
              key={tier.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    اسم المستوى
                  </label>
                  <input
                    type="text"
                    value={tier.name}
                    onChange={(e) => {
                      const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setSettings({
                        ...settings,
                        rules: { ...settings.rules, tiers: updated },
                      });
                    }}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    الحد الأدنى للنقاط
                  </label>
                  <input
                    type="number"
                    value={tier.minPoints}
                    onChange={(e) => {
                      const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                      updated[idx] = {
                        ...updated[idx],
                        minPoints: parseInt(e.target.value) || 0,
                      };
                      setSettings({
                        ...settings,
                        rules: { ...settings.rules, tiers: updated },
                      });
                    }}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    مضاعف النقاط (Multiplier)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    value={tier.multiplier}
                    onChange={(e) => {
                      const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                      updated[idx] = {
                        ...updated[idx],
                        multiplier: parseFloat(e.target.value) || 1,
                      };
                      setSettings({
                        ...settings,
                        rules: { ...settings.rules, tiers: updated },
                      });
                    }}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    الأيقونة / الشارة
                  </label>
                  <input
                    type="text"
                    value={tier.badge}
                    onChange={(e) => {
                      const updated = [...(settings.rules.tiers || DEFAULT_TIERS)];
                      updated[idx] = { ...updated[idx], badge: e.target.value };
                      setSettings({
                        ...settings,
                        rules: { ...settings.rules, tiers: updated },
                      });
                    }}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          onClick={() => saveSettings(settings)}
          disabled={savingSettings}
          className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          {savingSettings ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ShieldCheck size={16} />
          )}
          حفظ جميع إعدادات الولاء
        </button>
      </div>
    </div>
  );
};

export default LoyaltySettingsTab;
