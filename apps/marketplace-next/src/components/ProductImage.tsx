'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { PRODUCT_IMAGE_FALLBACK } from '@/lib/product-image';
import { cn } from '@/lib/utils';

/**
 * next/image wrapper that never renders a broken image.
 *
 * Product photos come from merchant uploads, so a 404/blocked host used to
 * leave the browser's broken-image glyph + alt text inside the card. When the
 * remote file fails we swap to the bundled placeholder and label it, so the
 * card keeps its layout and stays readable.
 */
export function ProductImage({
  src,
  alt,
  sizes = '(max-width: 768px) 50vw, 25vw',
  priority = false,
  className,
  showFallbackLabel = true,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  showFallbackLabel?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = failed || !src ? PRODUCT_IMAGE_FALLBACK : src;

  return (
    <>
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
        className={cn(failed ? 'object-contain p-6 opacity-70' : 'object-cover', className)}
      />
      {failed && showFallbackLabel && (
        <span className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400">
          <ImageOff className="w-3.5 h-3.5" />
          لا توجد صورة
        </span>
      )}
    </>
  );
}
