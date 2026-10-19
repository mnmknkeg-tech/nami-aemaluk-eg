'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, LayoutGrid, LayoutDashboard, Navigation, Clock,
  Package, CheckCircle2,
} from 'lucide-react';
import { computeSystemSummary, resolveDependencies, type ModuleId } from '@/lib/moduleConfig';

const MotionDiv = motion.div as any;

interface SystemSummaryProps {
  enabledModuleIds: ModuleId[];
  className?: string;
}

export default function SystemSummary({ enabledModuleIds, className = '' }: SystemSummaryProps) {
  const summary = useMemo(
    () => computeSystemSummary(enabledModuleIds),
    [enabledModuleIds],
  );

  const stats = [
    { id: 'modules', label: 'الوحدات', value: summary.moduleCount, icon: Package, color: 'text-slate-700' },
    { id: 'features', label: 'الميزات', value: summary.totalFeatures, icon: CheckCircle2, color: 'text-emerald-600' },
    { id: 'pages', label: 'الصفحات', value: summary.totalPages, icon: FileText, color: 'text-blue-600' },
    { id: 'setup', label: 'وقت الإعداد', value: `${summary.estimatedSetupMinutes}د`, icon: Clock, color: 'text-amber-600' },
  ];

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 overflow-hidden ${className}`}>
      <div className="p-6 border-b border-slate-50">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-[#00E5FF]" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base leading-none">ملخص النظام</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-1">نظرة عامة على نظامك المُكوّن</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center"
              >
                <Icon className={`w-4 h-4 mx-auto mb-2 ${stat.color}`} />
                <div className="font-black text-slate-900 text-lg leading-none">
                  <AnimatePresence mode="popLayout">
                    <MotionDiv
                      key={stat.value}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {stat.value}
                    </MotionDiv>
                  </AnimatePresence>
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-1 leading-tight">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3">
            الوحدات المفعّلة
          </div>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {summary.enabledModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <MotionDiv
                    key={mod.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${mod.color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: mod.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{mod.nameAr || mod.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{mod.features} ميزات</div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  </MotionDiv>
                );
              })}
            </AnimatePresence>
            {summary.enabledModules.length === 0 && (
              <div className="text-center py-6 text-slate-300">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">لا توجد وحدات مفعّلة</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
