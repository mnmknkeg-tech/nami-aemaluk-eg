'use client';

/**
 * دليل استخدام صفحات الموارد البشرية — النظام الموحد الذي كان منسوخاً
 * في كل صفحة، الآن مكوّن واحد يستقبل مفتاح الصفحة ويعرض دليلها.
 */
import React from 'react';
import {
  Info, XCircle, Target, Clock, BookOpen, Zap, CheckCircle2, Lightbulb, ChevronRight,
} from 'lucide-react';

export type HrGuideStep = { title: string; description: string };

export type HrGuideData = {
  purpose: string;
  whenToUse: string;
  whatsInside: string[];
  steps: HrGuideStep[];
  bestPractices: string[];
  tips: string[];
};

const SectionBlock: React.FC<{
  icon: any;
  iconColor: string;
  iconBg: string;
  heading: string;
  children: React.ReactNode;
}> = ({ icon: Icon, iconColor, iconBg, heading, children }) => (
  <div className="rounded-xl border border-slate-100 p-4 bg-white">
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${iconBg} ${iconColor} shrink-0`}>
        <Icon size={16} />
      </div>
      <h4 className="font-bold text-slate-900 text-sm">{heading}</h4>
    </div>
    {children}
  </div>
);

const GuideContent: React.FC<{ guide: HrGuideData }> = ({ guide }) => (
  <div className="space-y-4">
    <SectionBlock icon={Target} iconColor="text-blue-600" iconBg="bg-blue-50" heading="وظيفة الصفحة / Page Purpose">
      <p className="text-slate-600 text-sm leading-relaxed">{guide.purpose}</p>
    </SectionBlock>

    <SectionBlock icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" heading="متى تستخدمها / When to Use">
      <p className="text-slate-600 text-sm leading-relaxed">{guide.whenToUse}</p>
    </SectionBlock>

    <SectionBlock icon={BookOpen} iconColor="text-purple-600" iconBg="bg-purple-50" heading="ماذا ستجد داخلها / What's Inside">
      <ul className="space-y-1.5">
        {guide.whatsInside.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
            <ChevronRight size={14} className="text-slate-300 mt-0.5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </SectionBlock>

    {guide.steps.length > 0 && (
      <SectionBlock icon={Zap} iconColor="text-cyan-600" iconBg="bg-cyan-50" heading="خطوات الاستخدام / How to Use">
        <ol className="space-y-2">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold shrink-0">{i + 1}</span>
              <div>
                <div className="font-semibold text-slate-900">{step.title}</div>
                <div className="text-slate-500">{step.description}</div>
              </div>
            </li>
          ))}
        </ol>
      </SectionBlock>
    )}

    {guide.bestPractices.length > 0 && (
      <SectionBlock icon={CheckCircle2} iconColor="text-green-600" iconBg="bg-green-50" heading="أفضل الممارسات / Best Practices">
        <ul className="space-y-1.5">
          {guide.bestPractices.map((practice, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
              <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
              {practice}
            </li>
          ))}
        </ul>
      </SectionBlock>
    )}

    {guide.tips.length > 0 && (
      <SectionBlock icon={Lightbulb} iconColor="text-amber-600" iconBg="bg-amber-50" heading="نصائح / Tips">
        <ul className="space-y-1.5">
          {guide.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
              <Zap size={14} className="text-amber-500 mt-0.5 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </SectionBlock>
    )}
  </div>
);

export const HR_PAGE_GUIDES: Record<string, HrGuideData> = {
  employees: {
    purpose: 'إدارة قائمة موظفي المتجر — الإضافة والتعديل والحذف وربط كل موظف بوظيفته وراتبه.',
    whenToUse: 'عند تعيين موظف جديد أو تحديث بيانات موظف قائم أو متابعة رواتب الفريق.',
    whatsInside: [
      'قائمة الموظفين مع البحث والفلترة حسب الحالة',
      'إضافة وتعديل وحذف الموظفين',
      'رصد الراتب الأساسي وتاريخ التعيين لكل موظف',
      'إحصائيات سريعة عن الفريق',
    ],
    steps: [
      { title: 'إضافة موظف', description: 'اضغط زر «إضافة موظف» في الهيدر واملأ الاسم والمنصب والراتب' },
      { title: 'تعديل بيانات', description: 'اضغط أيقونة التعديل في صف الموظف لتحديث بياناته' },
      { title: 'تفعيل/إيقاف', description: 'بدّل حالة الموظف بين نشط وغير نشط من الصف مباشرة' },
    ],
    bestPractices: [
      'اكتب المنصب بشكل واضح لأنه يظهر في الحضور والرواتب والمهام',
      'حدّث الراتب الأساسي عند أي تغيير في العقد',
      'أوقف الموظف المنتهية خدمته بدلاً من حذفه للحفاظ على السجلات',
    ],
    tips: [
      'بيانات الموظفين تُحفظ على الباكند وتظهر في كل صفحات الموارد البشرية',
      'استخدم البحث للوصول السريع لأي موظف بالاسم أو الهاتف أو البريد',
    ],
  },
  attendance: {
    purpose: 'تسجيل ومتابعة حضور الموظفين اليومي — حضور، تأخير، غياب — مع ساعات العمل.',
    whenToUse: 'بداية كل يوم عمل لتسجيل الحضور، أو نهاية الشهر لمراجعة انتظام الفريق.',
    whatsInside: [
      'سجل الحضور كاملاً مع البحث والفلترة حسب الحالة والتاريخ',
      'تسجيل حضور يدوي لأي موظف',
      'تصدير السجل CSV',
      'إحصائيات سريعة عن الحضور اليوم',
    ],
    steps: [
      { title: 'تسجيل حضور', description: 'اضغط «تسجيل حضور» واختر الموظف ووقت الحضور' },
      { title: 'الفلترة', description: 'استخدم التابات (حاضر/متأخر/غائب) وشريط التاريخ' },
      { title: 'التصدير', description: 'اضغط «تصدير CSV» لتنزيل السجل الحالي' },
    ],
    bestPractices: [
      'سجّل الحضور يومياً حتى تظهر الإحصائيات صحيحة',
      'استخدم حالة «متأخر» بدلاً من الحضور بدون وقت محدد',
    ],
    tips: [
      'الانصراف يُسجَّل من صفحة «الانصراف» ويتكامل مع سجل الحضور',
      'الترتيب الافتراضي: الأحدث أولاً',
    ],
  },
  checkout: {
    purpose: 'تسجيل انصراف الموظفين وحساب ساعات العمل اليومية تلقائياً.',
    whenToUse: 'عند مغادرة أي موظف للعمل لتسجيل وقت الانصراف وساعات اليوم.',
    whatsInside: [
      'سجل الانصرافات مع البحث والفلترة',
      'تسجيل انصراف لموظف مع وقت الدخول والخروج',
      'حساب ساعات العمل تلقائياً',
      'تصدير السجل CSV',
    ],
    steps: [
      { title: 'تسجيل انصراف', description: 'اضغط «تسجيل انصراف» واختر الموظف ووقت الخروج' },
      { title: 'المراجعة', description: 'راجع ساعات اليوم لكل موظف من الجدول' },
      { title: 'التصدير', description: 'صدّر السجل للمراجعة الخارجية أو الرواتب' },
    ],
    bestPractices: [
      'سجّل الانصراف في نفس اليوم لضمان دقة ساعات العمل',
      'قارن ساعات العمل بالدوام المتفق عليه شهرياً',
    ],
    tips: [
      'ساعات العمل تُحسب من فرق وقت الدخول والخروج',
      'سجل الانصراف مفيد عند مراجعة الرواتب والإجازات',
    ],
  },
  payroll: {
    purpose: 'إدارة رواتب الموظفين — تسجيل المستحقات ومتابعة ما تم صرفه وما هو معلق.',
    whenToUse: 'نهاية كل شهر عند صرف الرواتب، أو في أي وقت لإضافة صرفية جزئية.',
    whatsInside: [
      'سجل الرواتب مع الفلترة حسب الحالة والشهر',
      'إضافة راتب جديد لأي موظف',
      'إجماليات المصروف والمعلق',
      'تصدير السجل CSV',
    ],
    steps: [
      { title: 'إضافة راتب', description: 'اضغط «إضافة راتب» واختر الموظف والمبلغ والفترة' },
      { title: 'المتابعة', description: 'تابع التابات (مدفوع/معلق) لمعرفة الوضع المالي' },
      { title: 'المراجعة', description: 'راجع عمود «صُرف في» لمعرفة تاريخ الصرف الفعلي' },
    ],
    bestPractices: [
      'اكتب الفترة بوضوح مثل «2026-09» أو «سبتمبر 2026»',
      'راجع إجمالي الرواتب الشهرية قبل الاعتماد',
    ],
    tips: [
      'الرواتب المدفوعة تُسجَّل بتاريخ الصرف تلقائياً',
      'الراتب الأساسي لكل موظف يُدار من صفحة الموظفين',
    ],
  },
  leaves: {
    purpose: 'طلبات إجازات الموظفين — إنشاء الطلب والموافقة عليه أو رفضه.',
    whenToUse: 'عند تقديم موظف طلب إجازة أو مراجعة الطلبات المعلقة.',
    whatsInside: [
      'كل طلبات الإجازة مع نوعها ومدتها وسببها',
      'الموافقة أو الرفض لكل طلب معلّق',
      'فلترة حسب النوع والحالة',
      'إضافة طلب إجازة جديد',
    ],
    steps: [
      { title: 'إنشاء طلب', description: 'اضغط «طلب إجازة» واختر الموظف والنوع والمدة' },
      { title: 'المراجعة', description: 'راجع الطلبات المعلقة من تاب «معلقة»' },
      { title: 'القرار', description: 'اضغط موافقة أو رفض في صف الطلب' },
    ],
    bestPractices: [
      'اكتب سبب الإجازة بوضوح لتسهيل المراجعة',
      'راجع أرصدة الإجازات السنوية قبل الموافقة',
    ],
    tips: [
      'عدد الأيام يُحسب تلقائياً من تاريخ البداية والنهاية',
      'الطلب المرفوض يبقى في السجل للمراجعة',
    ],
  },
  tasks: {
    purpose: 'إسناد ومتابعة مهام الفريق — الأولوية والحالة وتاريخ الاستحقاق.',
    whenToUse: 'عند توزيع مهام يومية أو أسبوعية على الموظفين ومتابعة إنجازها.',
    whatsInside: [
      'كل المهام مع المسند إليه والأولوية والحالة',
      'إنشاء وتعديل وحذف المهام',
      'تحديث حالة المهمة من الصف مباشرة',
      'تنبيه للمهام المتأخرة',
    ],
    steps: [
      { title: 'إضافة مهمة', description: 'اضغط «إضافة مهمة» وحدد العنوان والمسند إليه والأولوية' },
      { title: 'المتابعة', description: 'بدّل حالة المهمة (للتنفيذ/جاري التنفيذ/منجزة) من الصف' },
      { title: 'التعديل', description: 'اضغط أيقونة التعديل لتحديث تفاصيل المهمة' },
    ],
    bestPractices: [
      'حدد تاريخ استحقاق واقعي لكل مهمة',
      'راجع المهام المتأخرة يومياً',
    ],
    tips: [
      'المهام المتأخرة تظهر بلون تحذيري',
      'الفلترة بالأولوية تساعد في ترتيب اليوم',
    ],
  },
  permissions: {
    purpose: 'إدارة أدوار وصلاحيات الفريق — تحكم كامل في ما يستطيع كل دور الوصول إليه.',
    whenToUse: 'عند تعيين موظف لدور جديد أو تعديل صلاحيات الأدوار القائمة.',
    whatsInside: [
      'قائمة الأدوار مع عدد المستخدمين لكل دور',
      'مصفوفة صلاحيات لكل دور (وحدات × إجراءات)',
      'سجل النشاطات لأي تغيير في الصلاحيات',
      'إنشاء وتعديل وحذف الأدوار',
    ],
    steps: [
      { title: 'إنشاء دور', description: 'اضغط «إضافة دور» وسمّه وحدد صلاحياته من المصفوفة' },
      { title: 'صلاحية كاملة', description: 'فعّل «وصول كامل» للأدوار الإدارية فقط' },
      { title: 'المراجعة', description: 'تابع سجل النشاطات لمعرفة من عدّل ماذا' },
    ],
    bestPractices: [
      'اتبع مبدأ أقل صلاحية — امنح كل دور ما يحتاجه فقط',
      'لا تمنح «وصول كامل» إلا للمديرين الموثوقين',
    ],
    tips: [
      'الأدوار النظامية لا يمكن حذفها',
      'عدد الموظفين المرتبطين بكل دور يظهر في بطاقة الدور',
    ],
  },
};

export type HrGuidePageKey = keyof typeof HR_PAGE_GUIDES;

/** الدرج الموحد لدليل الاستخدام — يفتح من زر المعلومات في الهيدر */
export function HRGuideDrawer({
  page,
  title,
  open,
  onClose,
}: {
  page: HrGuidePageKey;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  const guide = HR_PAGE_GUIDES[page];
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-[fadeIn_0.15s_ease-out]" />
      <div
        className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Info size={20} className="text-slate-400" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
          >
            <XCircle size={20} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5 text-sm text-slate-600 leading-relaxed">
          {guide ? <GuideContent guide={guide} /> : <p>لا يوجد دليل لهذه الصفحة.</p>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            حسناً
          </button>
        </div>
      </div>
    </div>
  );
}
