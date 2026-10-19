'use client';

import React, { useEffect, useState } from 'react';
import {
  Bot, Image, Search, BarChart3, Zap, Sparkles, Loader2, Info, Target, BookOpen, Zap as ZapIcon, Link2, ChevronRight, Lightbulb, XCircle, Calendar
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';

/* ============================================================
 * AI Guide System
 * ============================================================ */

type GuideStep = {
  title: string;
  description: string;
};

type GuideLink = {
  label: string;
  onClick?: () => void;
};

type AIGuideData = {
  purpose: string;
  whenToUse: string;
  whatsInside: string[];
  steps: GuideStep[];
  bestPractices: string[];
  tips: string[];
  shortcuts: string[];
  relatedLinks?: GuideLink[];
};

const GuideSectionBlock: React.FC<{
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

const AIGuideContent: React.FC<{ guide: AIGuideData }> = ({ guide }) => (
  <div className="space-y-4">
    <GuideSectionBlock icon={Target} iconColor="text-blue-600" iconBg="bg-blue-50" heading="وظيفة الصفحة / Page Purpose">
      <p className="text-slate-600 text-sm leading-relaxed">{guide.purpose}</p>
    </GuideSectionBlock>

    <GuideSectionBlock icon={Calendar} iconColor="text-amber-600" iconBg="bg-amber-50" heading="متى تستخدمها / When to Use">
      <p className="text-slate-600 text-sm leading-relaxed">{guide.whenToUse}</p>
    </GuideSectionBlock>

    <GuideSectionBlock icon={BookOpen} iconColor="text-purple-600" iconBg="bg-purple-50" heading="ماذا ستجد داخلها / What's Inside">
      <ul className="space-y-1.5">
        {guide.whatsInside.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
            <ChevronRight size={14} className="text-slate-300 mt-0.5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </GuideSectionBlock>

    {guide.steps.length > 0 && (
      <GuideSectionBlock icon={ZapIcon} iconColor="text-cyan-600" iconBg="bg-cyan-50" heading="خطوات الاستخدام / How to Use">
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
      </GuideSectionBlock>
    )}

    {guide.bestPractices.length > 0 && (
      <GuideSectionBlock icon={Target} iconColor="text-green-600" iconBg="bg-green-50" heading="أفضل الممارسات / Best Practices">
        <ul className="space-y-1.5">
          {guide.bestPractices.map((practice, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
              <Sparkles size={14} className="text-green-500 mt-0.5 shrink-0" />
              {practice}
            </li>
          ))}
        </ul>
      </GuideSectionBlock>
    )}

    {guide.tips.length > 0 && (
      <GuideSectionBlock icon={Lightbulb} iconColor="text-amber-600" iconBg="bg-amber-50" heading="نصائح / Tips">
        <ul className="space-y-1.5">
          {guide.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
              <ZapIcon size={14} className="text-amber-500 mt-0.5 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </GuideSectionBlock>
    )}

    {guide.shortcuts.length > 0 && (
      <GuideSectionBlock icon={Link2} iconColor="text-indigo-600" iconBg="bg-indigo-50" heading="اختصارات / Shortcuts">
        <ul className="space-y-1.5">
          {guide.shortcuts.map((shortcut, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
              <ChevronRight size={14} className="text-indigo-400 mt-0.5 shrink-0" />
              {shortcut}
            </li>
          ))}
        </ul>
      </GuideSectionBlock>
    )}

    {guide.relatedLinks && guide.relatedLinks.length > 0 && (
      <GuideSectionBlock icon={Link2} iconColor="text-slate-600" iconBg="bg-slate-100" heading="روابط ذات صلة / Related Links">
        <div className="flex flex-wrap gap-2">
          {guide.relatedLinks.map((link, i) => (
            <button
              key={i}
              onClick={link.onClick}
              className="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-all"
            >
              {link.label}
            </button>
          ))}
        </div>
      </GuideSectionBlock>
    )}
  </div>
);

const InfoDrawer: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => (
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
        <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
          <XCircle size={20} />
        </button>
      </div>
      <div className="px-6 py-5 space-y-5 text-sm text-slate-600 leading-relaxed">{children}</div>
      <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-3">
        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
          حسناً
        </button>
      </div>
    </div>
  </div>
);

export default function AiPage() {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);

  const aiGuide: AIGuideData = {
    purpose: 'مركز الذكاء الاصطناعي المتكامل لمتجرك مع أدوات متعددة لتحسين الأداء والتجربة.',
    whenToUse: 'استخدم هذه الصفحة كنقطة بداية للوصول لجميع أدوات الذكاء الاصطناعي المتاحة.',
    whatsInside: [
      'توليد الصور بالذكاء الاصطناعي',
      'تحسين SEO للمتجر',
      'تحليل البيانات الذكي',
      'رؤى وتوصيات ذكية',
      'أتمتة المهام المتكررة'
    ],
    steps: [
      { title: 'اختر الأداة', description: 'اختر الأداة المناسبة من القائمة' },
      { title: 'استخدم الأداة', description: 'استخدم الأداة لتحسين متجرك' },
      { title: 'راجع النتائج', description: 'راجع النتائج والتوصيات' },
      { title: 'طبق التغييرات', description: 'طبق التغييرات المقترحة' }
    ],
    bestPractices: [
      'استخدم الأدوات بانتظام',
      'راجع التوصيات بعناية',
      'طبق التغييرات تدريجياً',
      'راقب النتائج'
    ],
    tips: [
      'الذكاء الاصطناعي يساعد في اتخاذ القرارات',
      'استخدم توليد الصور لتحسين المنتجات',
      'الأتمتة توفر الوقت والجهد'
    ],
    shortcuts: [
      'اضغط على أي أداة للوصول المباشر',
      'استخدم قسم الرؤى للحصول على توصيات'
    ],
    relatedLinks: [
      { label: 'صور AI', onClick: () => window.location.href = '/dashboard/ai/images' },
      { label: 'تحسين SEO', onClick: () => window.location.href = '/dashboard/ai/seo' },
      { label: 'تحليلات AI', onClick: () => window.location.href = '/dashboard/ai/analysis' },
      { label: 'رؤى AI', onClick: () => window.location.href = '/dashboard/ai/insights' },
      { label: 'أتمتة AI', onClick: () => window.location.href = '/dashboard/ai/automations' }
    ]
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest('/shops/me');
        setShop(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const aiTools = [
    { icon: Image, title: 'توليد الصور', desc: 'إنشاء صور للمنتجات باستخدام الذكاء الاصطناعي', color: 'bg-purple-50 text-purple-600', href: '/dashboard/ai/images' },
    { icon: Search, title: 'تحسين SEO', desc: 'تحسين محركات البحث للمتجر والمنتجات', color: 'bg-blue-50 text-blue-600', href: '/dashboard/ai/seo' },
    { icon: BarChart3, title: 'تحليل البيانات', desc: 'تحليل أداء المتجر والمبيعات', color: 'bg-green-50 text-green-600', href: '/dashboard/ai/analysis' },
    { icon: Sparkles, title: 'رؤى ذكية', desc: 'توصيات ذكية لتحسين المتجر', color: 'bg-amber-50 text-amber-600', href: '/dashboard/ai/insights' },
    { icon: Zap, title: 'الأتمتة', desc: 'أتمتة المهام المتكررة في المتجر', color: 'bg-cyan-50 text-cyan-600', href: '/dashboard/ai/automations' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-row-reverse">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Bot size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">الذكاء الاصطناعي</h1>
            <button onClick={() => setGuideOpen(true)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all" title="معلومات / Info">
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">أدوات ذكية لتحسين متجرك</p>
        </div>
      </div>

      {/* AI Tools grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiTools.map((tool, i) => (
          <a
            key={i}
            href={tool.href}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${tool.color}`}>
              <tool.icon size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5 text-right">{tool.title}</h3>
            <p className="text-xs text-slate-500 text-right leading-relaxed">{tool.desc}</p>
          </a>
        ))}
      </div>

      {/* AI Chat preview */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={32} className="text-[#00E5FF]" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">مساعد ذكي لمتجرك</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
          احصل على توصيات ذكية لتحسين منتجاتك ومتجرك باستخدام الذكاء الاصطناعي
        </p>
        <a
          href="/dashboard/ai/insights"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#00E5FF] text-slate-900 rounded-xl font-bold text-sm hover:bg-[#00B8D9] transition-all"
        >
          <Sparkles size={18} />
          ابدأ الآن
        </a>
      </div>

      {guideOpen && (
        <InfoDrawer title="الذكاء الاصطناعي" onClose={() => setGuideOpen(false)}>
          <AIGuideContent guide={aiGuide} />
        </InfoDrawer>
      )}
    </div>
  );
}
