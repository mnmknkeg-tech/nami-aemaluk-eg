'use client';

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import type { Product } from '@/lib/services';
import type { CommerceDecision } from '@/lib/commerce';
import { AddToCartButton } from './AddToCartButton';
import { BookingRequestModal } from './BookingRequestModal';
import { cn } from '@/lib/utils';

/**
 * زر الإجراء على الكارت — بيتقرر بالكامل من resolveCommerce():
 *   • المتجر بيبيع بسلة   → زر "أضف للسلة" (زي ما كان)
 *   • المتجر شال السعر    → "احجز 24 ساعة" أو "احجز موعد" (حسب اختيار التاجر)
 *   • المتجر "تواصل فقط"  → مفيش زر،غير رابط المتجر
 */
export function CommerceAction({
  decision,
  product,
  shopId,
  shopName,
  variant = 'icon',
  cartSize = 'sm',
  cartColor,
  showQuantityStepper = false,
}: {
  decision: CommerceDecision;
  product: Product;
  shopId: string;
  shopName?: string;
  variant?: 'icon' | 'button';
  /** حجم زر السلة — الكارت بيستخدم الأيقونة، وصفحة المنتج الزر الكبير */
  cartSize?: 'sm' | 'md' | 'lg';
  cartColor?: string;
  showQuantityStepper?: boolean;
}) {
  const [open, setOpen] = useState(false);

  // متجر بيبيع بسلة → السلوك القديم كما هو.
  if (decision.showAddToCart) {
    return (
      <AddToCartButton
        product={product}
        variant={variant}
        size={cartSize}
        color={cartColor}
        showQuantityStepper={showQuantityStepper}
      />
    );
  }

  if (decision.ctaKind !== 'booking') return null;

  const trigger =
    variant === 'icon' ? (
      <span
        className="w-8 h-8 rounded-full bg-brand-black text-white flex items-center justify-center shadow-md hover:bg-brand-cyan transition-colors"
        aria-hidden="true"
      >
        <CalendarPlus className="w-4 h-4" />
      </span>
    ) : (
      <span
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-black text-white',
          'px-4 py-2.5 text-sm font-black hover:bg-brand-cyan transition-colors'
        )}
      >
        <CalendarPlus className="w-4 h-4" />
        {decision.ctaLabel}
      </span>
    );

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // الكارت كله link، فلازم نمنع فتح صفحة المنتج.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={decision.ctaLabel}
        title={decision.ctaLabel}
        className="pointer-events-auto"
      >
        {trigger}
      </button>

      <BookingRequestModal
        open={open}
        onClose={() => setOpen(false)}
        decision={decision}
        shopId={shopId}
        shopName={shopName}
        product={product}
      />
    </>
  );
}
