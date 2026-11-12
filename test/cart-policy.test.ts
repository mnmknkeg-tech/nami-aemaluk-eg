import { isCartVisible, resolveCartIconType } from '../packages/shared/src/builder/cartPolicy';
import type { WebsiteCartSettings } from '../packages/shared/src/builder/types';

const enabledOrdersCart: WebsiteCartSettings = {
  enabled: true,
  businessType: 'orders',
  showCartIcon: true,
  position: 'both',
  iconType: 'ShoppingBag',
};

describe('shared website cart policy', () => {
  it.each([
    ['header', 'header', true],
    ['header', 'floating', false],
    ['floating', 'header', false],
    ['floating', 'floating', true],
    ['both', 'header', true],
    ['both', 'floating', true],
    [undefined, 'header', true],
    [undefined, 'floating', true],
  ] as const)(
    'applies the %s position consistently to %s placement',
    (position, placement, expected) => {
      expect(
        isCartVisible({
          settings: { ...enabledOrdersCart, position },
          placement,
        })
      ).toBe(expected);
    }
  );

  it.each([
    [{ ...enabledOrdersCart, enabled: false }, 'header', false],
    [{ ...enabledOrdersCart, enabled: false }, 'floating', false],
    [{ ...enabledOrdersCart, showCartIcon: false }, 'header', false],
    [{ ...enabledOrdersCart, businessType: 'bookings' }, 'header', false],
    [{ ...enabledOrdersCart, businessType: 'subscriptions' }, 'floating', false],
  ] as const)(
    'hides unsupported or globally disabled product carts',
    (settings, placement, expected) => {
      expect(isCartVisible({ settings, placement })).toBe(expected);
    }
  );

  it('treats missing fields as backward-compatible enabled orders defaults', () => {
    expect(isCartVisible({ settings: {}, placement: 'header' })).toBe(true);
    expect(isCartVisible({ settings: {}, placement: 'floating' })).toBe(true);
  });

  it('treats legacy hideCart as hide-only and supports explicit Header reset/show', () => {
    expect(
      isCartVisible({
        settings: enabledOrdersCart,
        placement: 'header',
        headerProps: { hideCart: true },
      })
    ).toBe(false);
    expect(
      isCartVisible({
        settings: enabledOrdersCart,
        placement: 'header',
        headerProps: { hideCart: false },
      })
    ).toBe(true);
    expect(
      isCartVisible({
        settings: enabledOrdersCart,
        placement: 'header',
        headerProps: { hideCart: true, cartVisibilityOverride: 'show' },
      })
    ).toBe(true);
    expect(
      isCartVisible({
        settings: enabledOrdersCart,
        placement: 'header',
        headerProps: { hideCart: true, cartVisibilityOverride: 'inherit' },
      })
    ).toBe(true);
    expect(
      isCartVisible({
        settings: enabledOrdersCart,
        placement: 'header',
        headerProps: { cartVisibilityOverride: 'hide' },
      })
    ).toBe(false);
  });

  it('keeps global disabled/hidden gates authoritative over Header overrides', () => {
    expect(
      isCartVisible({
        settings: { ...enabledOrdersCart, enabled: false },
        placement: 'header',
        headerProps: { cartVisibilityOverride: 'show' },
      })
    ).toBe(false);
    expect(
      isCartVisible({
        settings: { ...enabledOrdersCart, showCartIcon: false },
        placement: 'header',
        headerProps: { cartVisibilityOverride: 'show' },
      })
    ).toBe(false);
    expect(
      isCartVisible({
        settings: enabledOrdersCart,
        placement: 'header',
        themeHideCart: true,
        headerProps: { cartVisibilityOverride: 'show' },
      })
    ).toBe(false);
  });

  it('keeps floating mode independent of Header-only overrides', () => {
    expect(
      isCartVisible({
        settings: enabledOrdersCart,
        placement: 'floating',
        themeHideCart: true,
        headerProps: { hideCart: true, cartVisibilityOverride: 'hide' },
      })
    ).toBe(true);
  });

  it('uses the global icon first and legacy Header icons only when it is missing', () => {
    expect(resolveCartIconType('CreditCard', 'ShoppingCart')).toBe('CreditCard');
    expect(resolveCartIconType(undefined, 'ShoppingCart')).toBe('ShoppingCart');
    expect(resolveCartIconType('not-an-icon', 'Package')).toBe('Package');
    expect(resolveCartIconType(undefined, undefined)).toBe('ShoppingBag');
  });
});
