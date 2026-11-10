'use client';

import Image from 'next/image';
import { useState } from 'react';

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
  const [failed, setFailed] = useState(false);
  const candidate = typeof src === 'string' ? src.trim() : '';
  const fallbackSrc = '/placeholder.jpg';
  const imageSrc = !candidate || failed ? fallbackSrc : candidate;

  return (
    <Image
      src={imageSrc}
      alt={alt}
      {...(fill ? { fill: true } : { width, height })}
      priority={priority}
      sizes={sizes}
      className={className}
      unoptimized
      onError={() => {
        if (imageSrc !== fallbackSrc) setFailed(true);
      }}
    />
  );
}
