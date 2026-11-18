'use client';

import React, { useState } from 'react';
import { CheckCircle, ShoppingBag, ShoppingCart } from 'lucide-react';
import {
  buildCatalogCategories,
  normalizeCatalogProduct,
  productGridClass,
  resolveProductCardOptions,
} from '@ray-eg/shared/builder';

interface PublishedProductsSectionProps {
  node: any;
  style: React.CSSProperties;
  theme: any;
  ctxProducts: any[];
  ctxShop: any;
  website: any;
  onNavigatePage?: (pageId: string) => void;
  addLiveToCart: (product: any, quantity?: number) => void;
  renderChildren: () => React.ReactNode;
}

export function PublishedProductsSection({
  node,
  style,
  theme,
  ctxProducts,
  ctxShop,
  website,
  onNavigatePage,
  addLiveToCart,
  renderChildren,
}: PublishedProductsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

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
    activeCategory === 'all' ? rawList : rawList.filter((i: any) => i.category === activeCategory);
  // توازٍ مع الكانفس: بطاقات وضع الحجز (buyButtonMode hidden) تعرض زر
  // "احجز الآن" بدل سلة/واتساب — الحجز يثبت في لوحة التاجر لا محادثة.
  const gridOptions = resolveProductCardOptions(node.props);
  const bookingModeCards = gridOptions.buyButtonMode === 'hidden';
  const openBookingFlow = () => {
    const pages = (website as any).pages || [];
    const contactPage =
      pages.find((p: any) => p.slug === 'contact' || p.id === 'page_contact') ||
      pages.find((p: any) => (p.name || '').includes('تواصل') || (p.name || '').includes('حجز')) ||
      pages[0];
    if (contactPage) onNavigatePage?.(contactPage.id);
    if (typeof window !== 'undefined')
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  return (
    <section
      id={node.id}
      style={style}
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
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1">{title}</h3>
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
