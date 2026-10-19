import React from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Store,
  Package,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Compass,
  CalendarCheck,
  CreditCard as SubCard,
} from 'lucide-react';
import { useBuilder } from '../../../context/BuilderContext';
import type { WebsiteSettings, WebsiteCartSettings } from '../../../types/builder';

interface CartSettingsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  settings: WebsiteSettings;
}

export const CartSettingsSection: React.FC<CartSettingsSectionProps> = ({
  isOpen,
  onToggle,
  settings,
}) => {
  const { updateWebsiteSettings, website } = useBuilder();
  const cart: WebsiteCartSettings = settings.cart || {
    enabled: true,
    businessType: 'orders',
    showCartIcon: true,
    iconType: 'ShoppingBag',
    position: 'both',
    mode: 'standalone',
  };

  const businessType = cart.businessType || 'orders';
  const showCartIcon = cart.showCartIcon !== false;
  const iconType = cart.iconType || 'ShoppingBag';
  const position = cart.position || 'both';
  const cartMode = cart.mode || 'standalone';

  const updateCart = (patch: Partial<WebsiteCartSettings>) => {
    updateWebsiteSettings({
      cart: {
        ...cart,
        ...patch,
      },
    });
  };

  return (
    <div className="border-b border-slate-100">
      {/* Section Header Button */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-right hover:bg-slate-50 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                إعدادات السلة ونوع النشاط
              </h4>
              {showCartIcon && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">
                  مفعلة
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              تخصيص السلة المنفصلة، أيقونة المتجر، ونوع الطلبات
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        )}
      </button>

      {/* Section Body */}
      {isOpen && (
        <div className="p-4 pt-1 bg-slate-50/50 space-y-4">
          {/* 1. نوع نشاط الموقع (Business Flow Type) */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                نوع نشاط الموقع والعمليات (Business Flow)
              </span>
              <span className="text-[10px] text-slate-500">
                حدد طبيعة عمل متجرك لضبط زر السلة وتجربة الشراء المناسبة لعملائك
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {[
                {
                  id: 'orders',
                  title: '🛍️ طلبات ومنتجات (Orders & Delivery)',
                  desc: 'تفعيل سلة المشتريات الكاملة مع الدفع واستلام الطلبات باللوحة',
                  icon: ShoppingBag,
                },
                {
                  id: 'bookings',
                  title: '📅 حجوزات ومواعيد (Bookings & Appointments)',
                  desc: 'حجز المواعيد والخدمات الطبية أو الترفيهية مع تأكيد مباشر',
                  icon: CalendarCheck,
                },
                {
                  id: 'subscriptions',
                  title: '💳 اشتراكات وباقات (Subscriptions & Plans)',
                  desc: 'عرض خطط شهرية أو سنوية مع اشتراك سريع',
                  icon: SubCard,
                },
              ].map((item) => {
                const isSelected = businessType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      updateCart({
                        businessType: item.id as any,
                        // If switching to orders, auto-enable cart icon
                        showCartIcon: item.id === 'orders' ? true : showCartIcon,
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 text-slate-900'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{item.title}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. زر سلة التسوق (Show / Hide Cart Toggle) */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  إظهار أيقونة السلة في الموقع (Cart Button)
                </span>
                <span className="text-[10px] text-slate-500">
                  {showCartIcon
                    ? 'الأيقونة ظاهرة لزوار الموقع لتصفح وإتمام الطلبات'
                    : 'الأيقونة مخفية حالياً (استعراض وتواصل مباشر فقط)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateCart({ showCartIcon: !showCartIcon })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  showCartIcon ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    showCartIcon ? 'translate-x-0 rtl:-translate-x-5' : '-translate-x-5 rtl:translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 3. شكل أيقونة السلة (Cart Icon Picker) */}
          {showCartIcon && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
              <span className="text-xs font-bold text-slate-800 block">
                شكل وتصميم أيقونة السلة (Cart Icon Style)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ShoppingBag', label: 'حقيبة فاخرة', Icon: ShoppingBag },
                  { id: 'ShoppingCart', label: 'عربة تسوق', Icon: ShoppingCart },
                  { id: 'Store', label: 'متجر مباشر', Icon: Store },
                  { id: 'Package', label: 'طرد مشتريات', Icon: Package },
                  { id: 'CreditCard', label: 'دفع فوري', Icon: CreditCard },
                ].map((item) => {
                  const isSelected = iconType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateCart({ iconType: item.id as any })}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <item.Icon className="w-4 h-4" />
                      <span className="text-[10px] truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. موضع ظهور السلة في الموقع (Placement) */}
          {showCartIcon && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
              <span className="text-xs font-bold text-slate-800 block">
                موضع ظهور السلة في الموقع
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'header', label: 'الترويسة فقط' },
                  { id: 'floating', label: 'زر عائم ذكي' },
                  { id: 'both', label: 'كلاهما (موصى به)' },
                ].map((pos) => {
                  const isSelected = position === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => updateCart({ position: pos.id as any })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border text-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. وضع السلة والربط مع تطبيق راي المركزي (Cart Mode) */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                نظام إدارة واستقبال الطلبات (Cart System)
              </span>
              <span className="text-[10px] text-slate-500">
                فصل طلبات الموقع عن التطبيق الموحد لحين اكتمال التطوير
              </span>
            </div>

            {/* Option 1: Standalone Site Cart (Active) */}
            <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>السلة المستقلة للمتجر (Dedicated Site Cart)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white">
                  المفعل حالياً
                </span>
              </div>
              <p className="text-[10px] text-emerald-950/80 leading-relaxed">
                ✅ يستقبل موقعك الطلبات بشكل مستقل ومباشر. تظهر كل مبيعة في قسم <strong>الطلبات</strong> داخل لوحة تحكم التاجر مع إشعار الرنة الصوتي والواتساب، بدون أي اختلاط بسلات المتاجر الأخرى.
              </p>
            </div>

            {/* Option 2: Central Unified Marketplace Cart (Coming Soon) */}
            <div className="p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 space-y-1.5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>الربط بسلة تطبيق راي الموحدة (Ray Unified Cart)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  قريباً (تحت التطوير)
                </span>
              </div>
              <p className="text-[10px] text-amber-950/80 leading-relaxed">
                ⚙️ تطبيق راي العام في المنشور قيد التطوير والتحديث حالياً، وسيتم فتح خيار السلة المجمعة الشاملة تلقائياً فور إطلاق تحديث السوق الكبير لدمج سلات العملاء من عدة متاجر في طلب واحد.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
