'use client';

import React, { useState } from 'react';
import {
  Star,
  CheckCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  ShoppingCart,
  ShieldCheck,
  Truck,
  CreditCard,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Home,
  LayoutGrid,
  Loader2,
} from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import type { Shop, Product } from '@/lib/services';
import {
  applyWebsiteBackgroundToPageRoot,
  computeWebsiteRootStyles,
  computeThemeResponsiveNodeStyles,
  normalizeWebsiteTree,
  isLegacyProductCardNode,
  productGridClass,
  PublishedProductCard,
  resolveTheme,
  resolveProductCardOptions,
  useResponsiveViewport,
  type ResponsiveViewport,
  type StyleProperties,
  type WebsiteCartSettings,
  type WebsiteBackgroundSettings,
  CartIcon,
  isCartVisible,
  normalizeCatalogProduct,
  buildCatalogCategories,
  followPublishedDestination,
  isBrandHeadingNode,
  resolveAnnouncementBar,
  resolveBrandLogoUrl,
  resolvePublishedLinkDestination,
  sectionBadgeStyle,
  sectionShellClass,
  sectionSubtitleClass,
} from '@ray-eg/shared/builder';
import {
  isCompleteChildBasedHero,
  resolveHeroContent,
} from '@ray-eg/shared/builder/heroCompatibility';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComponentNode {
  id: string;
  type: string;
  category?: string;
  parentId?: string | null;
  childrenIds?: string[];
  props: Record<string, any>;
  styles: {
    desktop?: StyleProperties;
    tablet?: StyleProperties;
    mobile?: StyleProperties;
  };
  customCode?: { tsxSnippet?: string; cssSnippet?: string };
  isHidden?: boolean;
  /** Canonical link destination (page/section/order/external) set by the builder. */
  destination?: Record<string, any>;
}

interface BuilderWebsite {
  pages: Array<{
    id: string;
    rootNodeId: string;
    name?: string;
    slug?: string;
    metadata?: { isHomePage?: boolean; placement?: string; headerTitle?: string };
  }>;
  components: Record<string, ComponentNode>;
  theme: {
    colors: {
      primary: string;
      secondary?: string;
      accent?: string;
      background?: string;
      textPrimary?: string;
    };
    typography?: { fontBody?: string; fontHeading?: string };
    radius?: { sm?: string; md?: string; lg?: string; full?: string };
  };
  settings?: {
    cart?: WebsiteCartSettings;
    background?: WebsiteBackgroundSettings;
    announcement?: {
      enabled?: boolean;
      text?: string;
      link?: string;
      bgColor?: string;
      textColor?: string;
    };
    branding?: { logoUrl?: string; faviconUrl?: string };
    auth?: { enabled?: boolean; headerButton?: { show?: boolean } };
  };
  defaultDirection?: string;
}

/** Live shop + catalog passed down the tree so product cards and the mobile
 *  footer can bind to the REAL unified cart instead of dead WhatsApp buttons. */
const ShopDataContext = React.createContext<{
  shop?: Shop;
  products?: Product[];
  viewport: ResponsiveViewport;
  activePageId: string;
  onNavigatePage?: (pageId: string) => void;
}>({ viewport: 'desktop', activePageId: '' });

// ─── getComputedStyles ────────────────────────────────────────────────────────

function getComputedStyles(
  node: ComponentNode,
  theme: BuilderWebsite['theme'],
  viewport: ResponsiveViewport
): React.CSSProperties {
  return computeThemeResponsiveNodeStyles(node, viewport, theme?.typography);
}

// ─── NodeRenderer (recursive, stateful) ───────────────────────────────────────

