'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Construction, ArrowRight, LucideIcon } from 'lucide-react';
import Link from 'next/link';

type PlaceholderProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  features?: string[];
};

export default function PagePlaceholder({ icon: Icon = Construction, title, description, features }: PlaceholderProps) {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-2xl mx-auto"
      >
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Icon size={32} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">{title}</h1>
        <p className="text-slate-400 font-bold text-sm mb-8">
          {description || 'هذه الصفحة قيد التطوير وسيتم نقلها من النظام الحالي قريباً.'}
        </p>
        {features && features.length > 0 && (
          <div className="mb-8 text-right">
            <h3 className="text-sm font-bold text-slate-600 mb-3">المميزات القادمة:</h3>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all"
        >
          <ArrowRight size={16} />
          العودة للوحة التحكم
        </Link>
      </motion.div>
    </div>
  );
}
