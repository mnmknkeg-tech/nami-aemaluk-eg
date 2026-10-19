'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  LogIn,
  User,
  UserPlus,
  ShoppingBag,
  Bell,
  Heart,
  LogOut,
} from 'lucide-react';
import { useApp } from './AppProvider';
import { useCart } from '@/lib/cart';
import { useWishlist } from '@/lib/wishlist';
import { SearchBar } from './SearchBar';
import { GovernoratePicker } from './GovernoratePicker';
import { HERO_SEARCH_ID } from './HeroSearch';
import { siteConfig, navLinks } from '@/lib/config';
import {
  apiPath,
  APP_SCOPE,
  clearStoredAuthToken,
  getStoredAuthToken,
  isSessionActive,
} from '@/lib/api';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { theme, toggleTheme, lang, setLang } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { totalItems, setCartOpen } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  /**
   * The header stays transparent while the hero search bar is still in its place
   * (so it feels like a part of the section below it) and turns into a solid
   * sticky bar as soon as the search bar reaches the top of the screen.
   */
  useEffect(() => {
    const shouldBeSolid = () => {
      const headerHeight = headerRef.current?.offsetHeight ?? 64;
      const target = document.getElementById(HERO_SEARCH_ID);
      if (!target) return window.scrollY > 4;
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      return window.scrollY > Math.max(0, targetTop - headerHeight);
    };
    const onScroll = () => setSolid(shouldBeSolid());
    onScroll();
    const remeasure = setTimeout(onScroll, 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      clearTimeout(remeasure);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

  // Close the menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock the page scroll while the menu is open
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  // Session state + unread notifications counter — throttled: at most one
  // fetch per 45s (navigations used to fire one request each) plus a slow
  // keep-fresh interval and a refresh when the tab becomes visible again.
  const lastCountFetchRef = useRef(0);
  useEffect(() => {
    let cancelled = false;
    setIsLoggedIn(isSessionActive());
    const load = async (force = false) => {
      if (!isSessionActive()) {
        setUnreadNotifs(0);
        return;
      }
      const token = getStoredAuthToken();
      const now = Date.now();
      if (!force && now - lastCountFetchRef.current < 45_000) return;
      lastCountFetchRef.current = now;
      try {
        const res = await fetch(apiPath('/notifications/me/unread-count'), {
          headers: {
            'X-App-Scope': APP_SCOPE,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (cancelled) return;
        const d = res.status === 401 || !res.ok ? null : await res.json().catch(() => null);
        setUnreadNotifs(d?.unread_count || d?.count || 0);
      } catch {}
    };
    load(true);
    const interval = setInterval(() => load(true), 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  const openCart = useCallback(() => {
    setMenuOpen(false);
    setCartOpen(true);
  }, [setCartOpen]);

  const handleLogout = () => {
    clearStoredAuthToken();
    setIsLoggedIn(false);
    setMenuOpen(false);
    router.push('/');
  };

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          'sticky top-0 left-0 right-0 z-[80] transition-all duration-300',
          solid
            ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.35)]'
            : 'bg-transparent border-b border-transparent'
        )}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 md:h-[72px] flex items-center gap-2 md:gap-3">
          {/* Logo — unchanged */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="w-9 h-9 md:w-11 md:h-11 bg-brand-black rounded-lg flex items-center justify-center shadow-lg relative group overflow-hidden">
              <div className="absolute inset-0 bg-brand-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Image
                src="/brand/logo.png"
                alt="MNMKNK"
                width={28}
                height={28}
                className="relative z-10 w-6 h-6 md:w-7 md:h-7 object-contain"
              />
            </div>
            <span
              className={cn(
                'text-sm md:text-lg font-bold tracking-tight hidden sm:block',
                'bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-cyan bg-[length:200%_200%] text-transparent bg-clip-text',
                'transition-transform duration-300 hover:scale-[1.06]'
              )}
            >
              {lang === 'ar' ? siteConfig.nameArabic : siteConfig.name}
            </span>
          </Link>

          {/* Location picker — right next to the logo */}
          <GovernoratePicker />

          <div className="flex-1" />

          {/* Desktop nav links — the hamburger is a mobile-only pattern */}
          <nav className="hidden lg:flex items-center gap-1 mr-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors',
                  isActive(link.href)
                    ? 'text-brand-cyan bg-brand-cyan/10'
                    : 'text-slate-600 dark:text-slate-300 hover:text-brand-cyan hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                {link.label[lang]}
              </Link>
            ))}
          </nav>

          {/* Cart — desktop; on mobile the fixed footer bar carries it */}
          <button
            type="button"
            onClick={openCart}
            aria-label={lang === 'ar' ? 'السلة' : 'Cart'}
            className="hidden lg:flex relative w-10 h-10 rounded-full items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span
                key={totalItems}
                className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-cyan text-black text-[10px] font-black flex items-center justify-center animate-cart-pop"
              >
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>

          {/* Notifications */}
          <Link
            href="/notifications"
            aria-label={lang === 'ar' ? 'الإشعارات' : 'Notifications'}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifs > 0 && (
              <span className="absolute top-0.5 left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </Link>

          {/* Account — desktop only: the hamburger (which carries the login /
              signup entries) is hidden from lg and up, so the desktop header
              needs its own login entry point. */}
          {isLoggedIn ? (
            <Link
              href="/profile"
              aria-label={lang === 'ar' ? 'حسابي' : 'My Account'}
              className="hidden lg:inline-flex items-center gap-2 h-10 px-3.5 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <User className="w-5 h-5" />
              {lang === 'ar' ? 'حسابي' : 'My Account'}
            </Link>
          ) : (
            <Link
              href="/login"
              aria-label={lang === 'ar' ? 'دخول' : 'Login'}
              className="hidden lg:inline-flex items-center gap-2 h-10 px-4 rounded-full bg-brand-gradient text-white text-sm font-bold shadow-sm hover:shadow-glow-cyan transition-all shrink-0"
            >
              <LogIn className="w-4 h-4" />
              {lang === 'ar' ? 'دخول' : 'Login'}
            </Link>
          )}

          {/* Menu — mobile only; desktop shows the inline links above */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={lang === 'ar' ? 'القائمة' : 'Menu'}
            aria-expanded={menuOpen}
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Menu drawer — everything that used to live in the header */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={lang === 'ar' ? 'القائمة' : 'Menu'}
            className="absolute top-0 right-0 bottom-0 w-[88%] max-w-sm bg-white dark:bg-brand-black shadow-2xl flex flex-col animate-fade-in"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xl font-bold text-gradient">
                {lang === 'ar' ? siteConfig.nameArabic : siteConfig.name}
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="إغلاق"
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-5 space-y-2">
              <div className="pb-2">
                <SearchBar fullWidth />
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg font-semibold text-base transition-all',
                    isActive(link.href)
                      ? 'bg-brand-black/5 dark:bg-white/10 text-brand-cyan'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  )}
                >
                  {link.label[lang]}
                </Link>
              ))}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <Link
                  href="/wishlist"
                  className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 font-semibold"
                >
                  <Heart className="w-5 h-5" />
                  {lang === 'ar' ? 'المفضلة' : 'Wishlist'}
                  {wishlistCount > 0 && (
                    <span className="mr-auto min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={openCart}
                  className="w-full flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 font-semibold text-right"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {lang === 'ar' ? 'السلة' : 'Cart'}
                  {totalItems > 0 && (
                    <span className="mr-auto min-w-5 h-5 px-1 rounded-full bg-brand-cyan text-black text-[10px] font-bold flex items-center justify-center">
                      {totalItems > 9 ? '9+' : totalItems}
                    </span>
                  )}
                </button>
                <Link
                  href="/notifications"
                  className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 font-semibold"
                >
                  <Bell className="w-5 h-5" />
                  {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
                  {unreadNotifs > 0 && (
                    <span className="mr-auto min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifs > 9 ? '9+' : unreadNotifs}
                    </span>
                  )}
                </Link>
              </div>

              {/* Language + dark mode */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="flex items-center gap-3 font-semibold">
                    <Globe className="w-5 h-5" />
                    {lang === 'ar' ? 'اللغة' : 'Language'}
                  </span>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setLang('ar')}
                      aria-pressed={lang === 'ar'}
                      className={cn(
                        'px-3 py-1.5 text-xs font-bold transition-colors',
                        lang === 'ar'
                          ? 'bg-brand-cyan text-black'
                          : 'bg-white dark:bg-slate-900 text-slate-500'
                      )}
                    >
                      العربية
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang('en')}
                      aria-pressed={lang === 'en'}
                      className={cn(
                        'px-3 py-1.5 text-xs font-bold transition-colors',
                        lang === 'en'
                          ? 'bg-brand-cyan text-black'
                          : 'bg-white dark:bg-slate-900 text-slate-500'
                      )}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="flex items-center gap-3 font-semibold">
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    {lang === 'ar' ? 'الوضع الليلي' : 'Dark mode'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme === 'dark'}
                    aria-label={lang === 'ar' ? 'الوضع الليلي' : 'Dark mode'}
                    onClick={toggleTheme}
                    className={cn(
                      'flex w-12 h-6 rounded-full p-0.5 transition-colors',
                      theme === 'dark'
                        ? 'bg-brand-cyan justify-end'
                        : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    )}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow" />
                  </button>
                </div>
              </div>

              {/* Account */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 font-semibold"
                    >
                      <User className="w-5 h-5" />
                      {lang === 'ar' ? 'حسابي' : 'My Account'}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 font-semibold text-red-500 text-right"
                    >
                      <LogOut className="w-5 h-5" />
                      {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 font-semibold"
                    >
                      <LogIn className="w-5 h-5" />
                      {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
                    </Link>
                    <Link
                      href="/signup"
                      className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-brand-black to-slate-800 text-white font-semibold"
                    >
                      <UserPlus className="w-5 h-5" />
                      {lang === 'ar' ? 'إنشاء حساب' : 'Sign up'}
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
