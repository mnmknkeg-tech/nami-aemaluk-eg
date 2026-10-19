'use client';

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, RotateCcw } from 'lucide-react';
import { readLocalRecord, writeLocalRecord } from '@/lib/localStore';

type Permissions = Record<string, Record<string, boolean>>;

const MODULES = [
  { id: 'pos', label: 'الكاشير' },
  { id: 'sales', label: 'المبيعات' },
  { id: 'inventory', label: 'المخزون' },
  { id: 'finance', label: 'المالية' },
  { id: 'accounting', label: 'المحاسبة' },
  { id: 'customers', label: 'العملاء' },
  { id: 'marketing', label: 'التسويق' },
  { id: 'bookings', label: 'الحجوزات' },
  { id: 'hr', label: 'الموارد البشرية' },
  { id: 'analytics', label: 'التحليلات' },
  { id: 'settings', label: 'الإعدادات' },
];

const ROLE_PRESETS: Record<string, string[]> = {
  manager: MODULES.map((m) => m.id),
  branch_manager: ['pos', 'sales', 'inventory', 'customers', 'bookings', 'analytics', 'hr'],
  accountant: ['finance', 'accounting', 'sales', 'analytics'],
  cashier: ['pos', 'sales'],
  storekeeper: ['inventory'],
  marketer: ['marketing', 'analytics'],
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Record<string, string[]>>(() => {
    const saved = readLocalRecord<{ roles: Record<string, string[]> }>('team-roles').roles;
    return saved || { ...ROLE_PRESETS };
  });
  const [selectedRole, setSelectedRole] = useState('cashier');

  const toggle = (moduleId: string) => {
    const current = roles[selectedRole] || [];
    const next = current.includes(moduleId)
      ? current.filter((m) => m !== moduleId)
      : [...current, moduleId];
    const updated = { ...roles, [selectedRole]: next };
    setRoles(updated);
    writeLocalRecord('team-roles', { roles: updated });
  };

  const resetToPreset = () => {
    const updated = { ...roles, [selectedRole]: ROLE_PRESETS[selectedRole] };
    setRoles(updated);
    writeLocalRecord('team-roles', { roles: updated });
  };

  const current = roles[selectedRole] || [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <KeyRound size={22} className="text-teal-600" />
          الأدوار والصلاحيات
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-1">حدد كل دور يشوف أنهي أقسام — بنفس قوالب جاهزة تعدلها براحتك</p>
      </div>

      {/* Role selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.keys(ROLE_PRESETS).map((roleId) => (
          <button
            key={roleId}
            onClick={() => setSelectedRole(roleId)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              selectedRole === roleId
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {roleId === 'manager' ? 'مدير عام' : roleId === 'branch_manager' ? 'مدير فرع' : roleId === 'accountant' ? 'محاسب' : roleId === 'cashier' ? 'كاشير' : roleId === 'storekeeper' ? 'أمين مخزن' : 'مسوق'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck size={16} className="text-teal-600" />
            أقسام المتاحة لدور «{selectedRole === 'manager' ? 'مدير عام' : selectedRole === 'branch_manager' ? 'مدير فرع' : selectedRole === 'accountant' ? 'محاسب' : selectedRole === 'cashier' ? 'كاشير' : selectedRole === 'storekeeper' ? 'أمين مخزن' : 'مسوق'}»
          </h2>
          <button onClick={resetToPreset} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-slate-700 transition-colors">
            <RotateCcw size={12} />
            رجوع للقالب الافتراضي
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {MODULES.map((m) => {
            const enabled = current.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-black transition-all ${
                  enabled
                    ? 'bg-teal-50 border border-teal-200 text-teal-700'
                    : 'bg-slate-50 border border-transparent text-slate-400 hover:bg-slate-100'
                }`}
              >
                <span>{m.label}</span>
                <span className={`w-8 h-[18px] rounded-full relative transition-colors ${enabled ? 'bg-teal-500' : 'bg-slate-200'}`}>
                  <span className={`absolute top-[2px] w-3.5 h-3.5 bg-white rounded-full shadow transition-all ${enabled ? 'right-[2px]' : 'right-[calc(100%-16px)]'}`} />
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] font-bold text-slate-300 mt-4">دي معاينة للصلاحيات — التفعيل الفعلي على حسابات الفريق هيتم مع هيكلة النشاطات القادمة.</p>
      </div>
    </div>
  );
}
