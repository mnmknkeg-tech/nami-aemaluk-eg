'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type {
  SiteProduct,
  SiteShopContext,
  SiteSubscriptionPlan,
  ViewportBreakpoint,
  Website,
} from './types';
import {
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  Store,
  Package,
  CreditCard,
} from 'lucide-react';
import { buildWhatsAppLink, resolveTheme } from './theme';
import { NodeView, NodeViewContext } from './NodeView';
import { SiteSubscriptionModal } from './SiteSubscriptionModal';
import { SiteCartDrawer, type SiteCartItem } from './SiteCartDrawer';

interface SiteRendererProps {
  website: Website;
  shop: SiteShopContext;
  products: SiteProduct[];
  subscriptionPlans?: SiteSubscriptionPlan[];
  /** Wire the published site into the host app's unified cart (optional). */
  onAddToCart?: (product: SiteProduct) => void;
  onOpenCart?: () => void;
  /** Current unified-cart item count (badges on the mobile footer bar). */
  cartCount?: number;
}

/**
 * Public renderer for a published builder website.
 * Renders the exact component tree built in the editor: pages, sections,
 * theme tokens — with client-side page navigation.
 */
export const SiteRenderer: React.FC<SiteRendererProps> = ({
  website,
  shop,
  products,
  subscriptionPlans = [],
  onAddToCart,
  onOpenCart,
  cartCount,
}) => {
  const [subModalPlan, setSubModalPlan] = useState<any | null>(null);

  // ── Merchant Website Standalone Cart System ──────────────────────────────
  const cartSettings = website.settings?.cart;
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
    } else {
      setIsSiteCartOpen(true);
    }
  };

  const standaloneCount = standaloneItems.reduce((acc, it) => acc + it.quantity, 0);
  const effectiveCartCount = isUnifiedCart ? (cartCount ?? 0) : standaloneCount;

  const pages = website.pages || [];
  const homePage = useMemo(
    () =>
      pages.find((p) => p.metadata?.isHomePage) ||
      pages.find((p) => p.id === 'page_home') ||
      pages[0],
    [pages]
  );

  const [activePageId, setActivePageId] = useState<string>(homePage?.id || pages[0]?.id);
  // SSR renders desktop; after hydration match the visitor's device width.
  const [viewport, setViewport] = useState<ViewportBreakpoint>('desktop');
  // Prevent flash of unstyled content during hydration.
  const [hydrated, setHydrated] = useState(false);
  const [pageChanging, setPageChanging] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const compute = () => {
      const w = window.innerWidth;
      setViewport(w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const theme = useMemo(() => resolveTheme(website.theme), [website.theme]);

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId) || homePage,
    [pages, activePageId, homePage]
  );

  const navigateToPage = (pageId: string) => {
    setPageChanging(true);
    setTimeout(() => {
      setActivePageId(pageId);
      setPageChanging(false);
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        window.scrollTo(0, 0);
      }
    }, 120);
  };

  const waLink = (text: string) => buildWhatsAppLink(shop.whatsapp || shop.phone, text);

  if (!activePage) {
    return (
      <div
        dir={website.defaultDirection || 'rtl'}
        className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold"
      >
        لا يوجد محتوى منشور بعد
      </div>
    );
  }

  // Skeleton shown before hydration to prevent layout shift
  if (!hydrated) {
    return (
      <div
        dir={website.defaultDirection || 'rtl'}
        className="pub-site min-h-screen animate-pulse"
        style={{ backgroundColor: theme.colors.background }}
      >
        <div className="h-16 bg-slate-200/60 w-full" />
        <div className="h-[60vh] bg-slate-100/80 w-full" />
        <div className="h-32 bg-slate-200/40 w-full mt-4" />
      </div>
    );
  }

  const ctx: NodeViewContext = {
    website,
    viewport,
    activePage,
    theme,
    shop,
    realProducts: products || [],
    realSubscriptionPlans: subscriptionPlans || [],
    onNavigatePage: navigateToPage,
    waLink,
    onAddToCart: handleAddToCart,
    onOpenCart: handleOpenCart,
    onSubscribePlan: (p) => setSubModalPlan(p),
    cartCount: effectiveCartCount,
  };

  const announcement = website.settings?.announcement;
  const floating = website.settings?.floatingActions;

  return (
    <div
      dir={website.defaultDirection || 'rtl'}
      className="pub-site min-h-screen relative overflow-x-hidden w-full max-w-full"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.textPrimary,
        opacity: pageChanging ? 0.5 : 1,
        transition: 'opacity 0.12s ease',
      }}
    >
      {/* 1. Global Announcement Bar */}
      {announcement?.enabled && announcement?.text && (
        <aside
          aria-label="شريط الإعلانات الترويجي"
          style={{
            backgroundColor: announcement.bgColor || theme.colors.primary,
            color: announcement.textColor || '#ffffff',
          }}
          className="w-full py-2 px-3 text-xs font-bold text-center relative z-50 flex items-center justify-center gap-2 shadow-xs"
        >
          <span>{announcement.text}</span>
          {announcement.link && (
            <a
              href={announcement.link}
              className="underline text-[11px] font-extrabold hover:opacity-80 transition-opacity mr-2"
            >
              التفاصيل &larr;
            </a>
          )}
        </aside>
      )}

      {/* Theme typography tokens applied globally to the published site */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .pub-site, .pub-site * { box-sizing: border-box; }
            .pub-site { font-family: ${theme.typography.fontBody}; font-size: ${theme.typography.baseFontSize || '16px'}; overflow-x: hidden; }
            .pub-site h1, .pub-site h2, .pub-site h3, .pub-site h4 { font-family: ${theme.typography.fontHeading}; word-break: normal; overflow-wrap: break-word; }
          `,
        }}
      />

      <NodeView nodeId={activePage.rootNodeId} ctx={ctx} />

      {/* 2. Floating Cart Button for Published Site */}
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
            <ShoppingCart className="w-6 h-6 relative z-10" />
          ) : cartIconType === 'Package' ? (
            <Package className="w-6 h-6 relative z-10" />
          ) : cartIconType === 'Store' ? (
            <Store className="w-6 h-6 relative z-10" />
          ) : cartIconType === 'CreditCard' ? (
            <CreditCard className="w-6 h-6 relative z-10" />
          ) : (
            <ShoppingBag className="w-6 h-6 relative z-10" />
          )}
          {effectiveCartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md z-10">
              {effectiveCartCount > 99 ? '99+' : effectiveCartCount}
            </span>
          )}
        </button>
      )}

      {/* 3. Floating WhatsApp Direct Chat Button */}
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
          <MessageCircle className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400" />
        </a>
      )}

      {/* 4. Standalone Site Cart Drawer */}
      <SiteCartDrawer
        isOpen={isSiteCartOpen}
        onClose={() => setIsSiteCartOpen(false)}
        items={standaloneItems}
        shop={shop}
        website={website}
        onUpdateQuantity={(id, delta) => {
          setStandaloneItems((prev) =>
            prev
              .map((it) => (it.id === id ? { ...it, quantity: it.quantity + delta } : it))
              .filter((it) => it.quantity > 0)
          );
        }}
        onRemoveItem={(id) => {
          setStandaloneItems((prev) => prev.filter((it) => it.id !== id));
        }}
        onClearCart={() => setStandaloneItems([])}
      />

      <SiteSubscriptionModal
        isOpen={Boolean(subModalPlan)}
        onClose={() => setSubModalPlan(null)}
        plan={subModalPlan}
        shop={shop}
        availablePlans={subscriptionPlans || []}
      />
    </div>
  );
};
