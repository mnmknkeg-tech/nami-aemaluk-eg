'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getOptimizedImageUrl, buildSrcSet, detectImageFormatSupport } from '@/lib/image-utils';

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const optimizedSrc = src ? getOptimizedImageUrl(src, variant) : fallbackSrc;
  const { avif, webp } = detectImageFormatSupport();

  useEffect(() => {
    if (!src) {
      setHasError(true);
      return;
    }

    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => {
      setIsLoaded(true);
      setHasError(false);
    };

    const handleError = () => {
      setHasError(true);
      setIsLoaded(true);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src]);

  const handleImageError = () => {
    setHasError(true);
  };

  const placeholderStyle: React.CSSProperties = {
    backgroundColor: placeholder === 'solid' ? '#f1f5f9' : 'transparent',
    backgroundImage: placeholder === 'blur'
      ? 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)'
      : 'none',
    backgroundSize: '200% 100%',
    animation: placeholder === 'blur' ? 'shimmer 1.5s infinite' : 'none',
  };

  if (!src && !fallbackSrc) {
    return (
      <div
        className={`bg-slate-100 ${className}`}
        style={{ ...placeholderStyle, ...style }}
      />
    );
  }

  const finalSrc = hasError ? fallbackSrc : optimizedSrc;

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      
      <picture>
        {avif && (
          <source
            srcSet={buildSrcSet(finalSrc, [
              { width: 400, quality: 80 },
              { width: 800, quality: 75 },
              { width: 1200, quality: 70 },
            ])}
            type="image/avif"
          />
        )}
        {webp && (
          <source
            srcSet={buildSrcSet(finalSrc, [
              { width: 400, quality: 82 },
              { width: 800, quality: 80 },
              { width: 1200, quality: 75 },
            ])}
            type="image/webp"
          />
        )}
        <img
          ref={imgRef}
          src={finalSrc}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          style={{
            ...placeholderStyle,
            ...style,
          }}
          loading={loading}
          fetchPriority={fetchPriority}
          sizes={sizes}
          onError={handleImageError}
          onClick={onClick}
        />
      </picture>
    </>
  );
}