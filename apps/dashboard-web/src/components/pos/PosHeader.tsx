'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudOff,
  Pause,
  Play,
  Plus,
  Receipt,
  RotateCcw,
  ScanLine,
  UserPlus,
  UserRound,
} from 'lucide-react';
import PosProductToolbar from '@/components/pos/PosProductToolbar';

export interface PosHeaderProps {
  isArabic: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  categories: any[];
  categoryFilter: string;
  setCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
  showCategoryFilter: boolean;
  setShowCategoryFilter: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCustomerCardOpen: React.Dispatch<React.SetStateAction<boolean>>;
  customerPhone: string;
  handleOpenCustomerList: () => void;
  holdCurrentOrder: () => void;
  cart: readonly unknown[];
  setShowHeldOrders: React.Dispatch<React.SetStateAction<boolean>>;
  heldOrders: readonly unknown[];
  barcodeListening: boolean;
  setBarcodeListening: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCameraScanner: React.Dispatch<React.SetStateAction<boolean>>;
  isGated: boolean;
  posCashier: { id: string; name: string } | null;
  pendingCount: number;
  openInvoices: () => void;
  shiftStrip: {
    hours: number;
    minutes: number;
    totalSales: string;
    ordersCount: number;
    expectedDrawer: string;
  } | null;
  shiftOwnerName: string;
}

