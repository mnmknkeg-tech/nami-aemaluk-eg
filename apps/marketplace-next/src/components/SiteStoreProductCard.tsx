'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Check, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useSiteCart } from '@/lib/site-cart';

export function SiteStoreProductCard({
  product,
  siteSlug,
  shop,
}: {
  product: any;
  siteSlug: string;
  shop: any;
}) {
  const { addItem } = useSiteCart();
  const [added, setAdded] = useState(false);
  const image = product.imageUrl || product.image_url || product.images?.[0];
  const price = product.price ?? product.basePrice ?? product.base_price;
  const unavailable =
    product.isAvailable === false || product.isActive === false || product.is_active === false;

  const handleAdd = () => {
    if (unavailable) return;
    addItem(product, shop);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[inherit] bg-white">
      <Link
        href={`/site/${siteSlug}/product/${product.id}`}
        className="block overflow-hidden bg-slate-100"
      >
        {image ? (
          <Image
            src={image}
            alt={product.name || 'منتج'}
            width={640}
            height={480}
            className="aspect-[4/3] w-full object-cover transition duration-300 hover:scale-105"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center text-sm font-bold text-slate-400">
            لا توجد صورة
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4 text-right">
        <div>
          <Link
            href={`/site/${siteSlug}/product/${product.id}`}
            className="line-clamp-2 text-base font-black text-slate-900 hover:underline"
          >
            {product.name}
          </Link>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
              {product.description}
            </p>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-lg font-black text-slate-900">
            {price != null ? `${price} ج.م` : 'اطلب السعر'}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={unavailable}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-400"
            style={unavailable ? undefined : { backgroundColor: 'var(--site-primary, #2563eb)' }}
          >
            {unavailable ? null : added ? (
              <Check className="h-4 w-4" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            {unavailable ? 'غير متوفر' : added ? 'تمت الإضافة' : 'أضف للسلة'}
          </button>
        </div>
      </div>
    </article>
  );
}
