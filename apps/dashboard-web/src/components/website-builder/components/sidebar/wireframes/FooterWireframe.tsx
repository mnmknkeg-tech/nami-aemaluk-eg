import React from 'react';
import { Twitter, Facebook, Instagram } from 'lucide-react';
import { WireframeProps } from './types';

export const FooterWireframe: React.FC<WireframeProps> = ({ template }) => {
  const type = template.wireframeType || template.id;
    if (template.category === 'footer') {
    if (type === 'footer-mega-corporate') {
      return (
        <div className="w-full bg-zinc-950 text-slate-400 rounded-xl p-2.5 space-y-2 text-right text-[8px] border border-zinc-800">
          {/* Newsletter Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 flex items-center justify-between">
            <span className="text-[7px] text-blue-400 font-bold bg-blue-950/80 px-1.5 py-0.5 rounded">
              اشتراك
            </span>
            <span className="text-[8px] text-white font-bold">📩 النشرة البريدية الحصرية</span>
          </div>
          {/* 4 Columns */}
          <div className="grid grid-cols-4 gap-1 text-[7px] border-b border-zinc-800 pb-1.5">
            <div className="space-y-0.5">
              <span className="text-white font-bold block">الفروع</span>
              <span className="text-zinc-500 block">الرياض - جدة</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-white font-bold block">الضمان</span>
              <span className="text-zinc-500 block">150+ نقطة</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-white font-bold block">روابط</span>
              <span className="text-zinc-500 block">الأسطول</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-white font-bold block">الشركة</span>
              <span className="text-zinc-500 block">س.ت 101089</span>
            </div>
          </div>
          <div className="text-center text-[7px] text-zinc-600">
            جميع الحقوق محفوظة © 2025 شركة المجد للسيارات
          </div>
        </div>
      );
    }

    if (type === 'footer-luxury-minimal') {
      return (
        <div className="w-full bg-black text-zinc-400 rounded-xl p-3 space-y-1.5 text-center text-[8px] border border-zinc-800">
          <span className="inline-block bg-amber-500/10 text-amber-400 text-[7px] font-extrabold px-2 py-0.5 rounded-full">
            👑 THE PINNACLE OF MOTORS
          </span>
          <span className="text-[10px] font-black text-white block">المجد للسيارات الفاخرة</span>
          <div className="text-[7px] text-zinc-300 py-1 border-t border-b border-zinc-900 flex justify-center gap-1.5">
            <span>الرئيسية</span>
            <span>•</span>
            <span>من نحن</span>
            <span>•</span>
            <span>الأسطول</span>
            <span>•</span>
            <span>تواصل معنا</span>
          </div>
          <span className="text-[7px] text-zinc-600 block">القاهرة - جمهورية مصر العربية</span>
        </div>
      );
    }

    if (type === 'footer-ecommerce-badges') {
      return (
        <div className="w-full bg-slate-900 text-slate-300 rounded-xl p-2.5 space-y-1.5 text-right text-[8px] border border-slate-800">
          {/* Trust Row */}
          <div className="grid grid-cols-3 gap-1 bg-slate-800/80 rounded p-1 text-[7px] text-center text-white font-bold">
            <div>🔒 دفع آمن</div>
            <div>🚚 شحن VIP</div>
            <div>🛡️ فحص معتمد</div>
          </div>
          {/* Columns */}
          <div className="grid grid-cols-3 gap-1 text-[7px] py-1">
            <div>
              <span className="text-slate-400 block font-bold">الدعم</span>
              <span className="text-slate-500 block">واتساب 24/7</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold">الخدمات</span>
              <span className="text-slate-500 block">الضمان والاسترجاع</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold">المتجر</span>
              <span className="text-slate-500 block">أحدث الموديلات</span>
            </div>
          </div>
          {/* Payment Badges */}
          <div className="bg-slate-950/60 p-1 rounded text-center text-[7px] text-slate-400">
            💳 مدى | فيزا | Apple Pay | تمارا | تابي
          </div>
        </div>
      );
    }

    if (type === 'footer-light-modern-split') {
      return (
        <div className="w-full bg-white text-slate-700 rounded-xl p-2.5 space-y-1.5 text-right text-[8px] border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <span className="bg-emerald-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded">
              واتساب 💬
            </span>
            <span className="font-extrabold text-[9px] text-slate-900">المجد للسيارات</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[7px]">
            <div>
              <span className="text-slate-900 font-bold block">أوقات العمل</span>
              <span className="text-slate-500 block">السبت - الخميس: 9 ص - 10 م</span>
            </div>
            <div>
              <span className="text-slate-900 font-bold block">روابط الموقع</span>
              <span className="text-slate-500 block">الرئيسية • الأسطول • من نحن</span>
            </div>
          </div>
          <div className="text-center text-[7px] text-slate-400 pt-0.5">
            جميع الحقوق محفوظة © 2025
          </div>
        </div>
      );
    }

    if (type === 'footer-directory-categories') {
      return (
        <div className="w-full bg-slate-950 text-slate-400 rounded-xl p-2.5 space-y-1.5 text-right text-[8px] border border-slate-800">
          <span className="text-[9px] font-bold text-white block text-center border-b border-slate-800 pb-1">
            دليل الأسطول والخدمات الشامل
          </span>
          <div className="grid grid-cols-4 gap-1 text-[7px]">
            <div>
              <span className="text-slate-300 font-bold block">الخدمات</span>
              <span className="text-slate-500 block">استيراد خاص</span>
            </div>
            <div>
              <span className="text-slate-300 font-bold block">عن المجد</span>
              <span className="text-slate-500 block">رؤيتنا 2030</span>
            </div>
            <div>
              <span className="text-slate-300 font-bold block">الفئات</span>
              <span className="text-slate-500 block">SUV & سيدان</span>
            </div>
            <div>
              <span className="text-slate-300 font-bold block">الماركات</span>
              <span className="text-slate-500 block">مرسيدس وبورش</span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'footer-cta-social-bar') {
      return (
        <div className="w-full bg-slate-950 text-slate-300 rounded-xl p-2.5 space-y-1.5 text-center text-[8px] border border-slate-800">
          <div className="bg-indigo-950/80 border border-indigo-800 rounded p-1 flex justify-between items-center text-[7px] px-1.5">
            <span className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded">
              اتصل الآن
            </span>
            <span className="text-white font-bold">✨ تبحث عن سيارة نادرة بمواصفات خاصة؟</span>
          </div>
          <div className="bg-slate-900 py-1 rounded-full text-[7px] text-indigo-300 font-semibold">
            𝕏 تويتر • 📸 انستغرام • 💼 لينكد إن • ▶️ يوتيوب
          </div>
          <span className="text-[7px] text-slate-500 block">
            شركة المجد للسيارات الفاخرة © 2025
          </span>
        </div>
      );
    }

    return (
      <div className="w-full bg-slate-900 text-slate-400 rounded-xl p-2.5 space-y-1.5 text-center text-[8px]">
        <div className="flex justify-between border-b border-slate-800 pb-1">
          <span className="font-bold text-white">الشعار</span>
          <span>روابط سريعة • سياسة الخصوصية</span>
        </div>
        <span>جميع الحقوق محفوظة © 2025</span>
      </div>
    );
  }

  return null;
};
