'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Loader2, Search, RefreshCw, Filter, ChevronDown, Info, Target, BookOpen, Zap, Link2, ChevronRight, Lightbulb, XCircle, Calendar, Lightbulb as LightbulbIcon, Star, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type Insight = {
  id: string;
  category: 'sales' | 'products' | 'customers' | 'operations';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actions: string[];
  expectedOutcome: string;
  createdAt: string;
  status: 'new' | 'viewed' | 'implemented' | 'dismissed';
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  sales: { label: 'المبيعات', color: 'text-blue-600', bg: 'bg-blue-100', icon: <TrendingUp size={12} /> },
  products: { label: 'المنتجات', color: 'text-purple-600', bg: 'bg-purple-100', icon: <Sparkles size={12} /> },
  customers: { label: 'العملاء', color: 'text-green-600', bg: 'bg-green-100', icon: <Star size={12} /> },
  operations: { label: 'العمليات', color: 'text-amber-600', bg: 'bg-amber-100', icon: <AlertTriangle size={12} /> },
};

const IMPACT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: 'عالي', color: 'text-red-600', bg: 'bg-red-100' },
  medium: { label: 'متوسط', color: 'text-amber-600', bg: 'bg-amber-100' },
  low: { label: 'منخفض', color: 'text-slate-600', bg: 'bg-slate-100' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  new: { label: 'جديد', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Sparkles size={12} /> },
  viewed: { label: 'تمت المشاهدة', color: 'text-slate-600', bg: 'bg-slate-100', icon: <CheckCircle2 size={12} /> },
  implemented: { label: 'تم التطبيق', color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle2 size={12} /> },
  dismissed: { label: 'مرفوض', color: 'text-red-600', bg: 'bg-red-100', icon: <XCircle size={12} /> },
};

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
      <GuideSectionBlock icon={Zap} iconColor="text-cyan-600" iconBg="bg-cyan-50" heading="خطوات الاستخدام / How to Use">
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
              <Zap size={14} className="text-amber-500 mt-0.5 shrink-0" />
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

