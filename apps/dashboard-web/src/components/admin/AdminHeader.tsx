'use client';

import { Bell, Menu } from 'lucide-react';

type AdminHeaderProps = {
  currentLabel: string;
  initial: string;
  onMenuOpen: () => void;
};

export default function AdminHeader({ currentLabel, initial, onMenuOpen }: AdminHeaderProps) {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="md:hidden p-2.5 bg-slate-100 rounded-xl text-slate-700"
          aria-label="فتح القائمة"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-sm font-black text-slate-900">{currentLabel}</h1>
      </div>
      <div className="flex items-center gap-4">
        <Bell className="w-5 h-5 text-slate-400" />
        <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center font-black text-cyan-300 text-sm">
          {initial}
        </div>
      </div>
    </header>
  );
}