const PosHeader: React.FC<PosHeaderProps> = ({
  isArabic,
  searchInputRef,
  search,
  setSearch,
  categories,
  categoryFilter,
  setCategoryFilter,
  showCategoryFilter,
  setShowCategoryFilter,
  setIsCustomerCardOpen,
  customerPhone,
  handleOpenCustomerList,
  holdCurrentOrder,
  cart,
  setShowHeldOrders,
  heldOrders,
  barcodeListening,
  setBarcodeListening,
  setShowCameraScanner,
  isGated,
  posCashier,
  pendingCount,
  openInvoices,
  shiftStrip,
  shiftOwnerName,
}) => {
  return (
    <header className="p-3 md:p-6 bg-white border-b flex items-center gap-2 md:gap-4 flex-wrap">
      <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-xl shrink-0">
        <ChevronRight />
      </Link>
      <PosProductToolbar
        isArabic={isArabic}
        searchInputRef={searchInputRef}
        search={search}
        setSearch={setSearch}
        categories={categories}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        showCategoryFilter={showCategoryFilter}
        setShowCategoryFilter={setShowCategoryFilter}
      />
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsCustomerCardOpen(true)}
          className="bg-white border rounded-r-2xl py-3 px-4 w-32 md:w-36 outline-none flex items-center justify-center gap-2 font-black text-sm hover:bg-slate-50 border-l-0"
          title={isArabic ? 'بيانات العميل (F10)' : 'Customer (F10)'}
        >
          <UserPlus size={18} />
          {String(customerPhone || '').trim()
            ? isArabic
              ? 'تعديل'
              : 'Edit'
            : isArabic
              ? 'عميل'
              : 'Customer'}
        </button>
        <button
          type="button"
          onClick={handleOpenCustomerList}
          className="bg-white border rounded-l-2xl py-3 px-3 outline-none flex items-center justify-center hover:bg-slate-50 border-r-0 text-slate-500 hover:text-[#BD00FF]"
          title={isArabic ? 'اختيار عميل' : 'Select customer'}
        >
          <Plus size={18} />
        </button>
      </div>

      {/* POS feature buttons: hold, resume, barcode */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          type="button"
          onClick={holdCurrentOrder}
          disabled={cart.length === 0}
          className="p-2.5 md:p-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-all flex items-center gap-1.5 text-xs font-black text-amber-700 disabled:opacity-40"
          title={isArabic ? 'تعليق الطلب (F6)' : 'Hold order (F6)'}
        >
          <Pause size={16} className="md:hidden" />
          <Pause size={18} className="hidden md:block" />
          <span className="hidden md:inline">{isArabic ? 'تعليق' : 'Hold'}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowHeldOrders(true)}
          className="relative p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
          title={isArabic ? 'الطلبات المعلقة (F7)' : 'Held orders (F7)'}
        >
          <Play size={16} className="md:hidden" />
          <Play size={18} className="hidden md:block" />
          <span className="hidden md:inline">{isArabic ? 'معلقة' : 'Held'}</span>
          {heldOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {heldOrders.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setBarcodeListening((v) => !v)}
          className={`p-2.5 md:p-3 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-black ${barcodeListening ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
          title={isArabic ? 'قارئ الباركود USB (F8)' : 'USB barcode (F8)'}
        >
          <ScanLine size={16} className="md:hidden" />
          <ScanLine size={18} className="hidden md:block" />
          <span className="hidden md:inline">
            {barcodeListening ? (isArabic ? 'يعمل' : 'On') : isArabic ? 'باركود' : 'Scan'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowCameraScanner(true)}
          className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
          title={isArabic ? 'مسح بالكاميرا' : 'Camera scan'}
        >
          <Camera size={16} className="md:hidden" />
          <Camera size={18} className="hidden md:block" />
        </button>
      </div>

      {/* Quick action buttons — hidden while the shift/cashier gate is up */}
      {!isGated && (
        <div className="flex items-center gap-1.5 md:gap-2">
          {posCashier?.name && (
            <div
              className="p-2.5 md:p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-1.5 text-xs font-black text-[#BD00FF]"
              title={isArabic ? 'الكاشير الحالي' : 'Current cashier'}
            >
              <UserRound size={16} className="md:hidden" />
              <UserRound size={18} className="hidden md:block" />
              <span className="hidden md:inline">
                {isArabic ? `الكاشير: ${posCashier.name}` : `Cashier: ${posCashier.name}`}
              </span>
              <span className="md:hidden">{posCashier.name}</span>
            </div>
          )}
          {pendingCount > 0 && (
            <div
              className="p-2.5 md:p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-1.5 text-xs font-black text-amber-700"
              title={
                isArabic
                  ? 'طلبات محفوظة محليًا في انتظار المزامنة'
                  : 'Orders saved locally, pending sync'
              }
            >
              <CloudOff size={16} className="md:hidden" />
              <CloudOff size={18} className="hidden md:block" />
              <span className="hidden md:inline">
                {isArabic ? `${pendingCount} طلب معلق` : `${pendingCount} pending`}
              </span>
              <span className="md:hidden">{pendingCount}</span>
            </div>
          )}
          <button
            type="button"
            onClick={openInvoices}
            className="p-2.5 md:p-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#0098a8] hover:bg-[#00E5FF]/20 transition-all flex items-center gap-1.5 text-xs font-black"
            title={isArabic ? 'فواتير الكاشير — رجوع سريع وتعديل' : 'Cashier invoices'}
          >
            <Receipt size={16} className="md:hidden" />
            <Receipt size={18} className="hidden md:block" />
            <span className="hidden md:inline">{isArabic ? 'فواتير' : 'Invoices'}</span>
          </button>
          <Link
            href="/dashboard/sales"
            className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
            title={isArabic ? 'الفواتير' : 'Invoices'}
          >
            <Receipt size={16} className="md:hidden" />
            <Receipt size={18} className="hidden md:block" />
            <span className="hidden md:inline">{isArabic ? 'الفواتير' : 'Invoices'}</span>
          </Link>
          <Link
            href="/dashboard/sales"
            className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
            title={isArabic ? 'مرتجع من الطلبات' : 'Return from Orders'}
          >
            <RotateCcw size={16} className="md:hidden" />
            <RotateCcw size={18} className="hidden md:block" />
            <span className="hidden md:inline">
              {isArabic ? 'مرتجع من الطلبات' : 'Return from Orders'}
            </span>
          </Link>
          <Link
            href="/dashboard/pos/shifts"
            className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
            title={isArabic ? 'ورديتي' : 'My Shift'}
          >
            <Clock size={16} className="md:hidden" />
            <Clock size={18} className="hidden md:block" />
            <span className="hidden md:inline">{isArabic ? 'ورديتي' : 'Shift'}</span>
          </Link>
          <Link
            href="/dashboard/pos/reports"
            className="p-2.5 md:p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all flex items-center gap-1.5 text-xs font-black text-slate-600"
            title={isArabic ? 'تقرير' : 'Report'}
          >
            <BarChart3 size={16} className="md:hidden" />
            <BarChart3 size={18} className="hidden md:block" />
            <span className="hidden md:inline">{isArabic ? 'تقرير' : 'Report'}</span>
          </Link>
        </div>
      )}

      {/* Live shift strip — hidden while the gate is up or no active shift */}
      {!isGated && shiftStrip && (
        <Link
          href="/dashboard/pos/shifts"
          className="w-full flex items-center justify-between gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-[11px] font-black text-emerald-700 hover:bg-emerald-100/60 transition-all"
          title={isArabic ? 'فتح صفحة الورديات' : 'Open shifts'}
        >
          <span className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span>{isArabic ? 'الوردية مفتوحة' : 'Shift open'}</span>
            <span className="text-emerald-300">•</span>
            <span>{isArabic ? `الكاشير: ${shiftOwnerName}` : `Cashier: ${shiftOwnerName}`}</span>
            <span className="text-emerald-300">•</span>
            <span dir="ltr">
              ⏱{' '}
              {isArabic
                ? `${shiftStrip.hours}س ${shiftStrip.minutes}د`
                : `${shiftStrip.hours}h ${shiftStrip.minutes}m`}
            </span>
            <span className="text-emerald-300">•</span>
            <span>
              {isArabic
                ? `مبيعات: ج.م ${shiftStrip.totalSales}`
                : `Sales: EGP ${shiftStrip.totalSales}`}
            </span>
            <span className="text-emerald-300">•</span>
            <span>
              {isArabic ? `${shiftStrip.ordersCount} طلب` : `${shiftStrip.ordersCount} orders`}
            </span>
            <span className="text-emerald-300">•</span>
            <span>
              {isArabic
                ? `المتوقع في الدرج: ج.م ${shiftStrip.expectedDrawer}`
                : `Expected in drawer: EGP ${shiftStrip.expectedDrawer}`}
            </span>
          </span>
          <ChevronLeft size={14} className="shrink-0" />
        </Link>
      )}
    </header>
  );
};

export default PosHeader;
