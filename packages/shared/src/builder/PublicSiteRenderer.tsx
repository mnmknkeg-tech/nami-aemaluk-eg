'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type {
  SiteProduct,
  SiteShopContext,
  SiteSubscriptionPlan,
  ViewportBreakpoint,
  BuilderPage,
  Website,
} from './types';
import { resolveTheme, buildWhatsAppLink } from './theme';
import { NodeView } from './NodeView';
import { SiteSubscriptionModal } from './SiteSubscriptionModal';
import { SiteCartDrawer, type SiteCartItem } from './SiteCartDrawer';
import { useResponsiveViewport } from './responsiveViewport';
import { computeWebsiteRootStyles } from './responsiveStyles';
import { inspectWebsiteTree, normalizeWebsiteTree } from './websiteTree';
import { CartIcon } from './CartIcon';
import { isCartVisible } from './cartPolicy';

export interface PublicSiteRendererProps {
  website: Website;
  shop: SiteShopContext;
  products?: SiteProduct[];
  subscriptionPlans?: SiteSubscriptionPlan[];
  onAddToCart?: (product: SiteProduct) => void;
  onOpenCart?: () => void;
  cartCount?: number;
  onNavigatePage?: (pageId: string) => void;
  previewMode?: boolean;
  previewViewport?: ViewportBreakpoint;
  previewPageId?: string;
}

export type PreviewLinkResolution =
  { type: 'page'; pageId: string } | { type: 'anchor' } | { type: 'blocked' };

