import React, { useState } from 'react';
import { BaseRendererProps } from './types';
import { CustomCodeRenderer } from '../../code/CustomCodeRenderer';
import {
  Sparkles,
  ShieldCheck,
  Truck,
  CreditCard,
  MessageCircle,
  Star,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  ShoppingCart,
  Package,
  Store,
  Tag,
  Zap,
  User,
} from 'lucide-react';

import { CardGridRenderer } from './CardGridRenderer';

export interface BasicElementsRendererProps extends BaseRendererProps {
  cartCount: number;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item: any) => void;
}

export const BasicElementsRenderer: React.FC<BasicElementsRendererProps> = ({
  node,
  website,
  outlineClass,
  getComputedStyles,
  handleClick,
  handleMouseEnter,
  handleMouseLeave,
  renderChildren,
  isInteractivePreview,
  handleInteraction,
  switchPage,
  activePageId,
  currentViewport,
  overrideViewport,
  cartCount,
  setIsCartOpen,
  addToCart,
}) => {
  const [isFaqOpen, setIsFaqOpen] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const activePage = website.pages.find((p) => p.id === activePageId) || website.pages[0];

  if (node.props.hidden && node.type !== 'button') {
    return null;
  }

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

  switch (node.type) {
    case 'custom-code': {
      return (
        <div
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all ${outlineClass}`}
        >
          <CustomCodeRenderer node={node} isInteractivePreview={isInteractivePreview} />
          {renderChildren()}
        </div>
      );
    }

    case 'heading': {
      const tag = node.props.tag || 'h2';
      const headingClass = `cursor-pointer transition-all ${outlineClass} ${
        isInteractivePreview && isNavNode ? 'hover:opacity-80' : ''
      }`;
      const headingStyle = getComputedStyles();
      const rawText = node.props.text || 'عنوان المكون';

      const isBrand = node.id?.includes('brand') || node.id?.includes('logo');
      let logoElement: React.ReactNode = null;
      let text = rawText;

      if (isBrand) {
        const logoUrl =
          node.props.logoUrl ||
          (website.settings?.branding as any)?.logoUrl ||
          (website.settings?.branding as any)?.faviconUrl;

        if (logoUrl) {
          logoElement = (
            <img
              src={logoUrl}
              alt="شعار المنشأة"
              className="h-8 sm:h-9 w-auto max-w-[130px] object-contain rounded-lg shrink-0 inline-block"
            />
          );
        } else {
          // Parse leading emoji from brand text if present
          const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u;
          const match = typeof rawText === 'string' ? rawText.match(emojiRegex) : null;
          let icon = match ? match[1] : '';
          if (match) {
            text = rawText.slice(match[0].length).trim();
          }
          const initial = !icon && typeof text === 'string' && text.trim() ? text.trim()[0] : '⚡';
          const emblemContent = icon || initial;

          logoElement = (
            <span
              className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl shadow-xs text-sm sm:text-base shrink-0 font-bold select-none text-white transition-transform"
              style={{
                background: `linear-gradient(135deg, ${website.theme?.colors?.primary || '#3b82f6'}, ${website.theme?.colors?.accent || website.theme?.colors?.primary || '#1d4ed8'})`,
              }}
            >
              {emblemContent}
            </span>
          );
        }
      }

      const content = (
        <>
          {isBrand ? (
            <span className="inline-flex items-center gap-2 max-w-full overflow-hidden align-middle">
              {logoElement}
              <span className="truncate">{text}</span>
            </span>
          ) : (
            text
          )}
          {node.props.badgeText && (
            <span
              style={{
                backgroundColor: `${website.theme.colors.primary}20`,
                color: website.theme.colors.primary,
              }}
              className="mr-2 text-xs font-bold px-2 py-0.5 rounded-full inline-block align-middle shrink-0"
            >
              {node.props.badgeText}
            </span>
          )}
        </>
      );

      if (tag === 'h1') {
        return (
          <h1
            id={node.id}
            style={headingStyle}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={headingClass}
          >
            {content}
          </h1>
        );
      }
      if (tag === 'h3') {
        return (
          <h3
            id={node.id}
            style={headingStyle}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={headingClass}
          >
            {content}
          </h3>
        );
      }
      if (tag === 'h4') {
        return (
          <h4
            id={node.id}
            style={headingStyle}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={headingClass}
          >
            {content}
          </h4>
        );
      }
      return (
        <h2
          id={node.id}
          style={headingStyle}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={headingClass}
        >
          {content}
        </h2>
      );
    }

    case 'paragraph': {
      const text = node.props.text || 'نص توضيحي افتراضي للمكون.';
      const computed = getComputedStyles();

      if (isActiveLink) {
        computed.color = website.theme.colors.primary;
        computed.fontWeight = '700';
      }

      const hasDropdown =
        node.props.hasDropdown || node.id === 'nav_link_2' || !!node.props.dropdownItems;
      const dropdownItems = node.props.dropdownItems || [
        {
          id: 'sub_all',
          title: 'كافة أسطول 2025',
          description: 'جميع الموديلات الفاخرة المتاحة للتسليم الفوري',
          url: '/fleet',
          pageId: 'page_fleet',
          badge: 'شامل',
        },
        {
          id: 'sub_amg',
          title: 'مرسيدس AMG & مايباخ',
          description: 'سيدان وكوبيه VIP الرياضية',
          url: '/fleet',
          pageId: 'page_fleet',
          badge: '14 سيارة',
        },
        {
          id: 'sub_gt3',
          title: 'بورش 911 & GT3 RS',
          description: 'أداء حلبات خارق وفخامة فائقة',
          url: '/fleet',
          pageId: 'page_fleet',
          badge: '12 سيارة',
        },
        {
          id: 'sub_suv',
          title: 'رينج روفر SV & كولينان',
          description: 'دفع رباعي فاخر بقمة الهيبة',
          url: '/fleet',
          pageId: 'page_fleet',
          badge: '9 سيارات',
        },
      ];

      if (hasDropdown) {
        return (
          <div
            id={node.id}
            onMouseEnter={(e) => {
              handleMouseEnter(e);
              if (isInteractivePreview) setOpenDropdown(true);
            }}
            onMouseLeave={() => {
              handleMouseLeave();
              if (isInteractivePreview) setOpenDropdown(false);
            }}
            className="relative inline-block"
          >
            <div
              style={computed}
              onClick={(e) => {
                if (isInteractivePreview) {
                  setOpenDropdown(!openDropdown);
                } else {
                  handleClick(e);
                }
              }}
              className={`cursor-pointer transition-all flex items-center gap-1.5 ${
                isInteractivePreview && isNavNode ? 'hover:text-blue-600' : ''
              } ${outlineClass}`}
            >
              <span>{text}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  openDropdown ? 'rotate-180 text-blue-600' : 'opacity-70'
                }`}
              />
            </div>

            {isInteractivePreview && openDropdown && (
              <div
                style={{ direction: 'rtl' }}
                className="absolute top-full right-0 mt-2 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-slate-100"
              >
                <div className="px-3 py-2">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    تصفح أسطول المعرض والأقسام
                  </span>
                </div>
                <div className="py-1 space-y-1">
                  {dropdownItems.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(false);
                        handleInteraction(e, item.url, item.pageId, item.title);
                      }}
                      className="p-2.5 rounded-xl hover:bg-blue-50/80 transition-colors cursor-pointer group/sub flex items-center justify-between text-right"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-800 group-hover/sub:text-blue-600 flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-md">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      if (typeof text === 'string' && text.includes('•')) {
        const items = text.split('•');
        return (
          <p
            id={node.id}
            style={computed}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`cursor-pointer transition-all flex flex-wrap items-center gap-2 ${outlineClass}`}
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
                      handleInteraction(e, undefined, undefined, trimmed);
                    }}
                    className={`transition-colors hover:text-blue-600 cursor-pointer ${
                      isItemActive ? 'font-bold text-blue-600' : ''
                    }`}
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
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all ${
            isInteractivePreview && isNavNode ? 'hover:text-blue-600' : ''
          } ${outlineClass}`}
        >
          {text}
        </p>
      );
    }

    case 'button': {
      const isHeaderCta =
        node.id === 'header_cta_btn' ||
        node.id === 'gen_header_cta' ||
        node.id.endsWith('_cta') ||
        node.id.includes('cta') ||
        node.id.includes('action') ||
        Boolean(node.parentId?.includes('header'));
      const showInlineCartAndAuth = isHeaderCta && currentViewport !== 'mobile';
      const isCartEnabled = website.settings?.cart?.enabled !== false;
      const cartPos = website.settings?.cart?.position;
      const cartShowsInHeader = !cartPos || cartPos === 'header' || cartPos === 'both';

      const headerComp =
        (node.parentId && website.components[node.parentId]?.type === 'header'
          ? website.components[node.parentId]
          : Object.values(website.components).find((c) => c.type === 'header')) ||
        website.components['comp_header'] ||
        website.components['gen_header'];

      const isCartHidden = Boolean(
        headerComp?.props?.hideCart ||
        (website.theme as any)?.hideCart ||
        node.props?.hideCart
      );

      const showCart =
        showInlineCartAndAuth &&
        isCartEnabled &&
        cartShowsInHeader &&
        website.settings?.cart?.businessType !== 'bookings' &&
        website.settings?.cart?.showCartIcon !== false &&
        !isCartHidden;

      const isAuthEnabled = Boolean(website.settings?.auth?.enabled);
      const isAuthHidden = Boolean(
        headerComp?.props?.showLogin === false ||
        node.props?.showLogin === false ||
        website.settings?.auth?.headerButton?.show === false
      );

      const showAuth =
        showInlineCartAndAuth &&
        isAuthEnabled &&
        !isAuthHidden;

      const isHidden = Boolean(node.props?.hidden || node.isHidden);

      // If button is hidden and no cart/auth to show, render nothing
      if (isHidden && !showCart && !showAuth) {
        return null;
      }

      const handleBtnClick = (e: React.MouseEvent) => {
        if (isInteractivePreview) {
          handleInteraction(e);
          return;
        }
        handleClick(e);
      };

      const buttonLabel = node.props.label || node.props.text || 'زر الإجراء';

      return (
        <div className="inline-flex items-center gap-2">
          {showCart &&
            (() => {
              const headerCartIcon =
                website.components['comp_header']?.props?.cartIcon ||
                node.props.cartIcon ||
                'ShoppingBag';
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    if (isInteractivePreview) {
                      e.stopPropagation();
                      setIsCartOpen(true);
                    }
                  }}
                  title="سلة المشتريات والحجوزات"
                  className="relative p-2.5 rounded-xl border border-slate-200/80 bg-white/80 hover:bg-white text-slate-700 hover:text-blue-600 shadow-xs transition-all flex items-center justify-center cursor-pointer active:scale-95"
                >
                  {headerCartIcon === 'ShoppingCart' ? (
                    <ShoppingCart className="w-4 h-4" />
                  ) : headerCartIcon === 'Package' ? (
                    <Package className="w-4 h-4" />
                  ) : headerCartIcon === 'Store' ? (
                    <Store className="w-4 h-4" />
                  ) : headerCartIcon === 'CreditCard' ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" />
                  )}
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                      {cartCount}
                    </span>
                  )}
                </button>
              );
            })()}

          {showAuth &&
            (() => {
              const btnStyle = website.settings?.auth?.headerButton?.style || 'icon_and_text';
              const btnText = website.settings?.auth?.headerButton?.text || 'تسجيل الدخول';
              const onAuthClick = (e: React.MouseEvent) => {
                if (isInteractivePreview) {
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
                }
              };

              if (btnStyle === 'icon') {
                return (
                  <button
                    type="button"
                    onClick={onAuthClick}
                    title="تسجيل الدخول / حسابي"
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-white/80 hover:bg-white text-slate-700 hover:text-blue-600 shadow-xs transition-all flex items-center justify-center cursor-pointer active:scale-95"
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
                    <span>{btnText}</span>
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
                  <span>{btnText}</span>
                </button>
              );
            })()}

          {!isHidden && (
            <button
              id={node.id}
              style={getComputedStyles()}
              onClick={handleBtnClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className={`cursor-pointer transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 ${outlineClass}`}
            >
              {node.props.iconName === 'Sparkles' && <Sparkles className="w-4 h-4" />}
              {node.props.iconName === 'MessageCircle' && <MessageCircle className="w-4 h-4" />}
              {node.props.iconName === 'Phone' && <Phone className="w-4 h-4" />}
              {node.props.iconName === 'Mail' && <Mail className="w-4 h-4" />}
              {node.props.iconName === 'MapPin' && <MapPin className="w-4 h-4" />}
              <span>{buttonLabel}</span>
            </button>
          )}
        </div>
      );
    }

    case 'image': {
      return (
        <div
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer overflow-hidden transition-all ${outlineClass}`}
        >
          <img
            src={
              node.props.src ||
              'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=80'
            }
            alt={node.props.alt || 'صورة المكون'}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    case 'badge': {
      return (
        <div
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer inline-flex items-center transition-all ${outlineClass}`}
        >
          {node.props.text || 'شارة مميزة'}
        </div>
      );
    }

    case 'card':
    case 'grid':
      return (
        <CardGridRenderer
          node={node}
          website={website}
          outlineClass={outlineClass}
          getComputedStyles={getComputedStyles}
          handleClick={handleClick}
          handleMouseEnter={handleMouseEnter}
          handleMouseLeave={handleMouseLeave}
          renderChildren={renderChildren}
          isInteractivePreview={isInteractivePreview}
          handleInteraction={handleInteraction}
          switchPage={switchPage}
          activePageId={activePageId}
          cartCount={cartCount}
          setIsCartOpen={setIsCartOpen}
          addToCart={addToCart}
          currentViewport={currentViewport}
          overrideViewport={overrideViewport}
        />
      );

    default: {
      return (
        <div
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all ${outlineClass}`}
        >
          {renderChildren()}
        </div>
      );
    }
  }
};
