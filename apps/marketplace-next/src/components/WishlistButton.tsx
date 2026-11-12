'use client';

import { Heart } from 'lucide-react';
import { useWishlist } from '@/lib/wishlist';
import type { Product } from '@/lib/services';

export function WishlistButton({ product, size = 'md' }: { product: Product; size?: 'sm' | 'md' }) {
  const { has, toggle } = useWishlist();
  const isWishlisted = has(product.id);
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
      className={`p-2 rounded-lg transition-all ${
        isWishlisted
          ? 'bg-red-500/10 text-red-500'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500'
      }`}
      aria-label={isWishlisted ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
    >
      <Heart className={`${iconSize} ${isWishlisted ? 'fill-current' : ''}`} />
    </button>
  );
}
