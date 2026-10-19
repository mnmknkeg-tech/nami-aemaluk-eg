'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, Search, LogOut, User, ChevronDown, ChevronLeft, ChevronRight, PanelLeft, LayoutGrid, Settings } from 'lucide-react';
import type { SidebarSection } from '@/config/sidebar';
import { SECTION_COLORS } from '@/config/sidebar';
import { useAuth } from '@/lib/auth';
import { sectionSettingsHref } from '@/lib/sectionSettings';
import { useOrderBell } from '@/hooks/useOrderBell';
import useVisibleSections from '@/hooks/useVisibleSections';
import { useSettingsModal, parseSettingsHref } from '@/hooks/useSettingsModal';

const SETTINGS_CATEGORIES = [
  { id: 'all', labelAr: 'الكل' },
  {
    id: 'store_ops',
    labelAr: 'المتجر والعمليات',
    itemIds: [
      'settings_store',
      'settings_bookings',
      'settings_orders',
      'settings_pos',
      'settings_inventory',
      'settings_branches',
    ],
  },
  {
    id: 'finance',
    labelAr: 'المالية',
    itemIds: ['settings_payments', 'settings_accounting', 'settings_receipt_theme'],
  },
  {
    id: 'people',
    labelAr: 'العملاء والفريق',
    itemIds: ['settings_customers', 'settings_crm', 'settings_hr'],
  },
  {
    id: 'system',
    labelAr: 'النظام والأمان',
    itemIds: [
      'settings_overview',
      'settings_account',
      'settings_security',
      'settings_notifications',
      'settings_social_media',
      'settings_modules',
      'settings_apps',
      'settings_analytics',
    ],
  },
];

type TopNavProps = {
  onMenuClick: () => void;
  onSwitchNav: () => void;
};

// Small amber tag for local-only / not-yet-released features
const SoonBadge = ({ className = '' }: { className?: string }) => (
  <span
    className={`px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[8px] font-black leading-none shrink-0 ${className}`}
  >
    قريباً
  </span>
);

