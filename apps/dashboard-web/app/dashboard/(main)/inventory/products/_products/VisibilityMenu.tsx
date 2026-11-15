'use client';

import { Eye, EyeOff } from 'lucide-react';
import type { Product, VisibilityMenuState } from './types';

type Props = {
  menu: VisibilityMenuState;
  products: Product[];
  togglingId: string;
  onToggle: (p: Product, patch: { isActive?: boolean; appActive?: boolean }) => void;
  onClose: () => void;
};

export default function VisibilityMenuPortal({
  menu,
  products,
  togglingId,
  onToggle,
  onClose,
}: Props) {
  if (!menu) return null;
  const p = products.find((x) => x.id === menu.productId);
  if (!p) return null;
  const onSite = p.isActive !== false;
  const onApp = p.appActive !== false;
  const isHiddenEverywhere = !onSite && !onApp;
  const isBusy = togglingId === p.id;

  // Position: align right edge of menu with right edge of button (RTL friendly)
  const menuWidth = 208; // w-52 = 13rem = 208px
  const left = menu.x - menuWidth;
  const top = menu.y + 6;

  return (
    <>
      {/* Backdrop to close on outside click */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="fixed z-[9999] w-52 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
          إعدادات الظهور
        </div>

        {/* Website toggle */}
        <button
          onClick={() => {
            onToggle(p, { isActive: !onSite });
            onClose();
          }}
          disabled={isBusy}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-right hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              onSite ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {onSite ? <Eye size={13} /> : <EyeOff size={13} />}
          </span>
          <span className="flex-1">{onSite ? 'مرئي في الموقع' : 'مخفي من الموقع'}</span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${onSite ? 'bg-emerald-400' : 'bg-slate-300'}`}
          />
        </button>

        {/* App toggle — حقيقي: نفس علم app_active اللي بيفلترته الـ API والتطبيق */}
        <button
          onClick={() => {
            onToggle(p, { appActive: !onApp });
            onClose();
          }}
          disabled={isBusy}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-right hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              onApp ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {onApp ? <Eye size={13} /> : <EyeOff size={13} />}
          </span>
          <span className="flex-1">{onApp ? 'مرئي في التطبيق' : 'مخفي من التطبيق'}</span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${onApp ? 'bg-emerald-400' : 'bg-slate-300'}`}
          />
        </button>

        <div className="border-t border-slate-100" />

        {/* Hide everywhere */}
        <button
          onClick={() => {
            onToggle(p, { isActive: false, appActive: false });
            onClose();
          }}
          disabled={isBusy || isHiddenEverywhere}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-right hover:bg-red-50 text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center shrink-0">
            <EyeOff size={13} />
          </span>
          إخفاء من الكل
        </button>
      </div>
    </>
  );
}
