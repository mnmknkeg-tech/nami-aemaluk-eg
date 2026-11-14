'use client';

import React from 'react';
import {
  Gift,
  Crown,
  Plus,
  Edit,
  Trash2,
  Search,
  Zap,
  CreditCard,
  Ticket,
  Share2,
  Eye,
} from 'lucide-react';
import type { CustomerItem, LoyaltyCard, LoyaltySettings } from './types';

export interface LoyaltyCardsTabProps {
  settings: LoyaltySettings;
  setSettings: React.Dispatch<React.SetStateAction<LoyaltySettings>>;
  saveSettings: any;
  cardsList: any;
  setSelectedCardForStamp: React.Dispatch<React.SetStateAction<LoyaltyCard | null>>;
  setStampCustomerId: React.Dispatch<React.SetStateAction<string>>;
  customers: CustomerItem[];
  setStampSuccessMsg: React.Dispatch<React.SetStateAction<string>>;
  setStampModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingCard: React.Dispatch<React.SetStateAction<LoyaltyCard | null>>;
  setCardForm: React.Dispatch<React.SetStateAction<LoyaltyCard>>;
  setCardModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteCard: any;
  handleToggleCardActive: any;
  cardCustomerSearch: string;
  setCardCustomerSearch: React.Dispatch<React.SetStateAction<string>>;
  handleClaimRewardAndReset: any;
  handleQuickStamp: any;
  handleQuickDeductStamp: any;
  setPreviewCustomer: React.Dispatch<React.SetStateAction<CustomerItem | null>>;
  setPreviewCard: React.Dispatch<React.SetStateAction<LoyaltyCard | null>>;
  setPreviewCardModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  copyCardLink: any;
}

