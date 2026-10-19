'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ExternalLink, X, LogOut } from 'lucide-react';
import type { SidebarSection, SidebarItem } from '@/config/sidebar';
import { SECTION_COLORS } from '@/config/sidebar';
import { useAuth } from '@/lib/auth';
import useVisibleSections from '@/hooks/useVisibleSections';
import { useSettingsModal, parseSettingsHref } from '@/hooks/useSettingsModal';


// Small amber tag for local-only / not-yet-released features
const SoonBadge = () => (
  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[8px] font-black leading-none shrink-0">
    قريباً
  </span>
);

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const { openModal } = useSettingsModal();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isSectionView = activeSection !== null;
  const allVisibleSections = useVisibleSections();
  const visibleSections: SidebarSection[] = useMemo(() => {
    return isSectionView
      ? allVisibleSections.filter((s) => s.id === activeSection)
      : allVisibleSections;
  }, [isSectionView, activeSection, allVisibleSections]);

  const isActive = (href: string) => {
    // For settings page, check if the tab parameter matches
    if (href.startsWith('/dashboard/settings?tab=')) {
      const url = new URL(href, 'http://localhost');
      const tabParam = url.searchParams.get('tab') || 'overview';
      const currentTab = searchParams?.get('tab') || 'overview';
      return pathname === '/dashboard/settings' && tabParam === currentTab;
    }
    // Use exact matching for other pages
    return pathname === href;
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-72'
      } bg-white border-l border-slate-100 flex flex-col h-full transition-all duration-300 shrink-0`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-50 shrink-0">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#1A1A1A] rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/brand/logo-business.png" alt="نمّي أعمالك" width={28} height={28} className="w-6 h-6 object-contain" />
            </div>
            <span className="font-black text-sm text-slate-900">نمّي أعمالك</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-9 h-9 bg-[#1A1A1A] rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/brand/logo-business.png" alt="نمّي أعمالك" width={28} height={28} className="w-6 h-6 object-contain" />
            </div>
          </Link>
        )}
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 hover:bg-slate-50 rounded-lg"
            >
              <X size={18} className="text-slate-400" />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-1.5 hover:bg-slate-50 rounded-lg"
          >
            {collapsed ? (
              <ChevronLeft size={18} className="text-slate-400" />
            ) : (
              <ChevronRight size={18} className="text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {isSectionView && (
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-2 px-4 py-2 mb-2 text-xs font-black text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ChevronRight size={14} />
            كل الأقسام
          </button>
        )}

        {visibleSections.map((section) => {
          const SectionIcon = section.icon;
          const hasModule = Boolean(section.moduleId);

          // If a module section only has 1 item (e.g. Website -> /dashboard/website), show it directly as a link!
          const isAlreadyInSettings = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings');

          if (!isSectionView && hasModule && section.items.length === 1) {
            const singleItem = section.items[0];
            const ItemIcon = SectionIcon || singleItem.icon;
            const active = isActive(singleItem.href);
            const isSettings = !isAlreadyInSettings && (singleItem.href.startsWith('/dashboard/settings') || section.id === 'settings');

            if (isSettings) {
              return (
                <div key={section.id} className="px-3 mb-1">
                  <button
                    onClick={() => {
                      if (onClose) onClose();
                      const { tab, from } = parseSettingsHref(singleItem.href);
                      openModal(tab, from);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {ItemIcon && (
                      <ItemIcon
                        size={18}
                        className={`shrink-0 ${active ? 'text-[#00E5FF]' : 'text-slate-400'}`}
                      />
                    )}
                    {!collapsed && (
                      <span className="text-xs font-bold flex-1 text-right">
                        {section.titleAr}
                      </span>
                    )}
                    {!collapsed && section.published === false && <SoonBadge />}
                  </button>
                </div>
              );
            }

            return (
              <div key={section.id} className="px-3 mb-1">
                <Link
                  href={singleItem.href}
                  onClick={() => { if (onClose) onClose(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {ItemIcon && (
                    <ItemIcon
                      size={18}
                      className={`shrink-0 ${active ? 'text-[#00E5FF]' : 'text-slate-400'}`}
                    />
                  )}
                  {!collapsed && (
                    <span className="text-xs font-bold flex-1 text-right">
                      {section.titleAr}
                    </span>
                  )}
                  {!collapsed && section.published === false && <SoonBadge />}
                  {active && !collapsed && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
                  )}
                </Link>
              </div>
            );
          }

          if (!isSectionView && hasModule) {
            // Show section title only — click to expand (and navigate if mainHref is set)
            const handleSectionClick = () => {
              if (!isAlreadyInSettings && section.id === 'settings') {
                if (onClose) onClose();
                openModal('overview', 'dashboard');
                return;
              }
              setActiveSection(section.id);
              if (section.mainHref) {
                router.push(section.mainHref);
                if (onClose) onClose();
              }
            };
            return (
              <div key={section.id} className="px-3 mb-1">
                <button
                  onClick={handleSectionClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all group"
                >
                  {SectionIcon && (
                    <SectionIcon size={18} className="text-slate-400 shrink-0" />
                  )}
                  {!collapsed && (
                    <>
                      <span className="text-xs font-black text-slate-700 flex-1 text-right">
                        {section.titleAr}
                      </span>
                      {section.published === false && <SoonBadge />}
                      <ExternalLink
                        size={12}
                        className="text-slate-300 group-hover:text-slate-500 transition-colors"
                      />
                    </>
                  )}
                </button>
              </div>
            );
          }

          // Show section items
          return (
            <div key={section.id} className="mb-2">
              {!collapsed && !isSectionView && (
                <div className="px-6 py-1.5 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
                  {section.titleAr}
                </div>
              )}
              {isSectionView && !collapsed && (
                <div className="px-6 py-1.5 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
                  {section.titleAr}
                </div>
              )}
              {section.items.map((item: SidebarItem) => {
                const ItemIcon = item.icon;
                const active = isActive(item.href);
                const isNewInvoice = item.id === 'newInvoice';
                const isSettings = !isAlreadyInSettings && (item.href.startsWith('/dashboard/settings') || item.id.toLowerCase().endsWith('settings'));

                if (isSettings) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (onClose) onClose();
                        const { tab, from } = parseSettingsHref(item.href);
                        openModal(tab, from || section.id);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                      style={{ margin: '0 0.75rem', width: 'calc(100% - 1.5rem)' }}
                    >
                      <ItemIcon
                        size={16}
                        className={`shrink-0 ${active ? 'text-[#00E5FF]' : SECTION_COLORS[section.id] || 'text-slate-400'}`}
                      />
                      {!collapsed && (
                        <span className="text-xs font-bold flex-1 text-right">
                          {item.labelAr}
                        </span>
                      )}
                      {!collapsed && item.published === false && <SoonBadge />}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => { if (onClose) onClose(); }}
                    className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl transition-all ${
                      isNewInvoice
                        ? 'bg-[#00E5FF]/10 text-[#00B8CC] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/20'
                        : active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ItemIcon
                      size={16}
                      className={`shrink-0 ${isNewInvoice ? 'text-[#00B8CC]' : active ? 'text-[#00E5FF]' : SECTION_COLORS[section.id] || 'text-slate-400'}`}
                    />
                    {!collapsed && (
                      <span className="text-xs font-bold flex-1 text-right">
                        {item.labelAr}
                      </span>
                    )}
                    {!collapsed && item.published === false && <SoonBadge />}
                    {active && !collapsed && !isNewInvoice && (
                      <div className="w-1 h-1 rounded-full bg-[#00E5FF]" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Logout — pinned at bottom */}
      <div className="px-3 py-2 border-t border-slate-50 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut size={16} className="shrink-0 text-red-400" />
          {!collapsed && (
            <span className="text-xs font-bold flex-1 text-right">تسجيل الخروج</span>
          )}
        </button>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-50 shrink-0">
          <div className="text-[9px] font-bold text-slate-300 text-center">
            © 2026 نمّي أعمالك — راي
          </div>
        </div>
      )}
    </aside>
  );
}
