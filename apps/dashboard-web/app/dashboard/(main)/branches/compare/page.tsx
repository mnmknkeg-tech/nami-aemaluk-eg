'use client';

import React from 'react';
import { GitBranch, Building2, Target, TrendingUp, Users } from 'lucide-react';
import { useLocalCollection } from '@/lib/localStore';

type Branch = {
  id: string;
  name: string;
  manager?: string;
  monthlyTarget: string;
  status: 'active' | 'paused';
};

export default function BranchComparePage() {
  const { items: branches } = useLocalCollection<Branch>('branches');
  const sorted = [...branches].sort((a, b) => Number(b.monthlyTarget || 0) - Number(a.monthlyTarget || 0));
  const maxTarget = Math.max(1, ...sorted.map((b) => Number(b.monthlyTarget || 0)));
  const totalTarget = branches.reduce((s, b) => s + Number(b.monthlyTarget || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <GitBranch size={22} className="text-blue-600" />
          مقارنة الفروع
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-1">قارن المستهدفات والحالة بين كل فروعك في نظرة واحدة</p>
      </div>

      {branches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <GitBranch size={48} className="text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">لا توجد فروع للمقارنة</h3>
          <p className="text-slate-400 font-medium text-sm">أضف فروعك أولاً من صفحة إدارة الفروع لتشاهد المقارنة هنا.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <Target size={16} className="text-blue-600 mb-2" />
              <div className="text-lg font-black text-slate-900">ج.م {totalTarget.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-slate-400">إجمالي المستهدف الشهري</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <TrendingUp size={16} className="text-emerald-600 mb-2" />
              <div className="text-lg font-black text-slate-900">{sorted[0]?.name || '-'}</div>
              <div className="text-[10px] font-bold text-slate-400">أعلى فرع في المستهدف</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <Users size={16} className="text-violet-600 mb-2" />
              <div className="text-lg font-black text-slate-900">{branches.length}</div>
              <div className="text-[10px] font-bold text-slate-400">عدد الفروع المشاركة</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h2 className="text-sm font-black text-slate-900 mb-4">المستهدف الشهري لكل فرع</h2>
            <div className="space-y-3">
              {sorted.map((b, i) => {
                const val = Number(b.monthlyTarget || 0);
                const pct = Math.round((val / maxTarget) * 100);
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Building2 size={12} className="text-slate-400" />
                          {b.name}
                        </span>
                        {b.status === 'paused' && <span className="text-[9px] font-black text-slate-400">متوقف</span>}
                      </div>
                      <span className="text-xs font-black text-slate-700">ج.م {val.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-gradient-to-l from-[#00E5FF] to-[#BD00FF]' : 'bg-slate-300'}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
