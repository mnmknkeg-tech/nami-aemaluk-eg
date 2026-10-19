'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft } from 'lucide-react';

export default function PendingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white border border-slate-100 p-12 rounded-[3rem] shadow-xl text-center"
      >
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Clock size={40} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">قيد المراجعة</h1>
        <p className="text-slate-400 font-bold text-sm mb-8">
          حسابك قيد المراجعة من قبل الإدارة. سيتم إعلامك فور الموافقة.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all"
        >
          <ArrowLeft size={16} />
          العودة لتسجيل الدخول
        </button>
      </motion.div>
    </div>
  );
}
