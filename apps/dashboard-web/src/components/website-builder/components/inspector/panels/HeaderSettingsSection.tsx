import React from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Store,
  Package,
  CreditCard,
  Smartphone,
  ChevronDown,
  ChevronUp,
  User,
  MessageCircle,
  Phone,
  Pin,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { useBuilder } from '../../../context/BuilderContext';
import type { InspectorPanelProps } from './types';
import type { ComponentNode } from '../../../types/builder';

type HeaderSettingsSectionProps = Pick<
  InspectorPanelProps,
  | 'node'
  | 'parentSection'
  | 'isHeader'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handlePropChange'
>;

export const HeaderSettingsSection: React.FC<HeaderSettingsSectionProps> = ({
  node,
  parentSection,
  isHeader,
  expandedSections,
  toggleAccordion,
  handlePropChange,
}) => {
  const { website } = useBuilder();

  const ctaNode = (Object.values(website.components) as any[]).find(
    (c: any) =>
      c.type === 'button' &&
      (c.id === 'header_cta_btn' ||
        c.id === 'gen_header_cta' ||
        c.id.endsWith('_cta') ||
        c.id.includes('cta') ||
        c.id.includes('action') ||
        Boolean(c.parentId?.includes('header')))
  ) as any;

  const hideCart = Boolean(parentSection.props?.hideCart ?? node.props?.hideCart);
  const showLogin = parentSection.props?.showLogin !== false && node.props?.showLogin !== false;
  const loginText = (parentSection.props?.loginText || node.props?.loginText || 'حسابي') as string;
  const showLoginText = Boolean(parentSection.props?.showLoginText ?? node.props?.showLoginText);

  const showWhatsapp = Boolean(parentSection.props?.showWhatsapp ?? node.props?.showWhatsapp);
  const whatsappNumber = (parentSection.props?.whatsappNumber || node.props?.whatsappNumber || '') as string;
  const showPhone = Boolean(parentSection.props?.showPhone ?? node.props?.showPhone);
  const phoneNumber = (parentSection.props?.phoneNumber || node.props?.phoneNumber || '') as string;
  const stickyHeader = Boolean(parentSection.props?.sticky ?? node.props?.sticky);

  const updateProp = (key: string, val: any) => {
    handlePropChange(parentSection.id, key, val);
    if (node.id !== parentSection.id) {
      handlePropChange(node.id, key, val);
    }
  };

  return (
    <div className="p-3">
      <button
        onClick={() => toggleAccordion('headerSettings')}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
          <span>أيقونات وعناصر الترويسة (Header Icons & Controls)</span>
        </div>
        {expandedSections.headerSettings ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {expandedSections.headerSettings && (
        <div className="space-y-3 pt-2.5">
          {/* 1. Account / Login Button Control */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>زر تسجيل الدخول / حسابي</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {showLogin
                    ? 'الأيقونة ظاهرة في الهيدر والقائمة (ديسكتوب وموبايل)'
                    : 'الأيقونة مخفية حالياً'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateProp('showLogin', !showLogin)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  showLogin ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    showLogin ? 'translate-x-0 rtl:-translate-x-5' : '-translate-x-5 rtl:translate-x-0'
                  }`}
                />
              </button>
            </div>

            {showLogin && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-600">نص الزر:</label>
                  <label className="text-[10px] text-slate-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLoginText}
                      onChange={(e) => updateProp('showLoginText', e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-3 w-3"
                    />
                    <span>إظهار النص بجانب الأيقونة</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={loginText}
                  onChange={(e) => updateProp('loginText', e.target.value)}
                  placeholder="حسابي أو تسجيل الدخول"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* 2. Cart Button Toggle */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>زر سلة التسوق (Cart Button)</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {hideCart
                    ? 'السلة مخفية حالياً (استفسارات فقط)'
                    : 'السلة مفعلة وجاهزة لاستقبال الطلبات'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateProp('hideCart', !hideCart)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  !hideCart ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    !hideCart ? 'translate-x-0 rtl:-translate-x-5' : '-translate-x-5 rtl:translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Cart Icon Picker */}
            {!hideCart && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold text-slate-700 block">شكل أيقونة السلة (Cart Icon):</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'ShoppingBag', label: 'حقيبة فاخرة', Icon: ShoppingBag },
                    { id: 'ShoppingCart', label: 'عربة تسوق', Icon: ShoppingCart },
                    { id: 'Store', label: 'متجر مباشر', Icon: Store },
                    { id: 'Package', label: 'طرد مشتريات', Icon: Package },
                    { id: 'CreditCard', label: 'دفع فوري', Icon: CreditCard },
                  ].map((item) => {
                    const currentIcon = parentSection.props?.cartIcon || node.props?.cartIcon || 'ShoppingBag';
                    const isSelected = currentIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateProp('cartIcon', item.id)}
                        className={`p-1.5 rounded-lg border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <item.Icon className="w-4 h-4" />
                        <span className="text-[9px] truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Quick WhatsApp Action Button in Header */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>زر واتساب مباشر في الترويسة</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {showWhatsapp ? 'ظاهر للعملاء للتواصل الفوري' : 'مخفي حالياً'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateProp('showWhatsapp', !showWhatsapp)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  showWhatsapp ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    showWhatsapp ? 'translate-x-0 rtl:-translate-x-5' : '-translate-x-5 rtl:translate-x-0'
                  }`}
                />
              </button>
            </div>

            {showWhatsapp && (
              <div className="pt-2 border-t border-slate-200/80">
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  رقم الواتساب (اختياري، يترك فارغاً لاستخدام رقم المتجر العام):
                </label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => updateProp('whatsappNumber', e.target.value)}
                  placeholder="201000000000"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-500 dir-ltr text-right"
                />
              </div>
            )}
          </div>

          {/* 4. Direct Phone Call Button in Header */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-700" />
                  <span>زر اتصال مباشر في الترويسة</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {showPhone ? 'ظاهر للاتصال الهاتفي' : 'مخفي حالياً'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateProp('showPhone', !showPhone)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  showPhone ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    showPhone ? 'translate-x-0 rtl:-translate-x-5' : '-translate-x-5 rtl:translate-x-0'
                  }`}
                />
              </button>
            </div>

            {showPhone && (
              <div className="pt-2 border-t border-slate-200/80">
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  رقم الهاتف للاتصال المباشر:
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => updateProp('phoneNumber', e.target.value)}
                  placeholder="01000000000"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-blue-500 dir-ltr text-right"
                />
              </div>
            )}
          </div>

          {/* 5. Sticky Header Toggle */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تثبيت الترويسة عند التمرير (Sticky)</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {stickyHeader ? 'تظل الترويسة ثابتة في أعلى الشاشة' : 'تتحرك مع محتوى الصفحة'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateProp('sticky', !stickyHeader)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  stickyHeader ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    stickyHeader ? 'translate-x-0 rtl:-translate-x-5' : '-translate-x-5 rtl:translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 6. Primary CTA / Booking Button Control */}
          {ctaNode && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>زر الإجراء / الحجز في الترويسة (Header CTA)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {ctaNode.props?.hidden || ctaNode.isHidden
                      ? 'الزر مخفي حالياً من الترويسة'
                      : `ظاهر بنص: "${ctaNode.props?.label || ctaNode.props?.text || 'احجز الآن'}"`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const isCurrentlyHidden = Boolean(ctaNode.props?.hidden || ctaNode.isHidden);
                    handlePropChange(ctaNode.id, 'hidden', !isCurrentlyHidden);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    !(ctaNode.props?.hidden || ctaNode.isHidden) ? 'bg-amber-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      !(ctaNode.props?.hidden || ctaNode.isHidden)
                        ? 'translate-x-0 rtl:-translate-x-5'
                        : '-translate-x-5 rtl:translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {!(ctaNode.props?.hidden || ctaNode.isHidden) && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      نص الزر:
                    </label>
                    <input
                      type="text"
                      value={(ctaNode.props?.label || ctaNode.props?.text || '') as string}
                      onChange={(e) => {
                        handlePropChange(ctaNode.id, 'label', e.target.value);
                        handlePropChange(ctaNode.id, 'text', e.target.value);
                      }}
                      placeholder="احجز الآن أو تواصل معنا"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      الرابط أو وجهة الزر:
                    </label>
                    <input
                      type="text"
                      value={(ctaNode.props?.linkUrl || ctaNode.props?.url || '') as string}
                      onChange={(e) => {
                        handlePropChange(ctaNode.id, 'linkUrl', e.target.value);
                        handlePropChange(ctaNode.id, 'url', e.target.value);
                      }}
                      placeholder="#contact أو page_contact أو رابط خارجي"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-amber-500 dir-ltr text-right"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Business Flow / Operation Type */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-slate-700 block">
              نوع العمليات ونشاط السلة (Operation Mode):
            </span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'orders', label: '🛍️ طلبات' },
                { id: 'bookings', label: '📅 حجوزات' },
                { id: 'subscriptions', label: '💳 اشتراكات' },
              ].map((m) => {
                const currentMode =
                  parentSection.props?.businessType || node.props?.businessType || 'orders';
                const isSelected = currentMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      updateProp('businessType', m.id);
                      if (m.id === 'orders') {
                        updateProp('hideCart', false);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer border text-center ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Drawer Info Banner */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>القائمة الذكية للشاشات الصغيرة (Mobile Drawer)</span>
            </div>
            <p className="text-[10px] text-blue-950/80 leading-relaxed">
              ✨ جميع الأزرار المختارة (تسجيل الدخول، السلة، الواتساب، والاتصال) تتكيف وتظهر تلقائياً في القائمة الجانبية على الهواتف مع تجربة تطبيق سريعة وسلسة.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
