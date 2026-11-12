import { isValidCartItem, sanitizeCartItems } from '../apps/marketplace-next/src/lib/cart';
import { isValidSiteCartEntry, loadSiteCart } from '../apps/marketplace-next/src/lib/site-cart';

const cartItem = {
  id: 'line-1',
  productId: 'product-1',
  shopId: 'shop-1',
  shopName: 'Shop',
  shopSlug: 'shop',
  name: 'Product',
  price: 10,
  image: '/product.png',
  quantity: 2,
};

const siteShop = { id: 'shop-internal-id', name: 'Shop', slug: 'shop' };
const siteProduct = {
  id: 'product-1',
  title: 'Product',
  price: 10,
  shopId: 'shop-internal-id',
};

describe('phase 5 cart integrity', () => {
  it('accepts valid marketplace cart items and removes malformed entries', () => {
    expect(isValidCartItem(cartItem)).toBe(true);
    expect(sanitizeCartItems([cartItem, { ...cartItem, quantity: 0 }, null])).toEqual([cartItem]);
  });

  it('does not restore a cart item with invalid quantity or price', () => {
    expect(isValidCartItem({ ...cartItem, quantity: 1.5 })).toBe(false);
    expect(isValidCartItem({ ...cartItem, price: Number.NaN })).toBe(false);
  });

  it('rejects unavailable and cross-merchant site products', () => {
    expect(
      isValidSiteCartEntry({ product: siteProduct, quantity: 1, shop: siteShop }, 'shop')
    ).toBe(true);
    expect(
      isValidSiteCartEntry(
        { product: siteProduct, quantity: 1, shop: siteShop },
        'shop-internal-id'
      )
    ).toBe(false);
    expect(
      isValidSiteCartEntry(
        { product: { ...siteProduct, isAvailable: false }, quantity: 1, shop: siteShop },
        'shop'
      )
    ).toBe(false);
    expect(
      isValidSiteCartEntry(
        { product: { ...siteProduct, shopId: 'shop-2' }, quantity: 1, shop: siteShop },
        'shop'
      )
    ).toBe(false);
  });

  it('recovers valid entries from corrupted site storage without throwing', () => {
    const valid = { product: siteProduct, quantity: 1, shop: siteShop };
    expect(loadSiteCart(JSON.stringify([valid, { broken: true }]), 'shop')).toEqual([valid]);
    expect(loadSiteCart('{not-json', 'shop')).toEqual([]);
  });
});
