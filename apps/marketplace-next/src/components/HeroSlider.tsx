'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    src: '/images/hero-banner1.jpg',
    mobileSrc: '/images/hero-banner1-mobile.jpg',
    alt: 'من مكانك - المنصة الأولى للتجارة الذكية في مصر',
  },
  {
    src: '/images/hero-banner2.png',
    mobileSrc: '/images/hero-banner2-mobile.png',
    alt: 'من مكانك - اكتشف المتاجر والعروض',
  },
  {
    src: '/images/hero-banner3.png',
    mobileSrc: '/images/hero-banner3-mobile.png',
    alt: 'من مكانك - كل ما تحتاجه في مكان واحد',
  },
];

export function HeroSlider() {
  const [current, setCurrent] = useState(0);

  const goToNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(goToNext, 6000);
    return () => clearInterval(timer);
  }, [current, goToNext]);

  return (
    <div className="group relative w-full h-full">
      {slides.map((slide, i) => (
        <div key={slide.src} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === current ? 'opacity-100' : 'opacity-0'}`}>
          {/* Desktop / Tablet image (>= 640px) */}
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="100vw"
            priority={i === 0}
            className="hidden sm:block object-cover"
          />
          {/* Mobile image (< 640px) */}
          <Image
            src={slide.mobileSrc}
            alt={slide.alt}
            fill
            sizes="100vw"
            priority={i === 0}
            className="sm:hidden object-cover"
          />
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        type="button"
        aria-label="الشريحة السابقة"
        onClick={goToPrev}
        className="absolute left-2 md:left-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-11 md:h-11 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/50 hover:scale-110 active:scale-95 transition-all"
      >
        <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
      </button>
      <button
        type="button"
        aria-label="الشريحة التالية"
        onClick={goToNext}
        className="absolute right-2 md:right-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-11 md:h-11 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center hover:bg-black/50 hover:scale-110 active:scale-95 transition-all"
      >
        <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 md:gap-3">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`الشريحة ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-1.5 md:h-2 rounded-full transition-all duration-300 ${
              i === current
                ? 'w-6 md:w-10 bg-white'
                : 'w-1.5 md:w-2 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
