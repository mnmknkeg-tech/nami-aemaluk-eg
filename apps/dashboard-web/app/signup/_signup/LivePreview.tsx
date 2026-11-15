'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ModuleId } from '@/lib/moduleConfig';
import { MODULE_PREVIEW } from './constants';

interface LivePreviewProps {
  base: ModuleId[];
  added: ModuleId[];
  sticky?: boolean;
  hint?: string;
}

export default function LivePreview({ base, added, sticky = true, hint }: LivePreviewProps) {
  const previewModuleCount = base.length + added.length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-900 rounded-[2rem] p-5 text-white ${sticky ? 'sticky bottom-24' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
          معاينة لوحتك
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={previewModuleCount}
            initial={{ scale: 1.25, color: '#00E5FF' }}
            animate={{ scale: 1, color: 'rgba(255,255,255,0.4)' }}
            className="text-[10px] font-black"
          >
            {previewModuleCount} تطبيق مفعّل
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {base.map((m) => {
          const meta = MODULE_PREVIEW[String(m)];
          return (
            <span
              key={String(m)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black text-white/80"
            >
              <span>{meta?.icon || '📦'}</span> {meta?.label || String(m)}
            </span>
          );
        })}
        <AnimatePresence>
          {added.map((m) => {
            const meta = MODULE_PREVIEW[String(m)];
            return (
              <motion.span
                key={String(m)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00E5FF]/15 border border-[#00E5FF]/40 text-[11px] font-black text-[#00E5FF]"
              >
                <span>{meta?.icon || '✨'}</span> {meta?.label || String(m)}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>
      <p className="text-[10px] font-bold text-white/30 mt-3">
        {hint ||
          'الأزرار السماوية هي اللي فتحناها من إجاباتك — والباقي كله متاح في «الترقية» من لوحتك في أي وقت'}
      </p>
    </motion.div>
  );
}
