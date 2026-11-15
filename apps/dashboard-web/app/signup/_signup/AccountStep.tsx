'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Store, Phone } from 'lucide-react';
import { DIAL_CODES, type SignupFormData } from './constants';

interface AccountStepProps {
  formData: SignupFormData;
  setFormData: React.Dispatch<React.SetStateAction<SignupFormData>>;
  dialCode: string;
  setDialCode: (v: string) => void;
}

export default function AccountStep({
  formData,
  setFormData,
  dialCode,
  setDialCode,
}: AccountStepProps) {
  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="signup-card p-8"
      >
        <div className="w-14 h-14 rounded-2xl signup-btn-primary flex items-center justify-center mb-5">
          <Sparkles className="w-7 h-7 text-[#00E5FF]" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-1">أهلاً بيك 👋</h2>
        <p className="text-slate-400 font-bold text-sm mb-7">
          عرفنا بمتجرك في 30 ثانية، وبعدها نظبط لوحتك على نشاطك بالظبط
        </p>
        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-600 mb-2">
              <Store className="w-4 h-4 text-[#00E5FF]" /> اسم المتجر / المحل{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => setFormData((p) => ({ ...p, shopName: e.target.value }))}
              placeholder=""
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 font-black text-right text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[#00E5FF] transition-all outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-600 mb-2">
              <Phone className="w-4 h-4 text-[#00E5FF]" /> رقم الموبايل{' '}
              <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2" dir="ltr">
              <select
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                aria-label="كود الدولة"
                className="shrink-0 bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-3 font-black text-slate-900 focus:bg-white focus:border-[#00E5FF] transition-all outline-none cursor-pointer"
              >
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} {d.country}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={formData.phone}
                dir="ltr"
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="10xxxxxxxxx"
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 font-black text-left text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[#00E5FF] transition-all outline-none"
              />
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2">
              اختر كود الدولة واكتب رقمك بدون الصفر في البداية — هنستخدمه للتواصل وتفعيل حسابك، مفيش
              رسائل مزعجة
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
