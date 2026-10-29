import type { DesignTokens, SiteProduct } from './types';

// Mirrors the builder's defaultDesignTokens so a published site without a
// full theme still renders exactly as it looks in the editor.
export const DEFAULT_DESIGN_TOKENS: DesignTokens = {
  colors: {
    primary: '#1d4ed8',
    primaryHover: '#1e40af',
    secondary: '#0f172a',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  typography: {
    fontHeading: 'Tajawal, Cairo, sans-serif',
    fontBody: 'Cairo, Tajawal, sans-serif',
    scaleRatio: 1.25,
    baseFontSize: '16px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
    glow: '0 0 24px rgba(29, 78, 216, 0.25)',
  },
  spacingUnit: 4,
};

export function resolveTheme(theme?: Partial<DesignTokens> | null): DesignTokens {
  if (!theme || typeof theme !== 'object') return DEFAULT_DESIGN_TOKENS;
  const legacyPrimary = (theme as any).primaryColor;
  const legacySecondary = (theme as any).secondaryColor;
  const legacyAccent = (theme as any).accentColor;
  return {
    colors: {
      ...DEFAULT_DESIGN_TOKENS.colors,
      ...(legacyPrimary ? { primary: legacyPrimary } : {}),
      ...(legacySecondary ? { secondary: legacySecondary } : {}),
      ...(legacyAccent ? { accent: legacyAccent } : {}),
      ...(theme.colors || {}),
    },
    typography: { ...DEFAULT_DESIGN_TOKENS.typography, ...(theme.typography || {}) },
    radius: { ...DEFAULT_DESIGN_TOKENS.radius, ...(theme.radius || {}) },
    shadows: { ...DEFAULT_DESIGN_TOKENS.shadows, ...(theme.shadows || {}) },
    spacingUnit: theme.spacingUnit ?? DEFAULT_DESIGN_TOKENS.spacingUnit,
  };
}

/** Append an 8-digit alpha suffix to a hex color (canvas pattern: primary + '18'). */
export function withAlpha(hex: string | undefined, alpha: string): string {
  if (!hex) return alpha;
  return `${hex}${alpha}`;
}

export function formatPrice(price: number | string | undefined): string {
  if (price === undefined || price === null || price === '') return '';
  if (typeof price === 'string') return price;
  return `${price.toLocaleString('en-US')} ج.م`;
}

/** Map a real catalog product into the shape section templates expect. */
export function mapSiteProduct(p: any): SiteProduct {
  const images: string[] = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
  return {
    id: String(p?.id ?? ''),
    title: p?.title || p?.name || 'منتج',
    description: p?.description || undefined,
    price: typeof p?.price === 'number' ? p.price : Number(p?.price) || (p?.price as string),
    image: images[0] || p?.image || p?.image_url || p?.imageUrl,
    hoverImage: images[1],
    badge: p?.badge,
    specs: Array.isArray(p?.specs) ? p.specs : undefined,
    sizes: Array.isArray(p?.sizes) ? p.sizes : undefined,
    stock: typeof p?.stock === 'number' ? p.stock : Number(p?.stock) || undefined,
    slug: p?.slug,
    isActive: p?.isActive !== false && p?.is_active !== false,
    isAvailable: p?.isAvailable !== false && p?.is_available !== false,
    shopId: p?.shopId || p?.shop_id,
    shopSlug: p?.shopSlug || p?.shop_slug,
  };
}

/** Build a wa.me link from an Egyptian phone number with a prefilled text. */
export function buildWhatsAppLink(phone: string | undefined, text: string): string | null {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const intl = digits.startsWith('20') ? digits : `2${digits}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
