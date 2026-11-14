'use client';

import React from 'react';
import { Gift, Crown, X, Check, Eye, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import type { CustomerItem, LoyaltyCard, LoyaltySettings } from './types';

export interface LoyaltyDigitalCardPreviewModalProps {
  settings: LoyaltySettings;
  previewCustomer: CustomerItem | null;
  previewCard: LoyaltyCard | null;
  getCustomerCardUrl: any;
  shopId: string;
  setPreviewCardModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCopiedLink: React.Dispatch<React.SetStateAction<boolean>>;
  copiedLink: boolean;
}

const LoyaltyDigitalCardPreviewModal: React.FC<LoyaltyDigitalCardPreviewModalProps> = ({
  settings,
  previewCustomer,
  previewCard,
  getCustomerCardUrl,
  shopId,
  setPreviewCardModalOpen,
  setCopiedLink,
  copiedLink,
}) => {
  return (() => {
    const currentStamps =
      settings.rules.customerCardStamps?.[previewCustomer.id]?.[previewCard.id] || 0;
    const total = previewCard.totalStamps;
    const isComplete = currentStamps >= total;
    const remaining = Math.max(0, total - currentStamps);
    const cardLink = getCustomerCardUrl(shopId, previewCustomer.id, previewCard.id);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        onClick={() => setPreviewCardModalOpen(false)}
      >
        <div
          className="bg-slate-900 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-5 border border-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Eye size={18} className="text-purple-400" />
              <div>
                <h3 className="font-black text-sm text-white">معاينة بطاقة ولاء العميل</h3>
                <p className="text-[11px] text-slate-400">
                  هكذا يظهر الكارت للعميل على هاتفه المحمول (عرض فقط)
                </p>
              </div>
            </div>
            <button
              onClick={() => setPreviewCardModalOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* The Digital Card Simulation */}
          <div
            className={`rounded-3xl p-6 bg-gradient-to-br ${previewCard.color} text-white shadow-xl border border-white/20 relative overflow-hidden`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 backdrop-blur-xs text-white">
                  بطاقة ولاء رقمية
                </span>
                <h4 className="text-lg font-black text-white mt-1">{previewCard.title}</h4>
                <p className="text-xs text-white/80 font-medium">العميل: {previewCustomer.name}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white">
                <Crown size={24} />
              </div>
            </div>

            {/* Stamps Container */}
            <div className="my-5 p-4 bg-black/25 backdrop-blur-xs rounded-2xl border border-white/10">
              <div className="flex items-center justify-between text-xs font-bold mb-3">
                <span>
                  الأختام المجمعة:{' '}
                  <strong className="text-amber-300 font-black">
                    {currentStamps} من {total}
                  </strong>
                </span>
                <span className="text-[11px] text-white/90">
                  {isComplete ? '🎉 الكارت مكتمل!' : `باقي ${remaining} ختم`}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2.5">
                {Array.from({ length: total }).map((_, idx) => {
                  const isStamped = idx < currentStamps;
                  const isFinal = idx === total - 1;
                  return (
                    <div
                      key={idx}
                      className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                        isStamped
                          ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300 scale-105'
                          : isFinal
                            ? 'bg-white/15 border-2 border-dashed border-amber-300/80 text-amber-200'
                            : 'bg-white/10 border border-white/20 text-white/60'
                      }`}
                    >
                      {isStamped ? (
                        <Check size={16} className="stroke-[3]" />
                      ) : isFinal ? (
                        <Gift size={16} />
                      ) : (
                        idx + 1
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card Reward Description */}
            <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
              <div>
                <span className="text-white/70 text-[10px] block">المكافأة عند الاكتمال:</span>
                <span className="font-black text-amber-300">{previewCard.rewardText}</span>
              </div>
              <div className="text-right">
                <span className="text-white/70 text-[10px] block">رقم العضوية:</span>
                <span className="font-mono font-bold text-white/90">
                  #{previewCustomer.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Alert */}
          {isComplete ? (
            <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-amber-200 font-bold">
              <Gift size={18} className="text-amber-400 shrink-0" />
              <span>
                العميل مؤهل لاستلام هديته الآن! يمكنك تسليمها وإعادة فتح الكارت من اللوحة.
              </span>
            </div>
          ) : (
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-slate-300">
              <span>نسبة إنجاز الكارت:</span>
              <strong className="text-purple-300 font-black">
                {Math.round((currentStamps / total) * 100)}%
              </strong>
            </div>
          )}

          {/* Share & Link Actions */}
          <div className="pt-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (cardLink) {
                    navigator.clipboard.writeText(cardLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }
                }}
                className="flex-1 h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink ? 'تم نسخ الرابط ✓' : 'نسخ رابط الكارت للعميل'}
              </button>

              {previewCustomer.phone && (
                <a
                  href={`https://wa.me/${previewCustomer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `مرحباً ${previewCustomer.name}، بطاقة الولاء الخاصة بك في متجرنا أصبحت جاهزة! تابع أختامك وهداياك من هنا: ${cardLink}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <MessageCircle size={15} />
                  واتساب
                </a>
              )}
            </div>

            <a
              href={cardLink}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink size={13} />
              فتح صفحة العميل في نافذة جديدة
            </a>
          </div>
        </div>
      </div>
    );
  })();
};

export default LoyaltyDigitalCardPreviewModal;
