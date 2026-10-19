'use client';

import React from 'react';
import { Sparkles, ArrowLeft, Layers, Code } from 'lucide-react';

interface InnovationsPageViewProps {
  onOpenDemo: (ctx?: string) => void;
}

export const InnovationsPageView: React.FC<InnovationsPageViewProps> = ({ onOpenDemo }) => {
  return (
    <div className="space-y-8 max-w-2xl mx-auto text-center py-12">
      <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
        <Sparkles size={32} />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          جديد نمّي أعمالك (قريباً)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          هذه الصفحة مخصصة لمسار التحديثات والابتكارات الجديدة القادمة. يمكنك ربط مسارها الخاص في تطبيقك لاحقاً.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
        المسار المخصص: /innovations أو /new-features
      </div>
    </div>
  );
};
