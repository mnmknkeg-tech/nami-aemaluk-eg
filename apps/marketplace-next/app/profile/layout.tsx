'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Settings,
  LogOut,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';
import { api, clearStoredAuthToken, isSessionActive } from '@/lib/api';
import { ProfileShellSkeleton } from '@/components/Skeleton';

/**
 * Shared shell for every /profile/* page.
 *
 * Previously each profile page fetched /auth/me and rendered its own header +
 * sidebar, so every tab click flashed a full skeleton and re-fetched the user
 * — the "page reload" feel. The shell now lives here: the user is fetched
 * ONCE and tab switches only render the page content below, instantly.
 */

export interface ProfileUser {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  extraPhones?: string[];
  [key: string]: unknown;
}

interface ProfileUserContextValue {
  user: ProfileUser | null;
  setUser: (u: ProfileUser | null) => void;
  refresh: () => Promise<void>;
}

const ProfileUserContext = createContext<ProfileUserContextValue | null>(null);

export function useProfileUser(): ProfileUserContextValue {
  const ctx = useContext(ProfileUserContext);
  if (!ctx) throw new Error('useProfileUser must be used within the profile layout');
  return ctx;
}

/** Unwrap the /users/me envelope — same shapes /auth/me returns. */
function unwrapUser(res: unknown): ProfileUser | null {
  const r = res as Record<string, any> | undefined | null;
  const candidate = r?.data?.user ?? r?.data ?? r?.user ?? r;
  return candidate && typeof candidate === 'object' ? (candidate as ProfileUser) : null;
}

function ProfileUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isSessionActive()) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname || '/profile')}`);
      return;
    }

    const load = async () => {
      try {
        // /users/me returns the full profile (name, phone, extraPhones) —
        // the same object PATCH /users/me accepts.
        const res = await api.get('/users/me');
        setUser(unwrapUser(res));
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/users/me');
      setUser(unwrapUser(res));
    } catch {}
  }, []);

  if (loading) {
    return <ProfileShellSkeleton rows={4} />;
  }

  return (
    <ProfileUserContext.Provider value={{ user, setUser, refresh }}>
      {children}
    </ProfileUserContext.Provider>
  );
}

const NAV_ITEMS = [
  { href: '/profile', icon: User, label: 'الملف الشخصي', exact: true },
  { href: '/profile/orders', icon: ShoppingBag, label: 'طلباتي' },
  { href: '/profile/bookings', icon: CalendarDays, label: 'حجوزاتي' },
  { href: '/profile/wishlist', icon: Heart, label: 'المفضلة' },
  { href: '/profile/addresses', icon: MapPin, label: 'العناوين' },
  { href: '/profile/settings', icon: Settings, label: 'الإعدادات' },
];

function ProfileSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = () => {
    clearStoredAuthToken();
    router.push('/');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <nav className="space-y-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label, exact }) => (
          <Link
            key={href}
            href={href}
            className={
              isActive(href, exact)
                ? 'flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-cyan/10 text-brand-cyan font-semibold'
                : 'flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors'
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
            <ChevronRight className="w-4 h-4 mr-auto" />
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-semibold transition-colors mt-4"
        >
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </button>
      </nav>
    </div>
  );
}

function ProfileShell({ children }: { children: ReactNode }) {
  const { user } = useProfileUser();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 md:pb-12">
      {/* Header */}
      <div className="bg-brand-black text-white py-8 px-4 md:px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-brand-cyan/20 rounded-xl flex items-center justify-center">
              <User className="w-10 h-10 text-brand-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.name || 'مستخدم'}</h1>
              <p className="text-white/60 text-sm">{user?.phone || user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ProfileSidebar />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <ProfileUserProvider>
      <ProfileShell>{children}</ProfileShell>
    </ProfileUserProvider>
  );
}