function NodeRenderer({ nodeId, website }: { nodeId: string; website: BuilderWebsite }) {
  const node = website.components[nodeId];
  const { addItem, setCartOpen } = useCart();
  const {
    shop: ctxShop,
    products: ctxProducts,
    viewport,
    activePageId,
    onNavigatePage,
  } = React.useContext(ShopDataContext);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formBookingNumber, setFormBookingNumber] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isFaqOpen, setIsFaqOpen] = useState(true);
  if (
    !node ||
    node.isHidden ||
    node.props?.hidden ||
    (viewport === 'mobile' && node.props?.mobileHidden === true)
  )
    return null;

  // Fixed mobile bottom bar — rendered by its own component (uses cart hooks).
  if (node.type === 'mobile_footer') {
    return <MobileFooterBar node={node} cartSettings={website.settings?.cart} />;
  }

  const theme = website.theme;
  // Mirror the editor canvas: paint the long page background on the page root
  // itself so an opaque root background (e.g. white) cannot hide it on the
  // published site.
  const isPageRoot = website.pages?.some((page) => page.rootNodeId === node.id) ?? false;
  const computed = applyWebsiteBackgroundToPageRoot(
    getComputedStyles(node, theme, viewport),
    isPageRoot,
    website.settings?.background
  );

  const renderChildren = () =>
    (node.childrenIds || []).map((cid) => (
      <NodeRenderer key={cid} nodeId={cid} website={website} />
    ));

  // scroll to anchor helper
  const scrollTo = (anchor: string) => {
    const el =
      document.getElementById(anchor) || document.querySelector(`[data-section="${anchor}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  /** Add-to-cart from builder trees: catalog products from the API carry no
   *  shop fields, so items were saved with shopSlug:'' and the shop checkout
   *  filter missed them. Stamp the hosting shop on every cart item. */
  const addLiveToCart = (product: any, quantity = 1) => {
    addItem(
      {
        ...product,
        shopId: String(product.shopId || ctxShop?.id || ''),
        shopName: String(product.shopName || ctxShop?.name || ''),
        shopSlug: String(product.shopSlug || ctxShop?.slug || ''),
      },
      quantity,
      true
    );
  };

  /** Resolve a node/link click the same way the published /site handler does
   *  (destination → page switch/section scroll/cart/external) so links and
   *  buttons configured in the builder stop being dead on /shop. */
  const followLink = (source: Record<string, any>, opts?: { inferFromLabel?: boolean }) => {
    const destination = resolvePublishedLinkDestination(website as any, source, opts);
    return followPublishedDestination(destination, {
      website: website as any,
      activePageId: activePageId || '',
      onNavigatePage: (pageId) => onNavigatePage?.(pageId),
      onOpenCart: () => setCartOpen(true),
      scrollToSection: scrollTo,
    });
  };

  // ── custom-code ────────────────────────────────────────────────────────────
  if (node.type === 'custom-code') {
    const html = node.customCode?.tsxSnippet || node.props?.html || '';
    return (
      <div id={node.id} style={computed}>
        {html && <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />}
        {renderChildren()}
      </div>
    );
  }

  // ── heading ────────────────────────────────────────────────────────────────
  if (node.type === 'heading') {
    const tag = node.props.tag || 'h2';
    const text = node.props.text || '';
    // Editor parity: brand headings (id/name referencing brand/logo/شعار)
    // show the merchant logo instead of plain text after publishing too.
    const storeLogo =
      node.id.toLowerCase().includes('logo') || String(node.props?.name || '').includes('شعار')
        ? ctxShop?.logoUrl ||
          ctxShop?.logo ||
          resolveBrandLogoUrl(website as any, node) ||
          undefined
        : isBrandHeadingNode(node as any)
          ? resolveBrandLogoUrl(website as any, node) || undefined
          : undefined;
    const content = (
      <>
        {storeLogo && (
          <img
            src={storeLogo}
            alt={ctxShop?.name || 'شعار المتجر'}
            className="inline-block max-h-12 max-w-[200px] object-contain align-middle ml-2"
          />
        )}
        {text}
        {node.props.badgeText && (
          <span
            style={{
              backgroundColor: `${theme.colors.primary}20`,
              color: theme.colors.primary,
            }}
            className="mr-2 text-xs font-bold px-2 py-0.5 rounded-full inline-block align-middle"
          >
            {node.props.badgeText}
          </span>
        )}
      </>
    );
    if (tag === 'h1')
      return (
        <h1 id={node.id} style={computed}>
          {content}
        </h1>
      );
    if (tag === 'h3')
      return (
        <h3 id={node.id} style={computed}>
          {content}
        </h3>
      );
    if (tag === 'h4')
      return (
        <h4 id={node.id} style={computed}>
          {content}
        </h4>
      );
    return (
      <h2 id={node.id} style={computed}>
        {content}
      </h2>
    );
  }

  // ── paragraph ─────────────────────────────────────────────────────────────
  if (node.type === 'paragraph') {
    const text = node.props.text || '';

    // Editor parity: navigation bars are paragraph nodes carrying explicit
    // navigationItems (label + destination) — render them as real links.
    const navItems = Array.isArray(node.props.navigationItems)
      ? (node.props.navigationItems as Array<Record<string, any>>).filter(
          (item) => item?.label && !item.hidden
        )
      : null;
    if (navItems && navItems.length > 0) {
      return (
        <div id={node.id} style={computed} className="flex flex-wrap items-center gap-2">
          {navItems.map((item, index) => (
            <span
              key={`${item.label}-${index}`}
              onClick={() => followLink(item, { inferFromLabel: true })}
              className="cursor-pointer transition-colors hover:opacity-80"
            >
              {item.label}
            </span>
          ))}
        </div>
      );
    }

    // Editor parity: bullet-separated nav text is split into clickable items
    // that match navigationItems by label.
    if (typeof text === 'string' && (text.includes(' • ') || text.includes(' | '))) {
      const delimiter = text.includes(' • ') ? ' • ' : ' | ';
      const items = text.split(delimiter).map((item) => item.trim());
      return (
        <p id={node.id} style={computed} className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => {
            const navigationItem = (node.props.navigationItems || []).find(
              (candidate: { label?: string }) => candidate.label?.trim() === item
            );
            return (
              <React.Fragment key={index}>
                <span
                  onClick={() =>
                    followLink(
                      { ...node.props, destination: navigationItem?.destination },
                      { inferFromLabel: true }
                    )
                  }
                  className="cursor-pointer transition-colors hover:opacity-80"
                >
                  {item}
                </span>
                {index < items.length - 1 && <span className="opacity-40 select-none">•</span>}
              </React.Fragment>
            );
          })}
        </p>
      );
    }

    // Nav links created by the page operations (url/pageId/destination on a
    // plain paragraph) were dead text on /shop — make them clickable.
    const isLinkLike = Boolean(
      node.destination ||
      node.props.destination ||
      node.props.pageId ||
      node.props.targetPageId ||
      String(node.props.url || node.props.href || node.props.link || '').trim() ||
      node.props.allowLegacyLabelNavigation === true
    );
    if (isLinkLike && String(text).trim()) {
      return (
        <p
          id={node.id}
          style={computed}
          onClick={() => followLink({ ...node.props }, { inferFromLabel: true })}
          className="cursor-pointer transition-opacity hover:opacity-80"
        >
          {text}
        </p>
      );
    }

    return (
      <p id={node.id} style={computed}>
        {text}
      </p>
    );
  }

  // ── badge ─────────────────────────────────────────────────────────────────
  if (node.type === 'badge') {
    return (
      <div id={node.id} style={computed} className="inline-flex items-center">
        {node.props.text || ''}
      </div>
    );
  }

  // ── image ─────────────────────────────────────────────────────────────────
  if (node.type === 'image') {
    return (
      <div id={node.id} style={computed} className="overflow-hidden">
        <img
          src={
            node.props.src ||
            'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=80'
          }
          alt={node.props.alt || ''}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // ── button ────────────────────────────────────────────────────────────────
  if (node.type === 'button') {
    const url = String(node.props.url || node.props.href || node.props.link || '');
    const handleClick = () => {
      // Editor parity: destinations (page/section/whatsapp/order/external)
      // configured in the builder are followed exactly like on /site —
      // buttons with page targets used to be completely dead here.
      if (
        followLink(
          { ...node.props, url },
          { inferFromLabel: node.props.allowLegacyLabelNavigation === true }
        )
      ) {
        return;
      }
      if (url.startsWith('#')) {
        scrollTo(url.slice(1));
      } else if (/^(?:https?:|tel:|mailto:|\/\/)/i.test(url)) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };
    return (
      <button
        id={node.id}
        style={computed}
        onClick={handleClick}
        className="cursor-pointer transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
      >
        {node.props.iconName === 'Sparkles' && <Sparkles className="w-4 h-4" />}
        {node.props.iconName === 'MessageCircle' && <MessageCircle className="w-4 h-4" />}
        {node.props.iconName === 'Phone' && <Phone className="w-4 h-4" />}
        {node.props.iconName === 'Mail' && <Mail className="w-4 h-4" />}
        {node.props.iconName === 'MapPin' && <MapPin className="w-4 h-4" />}
        <span>{node.props.text || 'اضغط هنا'}</span>
      </button>
    );
  }

  // ── products / menu / catalog ─────────────────────────────────────────────
  if (node.type === 'products') {
    // The shop's LIVE catalog always wins over the baked template items, so
    // merchant sites show real products (same rule as published /site/ pages).
    // Baked items are only a fallback for shops with no catalog products yet.
    const bakedItems: any[] = node.props.items || node.props.products || [];
    const liveList = ctxProducts || [];
    const rawList: any[] =
      liveList.length > 0
        ? liveList.map((p, index) =>
            normalizeCatalogProduct(
              {
                ...p,
                priceFormatted: p.price != null ? `${p.price}` : '',
              },
              index
            )
          )
        : bakedItems.map((item, index) => normalizeCatalogProduct(item, index));
    const categoryOverrides = (node.props.categoryImages || {}) as Record<string, string>;
    const categoryCards = buildCatalogCategories(rawList, categoryOverrides);
    const categories: string[] = ['all', ...categoryCards.map((category) => category.key)];
    const filtered =
      activeCategory === 'all'
        ? rawList
        : rawList.filter((i: any) => i.category === activeCategory);
    // توازٍ مع الكانفس: بطاقات وضع الحجز (buyButtonMode hidden) تعرض زر
    // "احجز الآن" بدل سلة/واتساب — الحجز يثبت في لوحة التاجر لا محادثة.
    const gridOptions = resolveProductCardOptions(node.props);
    const bookingModeCards = gridOptions.buyButtonMode === 'hidden';
    const openBookingFlow = () => {
      const pages = (website as any).pages || [];
      const contactPage =
        pages.find((p: any) => p.slug === 'contact' || p.id === 'page_contact') ||
        pages.find(
          (p: any) => (p.name || '').includes('تواصل') || (p.name || '').includes('حجز')
        ) ||
        pages[0];
      if (contactPage) onNavigatePage?.(contactPage.id);
      if (typeof window !== 'undefined')
        window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    };

    return (
      <section
        id={node.id}
        style={computed}
        data-section="products"
        data-product-ids={rawList.map((item: any) => String(item.id)).join(',')}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {/* Section header */}
          {(node.props.title || node.props.badge) && (
            <div className="text-center mb-10 space-y-2 max-w-2xl mx-auto">
              {node.props.badge && (
                <span
                  style={{
                    backgroundColor: `${theme.colors.primary}18`,
                    color: theme.colors.primary,
                  }}
                  className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                >
                  {node.props.badge}
                </span>
              )}
              {node.props.title && (
                <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">
                  {node.props.title}
                </h2>
              )}
              {node.props.subtitle && (
                <p className="text-sm text-slate-600 leading-relaxed">{node.props.subtitle}</p>
              )}
            </div>
          )}

          {/* Category tabs with automatic cover images; overrides come from builder props. */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={
                    activeCategory === cat
                      ? { backgroundColor: theme.colors.primary, color: '#fff' }
                      : {}
                  }
                  className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${
                    activeCategory === cat
                      ? 'border-transparent shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {cat !== 'all' &&
                    categoryCards.find((category) => category.key === cat)?.image ? (
                      <img
                        src={categoryCards.find((category) => category.key === cat)?.image}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    {cat === 'all'
                      ? 'الكل'
                      : categoryCards.find((category) => category.key === cat)?.label || cat}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Items grid */}
          {filtered.length > 0 && (
            <div
              className={`${productGridClass(resolveProductCardOptions(node.props))} gap-4 sm:gap-6`}
            >
              {filtered.map((item: any, idx: number) => {
                const title = item.name || item.title || '';
                const price = item.priceFormatted || (item.price ? `${item.price}` : '');
                const image = item.image || '';
                const badge = item.badge || '';
                const desc = item.description || '';
                return (
                  <div
                    key={item.id || idx}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                  >
                    {image && (
                      <div className="relative aspect-video overflow-hidden bg-slate-100">
                        <img
                          src={image}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {badge && (
                          <span className="absolute top-3 right-3 bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                            {badge}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                            {title}
                          </h3>
                          {price && (
                            <span
                              style={{ color: theme.colors.primary }}
                              className="text-base font-extrabold font-mono shrink-0"
                            >
                              {price}
                            </span>
                          )}
                        </div>
                        {desc && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {desc}
                          </p>
                        )}
                      </div>
                      {(() => {
                        // وضع الحجز: زر حجز يوصل لنموذج يُحفظ في اللوحة —
                        // لا سلة ولا واتساب (كان يفتح واتساب مباشرة).
                        if (bookingModeCards) {
                          return (
                            <button
                              type="button"
                              onClick={openBookingFlow}
                              style={{
                                backgroundColor: theme.colors.primary,
                                borderRadius: theme.radius?.lg || '10px',
                              }}
                              className="w-full py-2.5 text-white font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{gridOptions.ctaText || 'احجز الآن'}</span>
                            </button>
                          );
                        }
                        // Bind to the LIVE catalog product when the baked item
                        // matches a real one — add-to-cart then uses the real
                        // product (price/stock/checkout all stay correct).
                        const live = (ctxProducts || []).find(
                          (p) => String(p.id) === String(item.id)
                        );
                        if (live) {
                          const available = live.isAvailable !== false;
                          return (
                            <button
                              type="button"
                              disabled={!available}
                              onClick={() => {
                                addLiveToCart(live);
                              }}
                              style={{
                                backgroundColor: theme.colors.primary,
                                borderRadius: theme.radius?.lg || '10px',
                              }}
                              className="w-full py-2.5 text-white font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>{available ? 'أضف للسلة' : 'غير متاح'}</span>
                            </button>
                          );
                        }
                        // No matching catalog product — fall back to WhatsApp order.
                        const waNumber = String(ctxShop?.whatsapp || ctxShop?.phone || '').replace(
                          /\D/g,
                          ''
                        );
                        if (waNumber) {
                          return (
                            <a
                              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`مرحباً، أريد طلب: ${title}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                backgroundColor: theme.colors.primary,
                                borderRadius: theme.radius?.lg || '10px',
                              }}
                              className="w-full py-2.5 text-white font-bold text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>طلب / شراء</span>
                            </a>
                          );
                        }
                        return (
                          <button
                            type="button"
                            disabled
                            style={{
                              backgroundColor: theme.colors.primary,
                              borderRadius: theme.radius?.lg || '10px',
                            }}
                            className="w-full py-2.5 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>طلب / شراء</span>
                          </button>
                        );
                      })()}
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

  // ── contact / booking form ─────────────────────────────────────────────────
  if (node.type === 'contact') {
    const fields: any[] = node.props.fields || [];
    const buttonText = node.props.buttonText || 'إرسال';

    // الطلب يُثبَّت فعلاً في الخادم (نفس مسار حجز الضيف) — بيكتب في لوحة
    // التاجر فورًا. بلا واتساب وبلا رسائل نجاح وهمية.
    const submitContactForm = async () => {
      if (formSubmitting) return;
      const shopId = String(ctxShop?.id || '');
      if (!shopId) {
        setFormError('تعذر إرسال الطلب الآن — تواصل معنا هاتفيًا.');
        return;
      }
      let customerName = '';
      let customerPhone = '';
      const notesParts: string[] = [];
      fields.forEach((field: any, idx: number) => {
        const fid = field.id || field.name || `f_${idx}`;
        const value = String(inputValues[fid] || '').trim();
        if (!value) return;
        const label = String(field.label || '');
        const type = String(field.type || '');
        const fname = String(field.name || '').toLowerCase();
        if (
          type === 'tel' ||
          fname === 'phone' ||
          fname === 'tel' ||
          fname === 'mobile' ||
          /جوال|هاتف|موبايل|واتس/.test(label)
        ) {
          customerPhone = value;
        } else if (fname === 'name' || fname === 'fullname' || /اسم/.test(label)) {
          customerName = value;
        } else {
          notesParts.push(`${label}: ${value}`);
        }
      });
      if (customerName.length < 2) return setFormError('اكتب الاسم من فضلك');
      if (customerPhone.replace(/\D/g, '').length < 10) return setFormError('اكتب رقم موبايل صحيح');

      setFormSubmitting(true);
      setFormError(null);
      try {
        const intentText =
          String(node.props.title || '') + ' ' + fields.map((f: any) => f.label || '').join(' ');
        const bookingIntent = /حجز|موعد|استشارة/.test(intentText);
        const res = await api.post<any>('/bookings/guest', {
          shopId,
          itemName: String(node.props.title || 'طلب من الموقع').slice(0, 120),
          itemPrice: 0,
          customerName,
          customerPhone,
          notes: notesParts.join(' — ') || undefined,
          bookingActivityType: bookingIntent ? 'APPOINTMENT' : 'QUOTE',
          metadata: { source: 'site-contact-form', siteSlug: ctxShop?.slug },
        });
        const data = (res as any)?.data ?? res ?? {};
        setFormBookingNumber(data?.bookingNumber || null);
        setFormSubmitted(true);
        setInputValues({});
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'تعذر الإرسال الآن، جرّب تاني');
      } finally {
        setFormSubmitting(false);
      }
    };

    if (formSubmitted) {
      return (
        <section id={node.id} style={computed} data-section="contact">
          <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 flex flex-col items-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-bold text-emerald-900">تم استلام طلبك بنجاح!</h3>
              <p className="text-sm text-emerald-700 max-w-sm leading-relaxed">
                طلبك اتحفظ في نظام التاجر — هيتم التواصل معك لتأكيد التفاصيل.
              </p>
              {formBookingNumber && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-600">
                    رقم الطلب:{' '}
                    <span className="text-emerald-700" dir="ltr">
                      {formBookingNumber}
                    </span>
                  </p>
                  <a
                    href={`/bookings/track?number=${encodeURIComponent(formBookingNumber)}`}
                    className="inline-block text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                  >
                    تتبع حالة الطلب
                  </a>
                </div>
              )}
              <button
                onClick={() => {
                  setFormSubmitted(false);
                  setFormBookingNumber(null);
                  setInputValues({});
                }}
                className="mt-2 text-xs font-semibold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
              >
                إرسال طلب جديد
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section id={node.id} style={computed} data-section="contact">
        <div className="max-w-2xl mx-auto px-4 py-12">
          {(node.props.title || node.props.badge) && (
            <div className="text-center mb-8 space-y-2">
              {node.props.badge && (
                <span
                  style={{
                    backgroundColor: `${theme.colors.primary}18`,
                    color: theme.colors.primary,
                  }}
                  className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                >
                  {node.props.badge}
                </span>
              )}
              {node.props.title && (
                <h2 className="text-2xl font-extrabold text-slate-900">{node.props.title}</h2>
              )}
              {node.props.subtitle && (
                <p className="text-sm text-slate-600">{node.props.subtitle}</p>
              )}
            </div>
          )}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            {fields.map((field: any, idx: number) => {
              const fid = field.id || field.name || `f_${idx}`;
              if (field.type === 'select') {
                return (
                  <div key={fid} className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{field.label}</label>
                    <select
                      value={inputValues[fid] || ''}
                      onChange={(e) => setInputValues((v) => ({ ...v, [fid]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">اختر...</option>
                      {(field.options || []).map((opt: string, oi: number) => (
                        <option key={oi} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              if (field.type === 'textarea') {
                return (
                  <div key={fid} className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{field.label}</label>
                    <textarea
                      placeholder={field.placeholder || ''}
                      rows={3}
                      value={inputValues[fid] || ''}
                      onChange={(e) => setInputValues((v) => ({ ...v, [fid]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                );
              }
              return (
                <div key={fid} className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    placeholder={field.placeholder || ''}
                    value={inputValues[fid] || ''}
                    onChange={(e) => setInputValues((v) => ({ ...v, [fid]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              );
            })}
            {formError && <p className="text-xs font-bold text-red-600">{formError}</p>}
            <button
              onClick={submitContactForm}
              disabled={formSubmitting}
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius?.lg || '10px',
              }}
              className="w-full py-3 text-white font-bold text-sm shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {formSubmitting ? 'بنرسل طلبك…' : buttonText}
            </button>
          </div>
          {renderChildren()}
        </div>
      </section>
    );
  }

  // ── testimonials ───────────────────────────────────────────────────────────
  if (node.type === 'testimonials') {
    const reviews: any[] = node.props.testimonials || node.props.reviews || [];
    return (
      <section id={node.id} style={computed} data-section="testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {(node.props.title || node.props.badge) && (
            <div className="text-center mb-10 space-y-2 max-w-2xl mx-auto">
              {node.props.badge && (
                <span
                  style={{
                    backgroundColor: `${theme.colors.primary}18`,
                    color: theme.colors.primary,
                  }}
                  className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                >
                  {node.props.badge}
                </span>
              )}
              {node.props.title && (
                <h2 className="text-3xl font-extrabold text-slate-900">{node.props.title}</h2>
              )}
              {node.props.subtitle && (
                <p className="text-sm text-slate-600">{node.props.subtitle}</p>
              )}
            </div>
          )}
          {reviews.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((r: any, idx: number) => (
                <div
                  key={r.id || idx}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex gap-1 text-amber-400">
                      {Array.from({ length: r.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed italic">
                      "{r.text || r.quote}"
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900">{r.name || r.author}</h4>
                    {(r.role || r.position) && (
                      <span className="text-[11px] text-slate-500">{r.role || r.position}</span>
                    )}
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

  // ── features ──────────────────────────────────────────────────────────────
  if (node.type === 'features') {
    const featuresList: any[] = node.props.features || [];
    return (
      <section id={node.id} style={computed}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {(node.props.title || node.props.badge) && (
            <div className="text-center mb-10 space-y-2 max-w-2xl mx-auto">
              {node.props.badge && (
                <span
                  style={{
                    backgroundColor: `${theme.colors.primary}18`,
                    color: theme.colors.primary,
                  }}
                  className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                >
                  {node.props.badge}
                </span>
              )}
              {node.props.title && (
                <h2 className="text-3xl font-extrabold text-slate-900">{node.props.title}</h2>
              )}
              {node.props.subtitle && (
                <p className="text-sm text-slate-600">{node.props.subtitle}</p>
              )}
            </div>
          )}
          {featuresList.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuresList.map((feat: any, idx: number) => (
                <div
                  key={feat.id || idx}
                  className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 space-y-3"
                >
                  <div
                    style={{
                      backgroundColor: `${theme.colors.primary}15`,
                      color: theme.colors.primary,
                    }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                  >
                    {feat.icon === 'ShieldCheck' ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : feat.icon === 'Truck' ? (
                      <Truck className="w-6 h-6" />
                    ) : feat.icon === 'CreditCard' ? (
                      <CreditCard className="w-6 h-6" />
                    ) : (
                      <CheckCircle className="w-6 h-6" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
                  {feat.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">{feat.description}</p>
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

  // ── pricing ───────────────────────────────────────────────────────────────
  if (node.type === 'pricing') {
    const tiers: any[] = node.props.tiers || [];
    return (
      <section id={node.id} style={computed}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {(node.props.title || node.props.badge) && (
            <div className="text-center mb-10 space-y-2 max-w-2xl mx-auto">
              {node.props.badge && (
                <span
                  style={{
                    backgroundColor: `${theme.colors.primary}18`,
                    color: theme.colors.primary,
                  }}
                  className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                >
                  {node.props.badge}
                </span>
              )}
              {node.props.title && (
                <h2 className="text-3xl font-extrabold text-slate-900">{node.props.title}</h2>
              )}
            </div>
          )}
          {tiers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {tiers.map((tier: any, idx: number) => {
                const isPopular = Boolean(tier.isPopular || tier.badge);
                return (
                  <div
                    key={tier.id || idx}
                    className={`bg-white rounded-2xl border p-6 flex flex-col justify-between relative transition-all ${
                      isPopular
                        ? 'border-blue-600 shadow-xl ring-2 ring-blue-600/30'
                        : 'border-slate-200 shadow-sm'
                    }`}
                  >
                    {tier.badge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-md">
                        {tier.badge}
                      </span>
                    )}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold">{tier.title}</h3>
                      <div className="flex items-baseline gap-1">
                        <span
                          style={{ color: theme.colors.primary }}
                          className="text-3xl font-black font-mono"
                        >
                          {tier.price}
                        </span>
                        {tier.period && (
                          <span className="text-xs text-slate-500">/{tier.period}</span>
                        )}
                      </div>
                      {tier.features && (
                        <div className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                          {tier.features.map((f: string, fi: number) => (
                            <div key={fi} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      style={{
                        backgroundColor: isPopular ? theme.colors.primary : '#0f172a',
                        borderRadius: theme.radius?.lg || '10px',
                      }}
                      className="w-full mt-6 py-3 text-white font-bold text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer text-center"
                    >
                      {tier.ctaText || 'اختيار الخطة'}
                    </button>
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

  // ── card (testimonial / bento / FAQ / pricing card) ───────────────────────
  if (node.type === 'card') {
    // Product cards are first-class builder nodes too. Keep this branch before
    // the generic card variants so a card placed inside a hero/grid survives
    // publishing with the same renderer and options as the editor preview.
    if (isLegacyProductCardNode(node)) {
      const waNumber = String(ctxShop?.whatsapp || ctxShop?.phone || '').replace(/\D/g, '');
      const waLink = (text: string) =>
        waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}` : null;
      return (
        <div id={node.id} style={computed} data-builder-node-id={node.id}>
          <PublishedProductCard
            item={node.props}
            index={0}
            sectionProps={node.props}
            ctx={{
              theme: {
                colors: {
                  primary: theme.colors.primary,
                  accent: theme.colors.accent || theme.colors.primary,
                },
              },
              realProducts: (ctxProducts || []) as any,
              waLink,
              siteSlug: ctxShop?.slug,
              onAddToCart: (product) => {
                const live = (ctxProducts || []).find((p) => String(p.id) === String(product.id));
                addLiveToCart((live || product) as any);
              },
            }}
          />
          {renderChildren()}
        </div>
      );
    }

    // Testimonial / Quote card
    if (node.props.quote) {
      return (
        <div id={node.id} style={computed} className="flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex gap-1 text-amber-400">
              {Array.from({ length: node.props.rating || 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed italic">"{node.props.quote}"</p>
            <div className="pt-2 border-t border-slate-200/60">
              <h4 className="text-xs font-bold text-slate-900">{node.props.author}</h4>
              {node.props.role && (
                <span className="text-[11px] text-slate-500">{node.props.role}</span>
              )}
            </div>
          </div>
          {renderChildren()}
        </div>
      );
    }

    // Bento / Feature card
    if (node.props.icon) {
      return (
        <div id={node.id} style={computed} className="space-y-3">
          <div
            style={{
              backgroundColor: `${theme.colors.primary}18`,
              color: theme.colors.primary,
              borderRadius: theme.radius?.md || '10px',
            }}
            className="w-12 h-12 flex items-center justify-center"
          >
            {node.props.icon === 'ShieldCheck' && <ShieldCheck className="w-6 h-6" />}
            {node.props.icon === 'Truck' && <Truck className="w-6 h-6" />}
            {node.props.icon === 'CreditCard' && <CreditCard className="w-6 h-6" />}
          </div>
          <h3 className="text-lg font-bold text-slate-900">{node.props.title}</h3>
          {node.props.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{node.props.description}</p>
          )}
          {renderChildren()}
        </div>
      );
    }

    // FAQ card
    if (node.props.question) {
      return (
        <div
          id={node.id}
          style={computed}
          onClick={() => setIsFaqOpen(!isFaqOpen)}
          className="cursor-pointer space-y-2 select-none"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-900">{node.props.question}</h4>
            <span className="text-slate-400 p-1">
              {isFaqOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </div>
          {isFaqOpen && (
            <p className="text-xs text-slate-600 leading-relaxed">{node.props.answer}</p>
          )}
          {renderChildren()}
        </div>
      );
    }

    // Generic card
    return (
      <div id={node.id} style={computed}>
        {renderChildren()}
      </div>
    );
  }

  // ── footer ─────────────────────────────────────────────────────────────────
  if (node.type === 'footer') {
    const brandName = node.props.brandName || ctxShop?.name || 'المتجر الإلكتروني';
    const description =
      node.props.description || 'منصة متكاملة للتجارة والخدمات بأعلى معايير الجودة.';
    const isDarkText = node.props.textColorMode === 'dark_text';
    const headingClass = isDarkText ? 'text-slate-900' : 'text-white';
    const subheadClass = isDarkText ? 'text-slate-800' : 'text-slate-300';
    const bodyTextClass = isDarkText ? 'text-slate-600' : 'text-slate-400';
    const borderDivider = isDarkText ? 'border-slate-300/80' : 'border-slate-800';
    const bottomBorder = isDarkText ? 'border-slate-300/60' : 'border-slate-800/60';
    const linkHover = isDarkText
      ? 'text-slate-700 hover:text-slate-950'
      : 'text-slate-300 hover:text-white';
    const badgeStyle = isDarkText
      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white';

    const phone = node.props.phone || ctxShop?.phone || ctxShop?.whatsapp;
    const email = node.props.email || ctxShop?.email;
    const address = node.props.address || ctxShop?.address;
    const links = Array.isArray(node.props.links) ? node.props.links : [];

    return (
      <footer id={node.id} style={computed} className="transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-12 text-right">
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 pb-8 border-b ${borderDivider}`}
          >
            {/* Brand Col */}
            <div className="space-y-2.5">
              <h3 className={`text-base sm:text-lg font-black ${headingClass} break-words`}>
                {brandName}
              </h3>
              <p className={`text-xs ${bodyTextClass} leading-relaxed max-w-sm break-words`}>
                {description}
              </p>
            </div>
            {/* Contact Col */}
            {(!node.props.hideContactInfo || phone || email || address) && (
              <div className="space-y-2">
                <h4 className={`text-xs font-bold ${subheadClass} uppercase tracking-wider`}>
                  {node.props.contactTitle || 'معلومات التواصل'}
                </h4>
                <div className={`space-y-1.5 text-xs ${bodyTextClass}`}>
                  {phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span dir="ltr">{phone}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{email}</span>
                    </div>
                  )}
                  {address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Trust Col */}
            {!node.props.hideTrustCol && (
              <div className="space-y-2">
                <h4 className={`text-xs font-bold ${subheadClass} uppercase tracking-wider`}>
                  {node.props.trustTitle || 'ضمان واعتماد'}
                </h4>
                <p className={`text-xs ${bodyTextClass} leading-relaxed`}>
                  {node.props.trustDescription ||
                    'جميع المعاملات والخدمات مشمولة بضمان معتمد وفريق دعم فني متواجد على مدار الساعة.'}
                </p>
              </div>
            )}
          </div>

          {links.length > 0 && (
            <nav aria-label="روابط الموقع" className="flex flex-wrap gap-x-4 gap-y-2 py-5 text-xs">
              {links.map((item: any, index: number) => {
                const label = typeof item === 'string' ? item : item.label || item.title || '';
                if (!label) return null;
                // Editor parity: resolve object links AND plain labels to
                // real pages/sections instead of hard-coded '#'.
                const destination = resolvePublishedLinkDestination(
                  website as any,
                  typeof item === 'object' ? item : { text: label },
                  { inferFromLabel: true, label }
                );
                const rawUrl = typeof item === 'object' ? String(item.url || item.href || '') : '';
                if (destination) {
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => followLink(typeof item === 'object' ? item : { text: label })}
                      className={`${linkHover} transition-colors cursor-pointer text-right`}
                    >
                      {label}
                    </button>
                  );
                }
                if (rawUrl && !rawUrl.startsWith('#')) {
                  return (
                    <a
                      key={index}
                      href={rawUrl}
                      target={/^https?:/i.test(rawUrl) ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className={`${linkHover} transition-colors`}
                    >
                      {label}
                    </a>
                  );
                }
                return (
                  <a key={index} href={rawUrl || '#'} className={`${linkHover} transition-colors`}>
                    {label}
                  </a>
                );
              })}
            </nav>
          )}

          {/* Copyright row */}
          <div
            className={`pt-6 pb-2 text-center flex flex-col sm:flex-row items-center justify-center gap-2 text-xs ${bodyTextClass} select-none border-t ${bottomBorder} mt-6`}
          >
            <span>
              {node.props.copyright ||
                `جميع الحقوق محفوظة © ${new Date().getFullYear()} ${brandName}`}
            </span>
            <span className="hidden sm:inline opacity-30">•</span>
            <a
              href="https://mnmknk.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${badgeStyle} border transition-all text-[11px] font-medium shadow-xs`}
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

  // ── hero (بنر الواجهة) ─────────────────────────────────────────────────────
  // Same three modes as the editor canvas (HeroRenderer): full-bleed media-only
  // banner, complete child-based hero, or the classic two-column hero. Without
  // this case the published site painted an empty styled div — the banner and
  // every hero CTA vanished after publishing.
  if (node.type === 'hero') {
    const isMobile = viewport === 'mobile';
    const content = resolveHeroContent(node as any, website.components as any);
    const heroStats = content.stats || [];
    const primaryColor = theme?.colors?.primary || '#2563eb';
    const hasCompleteChildContent = isCompleteChildBasedHero(content);
    const mediaType = node.props?.mediaType === 'video' ? 'video' : 'image';
    const imageUrl = node.props?.imageUrl || content.imageUrl;
    const videoUrl = node.props?.videoUrl;
    const mediaUrl = mediaType === 'video' ? videoUrl : imageUrl;
    const hasTextContent = Boolean(
      content.badge ||
      content.title ||
      content.description ||
      content.primaryCtaText ||
      content.secondaryCtaText ||
      heroStats.length
    );
    const heightPreset = String(node.props?.bannerHeight || 'medium');
    const bannerHeights: Record<string, { desktop: number; mobile: number }> = {
      small: { desktop: 220, mobile: 180 },
      medium: { desktop: 340, mobile: 260 },
      large: { desktop: 520, mobile: 360 },
    };
    const bannerHeight = bannerHeights[heightPreset] || bannerHeights.medium;

    const handleCta = (link?: string) => {
      const target = String(link || '');
      // Destinations configured in the builder win, exactly like the button case.
      if (followLink({ url: target })) return;
      if (target.startsWith('#')) {
        scrollTo(target.slice(1));
      } else if (/^(?:https?:|tel:|mailto:|\/\/)/i.test(target)) {
        window.open(target, '_blank', 'noopener,noreferrer');
      }
    };

    // Mode 1 — media-only banner: a full-bleed image/video with no baked text.
    if (mediaUrl && (node.props?.bannerMediaOnly || !hasTextContent)) {
      const mediaHeight = isMobile ? bannerHeight.mobile : bannerHeight.desktop;
      return (
        <section
          id={node.id}
          style={{
            ...computed,
            position: 'relative',
            width: '100%',
            height: `${mediaHeight}px`,
            minHeight: `${mediaHeight}px`,
            maxHeight: 'none',
            padding: 0,
            overflow: 'hidden',
          }}
          className="relative"
        >
          {mediaType === 'video' ? (
            <video
              src={videoUrl}
              poster={imageUrl || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={content.title || 'فيديو البنر'}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <img
              src={imageUrl}
              alt={content.title || 'صورة البنر'}
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </section>
      );
    }

    // Mode 2 — complete child-based hero: the children are the whole story.
    if (hasCompleteChildContent) {
      return (
        <section
          id={node.id}
          style={{
            ...computed,
            ...(node.props?.bannerHeight
              ? { minHeight: `${isMobile ? bannerHeight.mobile : bannerHeight.desktop}px` }
              : {}),
          }}
        >
          {renderChildren()}
        </section>
      );
    }

    // Mode 3 — classic two-column hero: text column + media column.
    return (
      <section
        id={node.id}
        style={{
          ...computed,
          ...(node.props?.bannerHeight
            ? { minHeight: `${isMobile ? bannerHeight.mobile : bannerHeight.desktop}px` }
            : {}),
        }}
      >
        <div className={sectionShellClass}>
          <div
            className={
              isMobile
                ? 'flex flex-col gap-5'
                : 'grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center'
            }
          >
            <div
              className={`${isMobile ? 'w-full' : 'lg:col-span-7'} space-y-3 sm:space-y-6 text-right`}
            >
              {content.badge && !content.childContent.badge && (
                <span
                  style={sectionBadgeStyle(theme as any)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{content.badge}</span>
                </span>
              )}

              {!content.childContent.title && (
                <h1
                  className={`${isMobile ? 'text-2xl' : 'text-2xl sm:text-4xl lg:text-5xl'} font-black text-slate-900 leading-tight break-words`}
                >
                  {content.title}
                  {content.highlightTitle && (
                    <span
                      style={{ color: primaryColor }}
                      className={isMobile ? 'block mt-0.5' : 'block sm:inline sm:mr-2'}
                    >
                      {content.highlightTitle}
                    </span>
                  )}
                </h1>
              )}

              {content.description && !content.childContent.description && (
                <p className={`${sectionSubtitleClass} text-slate-600 max-w-2xl`}>
                  {content.description}
                </p>
              )}

              <div
                className={`flex ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'} flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-4 pt-1`}
              >
                {content.primaryCtaText && !content.childContent.primaryCta && (
                  <button
                    onClick={() => handleCta(content.primaryCtaLink || '#items')}
                    style={{
                      backgroundColor: primaryColor,
                      borderRadius: theme?.radius?.lg || '12px',
                    }}
                    className="w-full sm:w-auto px-5 sm:px-7 py-3 text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 text-center"
                  >
                    <span>{content.primaryCtaText}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                )}

                {content.secondaryCtaText && !content.childContent.secondaryCta && (
                  <button
                    onClick={() => handleCta(content.secondaryCtaLink || '#contact')}
                    className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer shrink-0 text-center justify-center flex items-center"
                  >
                    <span>{content.secondaryCtaText}</span>
                  </button>
                )}
              </div>

              {heroStats.length > 0 && !content.childContent.stats && (
                <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-slate-200/80 text-center">
                  {heroStats.map((stat: any, sIdx: number) => (
                    <div key={sIdx} className="space-y-0.5 min-w-0">
                      <div
                        style={{ color: primaryColor }}
                        className={`${isMobile ? 'text-lg' : 'text-base sm:text-2xl'} font-black font-mono truncate`}
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

            {mediaUrl && (mediaType === 'video' || !content.childContent.image) && (
              <div className={isMobile ? 'w-full' : 'lg:col-span-5 w-full'}>
                <div
                  className={`relative rounded-2xl overflow-hidden shadow-xl border border-slate-100 bg-slate-100 ${isMobile ? 'aspect-video max-h-[200px]' : 'aspect-16/10 sm:aspect-square max-h-[340px] sm:max-h-none'}`}
                >
                  {mediaType === 'video' ? (
                    <video
                      src={videoUrl}
                      poster={imageUrl || undefined}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={content.title || 'فيديو البنر'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={imageUrl}
                      alt={content.title || 'صورة الواجهة'}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  )}
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

  // ── default (containers, flex, grid, header, hero, etc.) ───────────────────
  return (
    <div id={node.id} style={computed}>
      {/* Bento header-style badge+title+subtitle inline content */}
      {node.props.badge && node.props.title && !node.childrenIds?.length && (
        <div className="text-center mb-10 space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
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
      {/* Stats item */}
      {node.props.value && node.props.label && (
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900 font-mono">{node.props.value}</div>
          <div className="text-xs text-slate-500 font-medium">{node.props.label}</div>
        </div>
      )}
      {/* Footer copyright row */}
      {node.props.copyright && (
        <div className="w-full text-center text-xs text-slate-500">{node.props.copyright}</div>
      )}
      {/* Footer column with heading + links */}
      {node.props.heading && node.props.links && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {node.props.heading}
          </h4>
          <div className="flex flex-col gap-1.5 text-xs text-slate-400">
            {(node.props.links as string[])
              .filter((link) => !/نمّي|صنع بكل فخر|powered by|platform/i.test(link))
              .map((link, i) => (
                <span key={i} className="hover:text-white cursor-pointer transition-colors">
                  {link}
                </span>
              ))}
          </div>
        </div>
      )}
      {/* Footer column with heading + info */}
      {node.props.heading && node.props.info && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {node.props.heading}
          </h4>
          <div className="flex flex-col gap-1.5 text-xs text-slate-400">
            {(node.props.info as string[])
              .filter((inf) => !/نمّي|صنع بكل فخر|powered by|platform/i.test(inf))
              .map((inf, i) => (
                <span key={i}>{inf}</span>
              ))}
          </div>
        </div>
      )}
      {renderChildren()}
    </div>
  );
}

// ─── Mobile Footer (fixed bottom bar for phones) ─────────────────────────────

function MobileFooterBar({
  node,
  cartSettings,
}: {
  node: ComponentNode;
  cartSettings?: WebsiteCartSettings;
}) {
  const { setCartOpen, totalItems } = useCart();
  const { shop: ctxShop } = React.useContext(ShopDataContext);
  const showCart = isCartVisible({ settings: cartSettings, placement: 'floating' });
  const rawButtons: string[] = Array.isArray(node.props.buttons)
    ? node.props.buttons
    : ['home', 'products', 'cart', 'whatsapp'];
  const barBg = node.props.bgColor || '#0f172a';

  const scrollToProducts = () => {
    const el =
      document.querySelector('[data-section="products"]') || document.getElementById('products');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
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
        if (!showCart) return null;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-white/80 hover:text-white transition-colors"
          >
            <CartIcon iconType={cartSettings?.iconType} className="w-5 h-5" />
            <span className="text-[9px] font-bold">السلة</span>
            {totalItems > 0 && (
              <span className="absolute top-0 left-1/2 ltr:translate-x-2 rtl:-translate-x-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        );
      case 'whatsapp': {
        const wa = node.props.whatsapp || ctxShop?.whatsapp || node.props.phone || ctxShop?.phone;
        if (!wa) return null;
        return (
          <a
            key={key}
            href={`https://wa.me/${String(wa).replace(/\D/g, '')}`}
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
        const phone = node.props.phone || ctxShop?.phone;
        if (!phone) return null;
        return (
          <a
            key={key}
            href={`tel:${phone}`}
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

// ─── Public Export ─────────────────────────────────────────────────────────────

interface BuilderTreeRendererProps {
  website: BuilderWebsite;
  /** The shop owning this site — provides contact info (whatsapp/phone) for the mobile footer. */
  shop?: Shop;
  /** Live catalog — lets product cards add REAL items to the unified cart. */
  products?: Product[];
}

export function BuilderTreeRenderer({ website, shop, products }: BuilderTreeRendererProps) {
  const safeWebsite = React.useMemo(() => {
    const normalized = normalizeWebsiteTree(website as any);
    return {
      ...normalized,
      theme: resolveTheme(normalized.theme),
    } as BuilderWebsite;
  }, [website]);
  const viewport = useResponsiveViewport();
  // Multi-page parity with /site: pages can navigate client-side (buttons,
  // nav links, footer links with page destinations) instead of being pinned
  // to the home page forever.
  const [activePageId, setActivePageId] = useState<string | null>(() => {
    // فتح برابط فيه ‎?page=slug‎ يفتح الصفحة المطلوبة مباشرة (روابط قابلة
    // للمشاركة) — وبدونها يبدأ من الرئيسية.
    if (typeof window === 'undefined') return null;
    try {
      const slug = new URLSearchParams(window.location.search).get('page');
      if (!slug) return null;
      const match = (website?.pages || []).find((p: any) => p.slug === slug || p.id === slug);
      return match?.id ?? null;
    } catch {
      return null;
    }
  });
  const activePage =
    (activePageId && safeWebsite.pages?.find((page) => page.id === activePageId)) ||
    safeWebsite.pages?.find((page) => page.metadata?.isHomePage) ||
    safeWebsite.pages?.find((page) => page.id === 'page_home') ||
    safeWebsite.pages?.[0];
  const handleNavigatePage = (pageId: string) => {
    if (!safeWebsite.pages?.some((page) => page.id === pageId)) return;
    setActivePageId(pageId);
    // تسجيل الصفحة في الـ URL — بدونها سهم رجوع المتصفح بيخرج من الموقع
    // كله بدل ما يرجّعك للصفحة السابقة.
    if (typeof window !== 'undefined') {
      try {
        const page = safeWebsite.pages?.find((p) => p.id === pageId);
        const url = new URL(window.location.href);
        if (page && !page.metadata?.isHomePage) {
          url.searchParams.set('page', String(page.slug || page.id));
        } else {
          url.searchParams.delete('page');
        }
        window.history.pushState({}, '', url);
      } catch {}
    }
  };
  // سهم رجوع المتصفح: رجّع الصفحة المعروضة للقيمة السابقة من الـ URL.
  React.useEffect(() => {
    const onPopState = () => {
      if (typeof window === 'undefined') return;
      try {
        const slug = new URLSearchParams(window.location.search).get('page');
        const match = slug
          ? safeWebsite.pages?.find((p) => p.slug === slug || p.id === slug)
          : safeWebsite.pages?.find((p) => p.metadata?.isHomePage) ||
            safeWebsite.pages?.find((p) => p.id === 'page_home') ||
            safeWebsite.pages?.[0];
        if (match) setActivePageId(match.id);
      } catch {}
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [safeWebsite]);
  // Jump back to the top whenever the rendered page changes (skip first mount).
  const currentPageId = activePage?.id;
  const mountedRef = React.useRef(false);
  React.useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentPageId]);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!activePage) return;
    const sections = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[data-section="products"]') || []
    );
    const seen = new Set<string>();

    [...sections].reverse().forEach((section) => {
      const ids = (section.dataset.productIds || '').split(',').filter(Boolean);
      if (ids.some((id) => seen.has(id))) section.hidden = true;
      ids.forEach((id) => seen.add(id));
    });

    return () =>
      sections.forEach((section) => {
        section.hidden = false;
      });
  }, [safeWebsite, activePage?.id]);

  if (!activePage) return null;

  const direction = (safeWebsite.defaultDirection || 'rtl') as React.CSSProperties['direction'];

  return (
    <ShopDataContext.Provider
      value={{
        shop,
        products,
        viewport,
        activePageId: activePage?.id || '',
        onNavigatePage: handleNavigatePage,
      }}
    >
      <div
        ref={rootRef}
        className="merchant-site-builder"
        style={computeWebsiteRootStyles(
          safeWebsite.theme,
          direction,
          safeWebsite.settings?.background
        )}
      >
        {/* Editor parity: the announcement bar configured in the builder now
            shows on the published shop page too. */}
        {(() => {
          const announcement = resolveAnnouncementBar(safeWebsite as any);
          if (!announcement) return null;
          return (
            <aside
              aria-label="شريط الإعلانات الترويجي"
              style={{
                backgroundColor: announcement.bgColor || safeWebsite.theme.colors.primary,
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
          );
        })()}
        <NodeRenderer nodeId={activePage.rootNodeId} website={safeWebsite} />
      </div>
    </ShopDataContext.Provider>
  );
}
