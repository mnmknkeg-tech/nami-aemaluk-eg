'use client';

import React from 'react';
import {
  FileText,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  Megaphone,
  Calendar,
  UserCog,
  Globe,
  BarChart3,
  Plus,
  BookOpen,
} from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** full = get-started card (big title + actions). compact = list/filter result
   *  row — matches InvEmpty metrics so the whole dashboard shares one look. */
  variant?: 'full' | 'compact';
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

const iconMap: Record<string, React.ReactNode> = {
  sales: <ShoppingCart size={48} className="text-slate-200" />,
  quotes: <FileText size={48} className="text-slate-200" />,
  inventory: <Package size={48} className="text-slate-200" />,
  crm: <Users size={48} className="text-slate-200" />,
  finance: <CreditCard size={48} className="text-slate-200" />,
  marketing: <Megaphone size={48} className="text-slate-200" />,
  bookings: <Calendar size={48} className="text-slate-200" />,
  hr: <UserCog size={48} className="text-slate-200" />,
  website: <Globe size={48} className="text-slate-200" />,
  analytics: <BarChart3 size={48} className="text-slate-200" />,
  default: <FileText size={48} className="text-slate-200" />,
};

export default function EmptyState({
  icon,
  title,
  description,
  variant = 'full',
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  const isCompact = variant === 'compact';
  const hasActions = Boolean(primaryAction || secondaryAction);
  return (
    <div
      className={`bg-white border border-slate-200 text-center ${
        isCompact ? 'rounded-xl p-6 sm:p-8 md:p-12' : 'rounded-2xl p-6 sm:p-8 md:p-12'
      }`}
    >
      <div className="flex justify-center mb-4">{icon || iconMap.default}</div>
      <h3
        className={
          isCompact ? 'text-sm font-bold text-slate-400' : 'text-lg font-bold text-slate-900 mb-2'
        }
      >
        {title}
      </h3>
      {description && (
        <p
          className={
            isCompact
              ? 'text-[11px] font-bold text-slate-300 mt-1'
              : 'text-slate-400 font-medium text-sm mb-6 max-w-md mx-auto'
          }
        >
          {description}
        </p>
      )}
      {hasActions && (
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              {primaryAction.icon ?? <Plus size={18} />}
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              {secondaryAction.icon ?? <BookOpen size={18} />}
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function getEmptyStateIcon(type: string): React.ReactNode {
  return iconMap[type] || iconMap.default;
}
