'use client';

import React from 'react';
import { Coins, Users } from 'lucide-react';
import {
  InvTableCard,
  InvRow,
  InvPagination,
  InvEmpty,
} from '@/components/inventory/InventoryShell';
import type { CustomerItem, LoyaltySettings } from './types';

export interface LoyaltyCustomersTabProps {
  paginatedCustomers: any;
  getCustomerTier: any;
  settings: LoyaltySettings;
  fmt: any;
  setSelectedCustomer: React.Dispatch<React.SetStateAction<CustomerItem | null>>;
  setAdjustType: React.Dispatch<React.SetStateAction<'add' | 'deduct'>>;
  setAdjustPoints: React.Dispatch<React.SetStateAction<number>>;
  setAdjustReason: React.Dispatch<React.SetStateAction<string>>;
  setAdjustError: React.Dispatch<React.SetStateAction<string>>;
  setAdjustModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  totalPages: any;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  filteredCustomers: any;
  itemsPerPage: any;
}

const LoyaltyCustomersTab: React.FC<LoyaltyCustomersTabProps> = ({
  paginatedCustomers,
  getCustomerTier,
  settings,
  fmt,
  setSelectedCustomer,
  setAdjustType,
  setAdjustPoints,
  setAdjustReason,
  setAdjustError,
  setAdjustModalOpen,
  totalPages,
  currentPage,
  setCurrentPage,
  filteredCustomers,
  itemsPerPage,
}) => {
  return (
    <div className="space-y-4">
      <InvTableCard
        columns={[
          { label: 'العميل', className: 'col-span-3' },
          { label: 'المستوى الحالي', className: 'col-span-2' },
          { label: 'رصيد النقاط', className: 'col-span-2' },
          { label: 'القيمة التقديرية', className: 'col-span-2' },
          { label: 'مضاعف الكسب', className: 'col-span-1' },
          { label: 'إجراءات', className: 'col-span-2 text-left' },
        ]}
      >
        {paginatedCustomers.length === 0 ? (
          <InvEmpty icon={Users} title="لم يتم العثور على أي عملاء" />
        ) : (
          paginatedCustomers.map((c) => {
            const tier = getCustomerTier(c.loyaltyBalance);
            const estValue = (c.loyaltyBalance / 100) * settings.redeemValuePer100;
            return (
              <InvRow key={c.id}>
                <div className="col-span-3">
                  <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{c.phone}</p>
                </div>

                <div className="col-span-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                    <span>{tier.badge}</span>
                    <span>{tier.name}</span>
                  </span>
                </div>

                <div className="col-span-2">
                  {settings.pointsEnabled ? (
                    <>
                      <span className="font-black text-sm text-amber-600">
                        {fmt(c.loyaltyBalance)}
                      </span>
                      <span className="text-[11px] text-slate-400 mr-1">نقطة</span>
                    </>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm text-slate-400">0</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                        متوقف
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-span-2 font-bold text-xs text-slate-700">
                  {estValue.toFixed(2)} ج.م
                </div>

                <div className="col-span-1 font-bold text-xs text-indigo-600">
                  {tier.multiplier}x
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedCustomer(c);
                      setAdjustType('add');
                      setAdjustPoints(50);
                      setAdjustReason('مكافأة خاصة للعميل');
                      setAdjustError('');
                      setAdjustModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Coins size={13} />
                    تعديل النقاط
                  </button>
                </div>
              </InvRow>
            );
          })
        )}
      </InvTableCard>

      {totalPages > 1 && (
        <InvPagination
          page={currentPage}
          totalPages={totalPages}
          onPage={setCurrentPage}
          total={filteredCustomers.length}
          perPage={itemsPerPage}
        />
      )}
    </div>
  );
};

export default LoyaltyCustomersTab;
