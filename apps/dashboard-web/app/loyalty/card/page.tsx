'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Crown,
  Check,
  Gift,
  Sparkles,
  QrCode,
  ShieldCheck,
  Store,
  Clock,
  Award,
  RefreshCw,
  Coins,
  AlertCircle,
} from 'lucide-react';

type LoyaltyCardData = {
  id: string;
  title: string;
  description: string;
  totalStamps: number;
  rewardText: string;
  minSpendPerStamp?: number;
  color: string;
};

// Safe decoder for encrypted/tokenized card URLs
function decodeCardToken(tokenStr: string) {
  try {
    const padded = tokenStr.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = decodeURIComponent(escape(atob(padded)));
    const parsed = JSON.parse(decoded);
    return {
      shopId: String(parsed.s || parsed.shopId || ''),
      customerId: String(parsed.c || parsed.customerId || ''),
      cardId: String(parsed.k || parsed.cardId || ''),
    };
  } catch {
    return null;
  }
}

function CustomerLoyaltyCardContent() {
  const searchParams = useSearchParams();

  // Support both tokenized URL (?t=...) and direct params
  const tokenParam = searchParams.get('t') || searchParams.get('token') || '';
  const decoded = useMemo(() => (tokenParam ? decodeCardToken(tokenParam) : null), [tokenParam]);

  const shopId = decoded?.shopId || searchParams.get('shopId') || '';
  const customerId = decoded?.customerId || searchParams.get('customerId') || '';
  const cardId = decoded?.cardId || searchParams.get('cardId') || '';

  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState('المتجر');
  const [card, setCard] = useState<LoyaltyCardData | null>(null);
  const [stampsCount, setStampsCount] = useState(0);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsEnabled, setPointsEnabled] = useState(true);
  const [cardsEnabled, setCardsEnabled] = useState(true);

  const loadCardData = async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch loyalty settings
      const res = await fetch(`/api/v1/customers/shops/${shopId}/loyalty/settings`).catch(
        () => null
      );
      if (res && res.ok) {
        const json = await res.json();
        const data = json.data || json;

        // Check systems active state
        const ptsActive =
          data.rules?.pointsEnabled !== undefined
            ? Boolean(data.rules.pointsEnabled)
            : Boolean(data.enabled ?? true);
        const crdsActive =
          data.rules?.cardsEnabled !== undefined ? Boolean(data.rules.cardsEnabled) : true;

        setPointsEnabled(ptsActive);
        setCardsEnabled(crdsActive);

        const cards: any[] = data.rules?.cards || [];
        const foundCard = cards.find((c) => c.id === cardId) || cards[0];
        if (foundCard) {
          setCard({
            id: foundCard.id,
            title: foundCard.title,
            description: foundCard.description,
            totalStamps: foundCard.totalStamps || 6,
            rewardText: foundCard.rewardText || 'مكافأة خاصة',
            minSpendPerStamp: foundCard.minSpendPerStamp,
            color: foundCard.color || 'from-amber-600 via-amber-700 to-amber-900',
          });
        }

        // Stamps count (only if cards enabled by merchant)
        if (crdsActive && customerId && data.rules?.customerCardStamps?.[customerId]) {
          const targetCardId = foundCard ? foundCard.id : cardId;
          const count = data.rules.customerCardStamps[customerId]?.[targetCardId] || 0;
          setStampsCount(count);
        } else {
          setStampsCount(0);
        }
      }

      // 2. Fetch customer info if points enabled (if merchant disabled points, balance is strictly 0)
      if (customerId) {
        const custRes = await fetch(`/api/v1/shops/${shopId}/customers/${customerId}`).catch(
          () => null
        );
        if (custRes && custRes.ok) {
          const cJson = await custRes.json();
          const cust = cJson.data || cJson;
          setPointsBalance(cust.loyaltyBalance || cust.loyalty_balance || 0);
        }
      }

      // 3. Try fetching public shop name
      const shopRes = await fetch(`/api/v1/shops/${shopId}`).catch(() => null);
      if (shopRes && shopRes.ok) {
        const sJson = await shopRes.json();
        if (sJson.data?.name) setShopName(sJson.data.name);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCardData();
  }, [shopId, customerId, cardId]);

  const total = card?.totalStamps || 6;
  const isComplete = stampsCount >= total;
  const remaining = Math.max(0, total - stampsCount);

  // When merchant disables points system, client points balance is strictly 0
  const effectivePoints = pointsEnabled ? pointsBalance : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 mx-auto animate-pulse">
            <CreditCard size={24} />
          </div>
          <p className="text-xs font-bold text-slate-400">جاري تحميل بطاقة الولاء الرقمية...</p>
        </div>
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full space-y-3 text-white">
          <AlertCircle size={36} className="text-amber-400 mx-auto" />
          <h2 className="text-base font-black">رابط البطاقة غير صحيح أو منتهي</h2>
          <p className="text-xs text-slate-400">
            تأكد من فتح الرابط الصحيح الذي استلمته من المتجر.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none"
      dir="rtl"
    >
      {/* Container simulating a sleek Mobile Digital Wallet */}
      <div className="w-full max-w-sm space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-bold backdrop-blur-xs border border-white/10">
            <Store size={13} className="text-amber-400" />
            <span>{shopName}</span>
          </div>
          <h1 className="text-base font-black text-white">بطاقة الولاء والمكافآت الرقمية</h1>
          <p className="text-[11px] text-slate-400">
            أظهر هذه البطاقة للمسؤول عند كل عملية شراء لجمع أختامك واستلام هديتك
          </p>
        </div>

        {/* ─── SYSTEM STATUS: POINTS BALANCE BADGE ─── */}
        {pointsEnabled ? (
          <div className="p-3 bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-amber-400" />
              <div>
                <span className="text-[10px] text-amber-300 font-bold block">
                  رصيد نقاط الولاء:
                </span>
                <span className="text-sm font-black text-white">{effectivePoints} نقطة متاحة</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
              نظام النقاط نشط ✓
            </span>
          </div>
        ) : (
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Coins size={15} className="text-slate-500" />
              <span className="text-[11px] font-bold">رصيد النقاط:</span>
              <strong className="text-slate-300">0 نقطة</strong>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              نظام النقاط متوقف من المتجر
            </span>
          </div>
        )}

        {/* ─── CARDS SYSTEM: DIGITAL WALLET STAMP CARD ─── */}
        {cardsEnabled && card ? (
          <div
            className={`rounded-3xl p-6 bg-gradient-to-br ${
              card.color || 'from-amber-600 via-amber-700 to-amber-900'
            } shadow-2xl border border-white/20 relative overflow-hidden`}
          >
            {/* Card Top */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 backdrop-blur-xs text-white">
                  بطاقة أختام معتمدة ✓
                </span>
                <h2 className="text-lg font-black text-white mt-1.5">{card.title}</h2>
                <p className="text-xs text-white/80 line-clamp-2 mt-0.5">{card.description}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shrink-0">
                <Crown size={24} />
              </div>
            </div>

            {/* Stamps Box */}
            <div className="my-5 p-4 bg-black/25 backdrop-blur-xs rounded-2xl border border-white/10">
              <div className="flex items-center justify-between text-xs font-bold mb-3">
                <span>
                  أختامك:{' '}
                  <strong className="text-amber-300 font-black">
                    {stampsCount} من {total}
                  </strong>
                </span>
                <span className="text-[11px] text-white/90 font-medium">
                  {isComplete ? '🎉 مبروك! الكارت مكتمل' : `باقي ${remaining} أختام للهدية`}
                </span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
                {Array.from({ length: total }).map((_, idx) => {
                  const isStamped = idx < stampsCount;
                  const isFinal = idx === total - 1;
                  return (
                    <div
                      key={idx}
                      className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                        isStamped
                          ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300 scale-105'
                          : isFinal
                            ? 'bg-white/15 border-2 border-dashed border-amber-300/80 text-amber-200'
                            : 'bg-white/10 border border-white/20 text-white/50'
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

            {/* Card Footer Info */}
            <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
              <div>
                <span className="text-white/70 text-[10px] block">هدية إكمال الكارت:</span>
                <span className="font-black text-amber-300">{card.rewardText}</span>
              </div>
              {customerId && (
                <div className="text-left font-mono">
                  <span className="text-white/70 text-[10px] block">رقم العضوية:</span>
                  <span className="font-bold text-white/90 text-xs">#{customerId.slice(0, 8)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-1.5 text-slate-400 text-xs">
            <CreditCard size={24} className="text-slate-600 mx-auto" />
            <p className="font-bold text-slate-300">نظام كروت الولاء متوقف مؤقتًا</p>
            <p className="text-[11px] text-slate-500">
              المتجر يكتفي حالياً بنظام النقاط للمشتريات.
            </p>
          </div>
        )}

        {/* Completion Banner or Countdown */}
        {cardsEnabled && isComplete && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center mx-auto shadow-md">
              <Gift size={20} />
            </div>
            <p className="text-sm font-black text-amber-300">🎉 مبروك! كارتك مكتمل بنجاح</p>
            <p className="text-xs text-amber-200">
              أظهر هذا الكارت للمتجر لاستلام هديتك:{' '}
              <strong className="underline">{card?.rewardText}</strong>
            </p>
          </div>
        )}

        {/* QR Code / Membership Code for Cashier */}
        <div className="bg-white rounded-3xl p-5 text-slate-900 shadow-xl text-center space-y-3">
          <p className="text-xs font-bold text-slate-500">
            امسح الكود أو أظهره للمسؤول عند كل عملية شراء لختم كارتك
          </p>
          <div className="w-40 h-40 mx-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 p-3">
            <QrCode size={100} className="text-slate-900" />
            <span className="font-mono text-[10px] font-bold text-slate-500 tracking-wider">
              {customerId ? customerId.slice(0, 16) : 'CARD-MEMBER-LOYALTY'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 font-bold">
            <ShieldCheck size={14} />
            <span>بطاقة ولاء رقمية معتمدة من {shopName}</span>
          </div>
        </div>

        {/* Refresh button */}
        <div className="text-center pt-1">
          <button
            onClick={loadCardData}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            تحديث حالة الأختام
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLoyaltyCardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-bold text-xs">
          جاري التحميل...
        </div>
      }
    >
      <CustomerLoyaltyCardContent />
    </Suspense>
  );
}
