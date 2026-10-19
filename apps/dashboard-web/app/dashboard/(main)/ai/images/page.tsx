'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Image, Download, Trash2, Search, RefreshCw, Filter, ChevronDown, Info, Target, BookOpen, Zap, Link2, ChevronRight, Lightbulb, XCircle, Calendar, Sparkles, Upload, Wand2, Loader2, Copy, Check } from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type GeneratedImage = {
  id: string;
  prompt: string;
  imageUrl: string;
  thumbnailUrl: string;
  style: 'realistic' | 'artistic' | 'minimalist' | 'vibrant';
  productId?: string;
  productName?: string;
  createdAt: string;
  status: 'completed' | 'processing' | 'failed';
};

const STYLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  realistic: { label: 'واقعي', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Image size={12} /> },
  artistic: { label: 'فني', color: 'text-purple-600', bg: 'bg-purple-100', icon: <Sparkles size={12} /> },
  minimalist: { label: 'بسيط', color: 'text-slate-600', bg: 'bg-slate-100', icon: <Image size={12} /> },
  vibrant: { label: 'حيوي', color: 'text-amber-600', bg: 'bg-amber-100', icon: <Sparkles size={12} /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  completed: { label: 'مكتمل', color: 'text-green-600', bg: 'bg-green-100', icon: <Check size={12} /> },
  processing: { label: 'قيد المعالجة', color: 'text-amber-600', bg: 'bg-amber-100', icon: <Loader2 size={12} className="animate-spin" /> },
  failed: { label: 'فشل', color: 'text-red-600', bg: 'bg-red-100', icon: <XCircle size={12} /> },
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

export default function AiImagesPage() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [guideOpen, setGuideOpen] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { shop } = useShop();

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) { setLoading(false); return; }
      
      // TODO: Replace with actual API call
      // const data = await apiRequest(`/ai/images/shop/${sid}`);
      // setImages(Array.isArray(data) ? data : []);
      setImages([]);
    } catch { setImages([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadImages(); }, [loadImages]);

  const filteredAndSorted = useMemo(() => {
    let result = images.filter(img => 
      img.prompt.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (img.productName && img.productName.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );

    if (filterStyle !== 'all') {
      result = result.filter(img => img.style === filterStyle);
    }

    if (filterStatus !== 'all') {
      result = result.filter(img => img.status === filterStatus);
    }

    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'prompt') {
        comparison = a.prompt.localeCompare(b.prompt);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [images, debouncedSearch, filterStyle, filterStatus, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => {
    const total = images.length;
    const completed = images.filter(img => img.status === 'completed').length;
    const processing = images.filter(img => img.status === 'processing').length;
    return [
      { label: 'إجمالي الصور', value: total, bg: 'bg-blue-50', color: 'text-blue-600' },
      { label: 'مكتملة', value: completed, bg: 'bg-green-50', color: 'text-green-600' },
      { label: 'قيد المعالجة', value: processing, bg: 'bg-amber-50', color: 'text-amber-600' },
      { label: 'فشلت', value: images.filter(img => img.status === 'failed').length, bg: 'bg-red-50', color: 'text-red-600' },
    ];
  }, [images]);

  const styleCounts = useMemo(() => 
    Object.keys(STYLE_CONFIG).map(key => ({
      key,
      count: images.filter(img => img.style === key).length,
      ...STYLE_CONFIG[key]
    })), [images]
  );

  const imagesGuide: AIGuideData = {
    purpose: 'توليد صور احترافية للمنتجات باستخدام الذكاء الاصطناعي مع أنماط متعددة وتخصيص كامل.',
    whenToUse: 'استخدم هذه الصفحة لإنشاء صور للمنتجات، تحسين الصور الموجودة، أو إنشاء محتوى بصري إبداعي.',
    whatsInside: [
      'توليد صور بالذكاء الاصطناعي',
      'أنماط متعددة (واقعي، فني، بسيط، حيوي)',
      'ربط الصور بالمنتجات',
      'تصفية وبحث متقدم',
      'تحميل وحذف الصور'
    ],
    steps: [
      { title: 'اكتب الوصف', description: 'اكتب وصفاً دقيقاً للصورة التي تريد إنشاءها' },
      { title: 'اختر النمط', description: 'اختر النمط المناسب (واقعي، فني، بسيط، حيوي)' },
      { title: 'ولد الصورة', description: 'اضغط على زر التوليد لإنشاء الصورة' },
      { title: 'راجع وحفظ', description: 'راجع الصورة الناتجة واحفظها أو احذفها' }
    ],
    bestPractices: [
      'اكتب أوصاف دقيقة ومفصلة',
      'جرب أنماط مختلفة',
      'راجع الصور قبل الحفظ',
      'استخدم الصور في المنتجات'
    ],
    tips: [
      'الوصف الأدق يعطي نتائج أفضل',
      'يمكنك توليد عدة صور لنفس المنتج',
      'النمط الواقعي مناسب للمنتجات'
    ],
    shortcuts: [
      'استخدم مفتاح Enter للبحث السريع',
      'اضغط F5 لتحديث البيانات'
    ],
    relatedLinks: [
      { label: 'الذكاء الاصطناعي', onClick: () => window.location.href = '/dashboard/ai' },
      { label: 'تحسين SEO', onClick: () => window.location.href = '/dashboard/ai/seo' },
      { label: 'رؤى AI', onClick: () => window.location.href = '/dashboard/ai/insights' }
    ]
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Image size={24} className="text-[#00E5FF]" />
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">صور AI</h1>
            <button onClick={() => setGuideOpen(true)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all" title="معلومات / Info">
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">توليد صور بالذكاء الاصطناعي</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setShowGenerateModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all">
          <Wand2 size={16} />
          <span>توليد صورة جديدة</span>
        </button>
        <button onClick={loadImages} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all">
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
        {styleCounts.map(s => (
          <button 
            key={s.key} 
            onClick={() => setFilterStyle(filterStyle === s.key ? 'all' : s.key)}
            className={`p-3 rounded-xl border text-center transition-all ${
              filterStyle === s.key ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-200 bg-white'
            }`}
          >
            <div className={`flex items-center justify-center gap-1 mb-1 ${s.color}`}>
              {s.icon}
              <span className="text-xs font-bold">{s.label}</span>
            </div>
            <div className="text-lg font-black text-slate-900">{s.count}</div>
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
          <option value="completed">مكتمل</option>
          <option value="processing">قيد المعالجة</option>
          <option value="failed">فشل</option>
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
          <option value="date">التاريخ</option>
          <option value="prompt">الوصف</option>
        </select>
      </div>

      <div className="relative">
        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن صورة..."
          className="w-full pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00E5FF] rounded-full animate-spin" />
        </div>
      ) : paginatedData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Image size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 font-bold text-sm">لا توجد صور</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedData.map((img) => (
            <div key={img.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
              <div className="aspect-square bg-slate-100 relative">
                {img.status === 'processing' ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={32} className="text-slate-400 animate-spin" />
                  </div>
                ) : img.status === 'failed' ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <XCircle size={32} className="text-red-400" />
                  </div>
                ) : (
                  <img 
                    src={img.thumbnailUrl || img.imageUrl} 
                    alt={img.prompt}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    STATUS_CONFIG[img.status].bg
                  } ${STATUS_CONFIG[img.status].color}`}>
                    {STATUS_CONFIG[img.status].label}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-slate-600 line-clamp-2 mb-2">{img.prompt}</p>
                {img.productName && (
                  <p className="text-xs text-slate-400 mb-2">{img.productName}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    STYLE_CONFIG[img.style].bg
                  } ${STYLE_CONFIG[img.style].color}`}>
                    {STYLE_CONFIG[img.style].label}
                  </span>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                      <Download size={14} />
                    </button>
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {guideOpen && (
        <InfoDrawer title="صور AI" onClose={() => setGuideOpen(false)}>
          <AIGuideContent guide={imagesGuide} />
        </InfoDrawer>
      )}
    </div>
  );
}