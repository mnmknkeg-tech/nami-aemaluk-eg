import React from 'react';
import { BaseRendererProps } from './types';
import { resolveProductCardOptions, productGridClass } from '@ray-eg/shared/builder';
import { normalizeThemeTokens } from '../../../data/defaultTheme';
import { ProductCardView } from './ProductCardView';

export interface ProductsRendererProps extends BaseRendererProps {
  addToCart: (item: any) => void;
}

export const ProductsRenderer: React.FC<ProductsRendererProps> = ({
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
  const productsList = node.props.products || [];
  const options = resolveProductCardOptions(node.props as any);
  const theme = normalizeThemeTokens(website.theme);
  const isMobile = currentViewport === 'mobile';

  return (
    <section
      id={node.id}
      style={getComputedStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`cursor-pointer transition-all ${outlineClass}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        {(node.props.title || node.props.badge) && (
          <div className="text-center mb-8 sm:mb-10 space-y-2 max-w-2xl mx-auto">
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
              <h2
                className="text-2xl sm:text-3xl font-extrabold leading-tight break-words"
                style={{
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontHeading,
                }}
              >
                {node.props.title}
              </h2>
            )}
            {node.props.subtitle && (
              <p
                className="text-xs sm:text-sm leading-relaxed break-words"
                style={{ color: theme.colors.textMuted }}
              >
                {node.props.subtitle}
              </p>
            )}
          </div>
        )}

        {productsList.length > 0 && (
          <div className={`${productGridClass(options)} gap-4 sm:gap-6`}>
            {productsList.map((prod: any, idx: number) => (
              <ProductCardView
                key={prod.id || idx}
                item={prod}
                index={idx}
                options={options}
                theme={theme}
                isInteractivePreview={isInteractivePreview}
                compact={isMobile || options.shape === 'compact'}
                addToCart={(item) =>
                  addToCart({
                    id: `cart_${prod.id || idx}`,
                    priceFormatted: undefined,
                    ...item,
                    badge: prod.badge,
                  })
                }
                onDetails={(e) => {
                  if (isInteractivePreview) {
                    handleInteraction(e, '/contact', 'page_contact', options.ctaText);
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
};