export default function AiInsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterImpact, setFilterImpact] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [guideOpen, setGuideOpen] = useState(false);

  const { shop } = useShop();

  const loadInsights = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      
      // TODO: Replace with actual API call
      // const data = await apiRequest(`/ai/insights/shop/${sid}`);
      // setInsights(Array.isArray(data) ? data : []);
      setInsights([]);
    } catch { setInsights([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  const filteredAndSorted = useMemo(() => {
    let result = insights.filter(insight => 
      insight.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      insight.description.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    if (filterCategory !== 'all') {
      result = result.filter(insight => insight.category === filterCategory);
    }

    if (filterImpact !== 'all') {
      result = result.filter(insight => insight.impact === filterImpact);
    }

    if (filterStatus !== 'all') {
      result = result.filter(insight => insight.status === filterStatus);
    }

    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'confidence') {
        comparison = a.confidence - b.confidence;
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'impact') {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        comparison = impactOrder[a.impact] - impactOrder[b.impact];
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [insights, debouncedSearch, filterCategory, filterImpact, filterStatus, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => {
    const total = insights.length;
    const newInsights = insights.filter(i => i.status === 'new').length;
    const highImpact = insights.filter(i => i.impact === 'high').length;
    const avgConfidence = insights.length > 0 ? insights.reduce((s, i) => s + i.confidence, 0) / insights.length : 0;
    return [
      { label: 'إجمالي الرؤى', value: total, bg: 'bg-blue-50', color: 'text-blue-600' },
      { label: 'جديد', value: newInsights, bg: 'bg-green-50', color: 'text-green-600' },
      { label: 'تأثير عالي', value: highImpact, bg: 'bg-red-50', color: 'text-red-600' },
      { label: 'متوسط الثقة', value: `${avgConfidence.toFixed(0)}%`, bg: 'bg-purple-50', color: 'text-purple-600' },
    ];
  }, [insights]);

  const categoryCounts = useMemo(() => 
    Object.keys(CATEGORY_CONFIG).map(key => ({
      key,
      count: insights.filter(i => i.category === key).length,
      ...CATEGORY_CONFIG[key]
    })), [insights]
  );

  const insightsGuide: AIGuideData = {
    purpose: 'رؤى ذكية وتوصيات قابلة للتنفيذ لتحسين متجرك باستخدام الذكاء الاصطناعي.',
    whenToUse: 'استخدم هذه الصفحة للحصول على توصيات ذكية، مراجعة الرؤى، وتطبيق التحسينات المقترحة.',
    whatsInside: [
      'رؤى ذكية للمبيعات والمنتجات',
      'توصيات قابلة للتنفيذ',
      'تقييم التأثير والثقة',
      'تتبع حالة التطبيق',
      'تصفية وبحث متقدم'
    ],
    steps: [
      { title: 'راجع الرؤى', description: 'اطلع على جميع الرؤى والتوصيات المتاحة' },
      { title: 'قيم التأثير', description: 'راجع تأثير كل رؤية وثقة الذكاء الاصطناعي' },
      { title: 'طبق التوصيات', description: 'طبق التوصيات ذات التأثير العالي أولاً' },
      { title: 'راقب النتائج', description: 'راقب تأثير التغييرات المطبقة' }
    ],
    bestPractices: [
      'ركز على الرؤى ذات التأثير العالي',
      'راجع الرؤى الجديدة بانتظام',
      'طبق التوصيات تدريجياً',
      'قيّم النتائج بعد التطبيق'
    ],
    tips: [
      'الرؤى الجديدة تظهر أولاً',
      'الثقة العالية تعني دقة أعلى',
      'التأثير العالي يعني فائدة أكبر'
    ],
    shortcuts: [
      'استخدم مفتاح Enter للبحث السريع',
      'اضغط F5 لتحديث البيانات'
    ],
    relatedLinks: [
      { label: 'الذكاء الاصطناعي', onClick: () => window.location.href = '/dashboard/ai' },
      { label: 'تحليلات AI', onClick: () => window.location.href = '/dashboard/ai/analysis' },
      { label: 'أتمتة AI', onClick: () => window.location.href = '/dashboard/ai/automations' }
    ]
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Sparkles size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">رؤى AI</h1>
            <button onClick={() => setGuideOpen(true)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all" title="معلومات / Info">
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">رؤى ذكية وتوصيات</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={loadInsights} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all">
          <RefreshCw size={16} />
          <span>تحديث الرؤى</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className={`p-4 rounded-xl border ${stat.bg} ${stat.color}`}>
            <div className="text-xs font-bold mb-1">{stat.label}</div>
            <div className="text-xl font-black">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {categoryCounts.map(c => (
          <button 
            key={c.key} 
            onClick={() => setFilterCategory(filterCategory === c.key ? 'all' : c.key)}
            className={`p-3 rounded-xl border text-center transition-all ${
              filterCategory === c.key ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-200 bg-white'
            }`}
          >
            <div className={`flex items-center justify-center gap-1 mb-1 ${c.color}`}>
              {c.icon}
              <span className="text-xs font-bold">{c.label}</span>
            </div>
            <div className="text-lg font-black text-slate-900">{c.count}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600">التأثير:</span>
        </div>
        <select 
          value={filterImpact}
          onChange={(e) => setFilterImpact(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
        >
          <option value="all">الكل</option>
          <option value="high">عالي</option>
          <option value="medium">متوسط</option>
          <option value="low">منخفض</option>
        </select>
        <div className="flex items-center gap-2 mr-4">
          <ChevronDown size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600">الحالة:</span>
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
        >
          <option value="all">الكل</option>
          <option value="new">جديد</option>
          <option value="viewed">تمت المشاهدة</option>
          <option value="implemented">تم التطبيق</option>
          <option value="dismissed">مرفوض</option>
        </select>
        <div className="flex items-center gap-2 mr-4">
          <ChevronDown size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600">ترتيب:</span>
        </div>
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
        >
          <option value="confidence">الثقة</option>
          <option value="impact">التأثير</option>
          <option value="title">العنوان</option>
        </select>
      </div>

      <div className="relative">
        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن رؤية..."
          className="w-full pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
        </div>
      ) : paginatedData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Sparkles size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm">لا توجد رؤى</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {paginatedData.map((insight) => (
              <div key={insight.id} className="p-4 hover:bg-slate-50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      insight.status === 'new' ? 'bg-blue-50' : 
                      insight.status === 'implemented' ? 'bg-green-50' : 
                      'bg-slate-100'
                    }`}>
                      {STATUS_CONFIG[insight.status].icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-900">{insight.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{insight.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      IMPACT_CONFIG[insight.impact].bg
                    } ${IMPACT_CONFIG[insight.impact].color}`}>
                      {IMPACT_CONFIG[insight.impact].label}
                    </span>
                    <span className="text-xs text-slate-500">{insight.confidence}% ثقة</span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-xs text-slate-500 mb-1">الإجراءات المقترحة</div>
                  <div className="space-y-1">
                    {insight.actions.slice(0, 2).map((action, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <ArrowRight size={12} className="text-slate-400 mt-0.5 shrink-0" />
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    النتيجة المتوقعة: {insight.expectedOutcome}
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-all" title="موافق">
                      <ThumbsUp size={14} />
                    </button>
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="غير موافق">
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-semibold">
                صفحة {currentPage} من {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {guideOpen && (
        <InfoDrawer title="رؤى AI" onClose={() => setGuideOpen(false)}>
          <AIGuideContent guide={insightsGuide} />
        </InfoDrawer>
      )}
    </div>
  );
}