'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ADMIN_NAV_ITEMS } from './navigation';

type AdminSidebarProps = {
  pathname: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
};

export default function AdminSidebar({ pathname, open, onClose, onLogout }: AdminSidebarProps) {
  return (
    <aside
      className={`w-72 bg-white border-l border-slate-200 text-slate-800 flex flex-col fixed inset-y-0 right-0 z-[110] shadow-sm transition-transform duration-300 md:translate-x-0 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="px-8 py-7 flex items-center gap-3 border-b border-slate-100">
        <span className="text-xl font-black tracking-tight text-slate-900">
          نمّي <span className="text-cyan-600">ROOT</span>
        </span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold',
                active
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon size={18} className={active ? 'text-cyan-300' : 'text-slate-400'} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-bold text-sm"
        >
          <LogOut size={18} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