const LoyaltyCardsTab: React.FC<LoyaltyCardsTabProps> = ({
  settings,
  setSettings,
  saveSettings,
  cardsList,
  setSelectedCardForStamp,
  setStampCustomerId,
  customers,
  setStampSuccessMsg,
  setStampModalOpen,
  setEditingCard,
  setCardForm,
  setCardModalOpen,
  handleDeleteCard,
  handleToggleCardActive,
  cardCustomerSearch,
  setCardCustomerSearch,
  handleClaimRewardAndReset,
  handleQuickStamp,
  handleQuickDeductStamp,
  setPreviewCustomer,
  setPreviewCard,
  setPreviewCardModalOpen,
  copyCardLink,
}) => {
  return (
    <div className="space-y-6">
      {/* System Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CreditCard size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">
                نظام كروت وبطاقات الولاء الرقمية
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                  settings.cardsEnabled
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {settings.cardsEnabled ? 'النظام مفعل ويعمل للعملاء' : 'النظام متوقف مؤقتًا'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              أصدر بطاقات أختام ذكية لعملائك، كافئهم عند كل زيارة أو طلب، وعزز تكرار الشراء.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              settings.cardsEnabled
                ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Zap size={14} />
            {settings.cardsEnabled ? 'إيقاف نظام الكروت' : 'تفعيل نظام الكروت الآن'}
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cardsList.map((card) => {
          const stampsArr = Array.from({ length: card.totalStamps });
          return (
            <div
              key={card.id}
              className={`relative rounded-3xl border transition-all overflow-hidden bg-gradient-to-br ${card.color} text-white p-6 shadow-md flex flex-col justify-between min-h-[300px] ${
                !card.active ? 'opacity-60 grayscale-[40%]' : ''
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white backdrop-blur-sm">
                      {card.totalStamps} أختام للمكافأة
                    </span>
                    <h4 className="text-base font-black text-white mt-2">{card.title}</h4>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shrink-0">
                    <Gift size={20} />
                  </div>
                </div>
                <p className="text-xs text-white/80 line-clamp-2 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Stamps Visual Grid */}
              <div className="my-5 p-3.5 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-[11px] font-bold text-white/80 mb-2.5">
                  <span>الأختام المطلوبة:</span>
                  <span className="text-amber-300 font-black">{card.rewardText}</span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                  {stampsArr.map((_, sIdx) => {
                    const isFinal = sIdx === card.totalStamps - 1;
                    return (
                      <div
                        key={sIdx}
                        className={`aspect-square rounded-xl flex items-center justify-center font-black text-xs border transition-all ${
                          isFinal
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                            : 'bg-white/10 border-white/20 text-white/90'
                        }`}
                        title={isFinal ? 'ختم الهدية والمكافأة الأخيرة' : `ختم رقم ${sIdx + 1}`}
                      >
                        {isFinal ? <Crown size={15} /> : sIdx + 1}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-white/15 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedCardForStamp(card);
                      setStampCustomerId(customers[0]?.id || '');
                      setStampSuccessMsg('');
                      setStampModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Ticket size={13} />
                    منح ختم
                  </button>
                  <button
                    onClick={() => {
                      setEditingCard(card);
                      setCardForm({ ...card });
                      setCardModalOpen(true);
                    }}
                    className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
                    title="تعديل الكارت"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-1.5 rounded-xl bg-white/15 hover:bg-red-500/80 text-white transition-colors"
                    title="حذف الكارت"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <button
                  onClick={() => handleToggleCardActive(card.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                    card.active
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                      : 'bg-white/10 text-white/60 border-white/20'
                  }`}
                >
                  {card.active ? 'الكارت نشط ✓' : 'الكارت معطل'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Stamps Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Ticket size={18} className="text-indigo-600" />
              إدارة كروت وأختام العملاء — تحكم فوري للتاجر
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              اختم للعميل بنقرة واحدة، سلمه المكافأة عند الإكمال، وشاركه رابط بطاقته الرقمية الخاصة
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={cardCustomerSearch}
              onChange={(e) => setCardCustomerSearch(e.target.value)}
              placeholder="بحث باسم العميل أو الهاتف..."
              className="w-full h-9 pr-8 pl-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Search size={14} className="absolute right-2.5 top-2.5 text-slate-400" />
          </div>
        </div>

        {customers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            لا يوجد عملاء بعد لتتبع بطاقات الأختام
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {customers
              .filter((c) => {
                if (!cardCustomerSearch.trim()) return true;
                const q = cardCustomerSearch.trim().toLowerCase();
                return c.name.toLowerCase().includes(q) || c.phone.includes(q);
              })
              .map((c) => {
                const custStamps = settings.rules.customerCardStamps?.[c.id] || {};
                const completedCycles = settings.rules.customerCompletedCycles?.[c.id] || {};
                return (
                  <div
                    key={c.id}
                    className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Customer Info */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0 shadow-sm">
                        {c.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{c.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {c.phone} • رصيد نقاط:{' '}
                          <strong className="text-amber-600 font-black">{c.loyaltyBalance}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Customer Cards & Quick Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                      {cardsList.map((card) => {
                        const current = custStamps[card.id] || 0;
                        const cycles = completedCycles[card.id] || 0;
                        const completed = current >= card.totalStamps;
                        return (
                          <div
                            key={card.id}
                            className={`p-2.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center gap-3 ${
                              completed
                                ? 'bg-amber-50/90 border-amber-300 text-amber-900 ring-2 ring-amber-400/30'
                                : current > 0
                                  ? 'bg-purple-50/50 border-purple-200 text-purple-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="min-w-[130px]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs">{card.title}</span>
                                {completed && (
                                  <Crown size={14} className="text-amber-600 animate-bounce" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-black text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200/80 shadow-2xs">
                                  {current} / {card.totalStamps} ختم
                                </span>
                                {cycles > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    أكمل {cycles} مرات
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quick Buttons for Merchant */}
                            <div className="flex items-center gap-1.5">
                              {completed ? (
                                <button
                                  onClick={() => handleClaimRewardAndReset(c.id, card.id)}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                                  title="تسليم المكافأة وإعادة فتح الكارت لدورة جديدة"
                                >
                                  <Gift size={13} />
                                  تسليم الهدية
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleQuickStamp(c.id, card.id)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                  title="منح ختم سريع للعميل مع هذا الطلب"
                                >
                                  <Plus size={13} />
                                  ختم
                                </button>
                              )}

                              {current > 0 && (
                                <button
                                  onClick={() => handleQuickDeductStamp(c.id, card.id)}
                                  className="w-7 h-7 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors"
                                  title="خصم ختم (تراجع)"
                                >
                                  -
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setPreviewCustomer(c);
                                  setPreviewCard(card);
                                  setPreviewCardModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors"
                                title="معاينة كارت العميل الرقمي"
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                onClick={() => copyCardLink(c.id, card.id)}
                                className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-purple-600 transition-colors"
                                title="نسخ رابط كارت العميل لمشاركته معه"
                              >
                                <Share2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoyaltyCardsTab;
