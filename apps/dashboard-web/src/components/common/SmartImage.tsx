'use client';

import React, { useState } from 'react';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { normalizeImageUrl } from '@ray-eg/shared/utils/image-url';

interface SmartImageProps {
  src?: string | null;
  alt?: string;
  variant?: 'thumb' | 'md' | 'opt';
  placeholder?: 'blur' | 'solid' | 'none';
  fallbackSrc?: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export default function SmartImage({
  src,
  alt = '',
  variant = 'opt',
  placeholder = 'blur',
  fallbackSrc = '/placeholder.jpg',
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  style,
  onClick,
}: SmartImageProps) {
  const normalizedSrc = normalizeImageUrl(src);
  const normalizedFallback = normalizeImageUrl(fallbackSrc) || '/placeholder.jpg';
  const optimizedSrc = normalizedSrc
    ? getOptimizedImageUrl(normalizedSrc, variant)
    : normalizedFallback;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const finalSrc = normalizedSrc && failedSrc === normalizedSrc ? normalizedFallback : optimizedSrc;
  const isLoaded = loadedSrc === finalSrc;

  const placeholderStyle: React.CSSProperties = {
    backgroundColor: placeholder === 'solid' ? '#f1f5f9' : 'transparent',
    backgroundImage:
      placeholder === 'blur'
        ? 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)'
        : 'none',
    backgroundSize: '200% 100%',
    animation: placeholder === 'blur' ? 'shimmer 1.5s infinite' : 'none',
  };

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
      <img
        src={finalSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        style={{ ...placeholderStyle, ...style }}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        sizes={sizes}
        onLoad={() => setLoadedSrc(finalSrc)}
        onError={() => {
          setLoadedSrc(normalizedFallback);
          if (normalizedSrc && finalSrc !== normalizedFallback) setFailedSrc(normalizedSrc);
        }}
        onClick={onClick}
      />
    </>
  );
}
