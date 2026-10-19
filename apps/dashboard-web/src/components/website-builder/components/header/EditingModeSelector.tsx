'use client';

import React, { useState } from 'react';
import {
  Layout,
  FileCode,
  Palette,
  Code2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';

export type EditingModeId = 'visual' | 'html_only' | 'css_only' | 'full_code';

interface ModeInfo {
  id: EditingModeId;
  label: string;
  description: string;
  icon: React.ElementType;
  requiresJs: boolean;
  warning?: string;
}

const MODES: ModeInfo[] = [
  {
    id: 'visual',
    label: 'المحرر البصري (Visual)',
    description: 'صمم وعدّل عناصر موقعك بصرياً دون الحاجة لكتابة كود',
    icon: Layout,
    requiresJs: false,
  },
  {
    id: 'html_only',
    label: 'محرر HTML',
    description: 'تعديل هيكل الـ HTML مباشرة',
    icon: FileCode,
    requiresJs: false,
    warning: 'ميزات وأكواد JavaScript معطلة في هذا الوضع',
  },
  {
    id: 'css_only',
    label: 'محرر CSS',
    description: 'تخصيص أنماط وتنسيقات الـ CSS',
    icon: Palette,
    requiresJs: false,
    warning: 'أكواد JavaScript وHTML المباشرة معطلة في هذا الوضع',
  },
  {
    id: 'full_code',
    label: 'كود كامل (Full Code)',
    description: 'تطوير متقدم: HTML و CSS و JavaScript في بيئة معزولة آمنة',
    icon: Code2,
    requiresJs: true,
    warning: 'أكواد JavaScript تعمل بأمان فائق داخل إطار المعاينة المعزول',
  },
];

export const EditingModeSelector: React.FC = () => {
  const {
    setCodeActiveFile,
    isCodeWorkspaceOpen,
    setIsCodeWorkspaceOpen,
    selectedNode,
    editingMode: activeMode,
    setEditingMode: setActiveMode,
  } = useBuilder();
  const [showWarning, setShowWarning] = useState<EditingModeId | null>(null);

  const mode = MODES.find((m) => m.id === activeMode);

  const switchMode = (next: EditingModeId) => {
    setActiveMode(next);
    setShowWarning(null);

    // Open code workspace for code-centric modes.
    if (next === 'html_only' || next === 'css_only' || next === 'full_code') {
      setIsCodeWorkspaceOpen(true);
      if (next === 'html_only') setCodeActiveFile('component.tsx');
      if (next === 'css_only') setCodeActiveFile('styles.css');
      if (next === 'full_code') setCodeActiveFile('component.tsx');
    } else {
      setIsCodeWorkspaceOpen(false);
    }
  };

  if (!mode) return null;

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex gap-1 border border-slate-200 rounded-xl bg-white p-1 shadow-2xs">
        {MODES.map((m) => {
          const isActive = activeMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={m.description}
            >
              <m.icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {mode.warning && showWarning !== activeMode && (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div className="text-right">
            <div className="font-bold text-amber-900">{mode.label} — {mode.warning}</div>
            <div className="mt-0.5 text-amber-700 text-[11px] leading-relaxed">
              التبديل بين أوضاع التحرير يحافظ على شجرة المكوّنات بالكامل. الأكواد التي لا يدعمها الوضع المختار ستظهر للقراءة فقط حتى تعود لوضعها.
            </div>
            <button
              onClick={() => setShowWarning(activeMode)}
              className="mt-1 text-[11px] font-semibold underline text-amber-700 hover:text-amber-900 cursor-pointer"
            >
              عدم إظهار التنبيه مجدداً خلال هذه الجلسة
            </button>
          </div>
        </div>
      )}

      {activeMode === 'full_code' && selectedNode && (
        <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2 animate-in fade-in duration-200">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
          <div className="text-right">
            <div className="font-bold text-blue-900">معاينة آمنة ومعزولة (Sandboxed Preview)</div>
            <div className="mt-0.5 text-blue-700 text-[11px] leading-relaxed">
              تُنفَّذ أي أكواد JavaScript مخصصة بأمان تام داخل إطار المعاينة المعزول، ولا يمكنها بأي شكل الوصول إلى ملفات تعريف الارتباط أو بيانات لوحة التحكم.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};