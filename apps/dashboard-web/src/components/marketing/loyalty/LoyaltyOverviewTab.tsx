'use client';

import React from 'react';
import {
  Trophy,
  Coins,
  Users,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import type { CustomerItem, LedgerEntry, LoyaltySettings } from './types';

export interface LoyaltyOverviewTabProps {
  settings: LoyaltySettings;
  setSettings: React.Dispatch<React.SetStateAction<LoyaltySettings>>;
  saveSettings: any;
  cardsList: any;
  setTab: React.Dispatch<React.SetStateAction<any>>;
  fmt: any;
  totalPointsInCirculation: any;
  totalEstimatedValue: any;
  customers: CustomerItem[];
  totalPointsEarned: any;
  totalPointsRedeemed: any;
  DEFAULT_TIERS: any;
  getCustomerTier: any;
  ledger: LedgerEntry[];
  d: any;
}

const LoyaltyOverviewTab: React.FC<LoyaltyOverviewTabProps> = ({
  settings,
  setSettings,
  saveSettings,
  cardsList,
  setTab,
  fmt,
  totalPointsInCirculation,
  totalEstimatedValue,
  customers,
  totalPointsEarned,
  totalPointsRedeemed,
  DEFAULT_TIERS,
  getCustomerTier,
  ledger,
  d,
}) => {
  return (
    <div className="space-y-6">
      {/* Dual Systems Control Panel (Points + Loyalty Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System 1: Points System */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">نظام النقاط والمستويات</h3>
                  <p className="text-[11px] text-slate-300">كسب النقاط واستبدالها بخصومات</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                  settings.pointsEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {settings.pointsEnabled ? 'مفعل للعملاء' : 'معطل'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              يمنح العملاء نقاطاً مع كل طلب شراء حسب إجمالي الفاتورة، ويتيح لهم استبدالها بخصومات أو
              مكافآت.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-slate-300">
              معدل الكسب:{' '}
              <strong className="text-white">{settings.pointsPerCurrency} نقطة / 1 ج.م</strong>
            </span>
            <button
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
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                settings.pointsEnabled
                  ? 'bg-red-500/80 hover:bg-red-500 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              <Zap size={13} />
              {settings.pointsEnabled ? 'إيقاف النقاط' : 'تفعيل النقاط'}
            </button>
          </div>
        </div>

        {/* System 2: Loyalty Cards & Stamps System */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-950 p-5 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-400/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">نظام كروت الولاء والأختام</h3>
                  <p className="text-[11px] text-slate-300">بطاقات أختام رقمية ومكافآت الزيارات</p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                  settings.cardsEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {settings.cardsEnabled ? 'مفعل للعملاء' : 'معطل'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              بطاقات ولاء رقمية مخصصة تجمع الأختام مع كل طلب، وعند اكتمال الأختام يحصل العميل على
              مكافأته تلقائياً.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-slate-300">
              الكروت النشطة:{' '}
              <strong className="text-white">
                {cardsList.filter((c) => c.active).length} كارت
              </strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab('cards')}
                className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center gap-1"
              >
                إدارة الكروت
              </button>
              <button
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
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                  settings.cardsEnabled
                    ? 'bg-red-500/80 hover:bg-red-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                <Zap size={13} />
                {settings.cardsEnabled ? 'إيقاف الكروت' : 'تفعيل الكروت'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">إجمالي النقاط المتداولة</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {fmt(totalPointsInCirculation)}{' '}
              <span className="text-xs text-amber-600 font-bold">نقطة</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              تساوي تقريبًا {fmt(totalEstimatedValue)} ج.م
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">العملاء المشاركون</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {fmt(customers.length)} <span className="text-xs text-slate-500 font-bold">عميل</span>
            </p>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">
              {customers.filter((c) => c.loyaltyBalance > 0).length} لديهم رصيد نقاط نشط
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">مجموع النقاط المكتسبة</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {fmt(totalPointsEarned)} <span className="text-xs text-blue-600 font-bold">نقطة</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">من الطلبات والتسجيل</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ArrowDownRight size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">النقاط المستبدلة بالخصومات</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {fmt(totalPointsRedeemed)}{' '}
              <span className="text-xs text-purple-600 font-bold">نقطة</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">وفرت للعملاء تخفيضات</p>
          </div>
        </div>
      </div>

      {/* Tiers Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-black text-slate-900">مستويات العملاء والترقيات</h3>
            <p className="text-xs text-slate-500">
              يتدرج العميل بين المستويات كلما كسب نقاطاً أكثر، ويحصل على مضاعف نقاط ومزايا أعلى.
            </p>
          </div>
          <button
            onClick={() => setTab('settings')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            تخصيص المستويات
            <ChevronRight size={14} className="rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(settings.rules.tiers || DEFAULT_TIERS).map((tier) => {
            const membersCount = customers.filter(
              (c) => getCustomerTier(c.loyaltyBalance).id === tier.id
            ).length;
            return (
              <div
                key={tier.id}
                className="rounded-2xl border border-slate-200 p-5 relative overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{tier.badge}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white border border-slate-200 text-slate-700">
                    {tier.multiplier}x نقاط
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900">{tier.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">من {fmt(tier.minPoints)} نقطة</p>

                <div className="my-3 pt-3 border-t border-slate-200/60">
                  <p className="text-[11px] font-bold text-slate-600 mb-1.5">المزايا:</p>
                  <ul className="space-y-1">
                    {tier.benefits.map((b, i) => (
                      <li key={i} className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Check size={12} className="text-emerald-600 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">العملاء الحاليين:</span>
                  <span className="font-bold text-slate-900">{membersCount} عميل</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Customers & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              <h3 className="text-sm font-black text-slate-900">أعلى العملاء رصيدًا للنقاط</h3>
            </div>
            <button
              onClick={() => setTab('customers')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              عرض الكل ({customers.length})
            </button>
          </div>

          {customers.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">لا يوجد عملاء حتى الآن</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customers
                .slice()
                .sort((a, b) => b.loyaltyBalance - a.loyaltyBalance)
                .slice(0, 5)
                .map((c, idx) => {
                  const tier = getCustomerTier(c.loyaltyBalance);
                  return (
                    <div key={c.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-xs font-black text-slate-400">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{c.name}</p>
                          <p className="text-[10px] text-slate-500">{c.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {tier.badge} {tier.name}
                        </span>
                        <span className="text-xs font-black text-amber-600">
                          {fmt(c.loyaltyBalance)} نقطة
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-blue-500" />
              <h3 className="text-sm font-black text-slate-900">آخر حركات وسجل النقاط</h3>
            </div>
            <button
              onClick={() => setTab('ledger')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              سجل العمليات بالكامل
            </button>
          </div>

          {ledger.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">لم تسجل أي حركة نقاط بعد</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ledger.slice(0, 5).map((l) => {
                const cust = customers.find((c) => c.id === l.customerId);
                const isEarn = l.delta > 0;
                return (
                  <div key={l.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isEarn ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
                      >
                        {isEarn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {cust ? cust.name : 'عميل'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {l.reason} • {d(l.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-black ${isEarn ? 'text-emerald-600' : 'text-red-500'}`}
                    >
                      {isEarn ? `+${fmt(l.delta)}` : fmt(l.delta)} نقطة
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyOverviewTab;
