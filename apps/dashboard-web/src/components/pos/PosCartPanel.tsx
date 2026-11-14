'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownCircle,
  Banknote,
  BarChart3,
  Calculator,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Crown,
  DollarSign,
  FileText,
  Gift,
  Mail,
  Minus,
  Plus,
  Printer,
  Receipt,
  Scale,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Table2,
  Tag,
  Trash2,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import type { PaymentMethod } from '@/lib/pos-utils';

const MotionDiv = motion.div as any;

type Props = Record<string, any>;

export default function PosCartPanel({
  addToCart,
  canCheckout,
  cart,
  discountAmount,
  discountType,
  discountValue,
  earnedPoints,
  editingOrder,
  giftCardAmount,
  giftCardApplied,
  handlePrintReceipt,
  handleReadScale,
  isArabic,
  isProcessing,
  loadReportData,
  loyaltyCfg,
  loyaltyRedeemValue,
  openXReport,
  openZReport,
  paymentMethod,
  priceLevel,
  processPayment,
  quickKeyProducts,
  redeemPoints,
  removeFromCart,
  removeGiftCard,
  scaleLoading,
  scaleReading,
  selectedTableId,
  showAdvanced,
  showAuditTrail,
  showDiscount,
  showPaymentMethods,
  showQuickKeys,
  showTipSection,
  signatureData,
  splitPayments,
  splitValidation,
  startPriceOverride,
  startSignatureDrawing,
  subtotal,
  tables,
  taxExempt,
  tipAmount,
  tipType,
  tipValue,
  total,
  updateQuantity,
  usingSplitPayment,
  vatAmount,
  vatRatePct,
  setCart,
  setCashMovementType,
  setDiscountType,
  setDiscountValue,
  setEditingOrder,
  setGiftCardApplied,
  setGiftCardCode,
  setIsProcessing,
  setLoyaltyCfg,
  setPaymentMethod,
  setPriceLevel,
  setRedeemPoints,
  setScaleLoading,
  setScaleReading,
  setSelectedTableId,
  setShowAdvanced,
  setShowCashMovement,
  setShowDiscount,
  setShowDrawerDeclaration,
  setShowEmailReceipt,
  setShowLayaway,
  setShowLoyaltySettings,
  setShowPaymentMethods,
  setShowPriceLevelMenu,
  setShowQuickKeys,
  setShowReceiptSettings,
  setShowSignature,
  setShowSplitPayment,
  setShowTables,
  setShowTipSection,
  setSignatureData,
  setSplitPayments,
  setTables,
  setTaxExempt,
  setTipType,
  setTipValue,
  setVatRatePct,
  SHOW_UNPUBLISHED,
  isRestaurant,
}: Props) {
  return (
    <>
      <div className="p-4 md:p-6 border-b border-slate-100 bg-white sticky top-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#BD00FF]/10 p-2.5 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-[#BD00FF]" />
            </div>
            <h2 className="text-xl md:text-2xl font-black">{isArabic ? 'السلة' : 'Cart'}</h2>
          </div>
          <span className="bg-slate-100 px-4 py-1.5 rounded-full text-xs font-black">
            {cart.length} {isArabic ? 'صنف' : 'items'}
          </span>
        </div>
        {editingOrder && (
          <div className="mt-3 flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <span className="text-[11px] font-black text-amber-700 flex items-center gap-1.5">
              <Receipt size={13} />
              {isArabic
                ? `بتعدّل الفاتورة #${String(editingOrder.id || '').slice(0, 8)} — عند الدفع هتترجع الأصلية وتتسجل الجديدة`
                : `Editing invoice #${String(editingOrder.id || '').slice(0, 8)}`}
            </span>
            <button
              type="button"
              onClick={() => setEditingOrder(null)}
              className="text-[10px] font-black text-amber-600 hover:text-amber-800 underline"
            >
              {isArabic ? 'إلغاء التعديل' : 'Cancel'}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        <AnimatePresence mode="popLayout">
          {cart.map((item) => (
            <MotionDiv
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              key={item.id}
              className="bg-white border border-slate-100 p-3 md:p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 text-right">
                  <h4 className="font-black text-slate-900 leading-tight mb-0.5 text-sm md:text-base">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <p className="text-[#BD00FF] font-black text-xs md:text-sm">
                      ج.م {Number(item.price || 0).toFixed(2)}
                    </p>
                    {item.priceOverride != null && (
                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                        {isArabic ? 'سعر مخصص' : 'custom'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => startPriceOverride(item.id)}
                      className="text-[10px] font-black text-slate-400 hover:text-[#BD00FF] transition-colors"
                      title={isArabic ? 'تعديل السعر' : 'Override price'}
                    >
                      <Tag size={11} className="inline" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-9 h-9 md:w-10 md:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:border-[#BD00FF] hover:text-[#BD00FF] transition-all active:scale-90"
                  >
                    <Plus size={18} />
                  </button>
                  <span className="font-black text-base md:text-lg w-6 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-9 h-9 md:w-10 md:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-all active:scale-90"
                  >
                    <Minus size={18} />
                  </button>
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900 text-sm md:text-base">
                    ج.م {(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
                  </p>
                </div>
              </div>
            </MotionDiv>
          ))}
        </AnimatePresence>

        {cart.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
            <ShoppingCart size={64} className="mb-4 opacity-20" />
            <p className="font-black text-lg">{isArabic ? 'السلة فارغة' : 'Cart is empty'}</p>
          </div>
        )}
      </div>

      <div className="p-3 md:p-6 bg-white border-t border-slate-100 space-y-3">
        {/* Discount */}
        {cart.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowDiscount((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-black text-slate-500 hover:text-slate-700 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <Tag size={14} />
                {isArabic ? 'خصم' : 'Discount'}
              </span>
              <span className="flex items-center gap-1.5">
                {discountAmount > 0 ? (
                  <span className="text-red-500">- ج.م {discountAmount.toFixed(2)}</span>
                ) : (
                  <span className="text-slate-300">{isArabic ? 'إضافة' : 'Add'}</span>
                )}
                {showDiscount ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </span>
            </button>
            <AnimatePresence>
              {showDiscount && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pb-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="text-xs font-black border rounded-xl px-2 py-2 outline-none bg-slate-50"
                    >
                      <option value="none">{isArabic ? 'بدون' : 'None'}</option>
                      <option value="percent">%</option>
                      <option value="fixed">{isArabic ? 'مبلغ' : 'Amount'}</option>
                    </select>
                    {discountType !== 'none' && (
                      <input
                        type="number"
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        placeholder={
                          discountType === 'percent' ? '%' : isArabic ? 'مبلغ' : 'Amount'
                        }
                        className="flex-1 text-xs font-black border rounded-xl px-3 py-2 outline-none bg-slate-50 text-center"
                        min={0}
                        max={discountType === 'percent' ? 100 : undefined}
                      />
                    )}
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Payment method */}
        {cart.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowPaymentMethods((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-black text-slate-500 hover:text-slate-700 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                {paymentMethod === 'cash' ? (
                  <Banknote size={14} />
                ) : paymentMethod === 'card' ? (
                  <CreditCard size={14} />
                ) : paymentMethod === 'wallet' ? (
                  <Wallet size={14} />
                ) : (
                  <Clock size={14} />
                )}
                {isArabic ? 'طريقة الدفع' : 'Payment Method'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-slate-700">
                  {paymentMethod === 'cash'
                    ? isArabic
                      ? 'كاش'
                      : 'Cash'
                    : paymentMethod === 'card'
                      ? isArabic
                        ? 'بطاقة'
                        : 'Card'
                      : paymentMethod === 'wallet'
                        ? isArabic
                          ? 'محفظة'
                          : 'Wallet'
                        : isArabic
                          ? 'آجل'
                          : 'Credit'}
                </span>
                {showPaymentMethods ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </span>
            </button>
            <AnimatePresence>
              {showPaymentMethods && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pb-2">
                    {(
                      [
                        { id: 'cash', label: isArabic ? 'كاش' : 'Cash', icon: Banknote },
                        { id: 'card', label: isArabic ? 'بطاقة' : 'Card', icon: CreditCard },
                        { id: 'wallet', label: isArabic ? 'محفظة' : 'Wallet', icon: Wallet },
                        { id: 'credit', label: isArabic ? 'آجل' : 'Credit', icon: Clock },
                      ] as const
                    ).map((pm) => {
                      const Icon = pm.icon;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(pm.id);
                            setShowPaymentMethods(false);
                          }}
                          className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-black transition-all ${paymentMethod === pm.id ? 'border-[#BD00FF] bg-[#BD00FF]/5 text-[#BD00FF]' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        >
                          <Icon size={16} />
                          {pm.label}
                        </button>
                      );
                    })}
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Advanced features — collapsible (closed by default) */}
        {cart.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={`w-full flex items-center justify-between text-xs font-black transition-colors py-1.5 px-2 rounded-xl border ${showAdvanced ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-1.5">
                <Sliders size={14} />
                {isArabic ? 'خيارات متقدمة' : 'Advanced options'}
              </span>
              <span className="flex items-center gap-1.5">
                {!showAdvanced &&
                  (usingSplitPayment ||
                    taxExempt ||
                    priceLevel !== 'retail' ||
                    (loyaltyCfg.enabled && redeemPoints > 0)) && (
                    <span
                      className="w-2 h-2 rounded-full bg-[#BD00FF]"
                      title={isArabic ? 'خيارات مفعّلة' : 'Active'}
                    />
                  )}
                {showAdvanced ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </span>
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    <button
                      type="button"
                      onClick={() => setShowSplitPayment((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${usingSplitPayment ? 'bg-[#BD00FF]/10 border-[#BD00FF] text-[#BD00FF]' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'تقسيم الدفع' : 'Split payment'}
                    >
                      <CreditCard size={12} /> {isArabic ? 'تقسيم' : 'Split'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDiscount((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${discountAmount > 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'إكرامية' : 'Tip'}
                    >
                      <DollarSign size={12} /> {isArabic ? 'إكرامية' : 'Tip'}
                    </button>
                    {SHOW_UNPUBLISHED && (
                      <button
                        type="button"
                        onClick={() => setShowLoyaltySettings(true)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${loyaltyCfg.enabled ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                        title={isArabic ? 'نقاط الولاء' : 'Loyalty'}
                      >
                        <Crown size={12} /> {isArabic ? 'ولاء' : 'Loyalty'}
                      </button>
                    )}
                    {SHOW_UNPUBLISHED && (
                      <button
                        type="button"
                        onClick={() => {
                          const c = prompt(isArabic ? 'كود القسيمة' : 'Gift card code');
                          if (c) {
                            setGiftCardCode(c);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${giftCardAmount > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                        title={isArabic ? 'قسيمة شراء' : 'Gift card'}
                      >
                        <Gift size={12} /> {isArabic ? 'قسيمة' : 'Gift'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPriceLevelMenu((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${priceLevel !== 'retail' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'مستوى السعر' : 'Price level'}
                    >
                      <Tag size={12} />{' '}
                      {priceLevel === 'retail'
                        ? isArabic
                          ? 'تجزئة'
                          : 'Retail'
                        : priceLevel === 'wholesale'
                          ? isArabic
                            ? 'جملة'
                            : 'Wholesale'
                          : isArabic
                            ? 'موظفين'
                            : 'Employee'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxExempt((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${taxExempt ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'إعفاء ضريبي' : 'Tax exempt'}
                    >
                      <ShieldCheck size={12} /> {isArabic ? 'إعفاء' : 'Exempt'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignature(true);
                        setTimeout(startSignatureDrawing, 100);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${signatureData ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'توقيع العميل' : 'Signature'}
                    >
                      <Users size={12} /> {isArabic ? 'توقيع' : 'Sign'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailReceipt(true)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      title={isArabic ? 'إرسال بالبريد' : 'Email receipt'}
                    >
                      <Mail size={12} /> {isArabic ? 'بريد' : 'Email'}
                    </button>
                    {isRestaurant && (
                      <button
                        type="button"
                        onClick={() => setShowTables(true)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${selectedTableId ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                        title={isArabic ? 'الطاولات' : 'Tables'}
                      >
                        <Table2 size={12} />{' '}
                        {selectedTableId
                          ? tables.find((t) => t.id === selectedTableId)?.name
                          : isArabic
                            ? 'طاولة'
                            : 'Table'}
                      </button>
                    )}
                    {SHOW_UNPUBLISHED && (
                      <button
                        type="button"
                        onClick={() => setShowLayaway(true)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                        title={isArabic ? 'بيع بالتقسيط' : 'Layaway'}
                      >
                        <Clock size={12} /> {isArabic ? 'تقسيط' : 'Layaway'}
                      </button>
                    )}
                    {SHOW_UNPUBLISHED && (
                      <button
                        type="button"
                        onClick={handleReadScale}
                        disabled={scaleLoading}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        title={isArabic ? 'قراءة ميزان' : 'Scale'}
                      >
                        <Scale size={12} />{' '}
                        {scaleLoading
                          ? '...'
                          : scaleReading != null
                            ? `${scaleReading}kg`
                            : isArabic
                              ? 'ميزان'
                              : 'Scale'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowReceiptSettings(true)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      title={isArabic ? 'إعدادات الفاتورة' : 'Receipt settings'}
                    >
                      <Settings2 size={12} /> {isArabic ? 'فاتورة' : 'Receipt'}
                    </button>
                    <button
                      type="button"
                      onClick={showAuditTrail}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      title={isArabic ? 'سجل العمليات' : 'Audit trail'}
                    >
                      <BarChart3 size={12} /> {isArabic ? 'سجل' : 'Audit'}
                    </button>
                    <button
                      type="button"
                      onClick={openXReport}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100"
                      title={isArabic ? 'تقرير منتصف اليوم (X)' : 'X-Report (mid-day)'}
                    >
                      <FileText size={12} /> X
                    </button>
                    <button
                      type="button"
                      onClick={openZReport}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
                      title={isArabic ? 'تقرير نهاية اليوم (Z)' : 'Z-Report (end of day)'}
                    >
                      <FileText size={12} /> Z
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCashMovementType('out');
                        setShowCashMovement(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      title={isArabic ? 'مصروف/إيداع نقدي' : 'Cash in/out'}
                    >
                      <ArrowDownCircle size={12} /> {isArabic ? 'نقدي' : 'Cash'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        loadReportData();
                        setShowDrawerDeclaration(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                      title={isArabic ? 'جرد الصندوق' : 'Drawer declaration'}
                    >
                      <Calculator size={12} /> {isArabic ? 'جرد' : 'Declare'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuickKeys((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 border transition-all ${showQuickKeys && quickKeyProducts.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      title={isArabic ? 'أزرار سريعة' : 'Quick keys'}
                    >
                      <Zap size={12} /> {isArabic ? 'سريع' : 'Quick'}
                    </button>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Quick keys bar */}
        {showQuickKeys && quickKeyProducts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {quickKeyProducts.map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p, 1)}
                className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black hover:bg-amber-100 transition-all active:scale-95"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Tip section — collapsible */}
        {cart.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowTipSection((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-black text-slate-500 hover:text-slate-700 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5">
                <DollarSign size={14} />
                {isArabic ? 'إكرامية' : 'Tip'}
              </span>
              <span className="flex items-center gap-1.5">
                {tipAmount > 0 ? (
                  <span className="text-emerald-600">+ ج.م {tipAmount.toFixed(2)}</span>
                ) : (
                  <span className="text-slate-300">{isArabic ? 'إضافة' : 'Add'}</span>
                )}
                {showTipSection ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
              </span>
            </button>
            <AnimatePresence>
              {showTipSection && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 pb-2">
                    <select
                      value={tipType}
                      onChange={(e) => setTipType(e.target.value as any)}
                      className="text-[10px] font-black border rounded-lg px-1.5 py-1 outline-none bg-slate-50"
                    >
                      <option value="none">{isArabic ? 'بدون' : 'None'}</option>
                      <option value="percent">%</option>
                      <option value="fixed">{isArabic ? 'مبلغ' : 'Amount'}</option>
                    </select>
                    {tipType !== 'none' && (
                      <input
                        type="number"
                        value={tipValue || ''}
                        onChange={(e) => setTipValue(Number(e.target.value) || 0)}
                        placeholder={tipType === 'percent' ? '%' : isArabic ? 'مبلغ' : 'Amount'}
                        className="w-16 text-[10px] font-black border rounded-lg px-2 py-1 outline-none bg-slate-50 text-center"
                        min={0}
                      />
                    )}
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Split payment section */}
        {usingSplitPayment && (
          <div className="p-3 rounded-xl bg-[#BD00FF]/5 border border-[#BD00FF]/20 space-y-2">
            <div className="text-[10px] font-black text-[#BD00FF] flex items-center gap-1.5">
              <CreditCard size={12} />
              {isArabic ? 'تقسيم الدفع' : 'Split Payment'}
            </div>
            {(['cash', 'card', 'wallet', 'credit'] as PaymentMethod[]).map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-600 w-12">
                  {m === 'cash'
                    ? isArabic
                      ? 'كاش'
                      : 'Cash'
                    : m === 'card'
                      ? isArabic
                        ? 'بطاقة'
                        : 'Card'
                      : m === 'wallet'
                        ? isArabic
                          ? 'محفظة'
                          : 'Wallet'
                        : isArabic
                          ? 'آجل'
                          : 'Credit'}
                </span>
                <input
                  type="number"
                  value={splitPayments.find((s) => s.method === m)?.amount || ''}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setSplitPayments((prev) => {
                      const next = prev.filter((s) => s.method !== m);
                      return v > 0 ? [...next, { method: m, amount: v }] : next;
                    });
                  }}
                  placeholder="0"
                  className="flex-1 text-[10px] font-black border rounded-lg px-2 py-1.5 outline-none bg-white text-center"
                  min={0}
                />
              </div>
            ))}
            <div
              className={`text-[10px] font-black ${splitValidation.ok ? 'text-emerald-600' : 'text-red-500'}`}
            >
              {isArabic ? 'المجموع' : 'Sum'}: ج.م {splitValidation.sum.toFixed(2)} /{' '}
              {total.toFixed(2)}{' '}
              {splitValidation.ok
                ? '✓'
                : ` (${splitValidation.diff > 0 ? '+' : ''}${splitValidation.diff})`}
            </div>
          </div>
        )}

        {/* Gift card applied */}
        {giftCardAmount > 0 && giftCardApplied && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1.5">
              <Gift size={12} />
              {isArabic ? 'قسيمة' : 'Gift'}: {giftCardApplied.code}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-emerald-600">
                - ج.م {giftCardAmount.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={removeGiftCard}
                className="text-red-400 hover:text-red-600"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Loyalty redemption */}
        {loyaltyCfg.enabled && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-100">
            <span className="text-[10px] font-black text-amber-700 flex items-center gap-1.5">
              <Crown size={12} />
              {isArabic ? 'استبدال نقاط' : 'Redeem points'}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={redeemPoints || ''}
                onChange={(e) => setRedeemPoints(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="w-16 text-[10px] font-black border rounded-lg px-2 py-1 outline-none bg-white text-center"
                min={0}
              />
              {loyaltyRedeemValue > 0 && (
                <span className="text-[10px] font-black text-amber-600">
                  - ج.م {loyaltyRedeemValue.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-slate-500 font-bold text-sm md:text-base">
            <span>{isArabic ? 'المجموع الفرعي' : 'Subtotal'}</span>
            <span>ج.م {subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-red-500 font-bold text-sm md:text-base">
              <span>{isArabic ? 'خصم' : 'Discount'}</span>
              <span>- ج.م {discountAmount.toFixed(2)}</span>
            </div>
          )}
          {loyaltyRedeemValue > 0 && (
            <div className="flex justify-between text-amber-600 font-bold text-sm">
              <span>{isArabic ? 'نقاط ولاء' : 'Loyalty'}</span>
              <span>- ج.م {loyaltyRedeemValue.toFixed(2)}</span>
            </div>
          )}
          {giftCardAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold text-sm">
              <span>{isArabic ? 'قسيمة' : 'Gift card'}</span>
              <span>- ج.م {giftCardAmount.toFixed(2)}</span>
            </div>
          )}
          {vatRatePct > 0 && !taxExempt && (
            <div className="flex justify-between text-slate-500 font-bold text-sm md:text-base">
              <span>{isArabic ? `ضريبة ${vatRatePct}%` : `VAT ${vatRatePct}%`}</span>
              <span>ج.م {vatAmount.toFixed(2)}</span>
            </div>
          )}
          {taxExempt && vatRatePct > 0 && (
            <div className="flex justify-between text-green-600 font-bold text-xs">
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} />
                {isArabic ? 'إعفاء ضريبي' : 'Tax exempt'}
              </span>
              <span>ج.م 0.00</span>
            </div>
          )}
          {tipAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold text-sm">
              <span>{isArabic ? 'إكرامية' : 'Tip'}</span>
              <span>+ ج.م {tipAmount.toFixed(2)}</span>
            </div>
          )}
          {loyaltyCfg.enabled && earnedPoints > 0 && (
            <div className="flex justify-between text-amber-600 font-bold text-[10px]">
              <span className="flex items-center gap-1">
                <Crown size={10} />
                {isArabic ? `سيربح ${earnedPoints} نقطة` : `Earns ${earnedPoints} pts`}
              </span>
              <span></span>
            </div>
          )}
          <div className="flex justify-between items-end pt-1">
            <span className="text-lg md:text-2xl font-black text-slate-900">
              {isArabic ? 'الإجمالي' : 'Total'}
            </span>
            <span className="text-xl md:text-3xl font-black text-[#BD00FF]">
              ج.م {total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-2 md:space-y-3">
          <button
            type="button"
            disabled={!canCheckout}
            onClick={() => processPayment({ print: true })}
            className="w-full py-4 md:py-6 bg-gradient-to-l from-[#BD00FF] to-[#8A00C2] text-white rounded-2xl md:rounded-3xl font-black text-base md:text-xl shadow-lg shadow-[#BD00FF]/25 hover:from-[#8A00C2] hover:to-[#BD00FF] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isProcessing
              ? isArabic
                ? 'جاري...'
                : 'Processing...'
              : isArabic
                ? 'دفع وطباعة'
                : 'Pay & Print'}
          </button>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <button
              type="button"
              disabled={!canCheckout}
              onClick={() => processPayment()}
              className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-2xl md:rounded-3xl font-black text-sm md:text-base shadow-sm hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isArabic ? 'دفع فقط' : 'Pay Only'}
            </button>
            <button
              type="button"
              disabled={!canCheckout}
              onClick={handlePrintReceipt}
              className="w-full py-3 md:py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl md:rounded-3xl font-black text-sm md:text-base shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Printer size={16} className="md:w-5 md:h-5" />{' '}
              {isArabic ? 'طباعة فقط' : 'Print Only'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
