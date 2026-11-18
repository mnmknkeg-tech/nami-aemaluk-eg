'use client';

import React from 'react';
import {
  Star,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Truck,
  CreditCard,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { jsonRequest } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  PublishedBadgeNode,
  PublishedHeadingNode,
  PublishedImageNode,
  PublishedParagraphNode,
} from './BuilderPrimitiveNodes';
import { MobileFooterBar } from './BuilderMobileFooterBar';
import { PublishedProductsSection } from './PublishedProductsSection';
import { PublishedFooterSection } from './PublishedFooterSection';
import { PublishedContactForm } from './PublishedContactForm';
import { PublishedFeaturesSection, PublishedTestimonialsSection } from './PublishedMarketingSections';
// سلة موقع التاجر المستقلة — مش سلة الماركت (decoupling): الـ add-to-cart في
// قالب التاجر بيخزن في merchant-site-cart:site:{slug} والـ checkout بيكمل
// على /site/{slug}/checkout بسلته الخاصة، مالهمش أي دعوة بـ mnmknk_cart.
import { SiteCartProvider, useSiteCart } from '@/lib/site-cart';
import type { Shop, Product } from '@/lib/services';
import {
  applyWebsiteBackgroundToPageRoot,
  computeWebsiteRootStyles,
  computeThemeResponsiveNodeStyles,
  normalizeWebsiteTree,
  isLegacyProductCardNode,
  PublishedProductCard,
  CustomCodeFrame,
  resolveTheme,
  useResponsiveViewport,
  type ResponsiveViewport,
  type StyleProperties,
  type WebsiteCartSettings,
  type WebsiteBackgroundSettings,
  followPublishedDestination,
  isBrandHeadingNode,
  resolveAnnouncementBar,
  resolveBrandLogoUrl,
  resolvePublishedLinkDestination,
  sectionBadgeStyle,
  sectionShellClass,
  sectionSubtitleClass,
  SiteCartDrawer,
  type SiteShopContext,
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
  customCode?: {
    tsx?: string;
    tsxSnippet?: string;
    css?: string;
    cssSnippet?: string;
    js?: string;
    jsSnippet?: string;
  };
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

/** فتح/قفل درج سلة موقع التاجر — حالة الدرج عند جذر الشجرة وبتستهلك من أي
 *  عمق (أزرار الشراء، فوتر الموبايل، روابط «افتح السلة»). الدرج نفسه هو
 *  SiteCartDrawer بتاع الموقع — مش درج سلة الماركت. */
const SiteCartUIContext = React.createContext<{ openCart: () => void }>({
  openCart: () => {},
});

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
  // سلة موقع التاجر (مش سلة الماركت) + درج السلة بتاع الموقع نفسه
  const { addItem, totalItems } = useSiteCart();
  const { openCart } = React.useContext(SiteCartUIContext);
  const {
    shop: ctxShop,
    products: ctxProducts,
    viewport,
    activePageId,
    onNavigatePage,
  } = React.useContext(ShopDataContext);
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
    return (
      <MobileFooterBar
        node={node}
        cartSettings={website.settings?.cart}
        totalItems={totalItems}
        shop={ctxShop}
        onOpenCart={openCart}
      />
    );
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
   *  filter missed them. Stamp the hosting shop on every cart item.
   *  Decoupling: items go to the MERCHANT SITE cart (merchant-site-cart),
   *  never the marketplace cart — checkout continues at /site/{slug}/checkout
   *  with the site's own cart and guest-friendly public orders endpoint. */
  const addLiveToCart = (product: any, quantity = 1) => {
    addItem(
      {
        ...product,
        id: String(product.id ?? ''),
        title: product.title || product.name || 'منتج',
        price: typeof product.price === 'string' ? Number(product.price) || 0 : product.price,
        image: product.image || product.imageUrl || product.images?.[0],
        shopId: String(product.shopId || ctxShop?.id || ''),
        shopSlug: String(product.shopSlug || ctxShop?.slug || ''),
      },
      {
        id: String(ctxShop?.id || ''),
        name: String(ctxShop?.name || ''),
        slug: String(ctxShop?.slug || ''),
        logoUrl: (ctxShop as any)?.logoUrl,
        phone: (ctxShop as any)?.phone,
        whatsapp: (ctxShop as any)?.whatsapp,
      } as SiteShopContext,
      {
        quantity,
        variantSelection: product.variantSelection,
        addons: product.addons,
      }
    );
    openCart();
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
      onOpenCart: () => openCart(),
      scrollToSection: scrollTo,
    });
  };

  // ── custom-code ────────────────────────────────────────────────────────────
  if (node.type === 'custom-code') {
    return (
      <div id={node.id} style={computed} data-builder-node-id={node.id}>
        <CustomCodeFrame node={node as any} />
        {renderChildren()}
      </div>
    );
  }

  // ── heading ────────────────────────────────────────────────────────────────
  if (node.type === 'heading') {
    const storeLogo =
      node.id.toLowerCase().includes('logo') || String(node.props?.name || '').includes('شعار')
        ? ctxShop?.logoUrl || ctxShop?.logo || resolveBrandLogoUrl(website as any, node) || undefined
        : isBrandHeadingNode(node as any)
          ? resolveBrandLogoUrl(website as any, node) || undefined
          : undefined;
    return (
      <PublishedHeadingNode
        id={node.id}
        tag={node.props.tag || 'h2'}
        text={node.props.text || ''}
        badgeText={node.props.badgeText}
        storeLogo={storeLogo}
        shopName={ctxShop?.name}
        primaryColor={theme.colors.primary}
        style={computed}
      />
    );
  }

  // ── paragraph ─────────────────────────────────────────────────────────────
  if (node.type === 'paragraph') {
    return (
      <PublishedParagraphNode
        id={node.id}
        text={node.props.text || ''}
        props={node.props}
        destination={node.destination}
        style={computed}
        onFollowLink={followLink}
      />
    );
  }

  // ── badge ─────────────────────────────────────────────────────────────────
  if (node.type === 'badge') {
    return <PublishedBadgeNode id={node.id} text={node.props.text || ''} style={computed} />;
  }

  // ── image ─────────────────────────────────────────────────────────────────
  if (node.type === 'image') {
    return (
      <PublishedImageNode
        id={node.id}
        src={node.props.src || 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=80'}
        alt={node.props.alt || ''}
        style={computed}
      />
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
    return (
      <PublishedProductsSection
        node={node}
        style={computed}
        theme={theme}
        ctxProducts={ctxProducts || []}
        ctxShop={ctxShop}
        website={website}
        onNavigatePage={onNavigatePage}
        addLiveToCart={addLiveToCart}
        renderChildren={renderChildren}
      />
    );
  }

  // ── contact / booking form ─────────────────────────────────────────────────
  if (node.type === 'contact') {
    return (
      <PublishedContactForm
        node={node}
        style={computed}
        theme={theme}
        shopId={ctxShop?.id}
        shopSlug={ctxShop?.slug}
        renderChildren={renderChildren}
      />
    );
  }

  // ── testimonials ───────────────────────────────────────────────────────────
  if (node.type === 'testimonials') {
    return (
      <PublishedTestimonialsSection
        node={node}
        style={computed}
        theme={theme}
        renderChildren={renderChildren}
      />
    );
  }

  // ── features ──────────────────────────────────────────────────────────────
  if (node.type === 'features') {
    return (
      <PublishedFeaturesSection
        node={node}
        style={computed}
        theme={theme}
        renderChildren={renderChildren}
      />
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
    return (
      <PublishedFooterSection
        node={node}
        style={computed}
        ctxShop={ctxShop}
        website={website}
        followLink={followLink}
        renderChildren={renderChildren}
      />
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

// ─── Public Export ─────────────────────────────────────────────────────────────

interface BuilderTreeRendererProps {
  website: BuilderWebsite;
  /** The shop owning this site — provides contact info (whatsapp/phone) for the mobile footer. */
  shop?: Shop;
  /** Live catalog — lets product cards add REAL items to the unified cart. */
  products?: Product[];
}

export function BuilderTreeRenderer(props: BuilderTreeRendererProps) {
  // سلة موقع التاجر بمفتاح صريح من slug التاجر — بتشتغل صح سواء القالب بيتعرض
  // على /shop/[slug]?view=site أو على الدومين الفرعي/المخصص، ومش بتلمس
  // سلة الماركت (mnmknk_cart) إطلاقًا — قرار فصل موقع التاجر عن الماركت.
  const siteSlug = props.shop?.slug ? String(props.shop.slug) : undefined;
  return (
    <SiteCartProvider slug={siteSlug}>
      <BuilderTreeRendererInner {...props} />
    </SiteCartProvider>
  );
}

function BuilderTreeRendererInner({ website, shop, products }: BuilderTreeRendererProps) {
  const router = useRouter();
  const safeWebsite = React.useMemo(() => {
    const normalized = normalizeWebsiteTree(website as any);
    return {
      ...normalized,
      theme: resolveTheme(normalized.theme),
    } as BuilderWebsite;
  }, [website]);
  const viewport = useResponsiveViewport();
  // سياق المتجر بصيغة SiteShopContext — لسلة الموقع والدرج والكوبونات
  const siteShopCtx = React.useMemo<SiteShopContext>(
    () => ({
      id: String(shop?.id || ''),
      name: String(shop?.name || ''),
      slug: String(shop?.slug || ''),
      logoUrl: shop?.logoUrl || shop?.logo,
      phone: shop?.phone,
      whatsapp: (shop as any)?.whatsapp || shop?.phone,
    }),
    [shop]
  );
  const [isCartOpen, setCartOpen] = useState(false);
  const {
    items: siteCartEntries,
    updateQuantity: updateSiteCartItem,
    removeItem: removeSiteCartItem,
  } = useSiteCart();
  const cartItems = React.useMemo(
    () =>
      siteCartEntries.map((entry) => ({
        id: entry.cartItemId || entry.product.id,
        productId: entry.product.id,
        title: entry.product.title,
        price:
          typeof entry.product.price === 'string'
            ? Number(entry.product.price) || 0
            : entry.product.price,
        quantity: entry.quantity,
        image: entry.product.image,
        addons: entry.addons || (entry.product as any)?.addons,
        variantSelection: entry.variantSelection || (entry.product as any)?.variantSelection,
      })),
    [siteCartEntries]
  );
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
    <SiteCartUIContext.Provider value={{ openCart: () => setCartOpen(true) }}>
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

        {/* درج سلة موقع التاجر — منفصل تمامًا عن درج سلة الماركت؛ الـ checkout
            بيكمل على /site/{slug}/checkout بسلة الموقع نفسها */}
        <SiteCartDrawer
          isOpen={isCartOpen}
          onClose={() => setCartOpen(false)}
          items={cartItems}
          shop={siteShopCtx}
          website={safeWebsite as any}
          onUpdateQuantity={(id, delta) => updateSiteCartItem(id, delta)}
          onRemoveItem={removeSiteCartItem}
          onProceedToCheckout={() => {
            setCartOpen(false);
            router.push(`/site/${siteShopCtx.slug}/checkout`);
          }}
          onValidateCoupon={async (code, subtotal) => {
            const response = await jsonRequest<any>('/coupons/validate', {
              method: 'POST',
              body: JSON.stringify({ shopId: siteShopCtx.id, code, subtotal }),
            });
            const result = response?.data || response;
            if (!result || typeof result.discountAmount !== 'number') {
              throw new Error('الكوبون غير صالح أو منتهي');
            }
            window.sessionStorage.setItem(
              `merchant-site-coupon:site:${siteShopCtx.slug}`,
              JSON.stringify({ code, discountAmount: result.discountAmount })
            );
            return result;
          }}
        />
      </ShopDataContext.Provider>
    </SiteCartUIContext.Provider>
  );
}
