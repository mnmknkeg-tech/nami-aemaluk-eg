'use client';

import React from 'react';
import { X, Check, CheckCircle2, Ticket } from 'lucide-react';
import type { CustomerItem, LoyaltyCard, LoyaltySettings } from './types';

export interface LoyaltyStampModalProps {
  setStampModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  stampSuccessMsg: string;
  selectedCardForStamp: LoyaltyCard | null;
  cardsList: any;
  setSelectedCardForStamp: React.Dispatch<React.SetStateAction<LoyaltyCard | null>>;
  stampCustomerId: string;
  setStampCustomerId: React.Dispatch<React.SetStateAction<string>>;
  customers: CustomerItem[];
  settings: LoyaltySettings;
  handleAddStampToCustomer: any;
}

const LoyaltyStampModal: React.FC<LoyaltyStampModalProps> = ({
  setStampModalOpen,
  stampSuccessMsg,
  selectedCardForStamp,
  cardsList,
  setSelectedCardForStamp,
  stampCustomerId,
  setStampCustomerId,
  customers,
  settings,
  handleAddStampToCustomer,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in"
      onClick={() => setStampModalOpen(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-indigo-600" />
            <h3 className="font-black text-sm text-slate-900">منح ختم لبطاقة العميل</h3>
          </div>
          <button
            onClick={() => setStampModalOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {stampSuccessMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{stampSuccessMsg}</span>
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اختر الكارت</label>
            <select
              value={selectedCardForStamp.id}
              onChange={(e) => {
                const found = cardsList.find((c) => c.id === e.target.value);
                if (found) setSelectedCardForStamp(found);
              }}
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {cardsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.totalStamps} أختام)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اختر العميل</label>
            <select
              value={stampCustomerId}
              onChange={(e) => setStampCustomerId(e.target.value)}
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- حدد العميل لمنحه الختم --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || 'بدون هاتف'})
                </option>
              ))}
            </select>
          </div>

          {stampCustomerId && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900">الأختام الحالية للعميل:</span>
              <span className="font-black text-indigo-700 text-sm">
                {settings.rules.customerCardStamps?.[stampCustomerId]?.[selectedCardForStamp.id] ||
                  0}{' '}
                / {selectedCardForStamp.totalStamps}
              </span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setStampModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={!stampCustomerId}
            onClick={handleAddStampToCustomer}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check size={14} />
            تأكيد ومنح الختم الآن
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyStampModal;
