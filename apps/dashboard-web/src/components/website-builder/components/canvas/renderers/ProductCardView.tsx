import React, { useState } from 'react';
import { ShoppingBag, ShoppingCart, Zap, Sparkles, Tag, CheckCircle, Plus } from 'lucide-react';
import type { DesignTokens } from '../../../types/builder';
import { normalizeThemeTokens } from '../../../data/defaultTheme';
import {
  type ProductCardOptions,
  type NormalizedSize,
  normalizeProductSizes,
} from '@ray-eg/shared/builder';

/** البيانات المطلوبة لعرض بطاقة منتج واحدة. */
export interface ProductCardData {
  id?: string | number;
  title?: string;
  price?: number | string;
  image?: string;
  hoverImage?: string;
  badge?: string;
  specs?: string[];
  description?: string;
  sizes?: any[];
  stock?: number;
  hideBuyBtn?: boolean;
}

export interface ProductCardViewProps {
  item: ProductCardData;
  index: number;
  options: ProductCardOptions;
  theme: DesignTokens;
  isInteractivePreview: boolean;
  addToCart: (item: any) => void;
  onDetails?: (e: React.MouseEvent) => void;
  onBuy?: (e: React.MouseEvent) => void;
  /** وضع مضغوط للموبايل — صورة أصغر وأزرار مدمجة. */
  compact?: boolean;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag,
  ShoppingCart,
  Zap,
  Sparkles,
  Tag,
  CheckCircle,
  Plus,
};

const BuyIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const Icon = ICONS[name] || ShoppingBag;
  return <Icon className={className} />;
};

/** يحسب السعر الخام والمنسق لعرض/الإضافة للسلة. */
export function parseCardPrice(price: number | string | undefined, fallback = 100) {
  const raw =
    typeof price === 'number'
      ? price
      : parseInt(String(price ?? '').replace(/[^0-9]/g, '')) || fallback;
  const formatted =
    typeof price === 'string' && price.trim() ? price : `${raw.toLocaleString()} ج.م`;
  return { raw, formatted };
}

/** شارة المخزون — متوفر/نفد المخزون. */
const StockBadge: React.FC<{ stock?: number; compact?: boolean }> = ({ stock, compact }) => {
  if (stock === undefined || stock === null || Number.isNaN(Number(stock))) return null;
  const inStock = Number(stock) > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full px-2 py-0.5 ${
        compact ? 'text-[9px]' : 'text-[10px]'
      } ${
        inStock
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-600 border border-red-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {inStock ? `متوفر (${stock})` : 'نفد المخزون'}
    </span>
  );
};

