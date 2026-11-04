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

const siteShop = { id: 'shop-1', name: 'Shop', slug: 'shop' };
const siteProduct = {
  id: 'product-1',
  title: 'Product',
  price: 10,
  shopId: 'shop-1',
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
      isValidSiteCartEntry({ product: siteProduct, quantity: 1, shop: siteShop }, 'shop-1')
    ).toBe(true);
    expect(
      isValidSiteCartEntry(
        { product: { ...siteProduct, isAvailable: false }, quantity: 1, shop: siteShop },
        'shop-1'
      )
    ).toBe(false);
    expect(
      isValidSiteCartEntry(
        { product: { ...siteProduct, shopId: 'shop-2' }, quantity: 1, shop: siteShop },
        'shop-1'
      )
    ).toBe(false);
  });

  it('recovers valid entries from corrupted site storage without throwing', () => {
    const valid = { product: siteProduct, quantity: 1, shop: siteShop };
    expect(loadSiteCart(JSON.stringify([valid, { broken: true }]), 'shop-1')).toEqual([valid]);
    expect(loadSiteCart('{not-json', 'shop-1')).toEqual([]);
  });
});