export function resolvePreviewLink(
  href: string,
  pages: Pick<BuilderPage, 'id' | 'slug'>[]
): PreviewLinkResolution {
  const trimmedHref = href.trim();
  if (!trimmedHref) return { type: 'blocked' };
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(trimmedHref)) return { type: 'blocked' };

  const isFragment = trimmedHref.startsWith('#');
  const candidate = isFragment
    ? trimmedHref.slice(1).toLowerCase()
    : trimmedHref
        .split(/[?#]/, 1)[0]
        .replace(/^\/+|\/+$/g, '')
        .toLowerCase()
        .split('/')
        .pop() || '';
  if (!candidate && isFragment) return { type: 'anchor' };

  const page = pages.find(
    (item) =>
      item.slug.toLowerCase() === candidate ||
      item.id.toLowerCase() === candidate ||
      item.id.toLowerCase() === `page_${candidate}`
  );
  if (page) return { type: 'page', pageId: page.id };
  return isFragment ? { type: 'anchor' } : { type: 'blocked' };
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
  previewMode = false,
  previewViewport,
  previewPageId,
}) => {
  const [subModalPlan, setSubModalPlan] = useState<any | null>(null);

  // Normalize only in memory at the public boundary. Invalid edges are detached
  // before NodeView recurses; no database writes are performed by the renderer.
  const safeWebsite = useMemo(() => normalizeWebsiteTree(website), [website]);
  const treeReport = useMemo(() => inspectWebsiteTree(website), [website]);
  useEffect(() => {
    const hasDiagnostics = Object.entries(treeReport).some(
      ([key, value]) => key !== 'rootNodesCount' && Array.isArray(value) && value.length > 0
    );
    if (hasDiagnostics) {
      console.warn('[PublicSiteRenderer] builder tree diagnostics', {
        websiteId: website.id,
        ...treeReport,
      });
    }
  }, [treeReport, website.id]);

  const pages = useMemo(() => safeWebsite.pages || [], [safeWebsite.pages]);

  const homePage = useMemo(
    () =>
      pages.find((p) => p.metadata?.isHomePage) ||
      pages.find((p) => p.id === 'page_home') ||
      pages[0],
    [pages]
  );

  const [activePageId, setActivePageId] = useState<string | undefined>(homePage?.id);
  const detectedViewport = useResponsiveViewport();
  const viewport = previewViewport || detectedViewport;
  useEffect(() => {
    if (previewPageId && pages.some((page) => page.id === previewPageId)) {
      setActivePageId(previewPageId);
    }
  }, [pages, previewPageId]);

  const cartSettings = safeWebsite.settings?.cart;
  const floating = safeWebsite.settings?.floatingActions;

  const usesHostCart = !previewMode && Boolean(onAddToCart && onOpenCart);

  const showFloatingCart = isCartVisible({ settings: cartSettings, placement: 'floating' });

  // Hydration-safe standalone cart: the server (and the first client render)
  // both start from an empty list; stored items are loaded after mount. Reading
  // localStorage inside the useState initializer would desynchronize the first
  // client render from the SSR HTML and break hydration.
  const [standaloneItems, setStandaloneItems] = useState<SiteCartItem[]>([]);
  const [standaloneCartHydrated, setStandaloneCartHydrated] = useState(previewMode);

  useEffect(() => {
    if (previewMode || typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`ray_site_cart_${shop.id}`);
      setStandaloneItems(stored ? JSON.parse(stored) : []);
    } catch {
      setStandaloneItems([]);
    }
    setStandaloneCartHydrated(true);
  }, [previewMode, shop.id]);

  const [isSiteCartOpen, setIsSiteCartOpen] = useState(false);

  useEffect(() => {
    if (previewMode || typeof window === 'undefined' || !standaloneCartHydrated) return;
    try {
      localStorage.setItem(`ray_site_cart_${shop.id}`, JSON.stringify(standaloneItems));
    } catch {}
  }, [previewMode, standaloneCartHydrated, standaloneItems, shop.id]);

  const handleAddToCart = (product: SiteProduct) => {
    if (usesHostCart && onAddToCart) {
      onAddToCart(product);
      return;
    }
    setStandaloneItems((prev) => {
      const existing = prev.find((it) => it.id === product.id);
      const priceNum =
        typeof product.price === 'string' ? parseFloat(product.price) || 0 : product.price;
      if (existing) {
        return prev.map((it) => (it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it));
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
    if (usesHostCart && onOpenCart) {
      onOpenCart();
      return;
    }
    setIsSiteCartOpen(true);
  };

  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId) || homePage,
    [pages, activePageId, homePage]
  );
  useEffect(() => {
    if (!pages.some((page) => page.id === activePageId)) setActivePageId(homePage?.id);
  }, [pages, activePageId, homePage]);
  const rootNodeId = activePage?.rootNodeId;
  const hasContent = Boolean(rootNodeId && safeWebsite.components[rootNodeId]);

  const theme = useMemo(() => resolveTheme(safeWebsite.theme), [safeWebsite.theme]);

  const handleNavigatePage = (pageId: string) => {
    if (pages.some((page) => page.id === pageId)) setActivePageId(pageId);
    if (onNavigatePage) {
      onNavigatePage(pageId);
    }
  };

  const handlePreviewLink = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!previewMode || !(event.target instanceof Element)) return;
    const anchor = event.target.closest('a');
    const href = anchor?.getAttribute('href')?.trim();
    if (!anchor || !href) return;
    const resolution = resolvePreviewLink(href, pages);
    if (resolution.type === 'anchor') return;

    event.preventDefault();
    event.stopPropagation();
    if (resolution.type === 'page') handleNavigatePage(resolution.pageId);
  };

  const effectiveCartCount = usesHostCart
    ? (cartCount ?? 0)
    : standaloneItems.reduce((acc, it) => acc + it.quantity, 0);

  const waLink = (text: string) => buildWhatsAppLink(shop.phone || shop.whatsapp, text);
  return (
    <div
      className="min-h-screen bg-white text-slate-900 antialiased"
      onClickCapture={handlePreviewLink}
      onSubmitCapture={(event) => {
        if (previewMode) event.preventDefault();
      }}
    >
      {showFloatingCart && (
        <button
          type="button"
          onClick={handleOpenCart}
          title="سلة المشتريات"
          className="fixed bottom-24 ltr:left-6 rtl:right-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group cursor-pointer"
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
          <CartIcon
            iconType={cartSettings?.iconType}
            className="w-6 h-6 relative z-10 text-white"
          />
          {effectiveCartCount > 0 && (
            <span className="absolute -top-1 ltr:-right-1 rtl:-left-1 min-w-[20px] h-5 px-1 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md z-10">
              {effectiveCartCount > 99 ? '99+' : effectiveCartCount}
            </span>
          )}
        </button>
      )}

      {floating?.whatsappButton !== false && (shop.phone || floating?.whatsappNumber) && (
        <a
          href={
            waLink(
              floating?.welcomeMessage || `مرحبًا، أود الاستفسار عن خدمات ومنتجات ${shop.name}`
            ) || '#'
          }
          target="_blank"
          rel="noopener noreferrer"
          title="تواصل معنا عبر واتساب"
          className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group cursor-pointer"
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 8l7.89 5.26a2 2 0 002.22-2L18 8m-5 5L4 8m0 0L3 8m0 0l10.89 7.26a2 2 0 002.22-2L18 8m-5 5v3m0-12v12m-3-3h6m-6 0v-3m0 0l3 3m-3-3v-3"
            />
          </svg>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400" />
        </a>
      )}
      <div
        className="published-site-renderer min-h-screen"
        style={computeWebsiteRootStyles(
          theme,
          safeWebsite.defaultDirection === 'rtl' ? 'rtl' : 'ltr',
          safeWebsite.settings?.background
        )}
      >
        {hasContent && rootNodeId ? (
          <NodeView
            nodeId={rootNodeId}
            ctx={{
              website: safeWebsite,
              viewport,
              activePage: activePage!,
              theme,
              shop,
              realProducts: previewMode ? [] : products,
              realSubscriptionPlans: previewMode ? [] : subscriptionPlans,
              onNavigatePage: handleNavigatePage,
              waLink,
              onAddToCart: handleAddToCart,
              onOpenCart: handleOpenCart,
              cartCount: effectiveCartCount,
              previewMode,
            }}
          />
        ) : (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-slate-900">بداية الموقع</h1>
            <p className="mt-4 text-slate-500">ابدأ بإضافة الأقسام والمنتجات من القائمة الجانبية</p>
          </div>
        )}

        {!previewMode && (
          <SiteSubscriptionModal
            isOpen={Boolean(subModalPlan)}
            onClose={() => setSubModalPlan(null)}
            plan={subModalPlan}
            shop={shop}
            availablePlans={subscriptionPlans}
          />
        )}
        {!usesHostCart && (
          <SiteCartDrawer
            isOpen={isSiteCartOpen}
            onClose={() => setIsSiteCartOpen(false)}
            items={standaloneItems}
            shop={shop}
            website={safeWebsite}
            onUpdateQuantity={(id, delta) => {
              setStandaloneItems((prev) =>
                prev
                  .map((item) =>
                    item.id === id ? { ...item, quantity: item.quantity + delta } : item
                  )
                  .filter((item) => item.quantity > 0)
              );
            }}
            onRemoveItem={(id) =>
              setStandaloneItems((prev) => prev.filter((item) => item.id !== id))
            }
            onProceedToCheckout={() => {
              if (!previewMode) window.location.assign(`/site/${shop.slug}/checkout`);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PublicSiteRenderer;