/** شرائح المقاسات — من بيانات المنتج تلقائياً أو من احتياطي القسم. */
export const SizeChips: React.FC<{
  productSizes: NormalizedSize[];
  fallbackSizes: NormalizedSize[];
  compact?: boolean;
}> = ({ productSizes, fallbackSizes, compact }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const sizes = productSizes.length > 0 ? productSizes : fallbackSizes;
  if (sizes.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? 'py-1' : 'py-1.5'}`}>
      {sizes.map((s, i) => {
        const isActive = selected === s.label;
        return (
          <button
            key={`${s.label}_${i}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(isActive ? null : s.label);
            }}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              isActive
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
            title={s.price ? `+${s.price}` : s.label}
          >
            {s.label}
            {s.price && <span className="mr-0.5 opacity-70">+{s.price}</span>}
          </button>
        );
      })}
    </div>
  );
};
/** زر الشراء — كامل / أيقونة فقط / مخفي. */
export const BuyButton: React.FC<{
  options: ProductCardOptions;
  theme: DesignTokens;
  onBuy: (e: React.MouseEvent) => void;
  compact?: boolean;
}> = ({ options, theme, onBuy, compact }) => {
  const safeTheme = normalizeThemeTokens(theme);
  if (!options.showBuyButton || options.buyButtonMode === 'hidden') return null;
  if (options.buyButtonMode === 'icon') {
    return (
      <button
        type="button"
        onClick={onBuy}
        title={options.buyButtonText}
        aria-label={options.buyButtonText}
        className={`shrink-0 inline-flex items-center justify-center rounded-full text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all ${compact ? 'w-9 h-9' : 'w-10 h-10'}`}
        style={{ background: safeTheme.colors.primary }}
      >
        <BuyIcon name={options.buyButtonIcon} className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onBuy}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl text-white font-bold shadow hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition-all ${compact ? 'text-[11px] py-2 px-2' : 'text-xs py-2.5 px-3'}`}
      style={{ background: safeTheme.colors.primary }}
    >
      <BuyIcon name={options.buyButtonIcon} className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span className="truncate">{options.buyButtonText}</span>
    </button>
  );
};

/** بطاقة منتج واحدة — ٥ أشكال + كل مفاتيح التحكم. */
export const ProductCardView: React.FC<ProductCardViewProps> = ({
  item,
  index,
  options,
  theme,
  isInteractivePreview,
  addToCart,
  onDetails,
  onBuy,
  compact,
}) => {
  const safeTheme = normalizeThemeTokens(theme);
  const isCompact = compact || options.shape === 'compact';
  const { formatted } = parseCardPrice(item.price);
  const productSizes = normalizeProductSizes((item as any).sizes);
  const title = item.title || `منتج ${index + 1}`;
  const img =
    item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
  const badge = item.badge || (options.badgeText as string);
  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBuy) {
      onBuy(e);
      return;
    }
    const { raw } = parseCardPrice(item.price);
    addToCart({ id: item.id ?? index, title, price: raw, image: img });
  };
  const handleDetails = (e: React.MouseEvent) => {
    if (!isInteractivePreview) e.stopPropagation();
    if (onDetails) onDetails(e);
  };
  const cardBase: React.CSSProperties = {
    background: safeTheme.colors.surface,
    borderColor: safeTheme.colors.border,
    borderRadius: safeTheme.radius.lg,
    fontFamily: safeTheme.typography.fontBody,
  };
  const imgRatio = isCompact ? 'aspect-[4/3]' : 'aspect-square';
  const cardPadding = isCompact ? 'p-2' : 'p-3';
  const titleFontSize = isCompact ? 'text-[11px]' : 'text-[13px]';
  const titleStyle: React.CSSProperties = {
    color: safeTheme.colors.textPrimary,
    fontFamily: safeTheme.typography.fontHeading,
  };
  const mutedStyle: React.CSSProperties = { color: safeTheme.colors.textMuted };
  const priceStyle: React.CSSProperties = {
    color: safeTheme.colors.primary,
    fontFamily: safeTheme.typography.fontHeading,
  };
  const badgeEl =
    options.showBadge && badge ? (
      <span
        className="absolute top-2 right-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow"
        style={{ background: safeTheme.colors.accent }}
      >
        {badge}
      </span>
    ) : null;
  const stockEl = options.showStock ? <StockBadge stock={item.stock} compact={isCompact} /> : null;
  const sizesEl = options.showSizes ? (
    <SizeChips
      productSizes={productSizes}
      fallbackSizes={options.defaultSizes}
      compact={isCompact}
    />
  ) : null;
  const priceRow = options.showPrice ? (
    <div className="flex items-center justify-between gap-2">
      <span className="font-extrabold text-sm" style={priceStyle}>
        {formatted}
      </span>
      {stockEl}
    </div>
  ) : stockEl ? (
    <div className="flex justify-start">{stockEl}</div>
  ) : null;

  const specsEl =
    options.showSpecs && item.specs && item.specs.length > 0 ? (
      <ul className="space-y-0.5">
        {item.specs.slice(0, 3).map((s, i) => (
          <li key={i} className="text-[11px] flex items-center gap-1" style={mutedStyle}>
            <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
            <span className="truncate">{s}</span>
          </li>
        ))}
      </ul>
    ) : null;
  const descEl =
    options.showDescription && item.description ? (
      <p className="text-[11px] leading-relaxed line-clamp-2" style={mutedStyle}>
        {item.description}
      </p>
    ) : null;
  const actionsEl =
    options.showBuyButton || options.showCtaButton ? (
      <div className="flex items-center gap-1.5 pt-1">
        <BuyButton options={options} theme={theme} onBuy={handleBuy} compact={isCompact} />
        {options.showCtaButton && (
          <button
            type="button"
            onClick={handleDetails}
            className={`flex-1 inline-flex items-center justify-center gap-1 rounded-xl font-bold border transition-all hover:shadow ${isCompact ? 'text-[11px] py-2 px-2' : 'text-xs py-2.5 px-3'}`}
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
              background: 'transparent',
            }}
          >
            {options.ctaText}
          </button>
        )}
      </div>
    ) : null;
  if (options.shape === 'overlay') {
    return (
      <div
        className="relative overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
        style={{ ...cardBase, borderWidth: 1 }}
        onClick={handleDetails}
      >
        <div className={`relative ${imgRatio} overflow-hidden`}>
          <img
            src={img}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          {badgeEl}
        </div>
        <div className={`absolute bottom-0 inset-x-0 ${isCompact ? 'pb-2 px-2' : 'p-3'} space-y-1`}>
          <h4
            className={`font-bold ${titleFontSize} text-white leading-snug line-clamp-2`}
            style={{ fontFamily: theme.typography.fontHeading }}
          >
            {title}
          </h4>
          {options.showPrice && (
            <div className={`font-extrabold ${isCompact ? 'text-xs' : 'text-sm'} text-white`}>
              {formatted}
            </div>
          )}
          {options.showSizes && (
            <div className="[&_button]:!bg-white/15 [&_button]:!text-white [&_button]:!border-white/30">
              {sizesEl}
            </div>
          )}
          {actionsEl && (
            <div className="[&_button:last-child]:!text-white [&_button:last-child]:!border-white/40">
              {actionsEl}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (options.shape === 'horizontal') {
    return (
      <div
        className={`flex gap-3 ${isCompact ? 'p-2' : 'p-3'} border shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden`}
        style={{ ...cardBase, borderWidth: 1 }}
        onClick={handleDetails}
      >
        <div
          className={`relative ${isCompact ? 'w-16 sm:w-20' : 'w-24 sm:w-28'} shrink-0 rounded-lg overflow-hidden aspect-square group`}
        >
          <img
            src={img}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          {options.showBadge && badge && (
            <span
              className="absolute top-1 right-1 text-[9px] font-bold px-1.5 py-px rounded-full text-white"
              style={{ background: theme.colors.accent }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className={`font-bold ${titleFontSize} leading-snug line-clamp-2`} style={titleStyle}>
            {title}
          </h4>
          {priceRow}
          {sizesEl}
          {specsEl}
          {actionsEl}
        </div>
      </div>
    );
  }
  if (options.shape === 'compact') {
    return (
      <div
        className={`border shadow-sm hover:shadow-md transition-all cursor-pointer space-y-1`}
        style={{ ...cardBase, borderWidth: 1 }}
        onClick={handleDetails}
      >
        <div className={`relative rounded-md overflow-hidden ${imgRatio} group`}>
          <img
            src={img}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
          {badgeEl}
        </div>
        <h4
          className={`font-bold ${titleFontSize} leading-snug line-clamp-2 min-h-[28px]`}
          style={titleStyle}
        >
          {title}
        </h4>
        {priceRow}
        {sizesEl}
        {actionsEl}
      </div>
    );
  }
  if (options.shape === 'minimal') {
    return (
      <div className="group cursor-pointer space-y-2" onClick={handleDetails}>
        <div
          className={`relative overflow-hidden ${imgRatio}`}
          style={{ borderRadius: theme.radius.md, background: theme.colors.background }}
        >
          <img
            src={img}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {badgeEl}
        </div>
        <div className="space-y-1 px-0.5">
          <h4 className={`font-bold ${titleFontSize} line-clamp-1`} style={titleStyle}>
            {title}
          </h4>
          {priceRow}
          {sizesEl}
          {specsEl}
          {descEl}
          {actionsEl}
        </div>
      </div>
    );
  }
  return (
    <div
      className={`overflow-hidden border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col ${cardPadding}`}
      style={{ ...cardBase, borderWidth: 1 }}
      onClick={handleDetails}
    >
      <div
        className={`relative ${imgRatio} overflow-hidden group`}
        style={{ background: theme.colors.background }}
      >
        <img
          src={img}
          alt={title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {badgeEl}
      </div>
      <div className="p-3 space-y-1.5 flex-1 flex flex-col">
        <h4
          className={`font-bold ${titleFontSize} leading-snug line-clamp-2 min-h-[36px]`}
          style={titleStyle}
        >
          {title}
        </h4>
        {priceRow}
        {sizesEl}
        {specsEl}
        {descEl}
        <div className="flex-1" />
        {actionsEl}
      </div>
    </div>
  );
};

export default ProductCardView;
