import React, { useState } from 'react';
import { BasicElementsRendererProps } from './BasicElementsRenderer';
import { resolveProductCardOptions, productGridClass } from '@ray-eg/shared/builder';
import { ProductCardView } from './ProductCardView';
import {
  Sparkles,
  ShieldCheck,
  Truck,
  CreditCard,
  MessageCircle,
  Star,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Package,
  Store,
  User,
  Zap,
  CheckCircle,
} from 'lucide-react';

/** Renders 'card' and 'grid' node types */
export const CardGridRenderer: React.FC<BasicElementsRendererProps> = ({
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
  addToCart,
  currentViewport,
}) => {
  const [isFaqOpen, setIsFaqOpen] = useState(true);
  const isMobile = currentViewport === 'mobile';

  switch (node.type) {
    case 'card': {
      // ——— بطاقة منتج موحدة (صورة + سعر): نفس الشكل في المحرر والموقع المنشور ———
      if (node.props.image && node.props.price) {
        const cardOptions = resolveProductCardOptions(node.props as any);
        return (
          <div
            id={node.id}
            style={getComputedStyles()}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`cursor-pointer transition-all ${outlineClass}`}
          >
            <ProductCardView
              item={node.props as any}
              index={0}
              options={cardOptions}
              theme={website.theme}
              isInteractivePreview={isInteractivePreview}
              compact={isMobile || cardOptions.shape === 'compact'}
              addToCart={(item) =>
                addToCart({ priceFormatted: undefined, ...item, badge: node.props.badge })
              }
              onDetails={(e) => {
                if (isInteractivePreview) {
                  handleInteraction(e, node.props.targetUrl || '/contact', node.props.targetPageId || 'page_contact', cardOptions.ctaText);
                }
              }}
            />
            {renderChildren()}
          </div>
        );
      }
      if (node.props.icon ||
        node.props.specs ||
        node.props.quote ||
        node.props.question ||
        node.props.features
      ) {
        return (
          <div
            id={node.id}
            style={getComputedStyles()}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`cursor-pointer transition-all flex flex-col justify-between ${outlineClass}`}
          >
            {/* BENTO FEATURE CARD */}
            {node.props.icon && (
              <div className="space-y-3">
                <div
                  style={{
                    backgroundColor: `${website.theme.colors.primary}18`,
                    color: website.theme.colors.primary,
                    borderRadius: website.theme.radius?.md || '10px',
                  }}
                  className="w-12 h-12 flex items-center justify-center"
                >
                  {node.props.icon === 'ShieldCheck' && <ShieldCheck className="w-6 h-6" />}
                  {node.props.icon === 'Truck' && <Truck className="w-6 h-6" />}
                  {node.props.icon === 'CreditCard' && <CreditCard className="w-6 h-6" />}
                  {node.props.icon === 'Sparkles' && <Sparkles className="w-6 h-6" />}
                  {node.props.icon === 'Package' && <Package className="w-6 h-6" />}
                  {node.props.icon === 'Zap' && <Zap className="w-6 h-6" />}
                  {node.props.icon === 'Star' && <Star className="w-6 h-6" />}
                  {node.props.icon === 'Phone' && <Phone className="w-6 h-6" />}
                  {node.props.icon === 'Mail' && <Mail className="w-6 h-6" />}
                  {node.props.icon === 'MapPin' && <MapPin className="w-6 h-6" />}
                  {node.props.icon === 'Store' && <Store className="w-6 h-6" />}
                  {!['ShieldCheck', 'Truck', 'CreditCard', 'Sparkles', 'Package', 'Zap', 'Star', 'Phone', 'Mail', 'MapPin', 'Store'].includes(node.props.icon) && (
                    <Sparkles className="w-6 h-6" />
                  )}
                </div>
                {node.props.title && (
                  <h3 className="text-lg font-bold text-slate-900">{node.props.title}</h3>
                )}
                {node.props.description && (
                  <p className="text-sm text-slate-600 leading-relaxed">{node.props.description}</p>
                )}
                {node.props.tag && (
                  <span
                    style={{ color: website.theme.colors.primary }}
                    className="inline-block text-[11px] font-semibold"
                  >
                    {node.props.tag} &larr;
                  </span>
                )}
              </div>
            )}

            {/* SPECS LIST */}
            {node.props.specs && (
              <div className="space-y-1 py-2 border-t border-slate-100 text-xs text-slate-600">
                {node.props.specs.map((s: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {/* PRICING / FEATURES TIER */}
            {node.props.features && (
              <div className="space-y-4">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: website.theme.colors.primary,
                      borderRadius: website.theme.radius?.full || '9999px',
                    }}
                    className="inline-block text-[11px] font-bold text-white px-2.5 py-0.5"
                  >
                    {node.props.badge}
                  </span>
                )}
                {node.props.title && <h3 className="text-lg font-bold">{node.props.title}</h3>}
                {node.props.price && (
                  <div
                    style={{ color: website.theme.colors.primary }}
                    className="text-2xl font-extrabold font-mono"
                  >
                    {node.props.price}
                  </div>
                )}
                <div className="space-y-2 py-3 border-t border-slate-200/30 text-xs">
                  {node.props.features.map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {node.props.question && (
              <div
                onClick={(e) => {
                  if (isInteractivePreview) {
                    e.stopPropagation();
                    setIsFaqOpen(!isFaqOpen);
                  }
                }}
                className="space-y-2 select-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{node.props.question}</h4>
                  {isInteractivePreview && (
                    <span className="text-slate-400 p-1">
                      {isFaqOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  )}
                </div>
                {(!isInteractivePreview || isFaqOpen) && (
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    {node.props.answer}
                  </p>
                )}
              </div>
            )}

            {renderChildren()}
          </div>
        );
      }

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

    case 'grid': {
      const itemsList = node.props.items || [];
      const gridOptions = resolveProductCardOptions(node.props as any);
      const primaryColor = website.theme?.colors?.primary || '#2563eb';

      return (
        <section
          id={node.id}
          style={getComputedStyles()}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`cursor-pointer transition-all ${outlineClass}`}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-16">
                {node.props.badge && (
                  <span
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor,
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

            {itemsList.length > 0 && (
              <div className={`${productGridClass(gridOptions)} gap-3`}>
                {itemsList.map((item: any, idx: number) => (
                  <ProductCardView
                    key={item.id || idx}
                    item={item}
                    index={idx}
                    options={gridOptions}
                    theme={website.theme}
                    isInteractivePreview={isInteractivePreview}
                    compact={isMobile || gridOptions.shape === 'compact'}
                    addToCart={(cartItem) =>
                      addToCart({ priceFormatted: undefined, ...cartItem, badge: item.badge })
                    }
                    onDetails={(e) => {
                      if (isInteractivePreview) {
                        handleInteraction(e, item.targetUrl || '/contact', 'page_contact', gridOptions.ctaText);
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {renderChildren()}
          </div>
        </section>
      );
    }

    default:
      return null;
  }
};
