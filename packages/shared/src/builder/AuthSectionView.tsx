import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  ShieldCheck,
  CheckCircle,
  X,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import type { ComponentNode } from './types';
import type { NodeViewContext } from './NodeView';

/** Published-site authentication section presentation. */
export const AuthSectionView: React.FC<{
  node: ComponentNode;
  ctx: NodeViewContext;
}> = ({ node, ctx }) => {
  const { theme, shop } = ctx;
  const layout = node.props.layout || 'split';
  const defaultTab = node.props.defaultTab || 'login';

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [authChallenge, setAuthChallenge] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const title =
    activeTab === 'login' ? node.props.title || 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب عميل جديد';

  const subtitle =
    activeTab === 'login'
      ? node.props.subtitle || 'سجل دخولك لمتابعة طلباتك والاستفادة من العروض الحصرية'
      : 'انضم إلينا اليوم وتمتع بتجربة تسوق سريعة ومميزة';

  const perks = node.props.perks || [
    'متابعة حالة شحن وتوصيل الطلبات لحظة بلحظة',
    'إدارة وتجديد اشتراكات العضوية بنقرة واحدة',
    'خصومات وعروض أسعار خاصة بالمشتركين فقط',
    'دعم فني واستشارات مخصصة عبر واتساب',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!phone || phone.trim().length < 8) { setErrorMessage('يرجى إدخال رقم هاتف صحيح'); return; }
    if (!password.trim()) { setErrorMessage('يرجى إدخال كلمة المرور'); return; }
    if (activeTab === 'register' && !name.trim()) { setErrorMessage('يرجى إدخال اسمك الكريم'); return; }
    if (isOtpSent && !otpCode.trim()) { setErrorMessage('يرجى إدخال رمز التحقق'); return; }
    if (!ctx.onAuthenticate) { setErrorMessage('تسجيل الدخول غير متاح في هذه المعاينة'); return; }
    setLoading(true);
    try {
      const result = await ctx.onAuthenticate(isOtpSent
        ? { mode: 'login', phone, password, challenge: authChallenge, code: otpCode }
        : { mode: activeTab, phone, name: activeTab === 'register' ? name.trim() : undefined, password });
      if (result?.requires2FA && result.challenge) {
        setAuthChallenge(result.challenge); setIsOtpSent(true); setOtpCode('');
        setSuccessMessage('أدخل رمز المصادقة الثنائية لإكمال تسجيل الدخول');
        return;
      }
      setIsOtpSent(false); setAuthChallenge(''); setOtpCode('');
      setSuccessMessage(activeTab === 'login' ? 'تم تسجيل الدخول بنجاح! مرحباً بك مجدداً' : 'تم إنشاء حسابك بنجاح! مرحباً بك كعضو جديد');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر إكمال العملية، حاول مرة أخرى');
    } finally { setLoading(false); }
  };

  return (
    <section
      id={node.id || 'auth-section'}
      className="w-full py-6 sm:py-16 px-3 sm:px-6 relative overflow-hidden transition-all text-right"
      style={{
        backgroundColor: node.styles?.desktop?.backgroundColor || '#ffffff',
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div
          className={
            layout === 'split'
              ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center'
              : 'max-w-md mx-auto'
          }
        >
          {/* Split Left Side: Marketing Perks & Visual Showcase (Desktop & Tablet) */}
          {layout === 'split' && (
            <div className="lg:col-span-6 xl:col-span-7 space-y-6 order-2 lg:order-1">
              {node.props.badge && (
                <span
                  style={{
                    backgroundColor: theme.colors.primary + '18',
                    color: theme.colors.primary,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{node.props.badge}</span>
                </span>
              )}

              <div className="space-y-2">
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight break-words">
                  عضوية خاصة ومزايا حصرية لعملاء{' '}
                  <span style={{ color: theme.colors.primary }}>{shop.name}</span>
                </h2>
                <p className="text-xs sm:text-base text-slate-600 leading-relaxed max-w-lg break-words">
                  {subtitle}
                </p>
              </div>

              {/* Perks list */}
              <div className="space-y-3 pt-2">
                {perks.map((perk: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                      style={{
                        backgroundColor: theme.colors.primary + '15',
                        color: theme.colors.primary,
                      }}
                    >
                      <Check className="w-3.5 h-3.5 font-bold" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">{perk}</span>
                  </div>
                ))}
              </div>

              {/* Security Trust Badge */}
              <div className="pt-4 flex items-center gap-3 text-xs text-slate-500 border-t border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>بياناتك محمية ومشفرة بأعلى معايير الأمان 🔒</span>
              </div>
            </div>
          )}

          {/* Right Side: Interactive Auth Card */}
          <div
            className={
              layout === 'split'
                ? 'lg:col-span-6 xl:col-span-5 w-full order-1 lg:order-2'
                : 'w-full'
            }
          >
            <div
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-4 sm:p-8 space-y-6 relative transition-all"
              style={{
                borderRadius: theme.radius.xl || '16px',
              }}
            >
              {/* Tab Switcher Pills */}
              <div className="p-1 bg-slate-100 rounded-xl grid grid-cols-2 gap-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  حساب جديد
                </button>
              </div>

              {/* Card Title */}
              <div className="text-center space-y-1">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500 leading-normal">{subtitle}</p>
              </div>

              {/* Status Messages */}
              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      الاسم بالكامل
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="أحمد محمد"
                        className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden transition-all"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم الهاتف المحمول
                  </label>
                  <div className="relative flex">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      className="w-full pr-10 pl-3 py-2.5 rounded-r-xl border border-l-0 border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden transition-all dir-ltr text-right"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <span className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-l-xl text-xs font-bold text-slate-600 shrink-0 flex items-center justify-center">
                      🇪🇬 +20
                    </span>
                  </div>
                </div>

                {(activeTab === 'login' || activeTab === 'register') && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">كلمة المرور</label>
                      {activeTab === 'login' && (
                        <a
                          href="#forgot"
                          onClick={(e) => {
                            e.preventDefault();
                            alert('يرجى التواصل مع المتجر لإعادة تعيين كلمة المرور عبر واتساب');
                          }}
                          className="text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          نسيت كلمة المرور؟
                        </a>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden transition-all dir-ltr text-right"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 absolute left-3 top-2.5"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {isOtpSent && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      رمز المصادقة الثنائية أو رمز الاسترداد
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="رمز التحقق"
                      className="w-full py-2.5 rounded-xl border border-slate-200 text-center tracking-widest font-black text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
                    />
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radius.lg || '12px',
                  }}
                  className="w-full py-3 text-white font-extrabold text-xs shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>جاري المعالجة...</span>
                    </span>
                  ) : activeTab === 'login' ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>
                        {isOtpSent ? 'تأكيد رمز المصادقة' : 'تسجيل الدخول الآن'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>إنشاء حساب جديد والبدء</span>
                    </>
                  )}
                </button>
              </form>

              {/* Guest Option */}
              {node.props.allowGuest !== false && (
                <div className="pt-2 text-center border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 block mb-1">
                    تريد الشراء السريع دون تسجيل؟
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const prodSection =
                        document.querySelector('[data-type="products"]') ||
                        document.querySelector('#products');
                      if (prodSection) {
                        prodSection.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        const homePage = ctx.website.pages.find((p) => p.slug === 'home');
                        if (homePage) ctx.onNavigatePage(homePage.id);
                      }
                    }}
                    className="text-xs font-bold text-slate-700 hover:text-blue-600 underline cursor-pointer"
                  >
                    تصفح المنتجات والشراء كزائر &larr;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
