'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Zap, Play, Pause, Trash2, Edit, Plus, Search, RefreshCw, Filter, ChevronDown, Info, Target, BookOpen, Zap as ZapIcon, Link2, ChevronRight, Lightbulb, XCircle, Calendar, Clock, CheckCircle2, AlertCircle, Settings, Repeat, Mail } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type Automation = {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'notification' | 'task' | 'report';
  trigger: string;
  action: string;
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  nextRun: string;
  runCount: number;
  successRate: number;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  email: { label: 'بريد إلكتروني', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Mail size={12} /> },
  notification: { label: 'إشعار', color: 'text-purple-600', bg: 'bg-purple-100', icon: <AlertCircle size={12} /> },
  task: { label: 'مهمة', color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle2 size={12} /> },
  report: { label: 'تقرير', color: 'text-amber-600', bg: 'bg-amber-100', icon: <Settings size={12} /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active: { label: 'نشط', color: 'text-green-600', bg: 'bg-green-100', icon: <Play size={12} /> },
  paused: { label: 'متوقف', color: 'text-amber-600', bg: 'bg-amber-100', icon: <Pause size={12} /> },
  error: { label: 'خطأ', color: 'text-red-600', bg: 'bg-red-100', icon: <XCircle size={12} /> },
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
              <Zap size={14} className="text-green-500 mt-0.5 shrink-0" />
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

export default function AiAutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [guideOpen, setGuideOpen] = useState(false);

  const { shop } = useShop();

  const loadAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      
      // TODO: Replace with actual API call
      // const data = await apiRequest(`/ai/automations/shop/${sid}`);
      // setAutomations(Array.isArray(data) ? data : []);
      setAutomations([]);
    } catch { setAutomations([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAutomations(); }, [loadAutomations]);

  const filteredAndSorted = useMemo(() => {
    let result = automations.filter(automation => 
      automation.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      automation.description.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    if (filterType !== 'all') {
      result = result.filter(automation => automation.type === filterType);
    }

    if (filterStatus !== 'all') {
      result = result.filter(automation => automation.status === filterStatus);
    }

    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'runCount') {
        comparison = a.runCount - b.runCount;
      } else if (sortBy === 'successRate') {
        comparison = a.successRate - b.successRate;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [automations, debouncedSearch, filterType, filterStatus, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => {
    const total = automations.length;
    const active = automations.filter(a => a.status === 'active').length;
    const totalRuns = automations.reduce((s, a) => s + a.runCount, 0);
    const avgSuccessRate = automations.length > 0 ? automations.reduce((s, a) => s + a.successRate, 0) / automations.length : 0;
    return [
      { label: 'إجمالي الأتمتة', value: total, bg: 'bg-blue-50', color: 'text-blue-600' },
      { label: 'نشطة', value: active, bg: 'bg-green-50', color: 'text-green-600' },
      { label: 'إجمالي التشغيل', value: totalRuns.toLocaleString(), bg: 'bg-purple-50', color: 'text-purple-600' },
      { label: 'متوسط النجاح', value: `${avgSuccessRate.toFixed(0)}%`, bg: 'bg-amber-50', color: 'text-amber-600' },
    ];
  }, [automations]);

  const typeCounts = useMemo(() => 
    Object.keys(TYPE_CONFIG).map(key => ({
      key,
      count: automations.filter(a => a.type === key).length,
      ...TYPE_CONFIG[key]
    })), [automations]
  );

  const automationsGuide: AIGuideData = {
    purpose: 'أتمتة المهام المتكررة في المتجر باستخدام الذكاء الاصطناعي لتوفير الوقت والجهد.',
    whenToUse: 'استخدم هذه الصفحة لإنشاء وإدارة الأتمتة، مراقبة الأداء، وتحسين العمليات.',
    whatsInside: [
      'أتمتة البريد الإلكتروني',
      'أتمتة الإشعارات',
      'أتمتة المهام',
      'أتمتة التقارير',
      'مراقبة الأداء',
      'تصفية وبحث متقدم'
    ],
    steps: [
      { title: 'إنشاء أتمتة', description: 'أنشئ أتمتة جديدة بتحديد المشغل والإجراء' },
      { title: 'تخصيص القواعد', description: 'حدد القواعد والشروط للتشغيل' },
      { title: 'تفعيل الأتمتة', description: 'فعل الأتمتة لبدء العمل تلقائياً' },
      { title: 'مراقبة الأداء', description: 'راقب أداء الأتمتة وعدد التشغيلات' }
    ],
    bestPractices: [
      'ابدأ بأتمتة بسيطة',
      'راجع الأداء بانتظام',
      'عدل القواعد حسب الحاجة',
      'راقب معدل النجاح'
    ],
    tips: [
      'الأتمتة توفر الوقت والجهد',
      'يمكنك إيقاف الأتمتة في أي وقت',
      'راقب معدل النجاح للتأكد من الفعالية'
    ],
    shortcuts: [
      'استخدم مفتاح Enter للبحث السريع',
      'اضغط F5 لتحديث البيانات'
    ],
    relatedLinks: [
      { label: 'الذكاء الاصطناعي', onClick: () => window.location.href = '/dashboard/ai' },
      { label: 'رؤى AI', onClick: () => window.location.href = '/dashboard/ai/insights' },
      { label: 'تحليلات AI', onClick: () => window.location.href = '/dashboard/ai/analysis' }
    ]
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Zap size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">أتمتة AI</h1>
            <button onClick={() => setGuideOpen(true)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all" title="معلومات / Info">
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">أتمتة المهام بالذكاء الاصطناعي</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all">
          <Plus size={16} />
          <span>إنشاء أتمتة</span>
        </button>
        <button onClick={loadAutomations} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all">
          <RefreshCw size={16} />
          <span>تحديث</span>
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
        {typeCounts.map(t => (
          <button 
            key={t.key} 
            onClick={() => setFilterType(filterType === t.key ? 'all' : t.key)}
            className={`p-3 rounded-xl border text-center transition-all ${
              filterType === t.key ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-200 bg-white'
            }`}
          >
            <div className={`flex items-center justify-center gap-1 mb-1 ${t.color}`}>
              {t.icon}
              <span className="text-xs font-bold">{t.label}</span>
            </div>
            <div className="text-lg font-black text-slate-900">{t.count}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600">الحالة:</span>
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
        >
          <option value="all">الكل</option>
          <option value="active">نشط</option>
          <option value="paused">متوقف</option>
          <option value="error">خطأ</option>
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
          <option value="name">الاسم</option>
          <option value="runCount">عدد التشغيل</option>
          <option value="successRate">معدل النجاح</option>
        </select>
      </div>

      <div className="relative">
        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن أتمتة..."
          className="w-full pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
        </div>
      ) : paginatedData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Zap size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm">لا توجد أتمتة</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {paginatedData.map((automation) => (
              <div key={automation.id} className="p-4 hover:bg-slate-50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      automation.status === 'active' ? 'bg-green-50' : 
                      automation.status === 'paused' ? 'bg-amber-50' : 
                      'bg-red-50'
                    }`}>
                      {STATUS_CONFIG[automation.status].icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-900">{automation.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{automation.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      TYPE_CONFIG[automation.type].bg
                    } ${TYPE_CONFIG[automation.type].color}`}>
                      {TYPE_CONFIG[automation.type].label}
                    </span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-xs text-slate-500 mb-1">المشغل: {automation.trigger}</div>
                  <div className="text-xs text-slate-500">الإجراء: {automation.action}</div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">آخر تشغيل</div>
                    <div className="text-xs font-semibold text-slate-700">{new Date(automation.lastRun).toLocaleDateString('ar-EG')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">التالي</div>
                    <div className="text-xs font-semibold text-slate-700">{new Date(automation.nextRun).toLocaleDateString('ar-EG')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">عدد التشغيل</div>
                    <div className="text-xs font-semibold text-slate-700">{automation.runCount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">معدل النجاح</div>
                    <div className={`text-xs font-semibold ${
                      automation.successRate >= 80 ? 'text-green-600' : 
                      automation.successRate >= 50 ? 'text-amber-600' : 
                      'text-red-600'
                    }`}>
                      {automation.successRate.toFixed(0)}%
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all" title="تعديل">
                      <Edit size={14} />
                    </button>
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="حذف">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <button className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    automation.status === 'active' 
                      ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}>
                    {automation.status === 'active' ? (
                      <>
                        <Pause size={12} />
                        إيقاف
                      </>
                    ) : (
                      <>
                        <Play size={12} />
                        تشغيل
                      </>
                    )}
                  </button>
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
        <InfoDrawer title="أتمتة AI" onClose={() => setGuideOpen(false)}>
          <AIGuideContent guide={automationsGuide} />
        </InfoDrawer>
      )}
    </div>
  );
}