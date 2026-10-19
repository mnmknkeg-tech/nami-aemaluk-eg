'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description?: string;
  color?: string;
  bgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  description,
  color = 'text-slate-600',
  bgColor = 'bg-slate-50',
  trend,
}: StatCardProps) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm text-right">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-500 mb-1">{label}</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {description && (
            <div className="text-xs text-slate-400 mt-1">{description}</div>
          )}
          {trend && (
            <div className={`text-xs font-semibold mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0 ${bgColor} ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}