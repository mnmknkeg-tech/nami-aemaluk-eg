'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { businessBrand } from '@/lib/brand';
import { industries, solutions } from '@/lib/siteData';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openMenu = (id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(id);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 150);
  };

  const dark = scrolled;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        dark ? 'bg-white shadow-md shadow-slate-900/5' : 'bg-transparent'
      }`}
      onMouseLeave={scheduleClose}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center overflow-hidden">
            <Image
              src={businessBrand.logo}
              alt={businessBrand.name}
              width={28}
              height={28}
              className="w-6 h-6 object-contain"
            />
          </div>
          <span className="text-slate-900 font-black text-lg">{businessBrand.name}</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onMouseEnter={() => openMenu('solutions')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-cyan-600 transition-colors"
          >
            الحلول
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${open === 'solutions' ? 'rotate-180' : ''}`}
            />
          </button>
          <Link
            href="/#features"
            className="text-sm font-semibold text-slate-600 hover:text-cyan-600 transition-colors"
          >
            المميزات
          </Link>
          <Link
            href="/#products"
            className="text-sm font-semibold text-slate-600 hover:text-cyan-600 transition-colors"
          >
            المنتجات
          </Link>
          <button
            type="button"
            onMouseEnter={() => openMenu('industries')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-cyan-600 transition-colors"
          >
            الأنشطة
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${open === 'industries' ? 'rotate-180' : ''}`}
            />
          </button>
          <Link
            href="/#faq"
            className="text-sm font-semibold text-slate-600 hover:text-cyan-600 transition-colors"
          >
            الأسئلة الشائعة
          </Link>
          <Link
            href="/new"
            className="text-sm font-black text-cyan-600 hover:text-cyan-500 transition-colors"
          >
            جديد
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 hover:text-cyan-600 transition-colors"
          >
            دخول
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-xl bg-[#0057FF] text-white text-sm font-black hover:bg-[#0046CC] transition-all"
          >
            ابدأ مجاناً
          </Link>
        </div>
      </div>

      {/* الشريط الأبيض بعرض الهدر كامل — بيفتح عند الـ hover */}
      <div className="absolute left-0 right-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto">
        {/* لوحة الحلول */}
        {open === 'solutions' && (
          <div onMouseEnter={() => openMenu('solutions')} onMouseLeave={scheduleClose}>
            <div className="border-t border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {solutions.map((s) => (
                    <Link
                      key={s.title}
                      href={s.href}
                      className="group/item p-3 rounded-xl hover:bg-cyan-50 transition-colors"
                    >
                      <span className="block text-sm font-bold text-slate-800 group-hover/item:text-cyan-700 transition-colors">
                        {s.title}
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {s.desc}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* لوحة الأنشطة */}
        {open === 'industries' && (
          <div onMouseEnter={() => openMenu('industries')} onMouseLeave={scheduleClose}>
            <div className="border-t border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {industries.map((it) => (
                    <Link
                      key={it.label}
                      href="/#industries"
                      className="p-3 rounded-xl hover:bg-cyan-50 transition-colors"
                    >
                      <span className="block text-sm font-bold text-slate-700 hover:text-cyan-700 transition-colors">
                        {it.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
