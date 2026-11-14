import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Pause, Play, Search, Trash2, X } from 'lucide-react';
import type { HeldOrder } from '../../lib/pos-utils';

type Customer = {
  id: string;
  name?: string | null;
  phone?: string | null;
};

type Props = {
  isArabic: boolean;
  showSuccess: boolean;
  isCustomerCardOpen: boolean;
  customerName: string;
  setCustomerName: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  onCloseCustomerCard: () => void;
  isCustomerListOpen: boolean;
  onCloseCustomerList: () => void;
  customerSearchQuery: string;
  setCustomerSearchQuery: (value: string) => void;
  savedCustomers: Customer[];
  isLoadingCustomers: boolean;
  onSelectCustomer: (customer: Customer) => void;
  showHeldOrders: boolean;
  heldOrders: HeldOrder[];
  onCloseHeldOrders: () => void;
  onResumeHeldOrder: (id: string) => void;
  onDeleteHeldOrder: (id: string) => void;
};

const MotionDiv = motion.div;

export default function PosCustomerAndHeldModals({
  isArabic,
  showSuccess,
  isCustomerCardOpen,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  onCloseCustomerCard,
  isCustomerListOpen,
  onCloseCustomerList,
  customerSearchQuery,
  setCustomerSearchQuery,
  savedCustomers,
  isLoadingCustomers,
  onSelectCustomer,
  showHeldOrders,
  heldOrders,
  onCloseHeldOrders,
  onResumeHeldOrder,
  onDeleteHeldOrder,
}: Props) {
  const query = customerSearchQuery.trim().toLowerCase();
  const filteredCustomers = savedCustomers.filter((customer) => {
    if (!query) return true;
    return (
      String(customer.name || '')
        .toLowerCase()
        .includes(query) || String(customer.phone || '').includes(query)
    );
  });

  return (
    <>
      <AnimatePresence>
        {showSuccess && (
          <MotionDiv
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-sm"
          >
            <div className="bg-white rounded-[3rem] p-6 sm:p-8 md:p-12 text-center shadow-2xl">
              <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-black">{isArabic ? 'تم بنجاح!' : 'Success!'}</h3>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomerCardOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={onCloseCustomerCard}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black">{isArabic ? 'بيانات العميل' : 'Customer'}</h3>
                <button
                  type="button"
                  onClick={onCloseCustomerCard}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-xs font-black text-slate-500">
                    {isArabic ? 'الاسم (اختياري)' : 'Name (optional)'}
                  </div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder={isArabic ? 'اسم العميل' : 'Customer name'}
                    className="w-full bg-white border rounded-2xl py-3 px-4 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-black text-slate-500">
                    {isArabic ? 'الهاتف' : 'Phone'}
                  </div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full bg-white border rounded-2xl py-3 px-4 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerName('');
                    setCustomerPhone('');
                    onCloseCustomerCard();
                  }}
                  className="py-3 rounded-2xl bg-slate-50 text-slate-700 font-black"
                >
                  {isArabic ? 'مسح' : 'Clear'}
                </button>
                <button
                  type="button"
                  onClick={onCloseCustomerCard}
                  className="py-3 rounded-2xl bg-slate-900 text-white font-black"
                >
                  {isArabic ? 'حفظ' : 'Save'}
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomerListOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={onCloseCustomerList}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black">{isArabic ? 'اختر عميل' : 'Select Customer'}</h3>
                <button
                  type="button"
                  onClick={onCloseCustomerList}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={isArabic ? 'بحث عن عميل...' : 'Search customers...'}
                  className="w-full bg-slate-50 border rounded-xl py-2.5 pr-9 pl-4 outline-none text-sm text-right focus:ring-2 focus:ring-[#BD00FF]"
                  value={customerSearchQuery}
                  onChange={(event) => setCustomerSearchQuery(event.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 select-none">
                {isLoadingCustomers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-slate-400" size={24} />
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center text-slate-400 py-8 font-bold text-sm">
                    {isArabic ? 'لا يوجد عملاء' : 'No customers'}
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => onSelectCustomer(customer)}
                      className="w-full text-right p-3 rounded-xl border border-slate-100 hover:border-[#BD00FF] bg-slate-50/50 hover:bg-[#BD00FF]/5 transition-all flex flex-col gap-1"
                    >
                      <div className="font-black text-sm text-slate-900 flex justify-between flex-row-reverse w-full items-center">
                        <span>{customer.name || (isArabic ? 'بدون اسم' : 'Unnamed')}</span>
                        <span className="text-xs font-bold text-slate-400">{customer.phone}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHeldOrders && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[950] bg-black/40 flex items-center justify-center p-4"
            onClick={onCloseHeldOrders}
          >
            <MotionDiv
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-[2rem] p-5 flex flex-col max-h-[85vh] overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 flex-row-reverse">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Pause size={18} className="text-amber-500" />{' '}
                  {isArabic ? 'الطلبات المعلقة' : 'Held Orders'}
                </h3>
                <button
                  type="button"
                  onClick={onCloseHeldOrders}
                  className="p-2 rounded-xl hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              {heldOrders.length === 0 ? (
                <div className="text-center text-slate-400 py-12 font-bold text-sm">
                  {isArabic ? 'لا توجد طلبات معلقة' : 'No held orders'}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
                  {heldOrders.map((heldOrder) => {
                    const cart = Array.isArray(heldOrder.cart) ? heldOrder.cart : [];
                    const total = cart.reduce(
                      (sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 0),
                      0
                    );
                    return (
                      <div
                        key={heldOrder.id}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-amber-50/40 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2 flex-row-reverse">
                          <div className="font-black text-sm text-slate-900">
                            {isArabic ? 'طلب معلق' : 'Held order'}
                            <span className="text-[10px] text-slate-400 mr-2">
                              {new Date(heldOrder.savedAt).toLocaleTimeString('ar-EG')}
                            </span>
                          </div>
                          <div className="font-black text-sm text-[#BD00FF]">
                            ج.م {total.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold mb-2">
                          {cart.length} {isArabic ? 'عنصر' : 'items'}
                          {heldOrder.customerName ? ` · ${heldOrder.customerName}` : ''}
                          {heldOrder.customerPhone ? ` · ${heldOrder.customerPhone}` : ''}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onResumeHeldOrder(heldOrder.id)}
                            className="py-2 rounded-xl bg-emerald-500 text-white font-black text-xs hover:bg-emerald-600 flex items-center justify-center gap-1.5"
                          >
                            <Play size={14} /> {isArabic ? 'استئناف' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteHeldOrder(heldOrder.id)}
                            className="py-2 rounded-xl bg-red-50 text-red-600 font-black text-xs hover:bg-red-100 flex items-center justify-center gap-1.5"
                          >
                            <Trash2 size={14} /> {isArabic ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
}
