import React from 'react';
import { Star, Plus } from 'lucide-react';
import { WireframeProps } from './types';

export const ContentWireframe: React.FC<WireframeProps> = ({ template }) => {
  const type = template.wireframeType || template.id;
    if (template.category === 'team') {
    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
        <span className="text-[10px] font-bold text-slate-800 block text-center">
          فريق العمل والخبراء
        </span>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-slate-300 border border-white shadow-xs" />
              <span className="text-[8px] font-bold text-slate-800 mt-1">عضو الفريق</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 7. TABS WIREFRAME
  if (template.category === 'tabs') {
    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
        <div className="flex justify-center gap-1">
          <span className="bg-blue-600 text-white text-[8px] font-bold px-2 py-0.5 rounded">
            التبويب الأول
          </span>
          <span className="bg-slate-200 text-slate-700 text-[8px] px-2 py-0.5 rounded">
            التبويب الثاني
          </span>
          <span className="bg-slate-200 text-slate-700 text-[8px] px-2 py-0.5 rounded">
            التبويب الثالث
          </span>
        </div>
        <div className="bg-white p-2 rounded-lg border border-slate-200 text-[9px] text-slate-500 text-center">
          محتوى تفاعلي يتبدل حسب التبويب النشط
        </div>
      </div>
    );
  }

  // 8. ACCORDION WIREFRAME
  if (template.category === 'accordion') {
    if (type === 'accordion-2-col') {
      return (
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1 text-right">
          <span className="text-[10px] font-bold text-slate-800 block text-center">
            الأسئلة الشائعة في عمودين
          </span>
          <div className="grid grid-cols-2 gap-1 text-[8px]">
            <div className="bg-white p-1 rounded border border-slate-200 font-bold text-slate-700">
              شروط الاستئجار ▾
            </div>
            <div className="bg-white p-1 rounded border border-slate-200 font-bold text-slate-700">
              تأمين المركبات ▸
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
        <div className="bg-white p-1.5 rounded-lg border border-slate-200 flex justify-between text-[9px] font-bold text-slate-800">
          <span>السؤال الأول وكيفية الاستخدام؟</span>
          <span>▾</span>
        </div>
        <div className="bg-white p-1.5 rounded-lg border border-slate-200 flex justify-between text-[9px] font-bold text-slate-800">
          <span>طرق الدفع وخيارات التقسيط المتاحة؟</span>
          <span>▸</span>
        </div>
      </div>
    );
  }

  // 9. TESTIMONIALS WIREFRAME
  if (template.category === 'testimonials') {
    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-center">
        <div className="flex justify-center text-amber-400 gap-0.5">
          <Star className="w-3 h-3 fill-amber-400" />
          <Star className="w-3 h-3 fill-amber-400" />
          <Star className="w-3 h-3 fill-amber-400" />
          <Star className="w-3 h-3 fill-amber-400" />
          <Star className="w-3 h-3 fill-amber-400" />
        </div>
        <p className="text-[9px] text-slate-600 italic">"خدمة استثنائية وسرعة فائقة في التنفيذ"</p>
        <span className="text-[8px] font-bold text-slate-900 block">
          عبدالله السالم - عميل موثق
        </span>
      </div>
    );
  }

  // 10. CONTACT WIREFRAME
  if (template.category === 'contact') {
    if (type === 'contact-booking') {
      return (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1 text-right text-white">
          <span className="text-[10px] font-bold text-slate-200 block text-center">
            نموذج حجز تجربة قيادة
          </span>
          <div className="grid grid-cols-2 gap-1 text-[8px]">
            <div className="h-4 bg-white/10 rounded px-1 flex items-center text-slate-300">
              الاسم
            </div>
            <div className="h-4 bg-white/10 rounded px-1 flex items-center text-slate-300">
              الجوال
            </div>
          </div>
          <div className="h-4 bg-blue-600 rounded text-[8px] font-bold flex items-center justify-center text-white">
            تأكيد موعد التجربة
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
        <span className="text-[10px] font-bold text-slate-800 block text-center">
          تواصل معنا واستفسر الآن
        </span>
        <div className="space-y-1">
          <div className="h-5 bg-white border border-slate-200 rounded px-1.5 text-[8px] text-slate-400 flex items-center">
            الاسم الكامل
          </div>
          <div className="h-5 bg-white border border-slate-200 rounded px-1.5 text-[8px] text-slate-400 flex items-center">
            رقم الجوال
          </div>
          <div className="h-5 bg-blue-600 rounded text-white text-[8px] font-bold flex items-center justify-center">
            إرسال الرسالة
          </div>
        </div>
      </div>
    );
  }

  // 11. CTA WIREFRAME
  if (template.category === 'cta') {
    if (type === 'cta-countdown') {
      return (
        <div className="w-full bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl p-2.5 text-center space-y-1">
          <span className="text-[9px] font-black text-amber-400 block">⚡ عرض موسمي محدود</span>
          <span className="text-[10px] font-bold block">خصم 20% على باقات الصيانة الشاملة</span>
          <div className="flex justify-center gap-1 text-[8px]">
            <span className="bg-white/10 px-1 py-0.5 rounded font-mono">03 أيام</span>
            <span className="bg-white/10 px-1 py-0.5 rounded font-mono">14 ساعة</span>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-slate-900 text-white rounded-xl p-3 text-center space-y-1.5">
        <span className="text-[10px] font-bold block">جاهز لبدء مشروعك القادم معنا؟</span>
        <span className="inline-block bg-blue-500 text-white text-[8px] font-bold px-3 py-1 rounded-full">
          ابدأ مجاناً الآن
        </span>
      </div>
    );
  }

  // 12. CONTENT WIREFRAME
  if (template.category === 'content') {
    return (
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <div className="h-2.5 bg-slate-800 rounded w-3/4" />
          <div className="h-2 bg-slate-300 rounded w-full" />
          <div className="h-2 bg-slate-300 rounded w-2/3" />
        </div>
        <div className="w-12 h-10 bg-slate-300 rounded-md shrink-0" />
      </div>
    );
  }

  return null;
};
