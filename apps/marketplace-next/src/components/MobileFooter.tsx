'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BadgePercent, LayoutGrid, User, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/lib/cart';

interface FooterItem {
  href: string;
  icon: typeof Home;
  /** Icons-only bar, so the name is exposed to screen readers/tooltips only. */
  label: string;
}

export function MobileFooter() {
  const pathname = usePathname();
  const { totalItems, setCartOpen } = useCart();

  const navItems: FooterItem[] = [
    { href: '/', icon: Home, label: 'الرئيسية' },
    { href: '/offers', icon: BadgePercent, label: 'العروض' },
    { href: '/dalil', icon: LayoutGrid, label: 'الأقسام' },
    { href: '/profile', icon: User, label: 'حسابي' },
  ];

  const renderItem = (item: FooterItem) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        title={item.label}
        className={cn(
          'flex items-center justify-center w-11 h-11 rounded-xl transition-all',
          isActive
            ? 'text-brand-cyan bg-brand-cyan/10'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
        )}
      >
        <item.icon className="w-6 h-6" />
      </Link>
    );
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-[100] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around py-2">
        {navItems.slice(0, 2).map(renderItem)}

        {/* Cart center button */}
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          aria-label="السلة"
          title="السلة"
          className="relative flex items-center justify-center w-12 h-12 rounded-full bg-brand-gradient -mt-6 shadow-lg"
        >
          <ShoppingBag className="w-6 h-6 text-white" />
          {totalItems > 0 && (
            <span
              key={totalItems}
              className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-cart-pop"
            >
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>

        {navItems.slice(2).map(renderItem)}
      </div>
    </div>
  );
}
