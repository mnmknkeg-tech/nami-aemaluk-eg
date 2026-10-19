import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sparkles,
  ChevronDown,
  Search,
  Check,
  Building2,
  Utensils,
  Dumbbell,
  Stethoscope,
  Scissors,
  Gem,
  Car,
  ShoppingBag,
  ShoppingCart,
  Wrench,
  Plane,
  Scale,
  Zap,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { ActivityTemplateMeta } from '../../data/allActivityTemplates';

// Icon mapping for activities
const activityIconMap: Record<string, React.ReactNode> = {
  automotive: <Car className="w-4 h-4 text-amber-600" />,
  restaurant: <Utensils className="w-4 h-4 text-orange-600" />,
  gym_fitness: <Dumbbell className="w-4 h-4 text-emerald-600" />,
  clinic_health: <Stethoscope className="w-4 h-4 text-cyan-600" />,
  beauty_salon: <Scissors className="w-4 h-4 text-rose-600" />,
  jewelry_luxury: <Gem className="w-4 h-4 text-amber-500" />,
  real_estate: <Building2 className="w-4 h-4 text-teal-600" />,
  fashion_boutique: <ShoppingBag className="w-4 h-4 text-pink-600" />,
  grocery_supermarket: <ShoppingCart className="w-4 h-4 text-green-600" />,
  home_services: <Wrench className="w-4 h-4 text-sky-600" />,
  travel_tourism: <Plane className="w-4 h-4 text-indigo-600" />,
  law_firm: <Scale className="w-4 h-4 text-slate-700" />,
};

