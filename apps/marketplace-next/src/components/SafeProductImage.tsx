'use client';

import Image from 'next/image';
import { useState } from 'react';
import { normalizeImageUrl } from '@ray-eg/shared/utils/image-url';

type SafeProductImageProps = {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function SafeProductImage({
  src,
  alt,
  fill = false,
  width = 640,
  height = 480,
  priority = false,
  sizes,
  className,
}: SafeProductImageProps) {
  const candidate = normalizeImageUrl(src);
  const fallbackSrc = '/placeholder.jpg';
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = !candidate || failedSrc === candidate ? fallbackSrc : candidate;

  return (
    <Image
      src={imageSrc}
      alt={alt}
      {...(fill ? { fill: true } : { width, height })}
      preload={priority}
      sizes={sizes}
      className={className}
      unoptimized
      onError={() => {
        if (candidate && imageSrc !== fallbackSrc) setFailedSrc(candidate);
      }}
    />
  );
}
