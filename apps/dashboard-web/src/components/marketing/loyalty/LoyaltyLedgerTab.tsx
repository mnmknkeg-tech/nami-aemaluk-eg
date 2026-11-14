'use client';

import React from 'react';
import { Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { InvTableCard, InvRow, InvEmpty } from '@/components/inventory/InventoryShell';
import type { CustomerItem } from './types';

export interface LoyaltyLedgerTabProps {
  setLedgerFilter: React.Dispatch<React.SetStateAction<'all' | 'earn' | 'redeem' | 'manual'>>;
  ledgerFilter: 'all' | 'earn' | 'redeem' | 'manual';
  filteredLedger: any;
  customers: CustomerItem[];
  d: any;
  fmt: any;
}

const LoyaltyLedgerTab: React.FC<LoyaltyLedgerTabProps> = ({
  setLedgerFilter,
  ledgerFilter,
  filteredLedger,
  customers,
  d,
  fmt,
}) => {
  return (
    <div className="space-y-4">
      {/* Quick filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: 'كل الحركات' },
          { id: 'earn', label: 'النقاط المكتسبة (+)' },
          { id: 'redeem', label: 'النقاط المستبدلة (-)' },
          { id: 'manual', label: 'تعديل يدوي ومكافآت' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setLedgerFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              ledgerFilter === f.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <InvTableCard
        columns={[
          { label: 'التاريخ والوقت', className: 'col-span-2' },
          { label: 'العميل', className: 'col-span-3' },
          { label: 'حركة النقاط', className: 'col-span-2' },
          { label: 'الرصيد بعدها', className: 'col-span-2' },
          { label: 'السبب والمناسبة', className: 'col-span-2' },
          { label: 'المسؤول', className: 'col-span-1' },
        ]}
      >
        {filteredLedger.length === 0 ? (
          <InvEmpty
            icon={Coins}
            title="لا توجد حركات مسجلة — كل كسب أو استبدال للنقاط سيظهر تلقائياً في هذا السجل المالي"
          />
        ) : (
          filteredLedger.map((l) => {
            const cust = customers.find((c) => c.id === l.customerId);
            const isEarn = l.delta > 0;
            return (
              <InvRow key={l.id}>
                <div className="col-span-2 text-[11px] text-slate-500 font-medium">
                  {d(l.createdAt)}
                </div>

                <div className="col-span-3">
                  <p className="font-bold text-xs text-slate-900">
                    {cust ? cust.name : 'عميل غير مسجل'}
                  </p>
                  {cust && <p className="text-[10px] text-slate-400">{cust.phone}</p>}
                </div>

                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center gap-1 font-black text-xs px-2 py-0.5 rounded-full ${isEarn ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                  >
                    {isEarn ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {isEarn ? `+${fmt(l.delta)}` : fmt(l.delta)} نقطة
                  </span>
                </div>

                <div className="col-span-2 font-bold text-xs text-slate-700">
                  {fmt(l.balanceAfter)} نقطة
                </div>

                <div
                  className="col-span-2 text-xs text-slate-600 font-medium truncate"
                  title={l.reason}
                >
                  {l.reason}
                </div>

                <div className="col-span-1 text-[11px] text-slate-500 font-medium">
                  {l.staffName || 'النظام'}
                </div>
              </InvRow>
            );
          })
        )}
      </InvTableCard>
    </div>
  );
};

export default LoyaltyLedgerTab;