export default function TopNav({ onMenuClick, onSwitchNav }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { unreadCount } = useOrderBell();
  const sections: SidebarSection[] = useVisibleSections();
  const { openModal } = useSettingsModal();

  const [openSection, setOpenSection] = useState<string | null>(null);
  const [hoverSection, setHoverSection] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; right: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);

  // عرض مقتطف من الأقسام والصفحات + زر "عرض المزيد" بدل ازدحام الشريط
  const MAX_NAV_SECTIONS = 8;
  const MAX_SUB_ITEMS = 6;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [subExpanded, setSubExpanded] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<string>('all');
  const settingsScrollRef = useRef<HTMLDivElement>(null);

  const scrollSettingsBar = (dir: 'left' | 'right') => {
    if (settingsScrollRef.current) {
      const delta = dir === 'left' ? -220 : 220;
      settingsScrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const navSections = sections.slice(0, MAX_NAV_SECTIONS);
  const extraSections = sections.slice(MAX_NAV_SECTIONS);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) {
        setAppsOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    // Close the hover dropdown when the page scrolls or the window resizes,
    // otherwise the fixed panel would drift away from its section button
    const closeHover = () => setHoverSection(null);
    window.addEventListener('scroll', closeHover, true);
    window.addEventListener('resize', closeHover);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', closeHover, true);
      window.removeEventListener('resize', closeHover);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const isActive = (href: string) => {
    if (href.startsWith('/dashboard/settings?tab=')) {
      const url = new URL(href, 'http://localhost');
      const tabParam = url.searchParams.get('tab') || 'overview';
      const currentTab = searchParams?.get('tab') || 'overview';
      return pathname === '/dashboard/settings' && tabParam === currentTab;
    }
    return pathname === href;
  };

  // Which section matches the current page (kept in sync on navigation)
  const currentSectionId = useMemo(() => {
    // If the path is in settings, it is strictly the settings section
    if (pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/')) {
      return 'settings';
    }

    for (const section of sections) {
      if (section.id === 'settings') continue;
      if (section.mainHref && pathname === section.mainHref.split('?')[0]) return section.id;
      if (
        section.items.some((item) => {
          const itemPath = item.href.split('?')[0];
          // Do not match cross-section links like settings tab links pointing to settings
          if (item.href.startsWith('/dashboard/settings')) return false;
          return itemPath === pathname;
        })
      )
        return section.id;
    }
    return null;
  }, [pathname, sections]);

  // Reset manually opened section when route/tab changes so header stays accurate
  useEffect(() => {
    setOpenSection(null);
  }, [pathname, searchParams]);

  const activeSectionId = openSection ?? currentSectionId;
  const activeSection = sections.find((s) => s.id === activeSectionId) || null;
  const previewSection = sections.find((s) => s.id === hoverSection) || null;

  // التمرير التلقائي للتبويب النشط في إعدادات اللوحة
  useEffect(() => {
    if (activeSectionId === 'settings') {
      setTimeout(() => {
        if (settingsScrollRef.current) {
          const activeEl = settingsScrollRef.current.querySelector('[data-active="true"]');
          if (activeEl) {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      }, 100);
    }
  }, [activeSectionId, pathname, searchParams]);

  const handleSectionEnter = (sectionId: string, e?: React.MouseEvent<HTMLElement>) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoverSection(sectionId);
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoverPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
  };

  const handleSectionLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverSection(null), 180);
  };

  const navigateToSection = (section: SidebarSection) => {
    const href = section.mainHref || section.items[0]?.href;
    setOpenSection(section.id);
    if (href) router.push(href);
  };

  const handleSectionClick = (section: SidebarSection) => {
    setDropdownOpen(false);
    const isAlreadyInSettings = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings');
    if (!isAlreadyInSettings && section.id === 'settings') {
      const href = sectionSettingsHref(pathname);
      const { tab, from } = parseSettingsHref(href);
      openModal(tab, from);
      return;
    }
    if (section.items.length <= 1) {
      const href = section.mainHref || section.items[0]?.href;
      setOpenSection(null);
      if (href) router.push(href);
      return;
    }
    if (activeSectionId === section.id) {
      setOpenSection(null);
      return;
    }
    navigateToSection(section);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const userName = user?.name || 'مستخدم';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="shrink-0 relative z-40" onMouseLeave={handleSectionLeave}>
      {/* ===== Blue gradient main header matching logo ===== */}
      <header className="h-16 bg-gradient-to-r from-[#0284C7] via-[#0096C7] to-[#00B4D8] border-b border-white/20 flex items-center gap-2 px-3 md:px-5 shadow-sm">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 ml-1 md:ml-4">
          <div className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center overflow-hidden border border-white/30">
            <Image
              src="/brand/logo-business.png"
              alt="نمّي أعمالك"
              width={28}
              height={28}
              className="w-6 h-6 object-contain"
            />
          </div>
          <span className="hidden lg:block font-black text-sm text-white">نمّي أعمالك</span>
        </Link>

        {/* Section nav (desktop) */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
          {navSections.map((section) => {
            const SectionIcon = section.icon;
            const active = activeSectionId === section.id;
            const hovered = hoverSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section)}
                onMouseEnter={(e) => handleSectionEnter(section.id, e)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                  active || hovered
                    ? 'text-white bg-white/20 shadow-sm border border-white/25'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                } ${section.published === false ? 'opacity-60' : ''}`}
              >
                {SectionIcon && <SectionIcon size={16} className="shrink-0" />}
                <span>{section.titleAr}</span>
                {section.published === false && <SoonBadge />}
                {section.items.length > 1 && (
                  <ChevronDown
                    size={12}
                    className={`shrink-0 transition-transform duration-300 ${active || hovered ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
            );
          })}
          {/* عرض المزيد — باقي الأقسام (بتتفتح في شريط عريض تحت) */}
          {extraSections.length > 0 && (
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 transition-all ${
                moreOpen
                  ? 'text-white bg-white/25 shadow-sm border border-white/30'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>المزيد</span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-300 ${moreOpen ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </nav>

        {/* Left utilities */}
        <div className="flex items-center gap-1.5 mr-auto md:mr-0">
          {/* Search (desktop) */}
          <div className="relative hidden lg:block">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="بحث..."
              className="w-40 xl:w-56 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl py-1.5 pr-9 pl-3 text-xs font-bold text-white placeholder:text-white/50 outline-none focus:bg-white/20 focus:border-white/40 transition-all"
            />
          </div>

          {/* Apps / all sections grid (desktop) */}
          <div className="relative hidden md:block" ref={appsRef}>
            <button
              onClick={() => setAppsOpen(!appsOpen)}
              onMouseEnter={(e) => handleSectionEnter('__none__', e)}
              title="جميع التطبيقات والأقسام"
              className={`p-2 rounded-xl transition-colors ${
                appsOpen ? 'text-white bg-white/20' : 'text-white/80 hover:text-white hover:bg-white/15'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <AnimatePresence>
              {appsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50"
                >
                  <div className="max-h-80 overflow-y-auto">
                    {sections.map((section) => {
                      const SectionIcon = section.icon;
                      return (
                        <button
                          key={section.id}
                          onClick={() => {
                            setAppsOpen(false);
                            handleSectionClick(section);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors text-right"
                        >
                          {SectionIcon && (
                            <SectionIcon
                              size={16}
                              className={`shrink-0 ${SECTION_COLORS[section.id] || 'text-slate-400'}`}
                            />
                          )}
                          <span className="flex-1">{section.titleAr}</span>
                          {section.items.length > 1 && (
                            <ChevronDown size={12} className="text-slate-300 -rotate-90" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Switch back to sidebar mode */}
          <button
            onClick={onSwitchNav}
            title="التبديل إلى القائمة الجانبية"
            className="hidden md:block p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
          >
            <PanelLeft size={18} />
          </button>

          {/* Notifications */}
          <Link
            href="/dashboard/notifications"
            title="الإشعارات"
            className="relative p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Settings gear button — opens centered mini settings modal */}
          <button
            onClick={() => {
              const isAlreadyInSettings = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings');
              if (isAlreadyInSettings) return;
              const href = sectionSettingsHref(pathname);
              const { tab, from } = parseSettingsHref(href);
              openModal(tab, from);
            }}
            title="الإعدادات العامة"
            className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
          >
            <Settings size={18} />
          </button>

          {/* Vertical divider between utilities and user account */}
          <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" />

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-xl transition-all"
            >
              <div className="w-9 h-9 bg-gradient-to-tr from-[#00E5FF] to-[#BD00FF] rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-sm">{userInitial}</span>
              </div>
              <span className="hidden xl:block text-xs font-black text-white/90">{userName}</span>
              <ChevronDown
                size={14}
                className={`hidden xl:block text-white/50 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50"
                >
                  <div className="px-4 py-2 border-b border-slate-50">
                    <div className="text-xs font-black text-slate-900">{userName}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {user?.email || ''}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      const href = sectionSettingsHref(pathname);
                      const { tab, from } = parseSettingsHref(href);
                      openModal(tab, from);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <User size={16} className="text-slate-400" />
                    الإعدادات
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    تسجيل الخروج
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ===== شريط الأقسام الإضافية — يتفتح بالطول عند "المزيد" ===== */}
      <AnimatePresence initial={false}>
        {moreOpen && extraSections.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="px-3 md:px-5 py-2.5 flex flex-wrap items-center gap-1">
              {extraSections.map((section) => {
                const SectionIcon = section.icon;
                const active = activeSectionId === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setMoreOpen(false);
                      handleSectionClick(section);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      active
                        ? 'text-slate-900 bg-slate-900/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    } ${section.published === false ? 'opacity-60' : ''}`}
                  >
                    {SectionIcon && (
                      <SectionIcon
                        size={14}
                        className={`shrink-0 ${SECTION_COLORS[section.id] || 'text-slate-400'}`}
                      />
                    )}
                    <span>{section.titleAr}</span>
                    {section.published === false && <SoonBadge />}
                    {section.items.length > 1 && (
                      <ChevronDown size={11} className="text-slate-300 -rotate-90" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Hover dropdown — vertical page list anchored under the hovered section ===== */}
      <AnimatePresence>
        {previewSection && previewSection.items.length > 0 && hoverPos && (
          <motion.div
            key={`preview-${previewSection.id}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="fixed z-50 hidden md:block w-64"
            style={{ top: hoverPos.top, right: hoverPos.right }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
                {previewSection.icon && (
                  <previewSection.icon
                    size={16}
                    className={SECTION_COLORS[previewSection.id] || 'text-slate-400'}
                  />
                )}
                <span className="text-xs font-black text-slate-900">{previewSection.titleAr}</span>
                <span className="text-[10px] font-bold text-slate-300 mr-auto">
                  {previewSection.items.length} صفحات
                </span>
              </div>
              <div className="p-1.5 flex flex-col max-h-[60vh] overflow-y-auto">
                {previewSection.items.map((item) => {
                  const ItemIcon = item.icon;
                  const active = isActive(item.href);
                  const isAlreadyInSettings = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings');
                  const isSettings = !isAlreadyInSettings && (item.href.startsWith('/dashboard/settings') || item.id.toLowerCase().endsWith('settings'));

                  if (isSettings) {
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setHoverSection(null);
                          const { tab, from } = parseSettingsHref(item.href);
                          openModal(tab, from || previewSection.id);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          active
                            ? 'bg-slate-900/5 text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        } ${item.published === false ? 'opacity-60' : ''}`}
                      >
                        {ItemIcon && (
                          <span
                            className={`w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 ${active ? 'ring-1 ring-[#00E5FF]/40' : ''}`}
                          >
                            <ItemIcon
                              size={14}
                              className={SECTION_COLORS[previewSection.id] || 'text-slate-400'}
                            />
                          </span>
                        )}
                        <span className="flex-1 text-right">{item.labelAr}</span>
                        {item.published === false && <SoonBadge />}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        setOpenSection(previewSection.id);
                        setHoverSection(null);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? 'bg-slate-900/5 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      } ${item.published === false ? 'opacity-60' : ''}`}
                    >
                      {ItemIcon && (
                        <span
                          className={`w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 ${active ? 'ring-1 ring-[#00E5FF]/40' : ''}`}
                        >
                          <ItemIcon
                            size={14}
                            className={SECTION_COLORS[previewSection.id] || 'text-slate-400'}
                          />
                        </span>
                      )}
                      <span className="flex-1 text-right">{item.labelAr}</span>
                      {item.published === false && <SoonBadge />}
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== White sub-section bar (branch pages) ===== */}
      <AnimatePresence initial={false}>
        {activeSection && activeSection.items.length > 0 && (
          <motion.div
            key={activeSection.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white border-b border-slate-100 overflow-hidden"
          >
            {activeSection.id === 'settings' ? (
              <div className="px-3 md:px-5 py-2 flex items-center gap-2 overflow-hidden">
                {/* Section anchor on the right */}
                <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-100 shrink-0">
                  {activeSection.icon && (
                    <activeSection.icon
                      size={16}
                      className="text-[#0284C7]"
                    />
                  )}
                  <span className="text-xs font-black text-slate-900 whitespace-nowrap">
                    {activeSection.titleAr}
                  </span>
                </div>

                {/* Category filter pills */}
                <div className="flex items-center gap-1 pl-3 ml-1 border-l border-slate-100 shrink-0 overflow-x-auto no-scrollbar">
                  {SETTINGS_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSettingsCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all whitespace-nowrap ${
                        settingsCategory === cat.id
                          ? 'bg-gradient-to-r from-[#0284C7] to-[#00B4D8] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {cat.labelAr}
                    </button>
                  ))}
                </div>

                {/* Scroll right arrow */}
                <button
                  onClick={() => scrollSettingsBar('right')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                  title="تمرير لليمين"
                >
                  <ChevronRight size={14} />
                </button>

                {/* Sub-items track */}
                <div
                  ref={settingsScrollRef}
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-0.5"
                >
                  {activeSection.items
                    .filter((item) => item.id !== 'dashboardSettings')
                    .filter((item) => {
                      if (settingsCategory === 'all') return true;
                      const cat = SETTINGS_CATEGORIES.find((c) => c.id === settingsCategory);
                      return cat?.itemIds?.includes(item.id);
                    })
                    .map((item) => {
                      const ItemIcon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setOpenSection(null)}
                          data-active={active}
                          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all shrink-0 ${
                            active
                              ? 'bg-gradient-to-r from-[#0284C7] to-[#00B4D8] text-white font-black shadow-xs shadow-[#0284C7]/20 ring-1 ring-[#00B4D8]/30'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold'
                          } ${item.published === false ? 'opacity-65' : ''}`}
                        >
                          {ItemIcon && (
                            <ItemIcon
                              size={14}
                              className={`shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}
                            />
                          )}
                          <span>{item.labelAr}</span>
                          {item.published === false && (
                            <SoonBadge className={active ? 'bg-white/20 text-white' : ''} />
                          )}
                        </Link>
                      );
                    })}
                </div>

                {/* Scroll left arrow */}
                <button
                  onClick={() => scrollSettingsBar('left')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                  title="تمرير لليسار"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            ) : (
              <div
                className={`px-3 md:px-5 py-2.5 flex items-center gap-1 ${subExpanded ? 'flex-wrap' : 'overflow-x-auto no-scrollbar'}`}
              >
                {/* Section anchor on the right */}
                <div className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-100 shrink-0">
                  {activeSection.icon && (
                    <activeSection.icon
                      size={16}
                      className={SECTION_COLORS[activeSection.id] || 'text-slate-400'}
                    />
                  )}
                  <span className="text-xs font-black text-slate-900 whitespace-nowrap">
                    {activeSection.titleAr}
                  </span>
                </div>
                {(subExpanded
                  ? activeSection.items
                  : activeSection.items.slice(0, MAX_SUB_ITEMS)
                ).filter((item) => item.id !== 'dashboardSettings').map((item) => {
                  const ItemIcon = item.icon;
                  const active = isActive(item.href);
                  const isAlreadyInSettings = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings');
                  const isSettings = !isAlreadyInSettings && (item.href.startsWith('/dashboard/settings') || item.id.toLowerCase().endsWith('settings'));

                  if (isSettings) {
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          const { tab, from } = parseSettingsHref(item.href);
                          openModal(tab, from || activeSection.id);
                        }}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                          active
                            ? 'text-slate-900 bg-slate-900/5'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        } ${item.published === false ? 'opacity-60' : ''}`}
                      >
                        {ItemIcon && (
                          <ItemIcon
                            size={14}
                            className={`shrink-0 ${SECTION_COLORS[activeSection.id] || 'text-slate-400'}`}
                          />
                        )}
                        <span>{item.labelAr}</span>
                        {item.published === false && <SoonBadge />}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setOpenSection(null)}
                      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                        active
                          ? 'text-slate-900 bg-slate-900/5'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      } ${item.published === false ? 'opacity-60' : ''}`}
                    >
                      {ItemIcon && (
                        <ItemIcon
                          size={14}
                          className={`shrink-0 ${SECTION_COLORS[activeSection.id] || 'text-slate-400'}`}
                        />
                      )}
                      <span>{item.labelAr}</span>
                      {item.published === false && <SoonBadge />}
                      {active && (
                        <motion.span
                          layoutId="topnav-active-underline"
                          className="absolute bottom-0 right-3 left-3 h-0.5 bg-[#00E5FF] rounded-full"
                        />
                      )}
                    </Link>
                  );
                })}
                {/* عرض المزيد / عرض أقل */}
                {activeSection.items.length > MAX_SUB_ITEMS && (
                  <button
                    onClick={() => setSubExpanded(!subExpanded)}
                    className={`relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      subExpanded
                        ? 'text-slate-900 bg-slate-900/5'
                        : 'text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {subExpanded
                      ? 'عرض أقل'
                      : `عرض المزيد (${activeSection.items.length - MAX_SUB_ITEMS})`}
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-300 ${subExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
