import React from 'react';
import { CheckCircle, ShoppingBag, ShoppingCart, Zap, Sparkles, Tag } from 'lucide-react';
import { resolveProductCardOptions, normalizeProductSizes, parsePriceValue, resolveCardDisplay } from './productCard';

const BUY_ICONS: Record<string, any> = { ShoppingBag, ShoppingCart, Zap, Sparkles, Tag };

const BuyIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const Icon = BUY_ICONS[name] || ShoppingBag;
  return <Icon className={className} />;
};

export const StockBadge: React.FC<{ stock?: number }> = ({ stock }) => {
  if (stock === undefined) return null;
  if (stock <= 0)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">نفد المخزون</span>;
  if (stock <= 5)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">باقي {stock} فقط</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">متوفر</span>;
};

export const SizeChips: React.FC<{ sizes: Array<{ label: string; price?: string }> }> = ({ sizes }) => {
  if (!sizes.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {sizes.map((s, i) => (
        <span key={i} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
          {s.label}{s.price ? <span className="text-slate-400"> +{s.price}</span> : null}
        </span>
      ))}
    </div>
  );
};

export interface PublishedCardCtx {
  theme: { colors: { primary: string; accent: string } };
  realProducts: Array<Record<string, any>>;
  waLink: (text: string) => string | null;
  onAddToCart?: (product: any) => void;
}

