import React, { useState } from 'react';
import { BaseRendererProps } from './types';
import {
  Menu,
  X,
  ShoppingCart,
  Package,
  Store,
  CreditCard,
  ShoppingBag,
  User,
  ArrowRight,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { ComponentRenderer } from '../ComponentRenderer';

export interface HeaderRendererProps extends BaseRendererProps {
  cartCount: number;
  setIsCartOpen: (open: boolean) => void;
}

export const HeaderRenderer: React.FC<HeaderRendererProps> = ({
  node,
  website,
  currentViewport,
  isInteractivePreview,
  outlineClass,
  getComputedStyles,
  handleClick,
  handleMouseEnter,
  handleMouseLeave,
  renderChildren,
  switchPage,
  activePageId,
  overrideViewport,
  cartCount,
  setIsCartOpen,
}) => {
  const [isMobileMenuDrawerOpen, setIsMobileMenuDrawerOpen] = useState<boolean>(false);
  const isMobile = currentViewport === 'mobile';

  // Cart visibility
  const cartSettings = website.settings?.cart;
  const isCartEnabled = cartSettings?.enabled !== false;
  const cartBusinessType = cartSettings?.businessType || 'orders';
  const cartIconType =
    cartSettings?.iconType || (node.props.cartIcon as string) || 'ShoppingBag';
  const showCartInHeader =
    isCartEnabled &&
    cartBusinessType === 'orders' &&
    cartSettings?.showCartIcon !== false &&
    (cartSettings?.position === 'header' || cartSettings?.position === 'both' || !cartSettings?.position) &&
    !Boolean(node.props.hideCart || (website.theme as any)?.hideCart);
  const hideCart = !showCartInHeader;

  // Account / Login visibility: only visible when auth is actually enabled and not hidden
  const isAuthEnabled = Boolean(website.settings?.auth?.enabled);
  const showLogin =
    isAuthEnabled &&
    node.props.showLogin !== false &&
    website.settings?.auth?.headerButton?.show !== false;
  const loginText = (node.props.loginText as string) || 'حسابي';
  const showLoginText = Boolean(node.props.showLoginText);

  // Quick Contact visibility in header
  const showWhatsapp = Boolean(node.props.showWhatsapp);
  const whatsappNumber = String(node.props.whatsappNumber || '201000000000').replace(/[^0-9]/g, '');
  const showPhone = Boolean(node.props.showPhone);
  const phoneNumber = String(node.props.phoneNumber || '01000000000');

  const activePage = website.pages.find((p) => p.id === activePageId) || website.pages[0];

  // Extract nav section links from bullet-separated paragraph (gen_nav_items / header_nav)
  const navSectionLinks = (() => {
    const anchors: Array<{ label: string; anchor: string }> = [];

    // 1. Try to find bullet-separated nav node (e.g. gen_nav_items, nav_*)
    const navNode = Object.values(website.components).find(
      (c) =>
        (c.id.includes('nav') || c.category === 'navigation') &&
        c.type === 'paragraph' &&
        typeof c.props.text === 'string' &&
        c.props.text.includes('•')
    );

    const resolveAnchor = (label: string): string => {
      const lower = label.toLowerCase();
      // Try exact or keyword page match
      const pageMatch = website.pages.find((p) => {
        const pLower = p.name.toLowerCase();
        if (pLower === lower || p.slug === lower) return true;
        if (lower.includes('رئيسية') && (p.slug === 'home' || p.id === 'page_home')) return true;
        if (
          (lower.includes('خدمات') ||
            lower.includes('منتجات') ||
            lower.includes('منيو') ||
            lower.includes('عقارات') ||
            lower.includes('باقات') ||
            lower.includes('تخصصات') ||
            lower.includes('أطباء')) &&
          (p.slug === 'services' || p.id === 'page_services')
        )
          return true;
        if (
          (lower.includes('من نحن') ||
            lower.includes('قصت') ||
            lower.includes('تقييم') ||
            lower.includes('ذواقة') ||
            lower.includes('مدرب') ||
            lower.includes('آراء')) &&
          (p.slug === 'about' || p.id === 'page_about')
        )
          return true;
        if (
          (lower.includes('تواصل') ||
            lower.includes('حجز') ||
            lower.includes('طاولة') ||
            lower.includes('موعد') ||
            lower.includes('اتصل')) &&
          (p.slug === 'contact' || p.id === 'page_contact')
        )
          return true;
        return false;
      });

      if (pageMatch) return pageMatch.id;

      // Fallback section anchor
      if (lower.includes('رئيسية')) return 'page_home';
      if (lower.includes('باقات') || lower.includes('أسعار')) return '#pricing';
      if (lower.includes('آراء') || lower.includes('عملاء') || lower.includes('تقييم'))
        return '#features';
      if (lower.includes('تواصل') || lower.includes('حجز') || lower.includes('موعد'))
        return '#form';
      return '#items';
    };

    if (navNode) {
      (navNode.props.text as string).split('•').forEach((item: string) => {
        const label = item.trim();
        if (!label) return;
        anchors.push({ label, anchor: resolveAnchor(label) });
      });
      if (anchors.length > 0) return anchors;
    }

    // 2. Check if there is a nav flex/container with button children (e.g. restaurant.ts, clinic.ts, gym.ts)
    const navContainer = Object.values(website.components).find(
      (c) =>
        (c.id.includes('nav') || c.category === 'navigation') &&
        Array.isArray(c.childrenIds) &&
        c.childrenIds.length > 0
    );

    if (navContainer && navContainer.childrenIds.length > 0) {
      navContainer.childrenIds.forEach((childId) => {
        const child = website.components[childId];
        if (child && (child.type === 'button' || (child.type as string) === 'link')) {
          const label = String(child.props?.text || child.props?.label || child.name || '').trim();
          if (label) {
            anchors.push({ label, anchor: resolveAnchor(label) });
          }
        }
      });
      if (anchors.length > 0) return anchors;
    }

    // 3. Fallback to website.pages
    if (website.pages?.length > 0) {
      website.pages.forEach((p) => {
        anchors.push({ label: p.name, anchor: p.id });
      });
    }

    return anchors;
  })();

  const headerCtaComp = Object.values(website.components).find(
    (c) =>
      c.type === 'button' &&
      !c.isHidden &&
      !c.props?.hidden &&
      (c.id === 'header_cta_btn' ||
        c.id === 'gen_header_cta' ||
        c.id.endsWith('_cta') ||
        c.id.includes('cta') ||
        c.id.includes('action') ||
        Boolean(c.parentId?.includes('header'))) &&
      Boolean(c.props.label || c.props.text)
  );

  const hasInlineHeaderActions = Object.values(website.components).some(
    (c) =>
      c.type === 'button' &&
      (c.id === 'header_cta_btn' ||
        c.id === 'gen_header_cta' ||
        c.id.endsWith('_cta') ||
        c.id.includes('cta') ||
        c.id.includes('action') ||
        Boolean(c.parentId?.includes('header')))
  );

  const handleLoginClick = (e: React.MouseEvent) => {
    if (!isInteractivePreview) return;
    e.stopPropagation();
    const targetPage = website.pages.find(
      (p) =>
        p.slug === 'login' ||
        p.id.includes('login') ||
        p.name.includes('تسجيل الدخول') ||
        p.slug === 'auth'
    );
    if (targetPage) {
      switchPage(targetPage.id);
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

  return (
    <header
      id={node.id}
      style={getComputedStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`cursor-pointer transition-all ${outlineClass} relative`}
    >
      {isMobile ? (
        <div className="w-full flex items-center justify-between gap-3 px-3 py-2.5">
          {/* Brand Logo / Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {(() => {
              // Find brand node recursively or in direct children
              let brandComp: any = null;
              for (const cId of node.childrenIds || []) {
                const child = website.components[cId];
                if (!child) continue;
                if (
                  child.id.includes('brand') ||
                  child.id.includes('logo') ||
                  child.name?.includes('شعار') ||
                  child.name?.includes('هوية')
                ) {
                  brandComp = child;
                  break;
                }
                for (const subId of child.childrenIds || []) {
                  const subChild = website.components[subId];
                  if (
                    subChild &&
                    (subChild.id.includes('brand') ||
                      subChild.id.includes('logo') ||
                      subChild.name?.includes('شعار') ||
                      subChild.name?.includes('هوية'))
                  ) {
                    brandComp = subChild;
                    break;
                  }
                }
                if (brandComp) break;
              }

              if (brandComp) {
                return (
                  <ComponentRenderer
                    key={brandComp.id}
                    nodeId={brandComp.id}
                    isInteractivePreview={isInteractivePreview}
                    overrideViewport={overrideViewport}
                  />
                );
              }

              return (
                <div className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                  {node.props.title || website.name || 'المتجر الإلكتروني'}
                </div>
              );
            })()}
          </div>

          {/* Mobile Actions: Cart + Account/Login + Hamburger Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* WhatsApp Quick Button on Mobile */}
            {showWhatsapp && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => isInteractivePreview && e.stopPropagation()}
                title="واتساب مباشر"
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}

            {/* Cart Button */}
            {!hideCart && (
              <button
                type="button"
                onClick={(e) => {
                  if (isInteractivePreview) {
                    e.stopPropagation();
                    setIsCartOpen(true);
                  }
                }}
                title="سلة التسوق"
                className="relative p-2 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-800 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              >
                {cartIconType === 'ShoppingCart' ? (
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                ) : cartIconType === 'Package' ? (
                  <Package className="w-4 h-4 text-blue-600" />
                ) : cartIconType === 'Store' ? (
                  <Store className="w-4 h-4 text-blue-600" />
                ) : cartIconType === 'CreditCard' ? (
                  <CreditCard className="w-4 h-4 text-blue-600" />
                ) : (
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                )}
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                    {cartCount}
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
                className="p-2 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              >
                <User className="w-4 h-4 text-slate-700" />
              </button>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMobileMenuDrawerOpen(true);
              }}
              title="القائمة الرئيسية"
              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Slide-Over Drawer */}
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
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      {(website.settings?.branding as any)?.logoUrl ? (
                        <img
                          src={(website.settings?.branding as any)?.logoUrl}
                          alt={website.name || 'شعار المتجر'}
                          className="w-8 h-8 rounded-xl object-contain shadow-xs bg-white border border-slate-100"
                        />
                      ) : (
                        <div
                          style={{
                            background: `linear-gradient(135deg, ${website.theme?.colors?.primary || '#3b82f6'}, ${website.theme?.colors?.accent || website.theme?.colors?.primary || '#1d4ed8'})`,
                          }}
                          className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs select-none"
                        >
                          {(() => {
                            const raw = website.name || '⚡';
                            const emojiMatch = raw.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
                            return emojiMatch ? emojiMatch[1] : (raw[0] || '⚡');
                          })()}
                        </div>
                      )}
                      <span className="font-black text-sm text-slate-900 truncate max-w-[140px]">
                        {website.name || 'المتجر'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuDrawerOpen(false)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      التنقل في الموقع
                    </span>

                    {/* Section scroll / page navigation links from nav_items bullet text */}
                    {navSectionLinks.length > 0 ? (
                      navSectionLinks.map(({ label, anchor }) => {
                        const isPage = anchor.startsWith('page_') || website.pages.some((p) => p.id === anchor || p.slug === anchor);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPage) {
                                const target = website.pages.find((p) => p.id === anchor || p.slug === anchor);
                                if (target) switchPage(target.id);
                              } else {
                                const clean = anchor.replace('#', '');
                                const el =
                                  document.getElementById(clean) ||
                                  document.getElementById(`gen_${clean}`) ||
                                  document.getElementById(`comp_${clean}`) ||
                                  document.querySelector(`[id*="${clean}"]`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                              setIsMobileMenuDrawerOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer text-slate-700 hover:bg-slate-100"
                          >
                            <span>{label}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                          </button>
                        );
                      })
                    ) : (
                      /* Fallback to pages when no bullet nav found */
                      website.pages.map((p) => {
                        const isActive = p.id === activePage.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              switchPage(p.id);
                              setIsMobileMenuDrawerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{p.name}</span>
                            <ArrowRight
                              className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'} rtl:rotate-180`}
                            />
                          </button>
                        );
                      })
                    )}

                    {/* Multi-page links (always shown if more than 1 page) */}
                    {navSectionLinks.length > 0 && website.pages.length > 1 && (
                      <div className="pt-2 mt-1 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          الصفحات
                        </span>
                        {website.pages.map((p) => {
                          const isActive = p.id === activePage.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                switchPage(p.id);
                                setIsMobileMenuDrawerOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span>{p.name}</span>
                              <ArrowRight
                                className={`w-3 h-3 ${isActive ? 'text-white' : 'text-slate-400'} rtl:rotate-180`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Primary CTA Button in Drawer */}
                  {headerCtaComp && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isInteractivePreview) {
                            e.stopPropagation();
                            setIsMobileMenuDrawerOpen(false);
                            const link =
                              (headerCtaComp.props.linkUrl as string) ||
                              (headerCtaComp.props.url as string) ||
                              '#contact';
                            if (link.startsWith('page_') || website.pages.some((p) => p.id === link || p.slug === link)) {
                              const targetP = website.pages.find((p) => p.id === link || p.slug === link);
                              if (targetP) switchPage(targetP.id);
                            } else if (link.startsWith('#')) {
                              const clean = link.replace('#', '');
                              const target =
                                document.getElementById(clean) ||
                                document.getElementById(`gen_${clean}`) ||
                                document.getElementById(`comp_${clean}`) ||
                                document.querySelector(`[id*="${clean}"]`);
                              if (target) {
                                target.scrollIntoView({ behavior: 'smooth' });
                              }
                            }
                          }
                        }}
                        style={{
                          backgroundColor: website.theme.colors.primary,
                          color: '#ffffff',
                        }}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all text-white"
                      >
                        <span>
                          {(headerCtaComp.props.label as string) ||
                            (headerCtaComp.props.text as string) ||
                            'احجز الآن'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                    </div>
                  )}

                  {/* Customer Account / Login Link in Drawer */}
                  {showLogin && (
                    <div className="pt-2 pb-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          handleLoginClick(e);
                          setIsMobileMenuDrawerOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-blue-900 text-xs font-bold transition-all text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-lg text-white flex items-center justify-center shadow-xs"
                            style={{ backgroundColor: website.theme.colors.primary }}
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
                  {!hideCart && (
                    <div className="pt-1 pb-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isInteractivePreview) {
                            e.stopPropagation();
                            setIsCartOpen(true);
                            setIsMobileMenuDrawerOpen(false);
                          }
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </div>
                          <span>سلة المشتريات</span>
                        </div>
                        {cartCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                            {cartCount}
                          </span>
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 text-emerald-600" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Quick Contact Actions */}
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      تواصل سريع
                    </span>
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>تواصل عبر واتساب</span>
                    </a>

                    <a
                      href={`tel:${phoneNumber}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span>اتصال مباشر</span>
                    </a>
                  </div>
                </div>

                {/* Drawer Footer Branding */}
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

          {/* Desktop Actions Bar: Only shown for headers that don't have built-in cart+login next to header CTA
              (If any button exists inside header, cart+login are rendered inline in the flex container by BasicElementsRenderer) */}
          {(showCartInHeader || showLogin || showWhatsapp || showPhone) &&
            !hasInlineHeaderActions && (
            <div className="absolute ltr:right-4 rtl:left-4 sm:ltr:right-6 sm:rtl:left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20 pointer-events-auto">

              {showWhatsapp && (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => isInteractivePreview && e.stopPropagation()}
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
                  onClick={(e) => isInteractivePreview && e.stopPropagation()}
                  title="اتصال هاتفي"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold"
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden xl:inline">اتصال</span>
                </a>
              )}

              {/* Cart Button on Desktop */}
              {!hideCart && (
                <button
                  type="button"
                  onClick={(e) => {
                    if (isInteractivePreview) {
                      e.stopPropagation();
                      setIsCartOpen(true);
                    }
                  }}
                  title="سلة التسوق"
                  className="relative p-2 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-800 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
                >
                  {cartIconType === 'ShoppingCart' ? (
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                  ) : cartIconType === 'Package' ? (
                    <Package className="w-4 h-4 text-blue-600" />
                  ) : cartIconType === 'Store' ? (
                    <Store className="w-4 h-4 text-blue-600" />
                  ) : cartIconType === 'CreditCard' ? (
                    <CreditCard className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                  )}
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* Account / Login Button on Desktop */}
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
};