export const ActivityTemplateSwitcher: React.FC = () => {
  const {
    activeTemplateId,
    allTemplatesList,
    switchWebsite,
    website,
  } = useBuilder();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [justSwitchedId, setJustSwitchedId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Current active template metadata
  const currentTemplate = useMemo(() => {
    return (
      allTemplatesList.find((t) => t.id === activeTemplateId) ||
      allTemplatesList.find((t) => t.tenantId === website.tenantId) ||
      allTemplatesList[0]
    );
  }, [allTemplatesList, activeTemplateId, website.tenantId]);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    return allTemplatesList.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags && item.tags.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase())));

      // Sector categorization
      const realEstateCategories = [
        'العقارات والاستثمار',
        'المقاولات والإنشاءات',
        'السيراميك والبورسلان والرخام',
        'التصميم الداخلي والديكور',
        'الأدوات الصحية والسباكة الديكورية',
        'المطابخ والخزائن العصرية',
        'الإضاءة والنجف والإنارة الذكية',
        'أنظمة المنازل الذكية والتحكم',
        'تنسيق الحدائق والمسابح والمظلات',
        'الأبواب والنوافذ والألمنيوم وUPVC',
        'الدهانات الديكورية وورق الجدران',
        'التكييف المركزي وحلول التهوية',
        'الأثاث والديكور والتصميم الداخلي',
      ];

      const automotiveCategories = [
        'السيارات وصالات العرض',
        'صيانة وميكانيكا السيارات',
        'تأجير السيارات والليموزين',
      ];

      const retailCategories = [
        'الذهب والمجوهرات',
        'الأزياء والبوتيك',
        'الإلكترونيات والتقنية الحديثة',
        'الزهور والهدايا والتنسيق',
        'السوبرماركت والتموين',
      ];

      const hospitalityCategories = [
        'المطاعم والكافيهات',
        'السياحة والسفر والحجوزات',
      ];

      const healthCategories = [
        'العيادات والمراكز الطبية',
        'الأندية والجيم الرياضي',
        'الصالونات ومراكز التجميل',
      ];

      const corporateCategories = [
        'المحاماة والاستشارات القانونية',
        'المحاسبة والاستشارات المالية',
        'التسويق الرقمي والدعاية والإعلان',
        'التعليم والتدريب والأكاديميات',
        'الصيانة المنزلية والتشغيل',
      ];

      const matchesCat =
        selectedCategory === 'all' ||
        (selectedCategory === 'realestate' && realEstateCategories.includes(item.category)) ||
        (selectedCategory === 'automotive' && automotiveCategories.includes(item.category)) ||
        (selectedCategory === 'retail' && retailCategories.includes(item.category)) ||
        (selectedCategory === 'hospitality' && hospitalityCategories.includes(item.category)) ||
        (selectedCategory === 'health' && healthCategories.includes(item.category)) ||
        (selectedCategory === 'corporate' && corporateCategories.includes(item.category));

      return matchesSearch && matchesCat;
    });
  }, [allTemplatesList, searchQuery, selectedCategory]);

  const handleSelectTemplate = (template: ActivityTemplateMeta) => {
    switchWebsite(template.id);
    setJustSwitchedId(template.id);
    setIsOpen(false);

    setTimeout(() => {
      setJustSwitchedId(null);
    }, 2000);
  };

  return (
    <div className="relative" ref={dropdownRef} dir="rtl">
      {/* Trigger Button in TopBar */}
      <button
        id="activity_template_switcher_btn"
        onClick={() => setIsOpen(!isOpen)}
        title="تبديل قالب النشاط بالكامل (المطاعم، الجيم، العيادات، العقارات، الأزياء، المحاماة، إلخ)"
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer select-none shadow-2xs ${
          isOpen
            ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
            : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-800'
        }`}
      >
        <span className="text-sm">{currentTemplate?.icon || '🎯'}</span>
        <div className="flex flex-col text-right">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded">
              قالب النشاط:
            </span>
            <span className="text-xs font-black text-slate-900 max-w-[90px] sm:max-w-[140px] truncate">
              {currentTemplate?.name || 'قالب مخصص'}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 mr-0.5 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Full Activities Dropdown Popover */}
      {isOpen && (
        <div
          id="activity_templates_dropdown"
          className="absolute top-full mt-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-[340px] sm:w-[580px] md:w-[680px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <span>اختر نشاط وقالب موقعك</span>
                  <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">
                    {allTemplatesList.length} نشاط جاهز
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 font-medium">
                  يتم استبدال كامل الهيكل، الصفحات، النماذج، الحجوزات، والمنيو فوراً
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن النشاط (مطعم، جيم، عيادة، عقارات، أزياء، محاماة، سياحة)..."
                className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                كافة الأنشطة ({allTemplatesList.length})
              </button>
              <button
                onClick={() => setSelectedCategory('realestate')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                  selectedCategory === 'realestate'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                🏢 العقارات والمقاولات والديكور
              </button>
              <button
                onClick={() => setSelectedCategory('automotive')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                  selectedCategory === 'automotive'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                🚗 السيارات والنقل
              </button>
              <button
                onClick={() => setSelectedCategory('retail')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                  selectedCategory === 'retail'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                🛍️ التجزئة والمجوهرات
              </button>
              <button
                onClick={() => setSelectedCategory('hospitality')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                  selectedCategory === 'hospitality'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                🍽️ المطاعم والضيافة
              </button>
              <button
                onClick={() => setSelectedCategory('health')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                  selectedCategory === 'health'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                🏥 الصحة والجمال والرياضة
              </button>
              <button
                onClick={() => setSelectedCategory('corporate')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                  selectedCategory === 'corporate'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                💼 الشركات والخدمات والتعليم
              </button>
            </div>
          </div>

          {/* Templates Grid List */}
          <div className="p-3.5 overflow-y-auto max-h-[50vh] grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50/50">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500 space-y-2">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold">لم يتم العثور على نشاط يطابق بحثك</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  إعادة ضبط البحث
                </button>
              </div>
            ) : (
              filteredTemplates.map((template) => {
                const isCurrent =
                  template.id === activeTemplateId ||
                  template.tenantId === website.tenantId;

                return (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2.5 cursor-pointer relative group ${
                      isCurrent
                        ? 'bg-blue-50/90 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                        : 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          style={{ backgroundColor: `${template.primaryColor}15` }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border border-slate-100"
                        >
                          {template.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                              {template.name}
                            </h4>
                            <span
                              style={{ backgroundColor: template.primaryColor }}
                              className="w-2 h-2 rounded-full shrink-0"
                              title="لون السمة الأساسي"
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {template.category}
                          </span>
                        </div>
                      </div>

                      {/* Active / Select Badge */}
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>النشط الآن</span>
                        </span>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          تطبيق القالب
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-600 leading-relaxed font-normal line-clamp-2">
                      {template.description}
                    </p>

                    {/* Features Chips */}
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((feat, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[150px]"
                          >
                            ✓ {feat}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-500">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span>قالب متكامل مع الصفحات</span>
                      </span>
                      <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-0.5">
                        <span>معاينة وتطبيق</span>
                        <ArrowRight className="w-3 h-3 rotate-180" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>جميع القوالب تدعم الحجز، النماذج، والتعديل الفوري عبر السحب والإفلات</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
