'use client';

import { Check } from 'lucide-react';
import { groupAccentColors, type ActivityWithGroup } from '@/lib/activities';
import { ACTIVITY_ICONS, getActivityLabel } from './constants';

interface ActivityCardProps {
  activity: ActivityWithGroup;
  active: boolean;
  onSelect: (a: ActivityWithGroup) => void;
}

export default function ActivityCard({ activity, active, onSelect }: ActivityCardProps) {
  const group = activity.groupId || 'other';
  const gradient = groupAccentColors[group] || groupAccentColors.other;
  const icon = activity.icon || ACTIVITY_ICONS[activity.id];
  return (
    <button
      type="button"
      onClick={() => onSelect(activity)}
      className={`relative text-right p-4 rounded-2xl border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 ${active ? 'border-slate-900 bg-slate-900 text-white shadow-xl' : 'border-slate-100 bg-white hover:border-slate-300'}`}
    >
      {active && (
        <span className="absolute top-3 left-3 w-6 h-6 rounded-full bg-[#00E5FF] flex items-center justify-center">
          <Check className="w-4 h-4 text-black" strokeWidth={3} />
        </span>
      )}
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 ${active ? 'bg-white/10' : 'bg-slate-50 border border-slate-100'}`}
      >
        {icon || (
          <span
            className={`bg-gradient-to-br ${gradient} bg-clip-text text-transparent font-black text-xl`}
          >
            {getActivityLabel(activity).charAt(0)}
          </span>
        )}
      </div>
      <div className="font-black text-sm mb-1">{getActivityLabel(activity)}</div>
      <p
        className={`text-[11px] font-bold leading-4 line-clamp-2 ${active ? 'text-white/60' : 'text-slate-400'}`}
      >
        {activity.description}
      </p>
    </button>
  );
}
