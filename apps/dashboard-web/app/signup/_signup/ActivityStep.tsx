'use client';

import { Search } from 'lucide-react';
import { groupAccentColors, type ActivityWithGroup } from '@/lib/activities';
import ActivityCard from './ActivityCard';

interface ActivityStepProps {
  activitySearch: string;
  onSearchChange: (v: string) => void;
  groupIds: string[];
  groupedActivities: Record<string, ActivityWithGroup[]>;
  expandedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  activityId: string;
  onSelectActivity: (a: ActivityWithGroup) => void;
}

export default function ActivityStep({
  activitySearch,
  onSearchChange,
  groupIds,
  groupedActivities,
  expandedGroups,
  onToggleGroup,
  activityId,
  onSelectActivity,
}: ActivityStepProps) {
  return (
    <div className="space-y-5">
      <div className="relative max-w-md mx-auto">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={activitySearch}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="دور على نشاطك... (مطعم، سوبر ماركت، عيادة)"
          className="w-full pr-11 pl-4 py-3.5 rounded-2xl bg-white border-2 border-slate-100 text-slate-900 font-bold outline-none focus:border-[#00E5FF] transition-colors text-sm shadow-sm"
        />
      </div>

      {groupIds.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-400 font-bold">لا توجد أنشطة مطابقة لبحثك.</p>
        </div>
      ) : (
        groupIds.map((groupId) => {
          const activities = groupedActivities[groupId];
          const expanded =
            expandedGroups.has(groupId) || activitySearch.length > 0 || activityId !== '';
          const groupTitle = activities[0]?.groupTitle || groupId;
          const visible = expanded ? activities : activities.slice(0, 4);
          return (
            <div key={groupId} className="pt-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl bg-gradient-to-br ${groupAccentColors[groupId] || groupAccentColors.other} text-white flex items-center justify-center text-sm font-black`}
                  >
                    {activities[0]?.icon || groupTitle.charAt(0)}
                  </div>
                  <span className="font-black text-sm md:text-base text-slate-900">
                    {groupTitle}
                  </span>
                  <span className="text-[11px] font-black text-slate-300">
                    ({activities.length})
                  </span>
                </div>
                {!activitySearch && activities.length > 4 && (
                  <button
                    type="button"
                    onClick={() => onToggleGroup(groupId)}
                    className="text-xs font-black text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {expanded ? 'عرض أقل' : `عرض كل ${activities.length}`}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                {visible.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    active={activityId === activity.id}
                    onSelect={onSelectActivity}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
