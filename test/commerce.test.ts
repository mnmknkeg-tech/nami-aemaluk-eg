/**
 * قواعد العرض في الماركت: القرار بييجي من التاجر الأول، وبعدين من المنتج،
 * والقسم آخر حاجة (fallback).
 */
import { readShopCommerce, resolveCommerce, indexShopsById } from '@marketplace-lib/commerce';

const shop = (commerce: unknown) => ({ layoutConfig: { commerce } }) as any;
const priced = (price?: number) => ({ price }) as any;

describe('readShopCommerce', () => {
  it('يتعامل مع متجر من غير أي إعدادات', () => {
    expect(readShopCommerce(null)).toEqual({});
    expect(readShopCommerce(undefined)).toEqual({});
    expect(readShopCommerce({} as any)).toEqual({});
    expect(readShopCommerce({ layoutConfig: null } as any)).toEqual({});
  });

  it('يتجاهل القيم المش معروفة بدل ما يكسر', () => {
    const cfg = readShopCommerce(
      shop({ pricing: 'free', ordering: 'crypto', bookingWindowHours: 999, queueEnabled: 'yes' })
    );
    expect(cfg).toEqual({});
  });

  it('يقرأ القيم الصح', () => {
    const cfg = readShopCommerce(
      shop({
        pricing: 'hidden',
        ordering: 'booking24h',
        bookingWindowHours: 48,
        queueEnabled: false,
      })
    );
    expect(cfg).toEqual({
      pricing: 'hidden',
      ordering: 'booking24h',
      bookingWindowHours: 48,
      queueEnabled: false,
    });
  });
});

describe('resolveCommerce', () => {
  it('افتراضي: منتج بسعر في قسم منتجات = سعر + سلة (زي ما كان)', () => {
    const d = resolveCommerce({ product: priced(250), activity: { mode: 'products' } });
    expect(d.showPrice).toBe(true);
    expect(d.showAddToCart).toBe(true);
    expect(d.ctaKind).toBe('cart');
    expect(d.booking).toBe('none');
  });

  it('التاجر شال السعر وحط حجز 24 ساعة', () => {
    const d = resolveCommerce({
      product: priced(0),
      shop: shop({ pricing: 'hidden', ordering: 'booking24h' }),
      activity: { mode: 'products' },
    });
    expect(d.showPrice).toBe(false);
    expect(d.showAddToCart).toBe(false);
    expect(d.ctaKind).toBe('booking');
    expect(d.booking).toBe('24h');
    expect(d.bookingWindowHours).toBe(24);
    expect(d.ctaLabel).toBe('احجز 24 ساعة');
  });

  it('قرار التاجر يغلب وضع القسم (قسم منتجات بس التاجر خلّى السعر مخفي)', () => {
    const d = resolveCommerce({
      product: priced(900),
      shop: shop({ pricing: 'hidden' }),
      activity: { mode: 'products' },
    });
    expect(d.showPrice).toBe(false); // السعر موجود على المنتج بس التاجر قفله
    expect(d.bookingWindowHours).toBe(24);
  });

  it('العيادة: حجز حقيقي + طابور', () => {
    const d = resolveCommerce({
      product: priced(300),
      shop: shop({ ordering: 'appointment' }),
      activity: { mode: 'booking' },
    });
    expect(d.booking).toBe('appointment');
    expect(d.queueEnabled).toBe(true);
    expect(d.showAddToCart).toBe(false);
    expect(d.ctaLabel).toBe('احجز موعد');
  });

  it('مفيش سعر على المنتج من غير قرار تاجر = "السعر عند الطلب"', () => {
    const d = resolveCommerce({ product: priced(undefined), activity: { mode: 'products' } });
    expect(d.showPrice).toBe(false);
  });

  it('قسم الإعلانات = تواصل بس', () => {
    const d = resolveCommerce({ product: priced(100), activity: { mode: 'classifieds' } });
    expect(d.ctaKind).toBe('contact');
    expect(d.showAddToCart).toBe(false);
  });
});

describe('indexShopsById', () => {
  it('يبني خريطة من المتاجر وبيتجاهل اللي من غير id', () => {
    const map = indexShopsById([{ id: 'a' } as any, {} as any, { id: 'b' } as any]);
    expect(map.size).toBe(2);
    expect(map.get('a')).toEqual({ id: 'a' });
  });

  it('بيتعامل مع قائمة فاضية', () => {
    expect(indexShopsById([] as any).size).toBe(0);
  });
});
