'use client';

import React from 'react';
import { ShoppingBag, CheckCircle2, CreditCard, Wallet, Trophy, Star } from 'lucide-react';
import type { ShopCustomer } from './meta';

type Props = {
  customer: ShopCustomer;
  completedOrdersCount: number;
  currency: string;
  onShowAllOrders: () => void;
  onOpenWallet: () => void;
  onOpenLoyaltyAdjust: () => void;
};

export default function StatsCards({
  customer,
  completedOrdersCount,
  currency,
  onShowAllOrders,
  onOpenWallet,
  onOpenLoyaltyAdjust,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {/* 1. جميع الطلبات */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">جميع الطلبات</span>
          <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-[#492770] flex items-center justify-center">
            <ShoppingBag size={16} />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
          {customer.totalOrders ?? 0}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
          <span>طلب واحد قيد التنفيذ</span>
          <button
            type="button"
            onClick={onShowAllOrders}
            className="text-[#492770] font-bold hover:underline"
          >
            عرض الكل
          </button>
        </div>
      </div>

      {/* 2. الطلبات المكتملة */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">الطلبات المكتملة</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
          {completedOrdersCount || Math.min(customer.totalOrders || 0, 0)}
        </div>
        <div className="text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
          آخر طلب مكتمل مؤخراً
        </div>
      </div>

      {/* 3. إجمالي المصروفات */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">إجمالي المصروفات</span>
          <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center">
            <CreditCard size={16} />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
          {customer.totalSpent.toLocaleString()} {currency}
        </div>
        <div className="text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
          دفع نقداً أو ببطاقة الائتمان
        </div>
      </div>

      {/* 4. رصيد المحفظة */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">رصيد المحفظة</span>
          <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center">
            <Wallet size={16} />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
          {customer.balanceDue < 0 ? Math.abs(customer.balanceDue).toLocaleString() : 0} {currency}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
          <span>0% من التكلفة العامة</span>
          <button
            type="button"
            onClick={onOpenWallet}
            className="text-[#492770] font-bold hover:underline"
          >
            سجل
          </button>
        </div>
      </div>

      {/* 5. نقاط الولاء */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">نقاط الولاء</span>
          <div className="w-8 h-8 rounded-xl bg-yellow-100/70 text-yellow-700 flex items-center justify-center">
            <Trophy size={16} />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">
          {customer.loyaltyBalance ?? 0}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
          <span>0 نقطة معلقة</span>
          <button
            type="button"
            onClick={onOpenLoyaltyAdjust}
            className="text-[#492770] font-bold hover:underline"
          >
            سجل
          </button>
        </div>
      </div>

      {/* 6. مكافآت التقييمات */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500">مكافآت التقييمات</span>
          <div className="w-8 h-8 rounded-xl bg-rose-100/70 text-rose-700 flex items-center justify-center">
            <Star size={16} />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900 tabular-nums mb-1">—</div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
          <span>مكافأة لكل تقييم موثق</span>
          <button
            type="button"
            onClick={() => alert('مكافآت التقييمات مفعلة تلقائياً')}
            className="text-[#492770] font-bold hover:underline"
          >
            سجل
          </button>
        </div>
      </div>
    </div>
  );
}
