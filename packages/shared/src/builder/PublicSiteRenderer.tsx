'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type {
  SiteProduct,
  SiteShopContext,
  SiteSubscriptionPlan,
  ViewportBreakpoint,
  Website,
} from './types';
import { resolveTheme, buildWhatsAppLink } from './theme';
import { NodeView } from './NodeView';
import { SiteSubscriptionModal } from './SiteSubscriptionModal';
import { SiteCartDrawer, type SiteCartItem } from './SiteCartDrawer';

export interface PublicSiteRendererProps {
  website: Website;
  shop: SiteShopContext;
  products?: SiteProduct[];
  subscriptionPlans?: SiteSubscriptionPlan[];
  onAddToCart?: (product: SiteProduct) => void;
  onOpenCart?: () => void;
  cartCount?: number;
  onNavigatePage?: (pageId: string) => void;
}

export const PublicSiteRenderer: React.FC<PublicSiteRendererProps> = ({
  website,
  shop,
  products = [],
  subscriptionPlans = [],
  onAddToCart,
  onOpenCart,
  cartCount,
  onNavigatePage,
}) => {
  const [subModalPlan, setSubModalPlan] = useState<any | null>(null);

  const pages = website.pages || [];

  const homePage = useMemo(
    () => pages.find((p) => p.metadata?.isHomePage) || pages.find((p) => p.id === 'page_home') || pages[0],
    [pages]
  );

  const [viewport, setViewport] = useState<ViewportBreakpoint>('desktop');

  const cartSettings = website.settings?.cart;
  const floating = website.settings?.floatingActions;

  const cartMode = cartSettings?.mode || 'standalone';

  const isUnifiedCart = cartMode === 'unified' && Boolean(onAddToCart);

  const isOrdersFlow = (cartSettings?.businessType || 'orders') === 'orders';

  const showCartIcon = isOrdersFlow && cartSettings?.showCartIcon !== false;

  const cartPosition = cartSettings?.position || 'both';

  const cartIconType = cartSettings?.iconType || 'ShoppingBag';

  const [standaloneItems, setStandaloneItems] = useState<SiteCartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`ray_site_cart_${shop.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isSiteCartOpen, setIsSiteCartOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`ray_site_cart_${shop.id}`, JSON.stringify(standaloneItems));
    } catch {}
  }, [standaloneItems, shop.id]);

  const handleAddToCart = (product: SiteProduct) => {
    if (isUnifiedCart && onAddToCart) {
      onAddToCart(product);
      return;
    }
    setStandaloneItems((prev) => {
      const existing = prev.find((it) => it.id === product.id);
      const priceNum =
        typeof product.price === 'string' ? parseFloat(product.price) || 0 : product.price;
      if (existing) {
        return prev.map((it) =>
          it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          price: priceNum,
          quantity: 1,
          image: product.image,
          category: (product as any).category,
        },
      ];
    });
    setIsSiteCartOpen(true);
  };

  const handleOpenCart = () => {
    if (isUnifiedCart && onOpenCart) {
      onOpenCart();
      return;
    }
    setIsSiteCartOpen(true);
  };

  const activePage = useMemo(
    () => pages.find((p) => p.id === homePage?.id) || homePage,
    [pages, homePage]
  );
  const rootNodeId = activePage?.rootNodeId;
  const hasContent = Boolean(rootNodeId && website.components[rootNodeId]);

  const theme = useMemo(() => resolveTheme(website.theme), [website.theme]);

  const handleNavigatePage = (pageId: string) => {
    if (onNavigatePage) {
      onNavigatePage(pageId);
      return;
    }
  };

  const effectiveCartCount = isUnifiedCart
    ? cartCount ?? 0
    : standaloneItems.reduce((acc, it) => acc + it.quantity, 0);

  const waLink = (text: string) => buildWhatsAppLink(shop.phone || shop.whatsapp, text);
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {showCartIcon && (cartPosition === 'floating' || cartPosition === 'both') && (
        <button
          type="button"
          onClick={handleOpenCart}
          title="سلة المشتريات"
          className="fixed bottom-24 left-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group cursor-pointer"
          style={{
            backgroundColor: theme.colors.primary || '#059669',
            color: '#ffffff',
          }}
        >
          {effectiveCartCount > 0 && (
            <span
              className="absolute inset-0 rounded-full opacity-40 animate-ping"
              style={{ backgroundColor: theme.colors.primary || '#059669' }}
            />
          )}
          {cartIconType === 'ShoppingCart' ? (
            <svg className="w-6 h-6 relative z-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          ) : cartIconType === 'Package' ? (
            <svg className="w-6 h-6 relative z-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          ) : cartIconType === 'Store' ? (
            <svg className="w-6 h-6 relative z-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          ) : cartIconType === 'CreditCard' ? (
            <svg className="w-6 h-6 relative z-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 relative z-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          )}
          {effectiveCartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md z-10">
              {effectiveCartCount > 99 ? '99+' : effectiveCartCount}
            </span>
          )}
        </button>
      )}

      {floating?.whatsappButton !== false && (shop.phone || floating?.whatsappNumber) && (
        <a
          href={
            waLink(
              floating?.welcomeMessage ||
                `مرحبًا، أود الاستفسار عن خدمات ومنتجات ${shop.name}`
            ) || '#'
          }
          target="_blank"
          rel="noopener noreferrer"
          title="تواصل معنا عبر واتساب"
          className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group cursor-pointer"
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22-2L18 8m-5 5L4 8m0 0L3 8m0 0l10.89 7.26a2 2 0 002.22-2L18 8m-5 5v3m0-12v12m-3-3h6m-6 0v-3m0 0l3 3m-3-3v-3" />
          </svg>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400" />
        </a>
      )}
      <div
        className="min-h-screen"
        style={{
          backgroundColor: theme.colors.background,
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.fontBody,
          direction: website.defaultDirection === 'rtl' ? 'rtl' : 'ltr',
        }}
      >
        {hasContent && rootNodeId ? (
          <NodeView
            nodeId={rootNodeId}
            ctx={{
              website,
              viewport,
              activePage: activePage!,
              theme,
              shop,
              realProducts: products,
              realSubscriptionPlans: subscriptionPlans,
              onNavigatePage: handleNavigatePage,
              waLink,
              onAddToCart,
              onOpenCart,
              cartCount: effectiveCartCount,
            }}
          />
        ) : (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-slate-900">بداية الموقع</h1>
            <p className="mt-4 text-slate-500">
              ابدأ بإضافة الأقسام والمنتجات من القائمة الجانبية
            </p>
          </div>
        )}

        <SiteSubscriptionModal
          isOpen={Boolean(subModalPlan)}
          onClose={() => setSubModalPlan(null)}
          plan={subModalPlan}
          shop={shop}
          availablePlans={subscriptionPlans}
        />
      </div>
    </div>
  );
}

export default PublicSiteRenderer;