export const CardActions: React.FC<{
  options: ReturnType<typeof resolveProductCardOptions>;
  theme: PublishedCardCtx['theme'];
  prod: any; title: string; formatted: string; ctx: PublishedCardCtx;
}> = ({ options, theme, prod, title, formatted, ctx }) => {
  if (!options.showBuyButton && !options.showCtaButton) return null;
  const iconOnly = options.buyButtonMode === 'icon';
  const buyCls = iconOnly
    ? 'w-9 h-9 rounded-full text-white font-bold text-xs shadow-xs hover:opacity-95 flex items-center justify-center gap-1.5 active:scale-95'
    : 'py-2.5 px-3 rounded-xl text-white font-bold text-xs shadow-xs hover:opacity-95 flex items-center justify-center gap-1.5 active:scale-95';
  return (
    <div className={`grid gap-2 pt-2 ${options.showBuyButton && options.showCtaButton && !prod.hideBuyBtn ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {options.showBuyButton && !prod.hideBuyBtn && (
        ctx.onAddToCart ? (
          <button type="button" onClick={() => ctx.onAddToCart?.(prod)} style={{ backgroundColor: theme.colors.primary }}
            title={options.buyButtonText} aria-label={options.buyButtonText} className={buyCls}>
            <BuyIcon name={options.buyButtonIcon} className="w-3.5 h-3.5" />
            {options.buyButtonMode === 'full' && <span>{options.buyButtonText}</span>}
          </button>
        ) : (
          <a href={ctx.waLink(`مرحبًا، أريد طلب: ${title}${formatted ? ` (${formatted})` : ''}`) || '#'} target="_blank" rel="noopener noreferrer"
            style={{ backgroundColor: theme.colors.primary }} title={options.buyButtonText} aria-label={options.buyButtonText} className={buyCls}>
            <BuyIcon name={options.buyButtonIcon} className="w-3.5 h-3.5" />
            {options.buyButtonMode === 'full' && <span>{options.buyButtonText}</span>}
          </a>
        )
      )}
      {options.showCtaButton && (
        <a href={ctx.waLink(`مرحبًا، أريد تفاصيل عن: ${title}`) || '#'} target="_blank" rel="noopener noreferrer"
          className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all text-center active:scale-98">
          {options.ctaText}
        </a>
      )}
    </div>
  );
};



export const PublishedProductCard: React.FC<{
  item: any; index: number; sectionProps: Record<string, any>; ctx: PublishedCardCtx;
}> = ({ item, index, sectionProps, ctx }) => {
  const { theme } = ctx;
  const options = resolveProductCardOptions(sectionProps);
  // نفس مواصفة العرض الموحدة في المحرر (resolveCardDisplay) — فوق الكتالوج الحقيقي.
  const d = resolveCardDisplay(item, index, options, ctx.realProducts);
  const title = d.title;
  const formatted = d.formattedPrice;
  const img = d.img;
  const hoverImg = d.hoverImg;
  const badge = d.badge;
  const specs = d.specs;
  const desc = d.description;
  const stock = d.stock;
  const prod = { ...(item || {}), title, price: d.rawPrice, image: img, stock, badge };
  const productSizes = d.productSizes;
  const sizes = productSizes.length > 0 ? productSizes : options.defaultSizes;
  const titleRow = (
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">{title}</h3>
      {options.showPrice && <span style={{ color: theme.colors.primary }} className="text-sm sm:text-base font-extrabold font-mono shrink-0">{formatted}</span>}
    </div>
  );
  const imageBlock = img ? (
    <div className={`relative overflow-hidden bg-slate-100 group/prodimg ${options.shape === 'horizontal' ? 'w-28 sm:w-36 shrink-0' : 'aspect-16/10'}`}>
      <img src={img} alt={title} loading="lazy" className={`w-full h-full object-cover transition-all duration-500 ${hoverImg ? 'group-hover/prodimg:opacity-0 group-hover/prodimg:scale-105' : 'group-hover:scale-105'}`} />
      {hoverImg && <img src={hoverImg} alt={`${title} - صورة بديلة`} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover/prodimg:opacity-100 group-hover/prodimg:scale-105 transition-all duration-500 pointer-events-none" />}
    </div>
  ) : null;
  const body = (
    <>
      {options.showSpecs && specs.length > 0 && options.shape !== 'compact' && (
        <div className="space-y-1 py-1.5 border-t border-slate-100 text-xs text-slate-600">
          {specs.slice(0, 3).map((s: string, i: number) => (
            <div key={i} className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /><span className="truncate">{s}</span></div>
          ))}
        </div>
      )}
      {options.showDescription && desc && options.shape !== 'compact' && <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{desc}</p>}
      {(options.showStock || (options.showSizes && sizes.length > 0)) && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {options.showStock ? <StockBadge stock={stock} /> : <span />}
          {options.showSizes && sizes.length > 0 && options.shape === 'compact' && <span className="text-[10px] text-slate-400 font-bold">{sizes.length} مقاسات</span>}
        </div>
      )}
      {options.showSizes && sizes.length > 0 && options.shape !== 'compact' && <SizeChips sizes={sizes} />}
    </>
  );
  const actions = <CardActions options={options} theme={theme} prod={prod} title={title} formatted={formatted} ctx={ctx} />;
  const badgeEl = options.showBadge && badge
    ? <span className="absolute top-2 right-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow" style={{ background: theme.colors.accent }}>{badge}</span>
    : null;
  const wrapClass = options.shape === 'minimal'
    ? 'bg-white rounded-2xl overflow-hidden flex flex-col group border-0 shadow-none'
    : options.shape === 'overlay'
    ? 'relative rounded-2xl overflow-hidden flex flex-col justify-end group min-h-72 shadow-md border border-slate-200/60'
    : options.shape === 'horizontal'
    ? 'bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-row group'
    : options.shape === 'compact'
    ? 'bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group'
    : 'bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group';
  if (options.shape === 'overlay') {
    return (
      <div className={wrapClass}>
        {imageBlock && <div className="absolute inset-0">{imageBlock}<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" /></div>}
        <div className="relative p-4 space-y-2">
          {options.showBadge && badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow" style={{ background: theme.colors.accent }}>{badge}</span>}
          <h4 className="font-bold text-sm text-white leading-snug line-clamp-2">{title}</h4>
          {options.showPrice && <div className="font-extrabold text-sm text-white">{formatted}</div>}
          {actions}
        </div>
      </div>
    );
  }
  if (options.shape === 'horizontal') {
    return (
      <div className={wrapClass}>
        <div className="relative">{imageBlock}{badgeEl}</div>
        <div className="p-4 flex-1 flex flex-col justify-between space-y-2 min-w-0"><div className="space-y-1">{titleRow}{body}</div>{actions}</div>
      </div>
    );
  }
  return (
    <div className={wrapClass}>
      <div className="relative">{imageBlock}{badgeEl}</div>
      <div className={`${options.shape === 'compact' ? 'p-3' : 'p-4 sm:p-5'} flex-1 flex flex-col justify-between space-y-2`}>
        <div className="space-y-1.5">{titleRow}{body}</div>
        {actions}
      </div>
    </div>
  );
};
