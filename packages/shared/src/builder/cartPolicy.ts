import type { CartIconType, HeaderCartVisibilityOverride, WebsiteCartSettings } from './types';

export type CartPlacementTarget = 'header' | 'floating';

export interface CartVisibilityOptions {
  settings?: WebsiteCartSettings | null;
  placement: CartPlacementTarget;
  headerProps?: Record<string, any> | null;
  /** Legacy theme-level Header hide flag. It does not affect floating placement. */
  themeHideCart?: boolean;
}

const CART_ICONS = new Set<CartIconType>([
  'ShoppingBag',
  'ShoppingCart',
  'Store',
  'Package',
  'CreditCard',
]);

function isCartIconType(value: unknown): value is CartIconType {
  return typeof value === 'string' && CART_ICONS.has(value as CartIconType);
}

/** Global selection wins; legacy node values remain a read-only fallback. */
export function resolveCartIconType(
  configuredIcon?: unknown,
  ...legacyIcons: unknown[]
): CartIconType {
  if (isCartIconType(configuredIcon)) return configuredIcon;
  const legacy = legacyIcons.find(isCartIconType);
  return legacy || 'ShoppingBag';
}

/**
 * Shared policy for generated product-cart controls. Bookings and subscriptions
 * use their own booking/subscription actions rather than the product-order cart.
 * An explicit Header override can supersede legacy Header hide flags, but it
 * cannot bypass the global enabled/show switch or an unsupported flow.
 */
export function isCartVisible({
  settings,
  placement,
  headerProps,
  themeHideCart,
}: CartVisibilityOptions): boolean {
  const cart = settings || {};
  const businessType = cart.businessType || 'orders';
  if (cart.enabled === false || businessType !== 'orders' || cart.showCartIcon === false) {
    return false;
  }

  const position = cart.position || 'both';
  const isInPosition =
    position === 'both' ||
    position === placement ||
    (position !== 'header' && position !== 'floating');
  if (!isInPosition) return false;

  if (placement === 'floating') return true;
  if (themeHideCart) return false;

  const override = headerProps?.cartVisibilityOverride as HeaderCartVisibilityOverride | undefined;
  if (override === 'hide') return false;
  if (override === 'show' || override === 'inherit') return true;

  // Legacy boolean is a hide-only override; false means inherit, not force-show.
  return headerProps?.hideCart !== true;
}
