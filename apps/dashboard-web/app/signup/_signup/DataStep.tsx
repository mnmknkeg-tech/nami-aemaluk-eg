'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Check, Building2, ChevronLeft } from 'lucide-react';
import { ShopLocationPicker, type ResolvedShopLocation } from '@/components/ShopLocationPicker';
import type { ActivityWithGroup } from '@/lib/activities';
import { DIAL_CODES, getActivityLabel, type SignupFormData } from './constants';

interface DataStepProps {
  formData: SignupFormData;
  setFormData: React.Dispatch<React.SetStateAction<SignupFormData>>;
  dialCode: string;
  setDialCode: (v: string) => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  passwordChecks: { ok: boolean; label: string }[];
  showDetails: boolean;
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>;
  onLocationResolved: (loc: ResolvedShopLocation) => void;
  selectedActivity?: ActivityWithGroup;
  finalModulesCount: number;
  skipped: boolean;
}

export default function DataStep({
  formData,
  setFormData,
  dialCode,
  setDialCode,
  showPassword,
  setShowPassword,
  passwordChecks,
  showDetails,
  setShowDetails,
  onLocationResolved,
  selectedActivity,
  finalModulesCount,
  skipped,
}: DataStepProps) {
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] p-8">
        <h2 className="text-xl font-black text-slate-900 mb-1">آخر خطوة — حساب الدخول</h2>
        <p className="text-slate-400 font-bold text-xs mb-6">
          الإيميل وكلمة السر اللي هتدخل بيهم للوحة التحكم
        </p>
        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-600 mb-2">
              <Mail className="w-4 h-4 text-[#00E5FF]" /> البريد الإلكتروني{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              dir="ltr"
              autoFocus
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              placeholder="name@example.com"
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 font-black text-left text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[#00E5FF] transition-all outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-600 mb-2">
              <Lock className="w-4 h-4 text-[#00E5FF]" /> كلمة المرور{' '}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                dir="ltr"
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 pl-12 font-black text-left text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[#00E5FF] transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* شروط كلمة المرور — نفس سياسة الباك اند */}
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {passwordChecks.map((c) => (
                <li
                  key={c.label}
                  className={`flex items-center gap-1.5 text-[10px] font-bold ${
                    c.ok ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  <Check size={12} className={c.ok ? 'text-emerald-500' : 'text-slate-300'} />
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Shop location — map first, manual fields auto-fill from it */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] p-6 md:p-8">
        <h2 className="text-lg font-black text-slate-900 mb-1">فين متجرك؟ 📍</h2>
        <p className="text-slate-400 font-bold text-xs mb-5">
          حدد مكان متجرك على الخريطة — والمحافظة والمدينة والعنوان هيتملوا تلقائياً، وتقدر تعدّلهم
          بعدها
        </p>
        <ShopLocationPicker onResolve={onLocationResolved} />
      </div>

      {/* Optional store details */}
      <button
        type="button"
        onClick={() => setShowDetails((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white border border-slate-100 text-right hover:border-slate-200 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-black text-slate-600">
          <Building2 className="w-4 h-4 text-slate-400" />
          بيانات المتجر التفصيلية (اختياري)
        </span>
        <ChevronLeft
          className={`w-4 h-4 text-slate-400 transition-transform ${showDetails ? '-rotate-90' : ''}`}
        />
      </button>
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                    المحافظة
                  </label>
                  <input
                    value={formData.governorate}
                    onChange={(e) => setFormData((p) => ({ ...p, governorate: e.target.value }))}
                    placeholder="القاهرة"
                    className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                    المدينة
                  </label>
                  <input
                    value={formData.city}
                    onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                    placeholder="مدينة نصر"
                    className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                  هاتف المتجر (لو مختلف)
                </label>
                <div className="flex gap-2" dir="ltr">
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    aria-label="كود الدولة"
                    className="shrink-0 bg-slate-50 rounded-xl py-3 px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30 cursor-pointer"
                  >
                    {DIAL_CODES.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} {d.country}
                      </option>
                    ))}
                  </select>
                  <input
                    value={formData.shopPhone}
                    onChange={(e) => setFormData((p) => ({ ...p, shopPhone: e.target.value }))}
                    placeholder="2xxxxxxxxx"
                    className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                  مواعيد العمل
                </label>
                <input
                  value={formData.openingHours}
                  onChange={(e) => setFormData((p) => ({ ...p, openingHours: e.target.value }))}
                  placeholder="9 ص - 10 م"
                  className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                  العنوان التفصيلي
                </label>
                <textarea
                  value={formData.addressDetailed}
                  onChange={(e) => setFormData((p) => ({ ...p, addressDetailed: e.target.value }))}
                  rows={2}
                  placeholder="شارع ... عمارة ... دور ..."
                  className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5">
                  وصف قصير للمتجر
                </label>
                <textarea
                  value={formData.shopDescription}
                  onChange={(e) => setFormData((p) => ({ ...p, shopDescription: e.target.value }))}
                  rows={2}
                  placeholder="نبذة مختصرة عن نشاطك..."
                  className="w-full bg-slate-50 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00E5FF]/30 resize-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary card */}
      <div className="bg-slate-900 rounded-[2rem] p-6 text-white">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
          ملخص حسابك
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-bold text-white/40 mb-1">الموبايل</div>
            <div className="text-sm font-black" dir="ltr">
              {formData.phone ? `${dialCode} ${formData.phone}` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/40 mb-1">المتجر</div>
            <div className="text-sm font-black">{formData.shopName || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/40 mb-1">النشاط</div>
            <div className="text-sm font-black">
              {selectedActivity ? getActivityLabel(selectedActivity) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/40 mb-1">لوحة التحكم</div>
            <div className="text-sm font-black text-[#00E5FF]">
              {finalModulesCount} تطبيق · {skipped ? 'الأساسيات' : 'على مقاس نشاطك'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
