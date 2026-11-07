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
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Home,
  LayoutGrid,
} from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';
import { useCart } from '@/lib/cart';
import type { Shop, Product } from '@/lib/services';
import {
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
  CartIcon,
  isCartVisible,
} from '@ray-eg/shared/builder';

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
}

interface BuilderWebsite {
  pages: Array<{
    id: string;
    rootNodeId: string;
    name?: string;
    slug?: string;
    metadata?: { isHomePage?: boolean };
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
  settings?: { cart?: WebsiteCartSettings };
  defaultDirection?: string;
}

/** Live shop + catalog passed down the tree so product cards and the mobile
 *  footer can bind to the REAL unified cart instead of dead WhatsApp buttons. */
const ShopDataContext = React.createContext<{
  shop?: Shop;
  products?: Product[];
  viewport: ResponsiveViewport;
}>({ viewport: 'desktop' });

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
  const { addItem } = useCart();
  const { shop: ctxShop, products: ctxProducts, viewport } = React.useContext(ShopDataContext);
  const [formSubmitted, setFormSubmitted] = useState(false);
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
  const computed = getComputedStyles(node, theme, viewport);

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
    const content = (
      <>
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
    const url = node.props.url || node.props.href || node.props.link || '';
    const handleClick = () => {
      if (url.startsWith('#')) {
        scrollTo(url.slice(1));
      } else if (url.startsWith('http')) {
        window.open(url, '_blank', 'noopener');
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
        ? liveList.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            priceFormatted: p.price != null ? `${p.price}` : '',
            image: p.imageUrl || p.images?.[0] || '',
            description: p.description || '',
            category: p.category || '',
          }))
        : bakedItems;
    const categories: string[] = [
      'all',
      ...Array.from(new Set(rawList.map((i: any) => i.category).filter(Boolean))),
    ];
    const filtered =
      activeCategory === 'all'
        ? rawList
        : rawList.filter((i: any) => i.category === activeCategory);

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

          {/* Category tabs */}
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
                  {cat === 'all' ? 'الكل' : cat}
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
                                addItem(live, 1, true);
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
                شكراً لك. سنتواصل معك قريباً لتأكيد الطلب.
              </p>
              <button
                onClick={() => {
                  setFormSubmitted(false);
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
              const fid = field.id || `f_${idx}`;
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
            <button
              onClick={() => setFormSubmitted(true)}
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius?.lg || '10px',
              }}
              className="w-full py-3 text-white font-bold text-sm shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer"
            >
              {buttonText}
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
                addItem((live || product) as any, 1, true);
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

  // ── default (containers, flex, grid, header, hero, footer, etc.) ──────────
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
  const activePage =
    safeWebsite.pages?.find((page) => page.metadata?.isHomePage) ||
    safeWebsite.pages?.find((page) => page.id === 'page_home') ||
    safeWebsite.pages?.[0];
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
    <ShopDataContext.Provider value={{ shop, products, viewport }}>
      <div
        ref={rootRef}
        className="merchant-site-builder"
        style={computeWebsiteRootStyles(safeWebsite.theme, direction)}
      >
        <NodeRenderer nodeId={activePage.rootNodeId} website={safeWebsite} />
      </div>
    </ShopDataContext.Provider>
  );
}
