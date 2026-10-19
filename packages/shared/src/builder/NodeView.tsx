'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Truck,
  CreditCard,
  MessageCircle,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Check,
  MapPin,
  Phone,
  Mail,
  ShoppingBag,
  Store,
  Menu,
  X,
  ShoppingCart,
  Package,
  Home,
  LayoutGrid,
  Tag,
  Zap,
  User,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import type {
  BuilderPage,
  ComponentNode,
  PageMetadata,
  SiteProduct,
  SiteShopContext,
  SiteSubscriptionPlan,
  StyleProperties,
  ViewportBreakpoint,
  Website,
} from './types';
import { formatPrice, resolveTheme, withAlpha } from './theme';
import {
  productGridClass as productGridClassName,
  resolveProductCardOptions,
  normalizeProductSizes,
  parsePriceValue,
} from './productCard';
import { CustomCodeFrame } from './CustomCodeFrame';
import { PublishedProductCard } from './PublishedProductCard';

export interface NodeViewContext {
  website: Website;
  viewport: ViewportBreakpoint;
  activePage: BuilderPage;
  theme: ReturnType<typeof resolveTheme>;
  shop: SiteShopContext;
  /** Real products from the shop catalog — bound into products/grid sections. */
  realProducts: SiteProduct[];
  /** Real subscription plans from the shop memberships system. */
  realSubscriptionPlans?: SiteSubscriptionPlan[];
  /** Switch the published site to another page (client-side navigation). */
  onNavigatePage: (pageId: string) => void;
  /** Build an order/WhatsApp link for a product or general inquiry (null if no phone). */
  waLink: (text: string) => string | null;
  /** Add a catalog product to the host app's unified cart (optional — sites without cart support fall back to WhatsApp ordering). */
  onAddToCart?: (product: SiteProduct) => void;
  /** Open the host app's cart drawer (optional). */
  onOpenCart?: () => void;
  /** Trigger the subscription modal for a specific plan or pricing tier. */
  onSubscribePlan?: (
    plan: Partial<SiteSubscriptionPlan> & {
      title?: string;
      price?: number | string;
      period?: string;
      features?: string[];
    }
  ) => void;
  /** Current unified-cart item count (for badges on mobile footer / cart buttons). */
  cartCount?: number;
}

// ---------------------------------------------------------------------------
// Helpers (ported from the canvas renderer)
// ---------------------------------------------------------------------------

function findPage(website: Website, matcher: (p: BuilderPage) => boolean): BuilderPage | undefined {
  return website.pages.find(matcher);
}

/**
 * Resolve a click on a link/button node to a page navigation, anchor scroll,
 * or external URL — same resolution order as the editor's interactive preview.
 */
