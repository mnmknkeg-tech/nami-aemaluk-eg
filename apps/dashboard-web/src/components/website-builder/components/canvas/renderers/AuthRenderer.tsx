import React from 'react';
import { BaseRendererProps } from './types';
import { Sparkles, Check, ShieldCheck, Phone, Lock, UserCheck } from 'lucide-react';

export const AuthRenderer: React.FC<BaseRendererProps> = ({
  node,
  website,
  outlineClass,
  getComputedStyles,
  handleClick,
  handleMouseEnter,
  handleMouseLeave,
  renderChildren,
  currentViewport,
}) => {
  const layout = node.props.layout || 'split';
  const isMobile = currentViewport === 'mobile';
  const perks = node.props.perks || [
    'متابعة حالة شحن وتوصيل الطلبات لحظة بلحظة',
    'إدارة وتجديد اشتراكات العضوية بنقرة واحدة',
    'خصومات وعروض أسعار خاصة بالمشتركين فقط',
    'دعم فني واستشارات مخصصة عبر واتساب',
  ];

  return (
    <section
      id={node.id}
      style={getComputedStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`cursor-pointer transition-all ${outlineClass} w-full py-6 sm:py-16 px-3 sm:px-6 relative overflow-hidden text-right`}
    >
      <div className="max-w-6xl mx-auto">
        <div
          className={
            layout === 'split'
              ? isMobile
                ? 'flex flex-col gap-6'
                : 'grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center'
              : 'max-w-md mx-auto'
          }
        >
          {layout === 'split' && (
            <div className={isMobile ? 'w-full space-y-4 order-2' : 'lg:col-span-6 xl:col-span-7 space-y-6 order-2 lg:order-1'}>
              {node.props.badge && (
                <span
                  style={{
                    backgroundColor: (website.theme?.colors?.primary || '#1d4ed8') + '18',
                    color: website.theme?.colors?.primary || '#1d4ed8',
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{node.props.badge}</span>
                </span>
              )}
              <div className="space-y-2">
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight break-words">
                  عضوية خاصة ومزايا حصرية لعملاء المتجر
                </h2>
                <p className="text-xs sm:text-base text-slate-600 leading-relaxed max-w-lg break-words">
                  {node.props.subtitle || 'سجل دخولك لمتابعة طلباتك والاستفادة من العروض'}
                </p>
              </div>
              <div className="space-y-3 pt-2">
                {perks.map((perk: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                      style={{
                        backgroundColor: (website.theme?.colors?.primary || '#1d4ed8') + '15',
                        color: website.theme?.colors?.primary || '#1d4ed8',
                      }}
                    >
                      <Check className="w-3.5 h-3.5 font-bold" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                      {perk}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-4 flex items-center gap-3 text-xs text-slate-500 border-t border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>بياناتك محمية ومشفرة بأعلى معايير الأمان 🔒</span>
              </div>
            </div>
          )}

          <div
            className={
              layout === 'split'
                ? isMobile
                  ? 'w-full order-1'
                  : 'lg:col-span-6 xl:col-span-5 w-full order-1 lg:order-2'
                : 'w-full'
            }
          >
            <div
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-4 sm:p-8 space-y-5 text-right"
              style={{ borderRadius: website.theme?.radius?.xl || '16px' }}
            >
              <div className="p-1 bg-slate-100 rounded-xl grid grid-cols-2 gap-1 text-center">
                <span className="py-2 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-xs">
                  تسجيل الدخول
                </span>
                <span className="py-2 rounded-lg text-xs font-bold text-slate-500">
                  حساب جديد
                </span>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900">
                  {node.props.title || 'تسجيل الدخول إلى حسابك'}
                </h3>
                <p className="text-xs text-slate-500">
                  أدخل رقم هاتفك لتسجيل الدخول السريع
                </p>
              </div>
              <div className="space-y-3">
                <div className="relative flex">
                  <input
                    type="tel"
                    disabled
                    placeholder="01012345678"
                    className="w-full pr-10 pl-3 py-2.5 rounded-r-xl border border-l-0 border-slate-200 text-xs bg-slate-50 dir-ltr text-right cursor-not-allowed"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <span className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-l-xl text-xs font-bold text-slate-600 shrink-0 flex items-center justify-center">
                    🇪🇬 +20
                  </span>
                </div>
                {layout !== 'phone_otp' && (
                  <div className="relative">
                    <input
                      type="password"
                      disabled
                      placeholder="••••••••"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 dir-ltr text-right cursor-not-allowed"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                )}
                <button
                  type="button"
                  style={{
                    backgroundColor: website.theme?.colors?.primary || '#1d4ed8',
                    borderRadius: website.theme?.radius?.lg || '12px',
                  }}
                  className="w-full py-3 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {layout === 'phone_otp'
                      ? 'إرسال رمز التحقق السريع'
                      : 'تسجيل الدخول الآن'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {renderChildren()}
      </div>
    </section>
  );
};
