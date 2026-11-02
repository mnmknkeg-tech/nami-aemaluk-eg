'use client';

import { useEffect, useState } from 'react';
import { getShops, type Shop } from './services';
import { indexShopsById } from './commerce';

// خريطة المتاجر (id -> shop) عشان كل بطاقة منتج تعرف قرار تاجرها.
// الـ API client فيه cache 30 ثانية + dedup، فمئات البطاقات بتطلب نفس الاستجابة مرة واحدة.
let shopsIndexCache: Map<string, Shop> | null = null;

/** فهرس كل المتاجر متاح (بيتحمّل مرة واحدة للتطبيق). */
export function useShopsIndex(): Map<string, Shop> {
  const [index, setIndex] = useState<Map<string, Shop>>(() => shopsIndexCache ?? new Map());

  useEffect(() => {
    if (shopsIndexCache) {
      setIndex(shopsIndexCache);
      return;
    }
    let alive = true;
    getShops(300)
      .then((shops) => {
        const map = indexShopsById(shops);
        shopsIndexCache = map;
        if (alive) setIndex(map);
      })
      .catch(() => {
        /* لو الفشل بنرجع فارغ — البطاقة هتستخدم افتراضي القسم */
      });
    return () => {
      alive = false;
    };
  }, []);

  return index;
}

/**
 * بيانات المتجر لمنتج معيّن — أساساً عشان نقرأ layoutConfig.commerce (اختيار التاجر).
 * لو الـ shop اتمرّر للبطاقة مباشرة بياخد الأفضلية (صفحة القسم بتحمّلها بنفسها).
 */
export function useShopCommerce(
  shopId?: string,
  explicitShop?: Pick<Shop, 'layoutConfig'> | null
): Pick<Shop, 'layoutConfig'> | null {
  const index = useShopsIndex();
  if (explicitShop) return explicitShop;
  if (!shopId) return null;
  return index.get(shopId) ?? null;
}