function handleInteraction(e: React.MouseEvent, node: ComponentNode, ctx: NodeViewContext) {
  const { website, activePage, onNavigatePage } = ctx;

  const url = (node.props.url ?? node.props.href ?? node.props.link ?? '').trim();
  const pageId = (node.props.pageId ?? node.props.targetPage ?? '').trim();
  const text = (node.props.text ?? node.props.title ?? '').trim();

  // Subscription modal trigger for any subscription / pricing button
  if (
    ctx.onSubscribePlan &&
    (/اشتراك|باقة|اختر هذه الباقة|عضوية/.test(text) ||
      node.id.includes('tmpl_p1_btn') ||
      node.id.includes('tmpl_p2_btn') ||
      node.id.includes('tmpl_p3_btn') ||
      node.id.includes('prv_btn') ||
      url === '#subscribe' ||
      url === 'subscribe')
  ) {
    e.preventDefault();
    e.stopPropagation();
    ctx.onSubscribePlan({ title: text || 'باقة الاشتراك' });
    return;
  }

  const go = (page: BuilderPage) => {
    e.preventDefault();
    e.stopPropagation();
    if (page.id !== activePage.id) onNavigatePage(page.id);
  };

  // 1. Direct page id target
  if (pageId) {
    const match = findPage(website, (p) => p.id === pageId);
    if (match) return go(match);
  }

  // 2. URL / anchor / route resolution
  if (url) {
    if (url.startsWith('#')) {
      const anchorName = url.replace(/^#+/, '').trim().toLowerCase();
      const matchedPage = findPage(
        website,
        (p) =>
          p.slug.toLowerCase() === anchorName ||
          p.id.toLowerCase() === anchorName ||
          p.id.toLowerCase() === `page_${anchorName}`
      );
      if (matchedPage && matchedPage.id !== activePage.id) return go(matchedPage);

      e.preventDefault();
      e.stopPropagation();
      const targetElement =
        document.getElementById(anchorName) ||
        document.getElementById(`comp_${anchorName}`) ||
        document.getElementById(`tmpl_${anchorName}`) ||
        document.getElementById(node.id);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const cleanSlug = url
      .replace(/^[#/]+/, '')
      .toLowerCase()
      .trim();
    const pageBySlug = findPage(
      website,
      (p) =>
        p.slug.toLowerCase() === cleanSlug ||
        p.id.toLowerCase() === cleanSlug ||
        p.id.toLowerCase() === `page_${cleanSlug}` ||
        p.name.trim().toLowerCase() === cleanSlug
    );
    if (pageBySlug) return go(pageBySlug);

    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('tel:') ||
      url.startsWith('mailto:')
    ) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  // 3. Fallback: resolve by link label against page names / Arabic keywords
  if (text) {
    const byName = findPage(website, (p) => p.name.trim() === text);
    if (byName) return go(byName);

    const lower = text.toLowerCase();
    const keywordMap: Array<[RegExp, (p: BuilderPage) => boolean]> = [
      [
        /رئيسية|المجد/,
        (p) => p.slug === 'home' || p.id === 'page_home' || !!p.metadata?.isHomePage,
      ],
      [
        /أسطول|سيارات|معرض|موديل/,
        (p) => p.slug === 'fleet' || p.id.includes('fleet') || p.name.includes('أسطول'),
      ],
      [
        /من نحن|قصتنا|رؤيتنا|عن الشركة/,
        (p) => p.slug === 'about' || p.id === 'page_about' || p.name.includes('من نحن'),
      ],
      [
        /فريق|القيادة|الخبراء/,
        (p) => p.slug === 'team' || p.id === 'page_team' || p.name.includes('فريق'),
      ],
      [
        /فروع|صالات|الموقع/,
        (p) => p.slug === 'branches' || p.id === 'page_branches' || p.name.includes('فروع'),
      ],
      [
        /اعتماد|جوائز|شهادات|جودة/,
        (p) =>
          p.slug === 'certifications' ||
          p.id === 'page_certifications' ||
          p.name.includes('اعتمادات'),
      ],
      [
        /تواصل|حجز|اتصل|تجربة|فحص/,
        (p) => p.slug === 'contact' || p.id.includes('contact') || p.name.includes('تواصل'),
      ],
      [
        /دخول|تسجيل الدخول|حسابي|عضوية|تسجيل دخول/,
        (p) =>
          p.slug === 'login' ||
          p.id.includes('login') ||
          p.name.includes('تسجيل الدخول') ||
          p.slug === 'auth',
      ],
      [
        /إنشاء حساب|تسجيل جديد|عضو جديد|حساب جديد/,
        (p) =>
          p.slug === 'register' ||
          p.id.includes('register') ||
          p.name.includes('إنشاء حساب'),
      ],
    ];
    for (const [re, match] of keywordMap) {
      if (re.test(lower)) {
        const page = findPage(website, match);
        if (page) return go(page);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// FaqItem — accordion item for the 'faq' section type
// ---------------------------------------------------------------------------

const FaqItem: React.FC<{
  question: string;
  answer: string;
  theme: ReturnType<typeof resolveTheme>;
}> = ({ question, answer, theme }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
      style={{ borderColor: open ? theme.colors.primary + '40' : undefined }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-right cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-bold text-slate-900 flex-1">{question}</span>
        <span
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: open ? theme.colors.primary : '#f1f5f9',
            color: open ? '#fff' : '#64748b',
          }}
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
          {answer}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// AuthSectionView — Interactive Login / Register / Customer Account Section
// ---------------------------------------------------------------------------

const AuthSectionView: React.FC<{
  node: ComponentNode;
  ctx: NodeViewContext;
}> = ({ node, ctx }) => {
  const { theme, shop } = ctx;
  const layout = node.props.layout || 'split';
  const defaultTab = node.props.defaultTab || 'login';

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const title =
    activeTab === 'login'
      ? node.props.title || 'تسجيل الدخول إلى حسابك'
      : 'إنشاء حساب عميل جديد';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!phone || phone.trim().length < 8) {
      setErrorMessage('يرجى إدخال رقم هاتف صحيح');
      return;
    }
    if (activeTab === 'register' && !name.trim()) {
      setErrorMessage('يرجى إدخال اسمك الكريم');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (layout === 'phone_otp' && !isOtpSent) {
        setIsOtpSent(true);
        setSuccessMessage('تم إرسال رمز التحقق إلى رقم هاتفك ⚡');
      } else {
        setSuccessMessage(
          activeTab === 'login'
            ? 'تم تسجيل الدخول بنجاح! مرحباً بك مجدداً'
            : 'تم إنشاء حسابك بنجاح! مرحباً بك كعضو جديد'
        );
      }
    }, 700);
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
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                      {perk}
                    </span>
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

                {layout !== 'phone_otp' && (
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

                {layout === 'phone_otp' && isOtpSent && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      رمز التحقق المرسل (OTP)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="• • • •"
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
                        {layout === 'phone_otp' && !isOtpSent
                          ? 'إرسال رمز التحقق السريع'
                          : 'تسجيل الدخول الآن'}
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

// ---------------------------------------------------------------------------
// NodeView — recursive public renderer
// ---------------------------------------------------------------------------

export const NodeView: React.FC<{ nodeId: string; ctx: NodeViewContext }> = ({ nodeId, ctx }) => {
  const node = ctx.website.components[nodeId];
  if (!node || node.isHidden || node.props?.hidden) return null;
  return <NodeViewInner node={node} ctx={ctx} />;
};

const NodeViewInner: React.FC<{ node: ComponentNode; ctx: NodeViewContext }> = ({ node, ctx }) => {
  const { website, viewport, activePage, theme, shop, realProducts, onNavigatePage, waLink } = ctx;

  // Local interactive state (each node instance owns its own state — mirrors
  // the canvas where every ComponentRenderer instance is independent).
  const [openDropdown, setOpenDropdown] = useState(false);
  const [faqOpen, setFaqOpen] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isMobileMenuDrawerOpen, setIsMobileMenuDrawerOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  const isMobile = viewport === 'mobile';

  // Compute responsive styles merged by current breakpoint (faithful port).
  const getComputedStyles = (): React.CSSProperties => {
    const d = node.styles.desktop || {};
    const t = node.styles.tablet || {};
    const m = node.styles.mobile || {};

    let merged: StyleProperties = { ...d };
    if (viewport === 'tablet') {
      merged = { ...merged, ...t };
    } else if (viewport === 'mobile') {
      merged = { ...merged, ...t, ...m };
    }

    const css: React.CSSProperties = {
      display: merged.display,
      flexDirection: merged.flexDirection,
      justifyContent: merged.justifyContent,
      alignItems: merged.alignItems,
      flexWrap: merged.flexWrap,
      gridTemplateColumns: merged.gridColumns,
      gap: merged.gap,

      width: merged.width,
      minWidth: merged.minWidth,
      maxWidth: merged.maxWidth,
      height: merged.height,
      minHeight: merged.minHeight,
      maxHeight: merged.maxHeight,

      paddingTop: merged.paddingTop,
      paddingRight: merged.paddingRight,
      paddingBottom: merged.paddingBottom,
      paddingLeft: merged.paddingLeft,

      marginTop: merged.marginTop,
      marginRight: merged.marginRight,
      marginBottom: merged.marginBottom,
      marginLeft: merged.marginLeft,

      fontFamily: merged.fontFamily || theme.typography.fontBody || 'Cairo, sans-serif',
      fontSize: merged.fontSize,
      fontWeight: merged.fontWeight as any,
      lineHeight: merged.lineHeight,
      letterSpacing: merged.letterSpacing,
      textAlign: merged.textAlign,
      color: merged.textColor,
      textTransform: merged.textTransform,

      backgroundColor: merged.backgroundColor,
      backgroundImage: merged.backgroundImage,
      backgroundSize: merged.backgroundSize,
      backgroundPosition: merged.backgroundPosition,

      borderWidth: merged.borderWidth,
      borderStyle: merged.borderStyle,
      borderColor: merged.borderColor,
      borderRadius: merged.borderRadius,

      boxShadow: merged.boxShadow,
      opacity: merged.opacity,
      backdropFilter: merged.backdropBlur ? `blur(${merged.backdropBlur})` : undefined,
      WebkitBackdropFilter: merged.backdropBlur ? `blur(${merged.backdropBlur})` : undefined,
      overflow: merged.overflow,
      textOverflow: merged.textOverflow,
      flexShrink: merged.flexShrink as any,
      wordBreak: 'normal',
      overflowWrap: 'break-word',
      position: merged.position,
      top: merged.top,
      right: merged.right,
      bottom: merged.bottom,
      left: merged.left,
      zIndex: merged.zIndex,
    };

    // Responsive Tablet Safeguards:
    if (viewport === 'tablet') {
      css.boxSizing = 'border-box';
      if (node.type === 'header' || node.category === 'section' || node.type === 'container') {
        css.maxWidth = '100%';
        if (!t.paddingLeft && d.paddingLeft && parseInt(d.paddingLeft) > 32) {
          css.paddingLeft = '20px';
        }
        if (!t.paddingRight && d.paddingRight && parseInt(d.paddingRight) > 32) {
          css.paddingRight = '20px';
        }
        if (!t.paddingTop && d.paddingTop && parseInt(d.paddingTop) > 60) {
          css.paddingTop = '48px';
        }
        if (!t.paddingBottom && d.paddingBottom && parseInt(d.paddingBottom) > 60) {
          css.paddingBottom = '48px';
        }
      }
      if (node.type === 'heading') {
        css.wordBreak = 'normal';
        css.overflowWrap = 'break-word';
        if (!t.fontSize && d.fontSize && parseInt(d.fontSize) > 28) {
          css.fontSize = `${Math.max(20, Math.round(parseInt(d.fontSize) * 0.78))}px`;
        }
      }
      // Tablet multi-column grid collapsing (collapse 4+ cols to 2 cols)
      if (!t.gridColumns && css.gridTemplateColumns) {
        const colsStr = String(css.gridTemplateColumns);
        if (/(repeat\s*\(\s*[3-9]|1fr\s+1fr\s+1fr)/.test(colsStr)) {
          css.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
          css.gap = t.gap || '16px';
        }
      }
    }

    // Responsive Mobile Safeguards for All Themes:
    if (viewport === 'mobile') {
      css.boxSizing = 'border-box';

      // Width & Min-Width Safety Clamping
      css.maxWidth = '100%';
      if (css.width && typeof css.width === 'string' && /px$/.test(css.width)) {
        const px = parseInt(css.width);
        if (px > 340) {
          css.width = '100%';
        }
      }
      if (css.minWidth && typeof css.minWidth === 'string' && /px$/.test(css.minWidth)) {
        const px = parseInt(css.minWidth);
        if (px > 280) {
          css.minWidth = '0px';
        }
      }

      // Grid Collapsing: Any multi-column desktop grid collapses to 1 column on mobile
      if (!m.gridColumns && css.gridTemplateColumns) {
        const colsStr = String(css.gridTemplateColumns);
        if (/(repeat\s*\(\s*[2-9]|1fr\s+1fr)/.test(colsStr)) {
          css.gridTemplateColumns = 'repeat(1, minmax(0, 1fr))';
        }
      }
      if (css.gap && typeof css.gap === 'string' && parseInt(css.gap) > 20) {
        css.gap = '16px';
      }

      // Section and Container Spacing
      if (
        node.type === 'header' ||
        node.category === 'section' ||
        node.type === 'container' ||
        node.type === 'hero' ||
        node.type === 'features' ||
        node.type === 'pricing' ||
        node.type === 'products' ||
        node.type === 'footer'
      ) {
        css.maxWidth = '100%';
        css.overflowX = 'clip';

        // Clamp excessive desktop top/bottom padding
        if (!m.paddingTop && d.paddingTop && parseInt(d.paddingTop) > 36) {
          css.paddingTop = `${Math.min(36, Math.max(20, Math.round(parseInt(d.paddingTop) * 0.38)))}px`;
        }
        if (!m.paddingBottom && d.paddingBottom && parseInt(d.paddingBottom) > 36) {
          css.paddingBottom = `${Math.min(36, Math.max(20, Math.round(parseInt(d.paddingBottom) * 0.38)))}px`;
        }
        // Clamp excessive desktop horizontal padding
        if (!m.paddingLeft && d.paddingLeft && parseInt(d.paddingLeft) > 16) {
          css.paddingLeft = '14px';
        }
        if (!m.paddingRight && d.paddingRight && parseInt(d.paddingRight) > 16) {
          css.paddingRight = '14px';
        }
      }

      // Flex Layout Switching (Row -> Column on mobile for split heroes, feature splits, containers)
      if (
        merged.display === 'flex' &&
        (merged.flexDirection === 'row' || !merged.flexDirection) &&
        !m.flexDirection
      ) {
        const isHeaderBar =
          node.parentId?.includes('header') ||
          node.type === 'header' ||
          node.id?.includes('brand') ||
          node.id?.includes('toolbar') ||
          node.id?.includes('actions');
        const isInlineBadgeOrTag =
          node.id?.includes('badge') ||
          node.id?.includes('tag') ||
          node.id?.includes('star') ||
          node.id?.includes('rating') ||
          node.id?.includes('icon');
        if (!isHeaderBar && !isInlineBadgeOrTag) {
          css.flexDirection = 'column';
          if (!m.alignItems) {
            css.alignItems = 'stretch';
          }
        } else {
          css.flexWrap = 'wrap';
        }
        if (css.gap && typeof css.gap === 'string' && parseInt(css.gap) > 16) {
          css.gap = '12px';
        }
      }

      // Button Safeguards
      if (node.type === 'button') {
        css.whiteSpace = 'nowrap';
        css.flexShrink = 0;
        css.wordBreak = 'normal';
        if (!m.fontSize && (!d.fontSize || parseInt(d.fontSize) > 13)) {
          css.fontSize = '12px';
        }
        if (!m.paddingLeft && (!d.paddingLeft || parseInt(d.paddingLeft) > 12)) {
          css.paddingLeft = '12px';
        }
        if (!m.paddingRight && (!d.paddingRight || parseInt(d.paddingRight) > 12)) {
          css.paddingRight = '12px';
        }
        if (!m.paddingTop && (!d.paddingTop || parseInt(d.paddingTop) > 8)) {
          css.paddingTop = '6px';
        }
        if (!m.paddingBottom && (!d.paddingBottom || parseInt(d.paddingBottom) > 8)) {
          css.paddingBottom = '6px';
        }
      }

      // Heading Typography Safeguards
      if (node.type === 'heading') {
        css.wordBreak = 'normal';
        css.overflowWrap = 'break-word';
        if (!m.fontSize && d.fontSize) {
          const size = parseInt(d.fontSize);
          if (size >= 36) {
            css.fontSize = '22px';
            css.lineHeight = '1.3';
          } else if (size >= 28) {
            css.fontSize = '19px';
            css.lineHeight = '1.35';
          } else if (size >= 22) {
            css.fontSize = '16px';
            css.lineHeight = '1.4';
          }
        }
        if (d.lineHeight && parseInt(d.lineHeight) > 36) {
          css.lineHeight = '1.35';
        }
        if (
          node.parentId?.includes('header') ||
          node.id?.includes('brand') ||
          node.id?.includes('logo')
        ) {
          css.whiteSpace = 'nowrap';
          css.fontSize = m.fontSize || '14px';
          css.flexShrink = 0;
        }
      }

      // Paragraph Typography Safeguards
      if (node.type === 'paragraph') {
        css.wordBreak = 'normal';
        css.overflowWrap = 'break-word';
        if (!m.fontSize && d.fontSize && parseInt(d.fontSize) > 15) {
          css.fontSize = '13.5px';
          css.lineHeight = '1.55';
        }
      }

      // Hide desktop nav separators & desktop nav paragraphs on mobile
      if (
        (typeof node.props.text === 'string' &&
          (node.props.text.includes('•') ||
            node.props.text.includes('|') ||
            node.props.text.includes('▾'))) ||
        ((node.parentId?.includes('header') ||
          node.parentId?.includes('sec_') ||
          node.id?.includes('nav')) &&
          (node.type === 'paragraph' || node.id?.includes('nav') || node.category === 'navigation'))
      ) {
        css.display = 'none';
      }
    }

    return css;
  };

  const interactiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleInteraction(e, node, ctx);
  };

  const renderChildren = () => {
    if (!node.childrenIds || node.childrenIds.length === 0) return null;
    return node.childrenIds.map((childId) => <NodeView key={childId} nodeId={childId} ctx={ctx} />);
  };

  // Detect nav link nodes targeting the active page (for the active style).
  const isNavNode =
    node.parentId === 'header_nav' ||
    node.parentId === 'tmpl_nav_comp_box' ||
    Boolean(node.props.url) ||
    Boolean(node.props.pageId);

  const isActiveLink = Boolean(
    isNavNode &&
    ((node.props.pageId && node.props.pageId === activePage.id) ||
      (node.props.url &&
        (node.props.url === `/${activePage.slug}` ||
          node.props.url === `#${activePage.slug}` ||
          node.props.url === activePage.slug ||
          (activePage.slug === 'home' &&
            (node.props.url === '/' ||
              node.props.url === '#home' ||
              node.props.url === '/home')))) ||
      (node.props.text && node.props.text.trim() === activePage.name.trim()))
  );

  // Which product list should this section render? Prefer the shop's real
  // catalog so published sites never display leftover template mock items.
  const boundProducts: SiteProduct[] =
    realProducts.length > 0 ? realProducts : node.props.products || [];

  switch (node.type) {
    // ------------------------------------------------------------------ header
    case 'header': {
      const cartSettings = website.settings?.cart;
      const isOrders = (cartSettings?.businessType || 'orders') === 'orders';
      const showCart =
        isOrders &&
        cartSettings?.showCartIcon !== false &&
        (cartSettings?.position === 'header' ||
          cartSettings?.position === 'both' ||
          !cartSettings?.position) &&
        !Boolean(node.props.hideCart || (website.theme as any)?.hideCart);
      const iconType = cartSettings?.iconType || (node.props.cartIcon as string) || 'ShoppingBag';

      const showLogin =
        node.props.showLogin !== false &&
        website.settings?.auth?.headerButton?.show !== false;
      const loginText = (node.props.loginText as string) || 'حسابي';
      const showLoginText = Boolean(node.props.showLoginText);

      const showWhatsapp = Boolean(node.props.showWhatsapp);
      const whatsappNumber = String(node.props.whatsappNumber || shop.phone || '201000000000').replace(/[^0-9]/g, '');
      const showPhone = Boolean(node.props.showPhone);
      const phoneNumber = String(node.props.phoneNumber || shop.phone || '01000000000');

      const handleLoginClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const loginPage = website.pages.find(
          (p) =>
            p.slug === 'login' ||
            p.id.includes('login') ||
            p.name.includes('تسجيل الدخول') ||
            p.slug === 'auth'
        );
        if (loginPage) {
          onNavigatePage(loginPage.id);
        } else {
          const authSec =
            document.querySelector('[data-type="auth"]') ||
            document.querySelector('#auth-section') ||
            document.querySelector('#comp_auth');
          if (authSec) authSec.scrollIntoView({ behavior: 'smooth' });
        }
      };

      return (
        <header id={node.id} style={getComputedStyles()} className="relative transition-all">
          {isMobile ? (
            <div className="w-full flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {node.childrenIds && node.childrenIds.length > 0 ? (
                  node.childrenIds.map((cId) => {
                    const child = website.components[cId];
                    if (!child) return null;
                    if (
                      child.id.includes('nav') ||
                      child.type === 'paragraph' ||
                      child.category === 'navigation'
                    )
                      return null;
                    if (child.type === 'button' || child.id.includes('cta')) return null;
                    return <NodeView key={cId} nodeId={cId} ctx={ctx} />;
                  })
                ) : (
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                    {node.props.title || website.name || 'المتجر الإلكتروني'}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* WhatsApp Quick Button on Mobile */}
                {showWhatsapp && (
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="تواصل واتساب"
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors flex items-center justify-center active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}

                {/* Cart Icon Button */}
                {showCart && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      ctx.onOpenCart?.();
                    }}
                    title="سلة التسوق"
                    className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center active:scale-95 cursor-pointer"
                  >
                    {iconType === 'ShoppingCart' ? (
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                    ) : iconType === 'Package' ? (
                      <Package className="w-4 h-4 text-emerald-600" />
                    ) : iconType === 'Store' ? (
                      <Store className="w-4 h-4 text-emerald-600" />
                    ) : iconType === 'CreditCard' ? (
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    )}
                    {(ctx.cartCount || 0) > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                        {ctx.cartCount! > 99 ? '99+' : ctx.cartCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Account / Login Icon Button */}
                {showLogin && (
                  <button
                    type="button"
                    onClick={handleLoginClick}
                    title="تسجيل الدخول / حسابي"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center active:scale-95 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-700" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileMenuDrawerOpen(true);
                  }}
                  title="القائمة الرئيسية"
                  className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center justify-center active:scale-95"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>

              {isMobileMenuDrawerOpen && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMobileMenuDrawerOpen(false);
                  }}
                  className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-4/5 max-w-xs h-full bg-white text-slate-900 shadow-2xl flex flex-col justify-between p-5 animate-in slide-in-from-right duration-300 overflow-y-auto text-right"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs"
                            style={{ backgroundColor: theme.colors.primary }}
                          >
                            {shop.logoUrl ? (
                              <img
                                src={shop.logoUrl}
                                alt={shop.name}
                                className="w-8 h-8 rounded-xl object-cover"
                              />
                            ) : (
                              (shop.name || 'م')[0]
                            )}
                          </div>
                          <span className="font-black text-sm text-slate-900 truncate max-w-[140px]">
                            {shop.name || 'المتجر'}
                          </span>
                        </div>
                        <button
                          onClick={() => setIsMobileMenuDrawerOpen(false)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          صفحات الموقع
                        </span>
                        {website.pages.map((p) => {
                          const isActive = p.id === activePage.id;
                          return (
                            <button
                              key={p.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigatePage(p.id);
                                setIsMobileMenuDrawerOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all text-right ${
                                isActive
                                  ? 'text-white shadow-xs'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                              style={
                                isActive ? { backgroundColor: theme.colors.primary } : undefined
                              }
                            >
                              <span>{p.name}</span>
                              <ArrowRight
                                className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'} rtl:rotate-180`}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {/* Customer Account / Login Link in Drawer */}
                      {showLogin && (
                        <div className="pt-2 pb-1 border-t border-slate-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const loginPage = website.pages.find(
                                (p) =>
                                  p.slug === 'login' ||
                                  p.id.includes('login') ||
                                  p.name.includes('تسجيل الدخول') ||
                                  p.slug === 'auth'
                              );
                              if (loginPage) {
                                onNavigatePage(loginPage.id);
                              } else {
                                const authSec =
                                  document.querySelector('[data-type="auth"]') ||
                                  document.querySelector('#auth-section') ||
                                  document.querySelector('#comp_auth');
                                if (authSec) authSec.scrollIntoView({ behavior: 'smooth' });
                              }
                              setIsMobileMenuDrawerOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-blue-900 text-xs font-bold transition-all text-right cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-lg text-white flex items-center justify-center shadow-xs"
                                style={{ backgroundColor: theme.colors.primary }}
                              >
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <span>تسجيل الدخول / حسابي</span>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 text-blue-600" />
                          </button>
                        </div>
                      )}

                      {/* Cart Option in Mobile Drawer */}
                      {(() => {
                        const cartSettings = website.settings?.cart;
                        const isOrders = (cartSettings?.businessType || 'orders') === 'orders';
                        const showCart = isOrders && cartSettings?.showCartIcon !== false;
                        if (!showCart) return null;
                        return (
                          <div className="pt-2 pb-1 border-t border-slate-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                ctx.onOpenCart?.();
                                setIsMobileMenuDrawerOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all text-right cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                </div>
                                <span>سلة مشتريات المتجر</span>
                              </div>
                              {(ctx.cartCount || 0) > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                                  {ctx.cartCount}
                                </span>
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 text-emerald-600" />
                              )}
                            </button>
                          </div>
                        );
                      })()}

                      <div className="pt-4 border-t border-slate-100 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          تواصل سريع
                        </span>
                        {shop.phone && waLink(`مرحبًا، أريد الاستفسار عن منتجات ${shop.name}`) && (
                          <a
                            href={waLink(`مرحبًا، أريد الاستفسار عن منتجات ${shop.name}`) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>تواصل عبر واتساب</span>
                          </a>
                        )}
                        {shop.phone && (
                          <a
                            href={`tel:${shop.phone}`}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            <span>اتصال مباشر</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 text-center">
                      <span className="text-[10px] font-semibold text-slate-400">
                        صنع بكل فخر عبر{' '}
                        <strong className="text-blue-600 font-bold">نمّي أعمالك</strong> ⚡
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full relative">
              {renderChildren()}

              {/* Desktop Actions Bar: WhatsApp + Phone + Cart + Login/Account */}
              {(showCart || showLogin || showWhatsapp || showPhone) && (
                <div className="absolute ltr:right-4 rtl:left-4 sm:ltr:right-6 sm:rtl:left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20 pointer-events-auto">
                  {showWhatsapp && (
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="تواصل عبر واتساب"
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden xl:inline">واتساب</span>
                    </a>
                  )}

                  {showPhone && (
                    <a
                      href={`tel:${phoneNumber}`}
                      title="اتصال هاتفي"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold"
                    >
                      <Phone className="w-4 h-4" />
                      <span className="hidden xl:inline">اتصال</span>
                    </a>
                  )}

                  {showCart && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        ctx.onOpenCart?.();
                      }}
                      title="سلة التسوق"
                      className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center active:scale-95 cursor-pointer"
                    >
                      {iconType === 'ShoppingCart' ? (
                        <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      ) : iconType === 'Package' ? (
                        <Package className="w-4 h-4 text-emerald-600" />
                      ) : iconType === 'Store' ? (
                        <Store className="w-4 h-4 text-emerald-600" />
                      ) : iconType === 'CreditCard' ? (
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      )}
                      {(ctx.cartCount || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                          {ctx.cartCount! > 99 ? '99+' : ctx.cartCount}
                        </span>
                      )}
                    </button>
                  )}

                  {showLogin && (
                    <button
                      type="button"
                      onClick={handleLoginClick}
                      title="تسجيل الدخول / حسابي"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold active:scale-95"
                    >
                      <User className="w-4 h-4 text-slate-700" />
                      {showLoginText && <span>{loginText}</span>}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </header>
      );
    }

    // ------------------------------------------------------------ custom-code
    case 'custom-code': {
      return (
        <div id={node.id} style={getComputedStyles()} className="transition-all">
          <CustomCodeFrame node={node} />
          {renderChildren()}
        </div>
      );
    }

    // ---------------------------------------------------------------- heading
    case 'heading': {
      const tag = node.props.tag || 'h2';
      const headingClass = `transition-all ${isNavNode ? 'hover:opacity-80' : ''}`;
      const headingStyle = getComputedStyles();
      const text = node.props.text || 'عنوان المكون';

      const content = (
        <>
          {text}
          {node.props.badgeText && (
            <span
              style={{
                backgroundColor: withAlpha(theme.colors.primary, '20'),
                color: theme.colors.primary,
              }}
              className="mr-2 text-xs font-bold px-2 py-0.5 rounded-full inline-block align-middle"
            >
              {node.props.badgeText}
            </span>
          )}
        </>
      );

      if (tag === 'h1') {
        return (
          <h1 id={node.id} style={headingStyle} onClick={interactiveClick} className={headingClass}>
            {content}
          </h1>
        );
      }
      if (tag === 'h3') {
        return (
          <h3 id={node.id} style={headingStyle} onClick={interactiveClick} className={headingClass}>
            {content}
          </h3>
        );
      }
      if (tag === 'h4') {
        return (
          <h4 id={node.id} style={headingStyle} onClick={interactiveClick} className={headingClass}>
            {content}
          </h4>
        );
      }
      return (
        <h2 id={node.id} style={headingStyle} onClick={interactiveClick} className={headingClass}>
          {content}
        </h2>
      );
    }

    // -------------------------------------------------------------- paragraph
    case 'paragraph': {
      const text = node.props.text || 'نص توضيحي افتراضي للمكون.';
      const computed = getComputedStyles();

      if (isActiveLink) {
        computed.color = theme.colors.primary;
        computed.fontWeight = '700';
      }

      const hasDropdown = node.props.hasDropdown || !!node.props.dropdownItems;
      const dropdownItems = node.props.dropdownItems || [];

      if (hasDropdown && dropdownItems.length > 0) {
        return (
          <div
            id={node.id}
            onMouseEnter={() => setOpenDropdown(true)}
            onMouseLeave={() => setOpenDropdown(false)}
            className="relative inline-block"
          >
            <div
              style={computed}
              onClick={(e) => setOpenDropdown(!openDropdown)}
              className={`transition-all flex items-center gap-1.5 cursor-pointer ${isNavNode ? 'hover:opacity-80' : ''}`}
            >
              <span>{text}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown ? 'rotate-180' : 'opacity-70'}`}
              />
            </div>

            {openDropdown && (
              <div
                style={{ direction: 'rtl' }}
                className="absolute top-full right-0 mt-2 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-slate-100"
              >
                <div className="px-3 py-2">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    تصفح الأقسام
                  </span>
                </div>
                <div className="py-1 space-y-1">
                  {dropdownItems.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(false);
                        handleInteraction(
                          e,
                          { ...node, props: { ...node.props, url: item.url, pageId: item.pageId } },
                          ctx
                        );
                      }}
                      className="p-2.5 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer group flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </span>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-600 px-2 py-0.5 rounded-full shrink-0 transition-colors">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      if (node.id === 'fleet_filter_tabs' || node.props.isFilterTabs) {
        const filterPills = node.props.filterPills || [{ id: 'all', label: 'الكل' }];
        return (
          <div
            id={node.id}
            style={computed}
            className="transition-all flex flex-wrap items-center justify-center gap-2"
          >
            {filterPills.map((pill: any) => {
              const isPillActive = filterCategory === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterCategory(pill.id);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isPillActive
                      ? 'text-white shadow-md scale-105'
                      : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 shadow-xs'
                  }`}
                  style={isPillActive ? { backgroundColor: theme.colors.primary } : undefined}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        );
      }

      if (typeof text === 'string' && (text.includes(' • ') || text.includes(' | '))) {
        const delimiter = text.includes(' • ') ? ' • ' : ' | ';
        const items: string[] = text.split(delimiter);
        return (
          <p
            id={node.id}
            style={computed}
            className="transition-all flex flex-wrap items-center gap-2"
          >
            {items.map((item: string, index: number) => {
              const trimmed = item.trim();
              const isItemActive =
                activePage.name.trim() === trimmed ||
                (trimmed === 'الرئيسية' && activePage.slug === 'home');
              return (
                <React.Fragment key={index}>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInteraction(e, { ...node, props: { ...node.props } }, ctx);
                    }}
                    className={`transition-colors hover:opacity-80 cursor-pointer ${isItemActive ? 'font-bold' : ''}`}
                    style={isItemActive ? { color: theme.colors.primary } : undefined}
                  >
                    {trimmed}
                  </span>
                  {index < items.length - 1 && <span className="opacity-40 select-none">•</span>}
                </React.Fragment>
              );
            })}
          </p>
        );
      }

      return (
        <p
          id={node.id}
          style={computed}
          onClick={interactiveClick}
          className={`transition-all ${isNavNode ? 'hover:opacity-80' : ''}`}
        >
          {text}
        </p>
      );
    }

    // ----------------------------------------------------------------- button
    case 'button': {
      const btnText = node.props.text || 'زر الإجراء';
      const waHref = waLink(
        btnText ? `مرحبًا، بخصوص: ${btnText}` : `مرحبًا، أريد الاستفسار عن منتجات ${shop.name}`
      );
      const isHeaderCta =
        node.id === 'header_cta_btn' ||
        node.parentId === 'header_inner_container' ||
        node.id.includes('tmpl_cta_btn');

      return (
        <div className="inline-flex items-center gap-2">
          {/* Header Account / Login Button for Desktop */}
          {isHeaderCta &&
            website.settings?.auth?.enabled &&
            website.settings?.auth?.headerButton?.show !== false &&
            (() => {
              const btnStyle = website.settings?.auth?.headerButton?.style || 'icon_and_text';
              const btnLabel = website.settings?.auth?.headerButton?.text || 'تسجيل الدخول';
              const onAuthClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                const targetPageId = website.settings?.auth?.headerButton?.targetPageId;
                const targetPage = targetPageId
                  ? website.pages.find((p) => p.id === targetPageId)
                  : website.pages.find(
                      (p) =>
                        p.slug === 'login' ||
                        p.id.includes('login') ||
                        p.name.includes('تسجيل الدخول') ||
                        p.slug === 'auth'
                    );
                if (targetPage) {
                  onNavigatePage(targetPage.id);
                } else {
                  const authSec =
                    document.querySelector('[data-type="auth"]') ||
                    document.querySelector('#auth-section') ||
                    document.querySelector('#comp_auth');
                  if (authSec) {
                    authSec.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              };

              if (btnStyle === 'icon') {
                return (
                  <button
                    type="button"
                    onClick={onAuthClick}
                    title="تسجيل الدخول / حسابي"
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-white/90 hover:bg-white text-slate-700 hover:text-blue-600 shadow-xs transition-all flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    <User className="w-4 h-4" />
                  </button>
                );
              }

              if (btnStyle === 'button') {
                return (
                  <button
                    type="button"
                    onClick={onAuthClick}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{btnLabel}</span>
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  onClick={onAuthClick}
                  className="px-3 py-2 rounded-xl border border-slate-200/80 bg-white/90 hover:bg-white text-slate-700 hover:text-blue-600 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{btnLabel}</span>
                </button>
              );
            })()}
          <button
            id={node.id}
            style={getComputedStyles()}
            onClick={(e) => {
              e.stopPropagation();
              // If the button has no resolvable page target, fall back to WhatsApp.
              const hasTarget =
                node.props.url ||
                node.props.href ||
                node.props.link ||
                node.props.pageId ||
                node.props.targetPage;
              if (hasTarget) {
                handleInteraction(e, node, ctx);
              } else if (waHref) {
                window.open(waHref, '_blank', 'noopener,noreferrer');
              }
            }}
            className="transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 cursor-pointer"
          >
            {node.props.iconName === 'Sparkles' && <Sparkles className="w-4 h-4" />}
            {node.props.iconName === 'MessageCircle' && <MessageCircle className="w-4 h-4" />}
            {node.props.iconName === 'Phone' && <Phone className="w-4 h-4" />}
            {node.props.iconName === 'Mail' && <Mail className="w-4 h-4" />}
            {node.props.iconName === 'MapPin' && <MapPin className="w-4 h-4" />}
            <span>{btnText}</span>
          </button>
        </div>
      );
    }

    // ------------------------------------------------------------------ image
    case 'image': {
      return (
        <div id={node.id} style={getComputedStyles()} className="overflow-hidden transition-all">
          <img
            src={
              node.props.src ||
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="500"%3E%3Crect fill="%23e2e8f0" width="800" height="500"/%3E%3C/svg%3E'
            }
            alt={node.props.alt || 'صورة المكون'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    // ------------------------------------------------------------------ badge
    case 'badge': {
      return (
        <div
          id={node.id}
          style={getComputedStyles()}
          className="inline-flex items-center transition-all"
        >
          {node.props.text || 'شارة مميزة'}
        </div>
      );
    }

    // ------------------------------------------------------------------- card
    case 'card': {
      const special =
        node.props.icon ||
        node.props.specs ||
        node.props.quote ||
        node.props.question ||
        node.props.features;

      if (special) {
        return (
          <div
            id={node.id}
            style={getComputedStyles()}
            className="transition-all flex flex-col justify-between"
          >
            {/* PRODUCT CARD - موحدة مع المحرر (نفس الشكل/الخيارات) */}
            {node.props.image &&
              node.props.price &&
              (() => {
                const m = node.id.match(/\d+/);
                const ci = m ? parseInt(m[0], 10) - 1 : 0;
                return (
                  <PublishedProductCard
                    item={node.props as any}
                    index={ci}
                    sectionProps={node.props as any}
                    ctx={{
                      theme: { colors: { primary: theme.colors.primary, accent: theme.colors.accent } },
                      realProducts: realProducts as any,
                      waLink,
                      onAddToCart: ctx.onAddToCart as any,
                    }}
                  />
                );
              })()}

            {/* BENTO FEATURE CARD */}
            {node.props.icon && (
              <div className="space-y-3">
                <div
                  style={{
                    backgroundColor: withAlpha(theme.colors.primary, '18'),
                    color: theme.colors.primary,
                    borderRadius: theme.radius.md || '10px',
                  }}
                  className="w-12 h-12 flex items-center justify-center"
                >
                  {node.props.icon === 'ShieldCheck' && <ShieldCheck className="w-6 h-6" />}
                  {node.props.icon === 'Truck' && <Truck className="w-6 h-6" />}
                  {node.props.icon === 'CreditCard' && <CreditCard className="w-6 h-6" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{node.props.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{node.props.description}</p>
                {node.props.tag && (
                  <span
                    style={{ color: theme.colors.primary }}
                    className="inline-block text-[11px] font-semibold"
                  >
                    {node.props.tag} &larr;
                  </span>
                )}
              </div>
            )}

            {/* TESTIMONIAL CARD */}
            {node.props.quote && (
              <div className="space-y-4">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(node.props.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  "{node.props.quote}"
                </p>
                <div className="pt-2 border-t border-slate-200/60">
                  <h4 className="text-xs font-bold text-slate-900">{node.props.author}</h4>
                  <span className="text-[11px] text-slate-500">{node.props.role}</span>
                </div>
              </div>
            )}

            {/* FAQ ITEM */}
            {node.props.question && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setFaqOpen(!faqOpen);
                }}
                className="space-y-2 select-none cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{node.props.question}</h4>
                  <span className="text-slate-400 p-1">
                    {faqOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </div>
                {faqOpen && (
                  <p className="text-xs text-slate-600 leading-relaxed">{node.props.answer}</p>
                )}
              </div>
            )}

            {/* PRICING TIER */}
            {node.props.features && (
              <div className="space-y-4">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: theme.colors.primary,
                      borderRadius: theme.radius.full || '9999px',
                    }}
                    className="inline-block text-[11px] font-bold text-white px-2.5 py-0.5"
                  >
                    {node.props.badge}
                  </span>
                )}
                <h3 className="text-lg font-bold">{node.props.title}</h3>
                <div
                  style={{ color: theme.colors.primary }}
                  className="text-2xl font-extrabold font-mono"
                >
                  {node.props.price}
                </div>
                <div className="space-y-2 py-3 border-t border-slate-200/30 text-xs">
                  {node.props.features.map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <a
                  href={waLink(`مرحبًا، أريد الاشتراك في: ${node.props.title || 'الباقة'}`) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radius.lg || '10px',
                  }}
                  className="block w-full py-2.5 text-white font-bold text-xs transition-all hover:opacity-90 active:scale-98 text-center"
                >
                  {node.props.ctaText || 'اختيار الباقة'}
                </a>
              </div>
            )}

            {renderChildren()}
          </div>
        );
      }

      return (
        <div id={node.id} style={getComputedStyles()} className="transition-all">
          {renderChildren()}
        </div>
      );
    }

    // --------------------------------------------------------------- products
    case 'products': {
      const productsList = boundProducts;
      const cardOptions = resolveProductCardOptions(node.props as any);
      const cardCtx = {
        theme: { colors: { primary: theme.colors.primary, accent: theme.colors.accent } },
        realProducts: realProducts as any,
        waLink,
        onAddToCart: ctx.onAddToCart as any,
      };
      return (
        <section
          id={node.id}
          data-section="products"
          style={getComputedStyles()}
          className="transition-all"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-8 sm:mb-10 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight break-words">
                    {node.props.title}
                  </h2>
                )}
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">{node.props.subtitle}</p>
                )}
              </div>
            )}

            {productsList.length > 0 && (
              <div className={`${productGridClassName(cardOptions)} gap-4 sm:gap-6`}>
                {productsList.map((prod, idx) => (
                  <PublishedProductCard
                    key={prod.id || idx}
                    item={prod}
                    index={idx}
                    sectionProps={node.props as any}
                    ctx={cardCtx}
                  />
                ))}
              </div>
            )}

            {productsList.length === 0 && (
              <div className="text-center py-14 text-slate-400 font-bold">
                لا توجد منتجات متاحة حالياً
              </div>
            )}

            {renderChildren()}
          </div>
        </section>
      );
    }

    // ---------------------------------------------------------------- pricing
    case 'pricing': {
      const tiersList = node.props.tiers || [];
      const plansAsTiers = (ctx.realSubscriptionPlans || []).map((p) => ({
        id: p.id,
        title: p.nameAr || p.name,
        description: p.description,
        price: `${p.price} ${p.currency || 'ج.م'}`,
        period:
          p.billingCycle === 'yearly'
            ? 'سنوياً'
            : p.billingCycle === 'quarterly'
            ? '3 شهور'
            : p.billingCycle === 'weekly'
            ? 'أسبوعياً'
            : 'شهرياً',
        features: p.features || [],
        badge: p.isFeatured ? 'الأكثر طلباً' : undefined,
        isPopular: p.isFeatured,
        ctaText: 'اشترك الآن',
      }));

      const tiersToRender = tiersList.length > 0 ? tiersList : plansAsTiers;

      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-8 sm:mb-10 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight break-words">
                    {node.props.title}
                  </h2>
                )}
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">{node.props.subtitle}</p>
                )}
              </div>
            )}

            {tiersToRender.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {tiersToRender.map((tier: any, idx: number) => {
                  const isPopular = Boolean(tier.isPopular || tier.badge);
                  return (
                    <div
                      key={tier.id || idx}
                      className={`bg-white rounded-2xl border p-5 sm:p-6 flex flex-col justify-between relative transition-all duration-300 ${
                        isPopular ? 'shadow-xl z-10 md:scale-102' : 'border-slate-200 shadow-sm hover:shadow-md'
                      }`}
                      style={
                        isPopular
                          ? {
                              borderColor: theme.colors.primary,
                              boxShadow: `0 0 0 2px ${withAlpha(theme.colors.primary, '30')}`,
                            }
                          : undefined
                      }
                    >
                      {tier.badge && (
                        <span
                          className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-md"
                          style={{ backgroundColor: theme.colors.primary }}
                        >
                          {tier.badge}
                        </span>
                      )}

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{tier.title}</h3>
                          {tier.description && (
                            <p className="text-xs text-slate-500 mt-1">{tier.description}</p>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1 py-2">
                          <span
                            style={{ color: theme.colors.primary }}
                            className="text-3xl font-black font-mono"
                          >
                            {tier.price}
                          </span>
                          {tier.period && (
                            <span className="text-xs text-slate-500 font-medium">
                              /{tier.period}
                            </span>
                          )}
                        </div>

                        {tier.features && (
                          <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                            {tier.features.map((feat: string, fIdx: number) => (
                              <div key={fIdx} className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {ctx.onSubscribePlan ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            ctx.onSubscribePlan?.({
                              id: tier.id,
                              title: tier.title,
                              price: tier.price,
                              period: tier.period,
                              features: tier.features,
                            });
                          }}
                          style={{
                            backgroundColor: isPopular ? theme.colors.primary : '#0f172a',
                            borderRadius: theme.radius.lg || '10px',
                          }}
                          className="block w-full mt-6 py-3 text-white font-bold text-xs shadow-xs hover:opacity-90 active:scale-98 transition-all text-center cursor-pointer"
                        >
                          {tier.ctaText || 'اختيار الخطة والبدء'}
                        </button>
                      ) : (
                        <a
                          href={waLink(`مرحبًا، أريد الاشتراك في: ${tier.title || 'الخطة'}`) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            backgroundColor: isPopular ? theme.colors.primary : '#0f172a',
                            borderRadius: theme.radius.lg || '10px',
                          }}
                          className="block w-full mt-6 py-3 text-white font-bold text-xs shadow-xs hover:opacity-90 active:scale-98 transition-all text-center"
                        >
                          {tier.ctaText || 'اختيار الخطة والبدء'}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {renderChildren()}
          </div>
        </section>
      );
    }

    // ---------------------------------------------------------------- auth / login / register
    case 'auth':
    case 'auth_login':
    case 'auth_register': {
      return <AuthSectionView node={node} ctx={ctx} />;
    }

    // --------------------------------------------------------------- features
    case 'features': {
      const featuresList = node.props.features || [];
      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-8 sm:mb-10 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight break-words">
                    {node.props.title}
                  </h2>
                )}
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">{node.props.subtitle}</p>
                )}
              </div>
            )}

            {featuresList.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {featuresList.map((feat: any, idx: number) => (
                  <div
                    key={feat.id || idx}
                    className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all duration-300 space-y-3 flex flex-col justify-between"
                  >
                    <div
                      style={{
                        backgroundColor: withAlpha(theme.colors.primary, '15'),
                        color: theme.colors.primary,
                      }}
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                    >
                      {feat.icon ? <ShieldCheck className="w-6 h-6" /> : <span>⭐</span>}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {renderChildren()}
          </div>
        </section>
      );
    }

    // ------------------------------------------------------------------- hero
    case 'hero': {
      const heroStats = node.props.stats || [];
      const primaryColor = theme.colors.primary;

      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
              <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-right">
                {node.props.badge && (
                  <span
                    style={{ backgroundColor: withAlpha(primaryColor, '15'), color: primaryColor }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{node.props.badge}</span>
                  </span>
                )}

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight break-words">
                  {node.props.title}
                  {node.props.highlightTitle && (
                    <span style={{ color: primaryColor }} className="block sm:inline sm:mr-2">
                      {node.props.highlightTitle}
                    </span>
                  )}
                </h1>

                {node.props.description && (
                  <p className="text-xs sm:text-base text-slate-600 leading-relaxed max-w-2xl break-words">
                    {node.props.description}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-4 pt-2">
                  {node.props.primaryCtaText && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInteraction(
                          e,
                          {
                            ...node,
                            props: { ...node.props, url: node.props.primaryCtaLink || '#items' },
                          },
                          ctx
                        );
                      }}
                      style={{
                        backgroundColor: primaryColor,
                        borderRadius: theme.radius.lg || '12px',
                      }}
                      className="w-full sm:w-auto px-5 sm:px-7 py-3 text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 text-center"
                    >
                      <span>{node.props.primaryCtaText}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  )}

                  {node.props.secondaryCtaText && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInteraction(
                          e,
                          {
                            ...node,
                            props: {
                              ...node.props,
                              url: node.props.secondaryCtaLink || '#contact',
                              pageId: 'page_contact',
                            },
                          },
                          ctx
                        );
                      }}
                      className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer shrink-0 text-center justify-center flex items-center"
                    >
                      <span>{node.props.secondaryCtaText}</span>
                    </button>
                  )}
                </div>

                {heroStats.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-6 border-t border-slate-200/80 text-center sm:text-right">
                    {heroStats.map((stat: any, sIdx: number) => (
                      <div key={sIdx} className="space-y-0.5 min-w-0">
                        <div
                          style={{ color: primaryColor }}
                          className="text-base sm:text-2xl font-black font-mono truncate"
                        >
                          {stat.value}
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {node.props.imageUrl && (
                <div className="lg:col-span-5 w-full">
                  <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-100 bg-slate-100 aspect-16/10 sm:aspect-square max-h-[340px] sm:max-h-none">
                    <img
                      src={node.props.imageUrl}
                      alt={node.props.title || 'صورة الواجهة'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                  </div>
                </div>
              )}
            </div>

            {renderChildren()}
          </div>
        </section>
      );
    }

    // ------------------------------------------------------------------- grid
    case 'grid': {
      const itemsList = boundProducts;
      const primaryColor = theme.colors.primary;

      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-16">
            {(node.props.title || node.props.subtitle) && (
              <div className="text-center mb-6 sm:mb-12 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{ backgroundColor: withAlpha(primaryColor, '15'), color: primaryColor }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight break-words">
                    {node.props.title}
                  </h2>
                )}
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
                    {node.props.subtitle}
                  </p>
                )}
              </div>
            )}

            {itemsList.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {itemsList.map((item, idx) => {
                  const formattedPrice = formatPrice(item.price);
                  const orderHref =
                    waLink(
                      `مرحبًا، أريد طلب: ${item.title}${formattedPrice ? ` (${formattedPrice})` : ''}`
                    ) || '#';

                  const productHref = item.id ? `/product/${item.id}` : '#';

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group/card"
                    >
                      {item.image && (
                        <a
                          href={productHref}
                          onClick={(e) => {
                            if (item.id) {
                              // فتح صفحة تفاصيل المنتج
                            }
                          }}
                          className="block relative aspect-16/10 overflow-hidden bg-slate-100 group/img cursor-pointer"
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            className={`w-full h-full object-cover transition-all duration-500 ${
                              item.hoverImage
                                ? 'group-hover/img:scale-105 group-hover/img:opacity-0'
                                : 'group-hover/img:scale-105'
                            }`}
                            loading="lazy"
                          />
                          {item.hoverImage && (
                            <img
                              src={item.hoverImage}
                              alt={`${item.title} - صورة إضافية`}
                              className="absolute inset-0 w-full h-full object-cover transition-all duration-500 opacity-0 scale-100 group-hover/img:opacity-100 group-hover/img:scale-105"
                              loading="lazy"
                            />
                          )}
                          {item.badge && (
                            <span className="absolute top-2.5 right-2.5 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs z-10 shadow-xs">
                              {item.badge}
                            </span>
                          )}
                        </a>
                      )}

                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <a
                              href={productHref}
                              className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1 hover:text-blue-600 transition-colors"
                            >
                              {item.title}
                            </a>
                            <span
                              style={{ color: primaryColor }}
                              className="text-sm sm:text-base font-extrabold font-mono shrink-0"
                            >
                              {formattedPrice}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <a
                            href={orderHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              backgroundColor: primaryColor,
                              borderRadius: theme.radius.md || '8px',
                            }}
                            className="py-2 px-2.5 text-white font-bold text-xs shadow-xs hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1"
                          >
                            {node.props.btnIcon === 'ShoppingCart' ? (
                              <ShoppingCart className="w-3.5 h-3.5" />
                            ) : node.props.btnIcon === 'Zap' ? (
                              <Zap className="w-3.5 h-3.5" />
                            ) : (
                              <ShoppingBag className="w-3.5 h-3.5" />
                            )}
                            <span>{node.props.btnText || 'طلب الآن'}</span>
                          </a>

                          <a
                            href={productHref}
                            className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all text-center active:scale-98 flex items-center justify-center"
                          >
                            تفاصيل
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {renderChildren()}
          </div>
        </section>
      );
    }

    // ------------------------------------------------------------------- form
    case 'form': {
      const fieldsList = node.props.fields || [
        { name: 'name', label: 'الاسم الكريم', type: 'text', placeholder: 'الاسم بالكامل' },
        { name: 'phone', label: 'رقم الهاتف / واتساب', type: 'tel', placeholder: '01xxxxxxxxx' },
        { notes: 'notes', label: 'ملاحظات', type: 'text', placeholder: 'اكتب رسالتك...' },
      ];
      const primaryColor = theme.colors.primary;

      const submitViaWhatsApp = () => {
        const summary = fieldsList
          .map((f: any) => `${f.label}: ${inputValues[f.name] || '-'}`)
          .join('\n');
        const href = waLink(`مرحبًا، أريد إرسال الطلب التالي:\n${summary}`);
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
        setFormSubmitted(true);
      };

      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-lg space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  {node.props.title || 'تواصل معنا واحجز موعدك'}
                </h2>
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
                    {node.props.subtitle}
                  </p>
                )}
              </div>

              {formSubmitted ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-900">تم استلام طلبك!</h3>
                  <p className="text-xs sm:text-sm text-emerald-700 leading-relaxed">
                    شكراً لتواصلك معنا. سنقوم بالرد عليك في أقرب وقت — أو أكمل إرسال التفاصيل عبر
                    واتساب ليصلك رد أسرع.
                  </p>
                  <button
                    onClick={() => setFormSubmitted(false)}
                    className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 pt-2"
                  >
                    إرسال طلب آخر
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitViaWhatsApp();
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fieldsList.map((f: any, fIdx: number) => (
                      <div
                        key={f.name || fIdx}
                        className={
                          fIdx === fieldsList.length - 1 && fieldsList.length % 2 !== 0
                            ? 'sm:col-span-2'
                            : ''
                        }
                      >
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right">
                          {f.label} {f.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type={f.type || 'text'}
                          placeholder={f.placeholder || ''}
                          required={f.required}
                          value={inputValues[f.name] || ''}
                          onChange={(e) =>
                            setInputValues({ ...inputValues, [f.name]: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none transition-colors text-right"
                          style={{ borderRadius: theme.radius.md || '10px' }}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    style={{
                      backgroundColor: primaryColor,
                      borderRadius: theme.radius.lg || '12px',
                    }}
                    className="w-full py-3 sm:py-3.5 text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{node.props.buttonText || 'إرسال الطلب عبر واتساب'}</span>
                  </button>
                </form>
              )}
            </div>

            {renderChildren()}
          </div>
        </section>
      );
    }

    // ----------------------------------------------------------------- footer
    case 'footer': {
      const brandName = node.props.brandName || shop.name || website.name || 'المتجر الإلكتروني';
      const description =
        node.props.description || 'منصة متكاملة للتجارة والخدمات بأعلى معايير الجودة.';

      return (
        <footer id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-12 text-right">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 pb-8 border-b border-slate-800">
              <div className="space-y-2.5">
                <h3 className="text-base sm:text-lg font-black text-white break-words">{brandName}</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm break-words">{description}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  معلومات التواصل
                </h4>
                <div className="space-y-1.5 text-xs text-slate-400">
                  {node.props.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span dir="ltr">{node.props.phone}</span>
                    </div>
                  )}
                  {node.props.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{node.props.email}</span>
                    </div>
                  )}
                  {node.props.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{node.props.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  ضمان واعتماد
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  جميع المعاملات والخدمات مشمولة بضمان معتمد وفريق دعم فني متواجد على مدار الساعة.
                </p>
              </div>
            </div>

            <div className="pt-6 pb-2 text-center flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-400 select-none border-t border-slate-800/60 mt-6">
              <span>
                {node.props.copyright ||
                  `جميع الحقوق محفوظة © ${new Date().getFullYear()} ${brandName}`}
              </span>
              <span className="hidden sm:inline opacity-30">•</span>
              <a
                href="https://mnmknk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all text-[11px] font-medium shadow-xs"
              >
                <span>صنع بكل فخر عبر</span>
                <strong className="text-blue-400 font-extrabold flex items-center gap-1">
                  <span>نمّي أعمالك</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </strong>
              </a>
            </div>

            {renderChildren()}
          </div>
        </footer>
      );
    }

    // ------------------------------------------------------------ testimonials
    case 'testimonials': {
      const reviews = node.props.items || node.props.testimonials || [];
      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-16">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-8 sm:mb-10 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight break-words">
                    {node.props.title}
                  </h2>
                )}
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
                    {node.props.subtitle}
                  </p>
                )}
              </div>
            )}
            {reviews.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {reviews.map((r: any, idx: number) => (
                  <div
                    key={r.id || idx}
                    className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex gap-0.5 text-amber-400">
                        {[...Array(r.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed italic">
                        "{r.quote || r.text || r.comment}"
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
                      {r.avatar ? (
                        <img
                          src={r.avatar}
                          alt={r.author}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                          style={{ backgroundColor: theme.colors.primary }}
                        >
                          {(r.author || 'ع')[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {r.author || 'عميل كريم'}
                        </div>
                        {r.role && <div className="text-[11px] text-slate-500">{r.role}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">لا توجد تقييمات بعد</div>
            )}
            {renderChildren()}
          </div>
        </section>
      );
    }

    // --------------------------------------------------------------- gallery
    case 'gallery': {
      const images = node.props.images || node.props.items || [];
      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-16">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-6 sm:mb-8 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 break-words">
                    {node.props.title}
                  </h2>
                )}
              </div>
            )}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {images.map((img: any, idx: number) => {
                  const src = typeof img === 'string' ? img : img.src || img.url || img.image;
                  const alt =
                    typeof img === 'string'
                      ? `صورة ${idx + 1}`
                      : img.alt || img.title || `صورة ${idx + 1}`;
                  return (
                    <div
                      key={idx}
                      className="aspect-square overflow-hidden rounded-xl bg-slate-100 group shadow-sm hover:shadow-lg transition-all"
                    >
                      <img
                        src={src}
                        alt={alt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">لا توجد صور في المعرض</div>
            )}
            {renderChildren()}
          </div>
        </section>
      );
    }

    // ------------------------------------------------------------------ team
    case 'team': {
      const members = node.props.members || node.props.items || [];
      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-16">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-10 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 break-words">
                    {node.props.title}
                  </h2>
                )}
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
                    {node.props.subtitle}
                  </p>
                )}
              </div>
            )}
            {members.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {members.map((m: any, idx: number) => (
                  <div
                    key={m.id || idx}
                    className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all text-center space-y-3"
                  >
                    {m.image ? (
                      <img
                        src={m.image}
                        alt={m.name}
                        className="w-20 h-20 rounded-full object-cover mx-auto shadow-md border-2"
                        style={{ borderColor: withAlpha(theme.colors.primary, '40') }}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center font-bold text-2xl text-white shadow-md"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        {(m.name || 'م')[0]}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-slate-900">{m.name}</div>
                      {m.role && <div className="text-xs text-slate-500 mt-0.5">{m.role}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {renderChildren()}
          </div>
        </section>
      );
    }

    // ------------------------------------------------------------------ stats
    case 'stats': {
      const statItems = node.props.stats || node.props.items || [];
      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-16">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-8 sm:mb-10 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 break-words">
                    {node.props.title}
                  </h2>
                )}
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 break-words">{node.props.subtitle}</p>
                )}
              </div>
            )}
            {statItems.length > 0 && (
              <div
                className={`grid gap-3 sm:gap-6 ${statItems.length <= 2 ? 'grid-cols-2' : statItems.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}
              >
                {statItems.map((stat: any, idx: number) => (
                  <div
                    key={stat.id || idx}
                    className="text-center space-y-1.5 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all min-w-0"
                  >
                    {stat.icon && (
                      <div
                        className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2"
                        style={{
                          backgroundColor: withAlpha(theme.colors.primary, '15'),
                          color: theme.colors.primary,
                        }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </div>
                    )}
                    <div
                      className="text-xl sm:text-4xl font-black font-mono truncate"
                      style={{ color: theme.colors.primary }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 font-medium leading-snug truncate">
                      {stat.label}
                    </div>
                    {stat.description && (
                      <p className="text-[11px] text-slate-400 break-words">{stat.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {renderChildren()}
          </div>
        </section>
      );
    }

    // ------------------------------------------------------------------- faq
    case 'faq': {
      const faqItems = node.props.items || node.props.questions || [];
      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-10 space-y-2">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {node.props.title}
                  </h2>
                )}
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {node.props.subtitle}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-3">
              {faqItems.length > 0
                ? faqItems.map((item: any, idx: number) => (
                    <FaqItem
                      key={item.id || idx}
                      question={item.question}
                      answer={item.answer}
                      theme={theme}
                    />
                  ))
                : null}
            </div>
            {renderChildren()}
          </div>
        </section>
      );
    }

    // --------------------------------------------------------- contact-section
    case 'contact':
    case 'contact-section': {
      const phone = node.props.phone || shop.phone;
      const email = node.props.email || shop.email;
      const address = node.props.address || shop.address;
      const whatsappHref = waLink(`مرحبًا، أريد التواصل مع ${shop.name || 'المتجر'}`);
      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-16">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-8 sm:mb-10 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 break-words">
                    {node.props.title}
                  </h2>
                )}
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
                    {node.props.subtitle}
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-center group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '15'),
                      color: theme.colors.primary,
                    }}
                  >
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    {node.props.phoneLabel || 'اتصل بنا'}
                  </div>
                  <div className="text-sm font-extrabold text-slate-900" dir="ltr">
                    {phone}
                  </div>
                </a>
              )}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-5 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform bg-emerald-100 text-emerald-600">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-emerald-700">
                    {node.props.whatsappLabel || 'واتساب'}
                  </div>
                  <div className="text-sm font-extrabold text-emerald-900" dir="ltr">
                    {phone}
                  </div>
                </a>
              )}
              {(email || address) && (
                <div className="flex flex-col gap-3">
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                    >
                      <Mail className="w-4 h-4 shrink-0" style={{ color: theme.colors.primary }} />
                      <span className="text-xs text-slate-700 truncate">{email}</span>
                    </a>
                  )}
                  {address && (
                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <MapPin
                        className="w-4 h-4 shrink-0"
                        style={{ color: theme.colors.primary }}
                      />
                      <span className="text-xs text-slate-700">{address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {renderChildren()}
          </div>
        </section>
      );
    }

    // ---------------------------------------------------------- services-grid
    case 'services':
    case 'services-grid': {
      const servicesList = node.props.services || node.props.items || [];
      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-10 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {node.props.title}
                  </h2>
                )}
                {node.props.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {node.props.subtitle}
                  </p>
                )}
              </div>
            )}
            {servicesList.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {servicesList.map((svc: any, idx: number) => {
                  const href = waLink(`مرحبًا، أريد الاستفسار عن خدمة: ${svc.title || ''}`) || '#';
                  return (
                    <div
                      key={svc.id || idx}
                      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all space-y-4 flex flex-col group"
                    >
                      {svc.image ? (
                        <img
                          src={svc.image}
                          alt={svc.title}
                          className="w-full h-36 object-cover rounded-xl"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            backgroundColor: withAlpha(theme.colors.primary, '15'),
                            color: theme.colors.primary,
                          }}
                        >
                          <Sparkles className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-900 mb-1">{svc.title}</h3>
                        {svc.description && (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {svc.description}
                          </p>
                        )}
                        {svc.price && (
                          <div
                            className="mt-2 font-extrabold text-sm font-mono"
                            style={{ color: theme.colors.primary }}
                          >
                            {svc.price}
                          </div>
                        )}
                      </div>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          backgroundColor: theme.colors.primary,
                          borderRadius: theme.radius.lg,
                        }}
                        className="block w-full py-2.5 text-white font-bold text-xs text-center hover:opacity-90 active:scale-98 transition-all"
                      >
                        {svc.ctaText || 'احجز الآن'}
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
            {renderChildren()}
          </div>
        </section>
      );
    }

    // --------------------------------------------------------------- divider / spacer
    case 'divider': {
      const dividerStyle = node.props.style || 'line';
      return (
        <div id={node.id} style={getComputedStyles()} className="transition-all px-4 sm:px-6">
          {dividerStyle === 'dots' ? (
            <div className="flex items-center justify-center gap-2 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              ))}
            </div>
          ) : dividerStyle === 'wave' ? (
            <div className="py-4 text-center text-slate-200 text-xl select-none">〰〰〰</div>
          ) : (
            <hr
              className="border-slate-200"
              style={{ borderColor: node.props.color || undefined }}
            />
          )}
        </div>
      );
    }

    case 'spacer': {
      return <div id={node.id} style={getComputedStyles()} aria-hidden="true" />;
    }

    // ------------------------------------------------------- mobile footer bar
    case 'mobile_footer': {
      // A fixed bottom navigation bar for phones (hidden on ≥md screens).
      // Buttons come from node.props.buttons; the cart button opens the host
      // app's unified cart drawer when the host wires onOpenCart.
      const rawButtons: string[] = Array.isArray(node.props.buttons)
        ? node.props.buttons
        : ['home', 'products', 'cart', 'whatsapp'];
      const barBg = node.props.bgColor || '#0f172a';
      const activeColor = node.props.accentColor || theme.colors.primary || '#22d3ee';

      const scrollToProducts = () => {
        const el =
          document.querySelector('[data-section="products"]') ||
          document.getElementById('products');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else ctx.onNavigatePage?.(ctx.activePage.id);
      };

      const renderBtn = (key: string) => {
        switch (key) {
          case 'home':
            return (
              <button
                key={key}
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-white/80 hover:text-white transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="text-[9px] font-bold">الرئيسية</span>
              </button>
            );
          case 'products':
            return (
              <button
                key={key}
                type="button"
                onClick={scrollToProducts}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-white/80 hover:text-white transition-colors"
              >
                <LayoutGrid className="w-5 h-5" />
                <span className="text-[9px] font-bold">المنتجات</span>
              </button>
            );
          case 'cart':
            return (
              <button
                key={key}
                type="button"
                onClick={() => ctx.onOpenCart?.()}
                className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-white/80 hover:text-white transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="text-[9px] font-bold">السلة</span>
                {(ctx.cartCount || 0) > 0 && (
                  <span className="absolute top-0 left-1/2 translate-x-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                    {ctx.cartCount! > 9 ? '9+' : ctx.cartCount}
                  </span>
                )}
              </button>
            );
          case 'whatsapp': {
            const href = waLink(`مرحبًا، أريد التواصل مع ${shop.name || 'المتجر'}`);
            if (!href) return null;
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-[9px] font-bold">واتساب</span>
              </a>
            );
          }
          case 'phone': {
            if (!shop.phone) return null;
            return (
              <a
                key={key}
                href={`tel:${shop.phone}`}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-white/80 hover:text-white transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span className="text-[9px] font-bold">اتصال</span>
              </a>
            );
          }
          default:
            return null;
        }
      };

      return (
        <div
          id={node.id}
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 backdrop-blur-md"
          style={{ backgroundColor: barBg }}
        >
          <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
            {rawButtons.map(renderBtn)}
          </div>
        </div>
      );
    }

    // ----------------------------------------------------- whatsapp-float button
    case 'whatsapp-float':
    case 'whatsapp_button': {
      const waFloatHref = waLink(
        node.props.message || `مرحبًا، أريد التواصل مع ${shop.name || 'المتجر'}`
      );
      if (!waFloatHref) return null;
      return (
        <a
          id={node.id}
          href={waFloatHref}
          target="_blank"
          rel="noopener noreferrer"
          title="تواصل عبر واتساب"
          className="fixed bottom-5 left-5 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95 hover:scale-105"
          style={{ boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)' }}
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      );
    }

    // ------------------------------------------------------------ trust-badges
    case 'trust-badges':
    case 'trust_badges': {
      const badges = node.props.badges ||
        node.props.items || [
          { icon: 'Truck', label: 'توصيل سريع', sub: 'لجميع المحافظات' },
          { icon: 'CreditCard', label: 'دفع عند الاستلام', sub: 'بدون دفع مسبق' },
          { icon: 'ShieldCheck', label: 'ضمان الجودة', sub: 'استرداد مضمون' },
          { icon: 'Star', label: 'تقييم ممتاز', sub: '+1000 عميل سعيد' },
        ];
      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            <div
              className={`grid gap-3 sm:gap-4 ${badges.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : badges.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}
            >
              {badges.map((b: any, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-all text-center sm:text-right"
                >
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center"
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '15'),
                      color: theme.colors.primary,
                    }}
                  >
                    {b.icon === 'Truck' && <Truck className="w-5 h-5" />}
                    {b.icon === 'CreditCard' && <CreditCard className="w-5 h-5" />}
                    {b.icon === 'ShieldCheck' && <ShieldCheck className="w-5 h-5" />}
                    {b.icon === 'Star' && <Star className="w-5 h-5" />}
                    {b.icon === 'Package' && <Package className="w-5 h-5" />}
                    {!['Truck', 'CreditCard', 'ShieldCheck', 'Star', 'Package'].includes(
                      b.icon
                    ) && <CheckCircle className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 break-words">{b.label}</div>
                    {b.sub && <div className="text-[11px] text-slate-500 mt-0.5 break-words">{b.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    // ----------------------------------------------------------- before-after
    case 'before-after':
    case 'before_after': {
      const beforeImg = node.props.beforeImage || node.props.before;
      const afterImg = node.props.afterImage || node.props.after;
      return (
        <section id={node.id} style={getComputedStyles()} className="transition-all">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
            {(node.props.title || node.props.badge) && (
              <div className="text-center mb-8 space-y-2 max-w-2xl mx-auto">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: withAlpha(theme.colors.primary, '18'),
                      color: theme.colors.primary,
                    }}
                    className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && (
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                    {node.props.title}
                  </h2>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              {beforeImg && (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden aspect-square bg-slate-100 shadow-md">
                    <img
                      src={beforeImg}
                      alt="قبل"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-3 right-3 bg-slate-900/80 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-xs">
                      {node.props.beforeLabel || 'قبل'}
                    </div>
                  </div>
                </div>
              )}
              {afterImg && (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden aspect-square bg-slate-100 shadow-md">
                    <img
                      src={afterImg}
                      alt="بعد"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div
                      className="absolute top-3 right-3 text-white text-xs font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      {node.props.afterLabel || 'بعد'}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {renderChildren()}
          </div>
        </section>
      );
    }

    // ----------------------------------------------------------- promo-banner
    case 'promo-banner':
    case 'promo_banner':
    case 'announcement-bar':
    case 'announcement_bar': {
      return (
        <div
          id={node.id}
          style={{
            backgroundColor: node.props.bgColor || theme.colors.primary,
            color: node.props.textColor || '#ffffff',
            ...getComputedStyles(),
          }}
          className="w-full py-2.5 px-4 text-center text-xs sm:text-sm font-bold transition-all"
        >
          {node.props.emoji && <span className="mr-1.5">{node.props.emoji}</span>}
          {node.props.text || node.props.title || '🎉 عرض خاص! احجز الآن واحصل على خصم'}
          {node.props.link && (
            <a
              href={node.props.link}
              className="underline mr-2 hover:opacity-80 transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              {node.props.linkText || 'تفاصيل'}
            </a>
          )}
        </div>
      );
    }

    // ---------------------------------------------------------------- default

    default: {
      return (
        <div id={node.id} style={getComputedStyles()} className="transition-all">
          {node.props.badge && node.props.title && (
            <div className="text-center mb-10 space-y-2 max-w-2xl mx-auto">
              <span
                className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                style={{
                  backgroundColor: withAlpha(theme.colors.primary, '12'),
                  color: theme.colors.primary,
                }}
              >
                {node.props.badge}
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">
                {node.props.title}
              </h2>
              {node.props.subtitle && (
                <p className="text-sm text-slate-600 leading-relaxed">{node.props.subtitle}</p>
              )}
            </div>
          )}

          {node.props.value && node.props.label && (
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 font-mono">{node.props.value}</div>
              <div className="text-xs text-slate-500 font-medium">{node.props.label}</div>
            </div>
          )}

          {node.props.copyright && (
            <div className="w-full text-center text-xs text-slate-500">{node.props.copyright}</div>
          )}

          {node.props.heading && node.props.links && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {node.props.heading}
              </h4>
              <div className="flex flex-col gap-1.5 text-xs text-slate-400">
                {node.props.links.map((link: string, i: number) => (
                  <span
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInteraction(e, { ...node, props: { ...node.props, text: link } }, ctx);
                    }}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    {link}
                  </span>
                ))}
              </div>
            </div>
          )}

          {node.props.heading && node.props.info && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {node.props.heading}
              </h4>
              <div className="flex flex-col gap-1.5 text-xs text-slate-400">
                {node.props.info.map((inf: string, i: number) => (
                  <span key={i}>{inf}</span>
                ))}
              </div>
            </div>
          )}

          {renderChildren()}
        </div>
      );
    }
  }
};
