import {
  Banknote,
  CreditCard,
  Wallet,
  Clock,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Tag,
  UserRound,
  Loader2,
} from 'lucide-react';
import { money, type CartItem, type PaymentMethod } from './types';

type Props = {
  cart: CartItem[];
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  showDiscount: boolean;
  setShowDiscount: (value: boolean | ((current: boolean) => boolean)) => void;
  discountType: 'none' | 'percent' | 'fixed';
  setDiscountType: (value: 'none' | 'percent' | 'fixed') => void;
  discountValue: number;
  setDiscountValue: (value: number) => void;
  paymentMethod: PaymentMethod;
  showPaymentMethods: boolean;
  setShowPaymentMethods: (value: boolean | ((current: boolean) => boolean)) => void;
  setPaymentMethod: (value: PaymentMethod) => void;
  customerName: string;
  setCustomerName: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  orderNotes: string;
  setOrderNotes: (value: string) => void;
  showCustomer: boolean;
  setShowCustomer: (value: boolean | ((current: boolean) => boolean)) => void;
  subtotal: number;
  discountAmount: number;
  total: number;
  processPayment: () => void;
  checkoutBusy: boolean;
  checkoutError: string;
};

export default function PosCartPanel({
  cart,
  removeFromCart,
  updateQuantity,
  showDiscount,
  setShowDiscount,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  paymentMethod,
  showPaymentMethods,
  setShowPaymentMethods,
  setPaymentMethod,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  orderNotes,
  setOrderNotes,
  showCustomer,
  setShowCustomer,
  subtotal,
  discountAmount,
  total,
  processPayment,
  checkoutBusy,
  checkoutError,
}: Props) {
  return (
    <>
      <div className="p-4 md:p-6 border-b border-slate-100 bg-white sticky top-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#BD00FF]/10 p-2.5 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-[#BD00FF]" />
            </div>
            <h2 className="text-xl md:text-2xl font-black">السلة</h2>
          </div>
          <span className="bg-slate-100 px-4 py-1.5 rounded-full text-xs font-black">
            {cart.length} صنف
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {cart.map((item) => (
          <div
            key={item.productId}
            className="bg-white border border-slate-100 p-3 md:p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 text-right">
                <h4 className="font-black text-slate-900 leading-tight mb-0.5 text-sm md:text-base">
                  {item.name}
                </h4>
                <p className="text-[#BD00FF] font-black text-xs md:text-sm">
                  ج.م {money(item.price)}
                </p>
              </div>
              <button
                onClick={() => removeFromCart(item.productId)}
                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.productId, 1)}
                  className="w-9 h-9 md:w-10 md:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:border-[#BD00FF] hover:text-[#BD00FF] transition-all active:scale-90"
                >
                  <Plus size={18} />
                </button>
                <span className="font-black text-base md:text-lg w-6 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, -1)}
                  className="w-9 h-9 md:w-10 md:h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-all active:scale-90"
                >
                  <Minus size={18} />
                </button>
              </div>
              <p className="font-black text-slate-900 text-sm md:text-base pl-2">
                ج.م {money(item.price * item.quantity)}
              </p>
            </div>
          </div>
        ))}
        {cart.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
            <ShoppingCart size={64} className="mb-4 opacity-20" />
            <p className="font-black text-lg">السلة فارغة</p>
          </div>
        )}
      </div>

      <div className="p-3 md:p-6 bg-white border-t border-slate-100 space-y-3">
        {cart.length > 0 && (
          <>
            {/* discount */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowDiscount((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-black text-slate-500 hover:text-slate-700 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Tag size={14} />
                  خصم
                </span>
                <span className="flex items-center gap-1.5">
                  {discountAmount > 0 ? (
                    <span className="text-red-500">- ج.م {money(discountAmount)}</span>
                  ) : (
                    <span className="text-slate-300">إضافة</span>
                  )}
                  {showDiscount ? (
                    <ChevronUp size={14} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-400" />
                  )}
                </span>
              </button>
              {showDiscount && (
                <div className="flex gap-2 pb-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="text-xs font-black border rounded-xl px-2 py-2 outline-none bg-slate-50"
                  >
                    <option value="none">بدون</option>
                    <option value="percent">%</option>
                    <option value="fixed">مبلغ</option>
                  </select>
                  {discountType !== 'none' && (
                    <input
                      type="number"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                      placeholder={discountType === 'percent' ? '%' : 'مبلغ'}
                      className="flex-1 text-xs font-black border rounded-xl px-3 py-2 outline-none bg-slate-50 text-center"
                      min={0}
                      max={discountType === 'percent' ? 100 : undefined}
                    />
                  )}
                </div>
              )}
            </div>

            {/* payment method */}
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
                  طريقة الدفع
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-700">
                    {paymentMethod === 'cash'
                      ? 'كاش'
                      : paymentMethod === 'card'
                        ? 'بطاقة'
                        : paymentMethod === 'wallet'
                          ? 'محفظة'
                          : 'آجل'}
                  </span>
                  {showPaymentMethods ? (
                    <ChevronUp size={14} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={14} className="text-slate-400" />
                  )}
                </span>
              </button>
              {showPaymentMethods && (
                <div className="grid grid-cols-4 gap-1.5 pb-2">
                  {(
                    [
                      { id: 'cash', label: 'كاش', icon: Banknote },
                      { id: 'card', label: 'بطاقة', icon: CreditCard },
                      { id: 'wallet', label: 'محفظة', icon: Wallet },
                      { id: 'credit', label: 'آجل', icon: Clock },
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
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-black transition-all ${
                          paymentMethod === pm.id
                            ? 'border-[#BD00FF] bg-[#BD00FF]/5 text-[#BD00FF]'
                            : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={16} />
                        {pm.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* customer + notes */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowCustomer((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-black text-slate-500 hover:text-slate-700 transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <UserRound size={14} />
                  بيانات العميل
                </span>
                {customerName || customerPhone ? (
                  <span className="text-[#BD00FF]">{customerName || customerPhone}</span>
                ) : (
                  <span className="text-slate-300">إضافة</span>
                )}
              </button>
              {showCustomer && (
                <div className="space-y-2 pb-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="اسم العميل (اختياري)"
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-3 outline-none text-xs font-black focus:ring-2 focus:ring-[#BD00FF]"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) =>
                      setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 15))
                    }
                    placeholder="رقم الموبايل (اختياري)"
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-3 outline-none text-xs font-black text-right focus:ring-2 focus:ring-[#BD00FF]"
                  />
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="ملاحظات (اختياري)"
                    className="w-full bg-slate-50 border rounded-xl py-2.5 px-3 outline-none text-xs font-black focus:ring-2 focus:ring-[#BD00FF]"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* totals */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-black text-slate-500">
            <span>الإجمالي الفرعي</span>
            <span>ج.م {money(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs font-black text-red-500">
              <span>الخصم</span>
              <span>- ج.م {money(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-black text-slate-900 pt-1 border-t border-slate-100 mt-1">
            <span>الإجمالي</span>
            <span className="text-[#BD00FF]">ج.م {money(total)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={processPayment}
          disabled={cart.length === 0 || checkoutBusy}
          className="w-full py-4 rounded-2xl bg-gradient-to-l from-[#BD00FF] to-[#8A00C2] text-white font-black text-base shadow-lg shadow-[#BD00FF]/25 hover:from-[#8A00C2] hover:to-[#BD00FF] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {checkoutBusy ? <Loader2 size={20} className="animate-spin" /> : <Banknote size={20} />}
          دفع الآن
        </button>
        {checkoutError && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center">
            {checkoutError}
          </div>
        )}
      </div>
    </>
  );
}
