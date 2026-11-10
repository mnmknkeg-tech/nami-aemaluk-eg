import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  Home,
  Image,
  Info,
  Layers,
  List,
  LogIn,
  Megaphone,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Users,
  Eye,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { sectionCategoriesList, SectionCategory, SectionTemplate } from '../../data/sectionLibrary';
import { getSectionTemplateRecords } from '../../data/registry';
import { SectionWireframePreview } from './SectionWireframePreview';
import { LiveTemplatePreviewModal } from './LiveTemplatePreviewModal';

const registeredSectionTemplates = getSectionTemplateRecords().map((entry) => entry.template);
const templatesByCategory = new Map<SectionCategory, SectionTemplate[]>();
const templateCounts = new Map<SectionCategory, number>();

registeredSectionTemplates.forEach((template) => {
  const templates = templatesByCategory.get(template.category) || [];
  templates.push(template);
  templatesByCategory.set(template.category, templates);
  templateCounts.set(template.category, templates.length);
});

type CategoryFilter = 'all' | 'store' | 'content' | 'site';

const filters: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'store', label: 'المتجر' },
  { id: 'content', label: 'المحتوى' },
  { id: 'site', label: 'الواجهة والتواصل' },
];

const categoryFilters: Record<SectionCategory, Exclude<CategoryFilter, 'all'>> = {
  navbar: 'site',
  hero: 'site',
  products: 'store',
  product_detail: 'store',
  about: 'content',
  features: 'content',
  stats: 'content',
  steps: 'content',
  logos: 'content',
  gallery: 'content',
  pricing: 'store',
  team: 'content',
  tabs: 'content',
  accordion: 'content',
  testimonials: 'content',
  contact: 'site',
  cta: 'site',
  content: 'content',
  footer: 'site',
  mobile_footer: 'site',
  auth: 'store',
};

const categoryIcons = {
  navbar: Menu,
  hero: Home,
  products: ShoppingBag,
  product_detail: Package,
  about: Info,
  features: Sparkles,
  stats: BarChart3,
  steps: List,
  logos: Tag,
  gallery: Image,
  pricing: CreditCard,
  team: Users,
  tabs: Layers,
  accordion: CircleHelp,
  testimonials: MessageCircle,
  contact: Phone,
  cta: Megaphone,
  content: FileText,
  footer: Activity,
  mobile_footer: Smartphone,
  auth: LogIn,
} satisfies Record<SectionCategory, React.ComponentType<{ className?: string }>>;

const accentByFilter: Record<Exclude<CategoryFilter, 'all'>, string> = {
  store: 'bg-violet-50 text-violet-700 ring-violet-100',
  content: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  site: 'bg-sky-50 text-sky-700 ring-sky-100',
};

const searchableTemplateText = (template: SectionTemplate) =>
  [template.name, template.nameAr, template.descriptionAr, ...template.tags]
    .join(' ')
    .toLocaleLowerCase();

export const SectionLibraryPanel: React.FC = () => {
  const { insertSectionTemplate } = useBuilder();
  const [selectedCategory, setSelectedCategory] = useState<SectionCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<SectionTemplate | null>(null);

  const handleInsert = (template: SectionTemplate) => {
    if (!insertSectionTemplate(template.id)) return;
    setInsertedId(template.id);
    setTimeout(() => setInsertedId(null), 2000);
  };

  const currentCategoryDef = selectedCategory
    ? sectionCategoriesList.find((category) => category.id === selectedCategory)
    : null;
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const availableCategories = sectionCategoriesList.filter((category) => {
    const templates = templatesByCategory.get(category.id) || [];
    if (!templates.length) return false;
    if (activeFilter !== 'all' && categoryFilters[category.id] !== activeFilter) return false;
    if (!normalizedQuery) return true;
    return (
      `${category.nameAr} ${category.nameEn}`.toLocaleLowerCase().includes(normalizedQuery) ||
      templates.some((template) => searchableTemplateText(template).includes(normalizedQuery))
    );
  });
  const categoryTemplates = selectedCategory
    ? (templatesByCategory.get(selectedCategory) || []).filter(
        (template) => !normalizedQuery || searchableTemplateText(template).includes(normalizedQuery)
      )
    : [];

  return (
    <div className="relative flex h-full flex-col bg-white text-slate-900" dir="rtl">
      {!selectedCategory ? (
        <>
          <div className="shrink-0 border-b border-slate-100 bg-gradient-to-b from-blue-50/80 via-white to-white">
            <div className="px-3.5 pb-3 pt-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-blue-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>مكتبة منشئ الصفحات</span>
                  </div>
                  <h2 className="text-sm font-black tracking-tight text-slate-900">
                    أضف قسماً لموقعك
                  </h2>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">
                    اختر تصنيفاً ثم أدرج التصميم المناسب فوراً.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-blue-100 bg-white/90 px-2 py-1 text-[10px] font-bold text-blue-700 shadow-xs">
                  {registeredSectionTemplates.length} تصميم
                </span>
              </div>

              <label className="relative block">
                <span className="sr-only">ابحث عن قسم أو تصميم</span>
                <input
                  type="search"
                  placeholder="ابحث عن قسم أو تصميم..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-10 ps-3 text-xs text-slate-800 shadow-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              </label>
            </div>

            <div className="flex gap-1.5 overflow-x-auto px-3.5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filters.map((filter) => {
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
            {availableCategories.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Search className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">لا توجد نتائج مطابقة</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                  }}
                  className="mt-2 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                >
                  مسح البحث والفلاتر
                </button>
              </div>
            ) : (
              availableCategories.map((category) => {
                const Icon = categoryIcons[category.id];
                const group = categoryFilters[category.id];
                const templateCount = templateCounts.get(category.id) || 0;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-label={`${category.nameAr}، ${templateCount} تصميم`}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSearchQuery('');
                    }}
                    className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-right transition hover:border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${accentByFilter[group]}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-xs font-bold text-slate-800 transition group-hover:text-blue-700">
                          {category.nameAr}
                        </span>
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-slate-500">
                          {templateCount}
                        </span>
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-400">
                        {templateCount === 1 ? 'تصميم جاهز للإضافة' : 'تصاميم جاهزة للإضافة'}
                      </span>
                    </span>
                    <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:-translate-x-0.5 group-hover:text-blue-600" />
                  </button>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3 py-3">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery('');
              }}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
            >
              <ChevronRight className="h-4 w-4" />
              <span>كل الأقسام</span>
            </button>
            <div className="text-left">
              <span className="block text-xs font-black text-slate-900">
                {currentCategoryDef?.nameAr}
              </span>
              <span className="mt-0.5 block text-[9px] text-slate-400">
                {(templatesByCategory.get(selectedCategory) || []).length} تصميم متاح
              </span>
            </div>
          </div>

          <div className="shrink-0 px-3 pb-2 pt-3">
            <label className="relative block">
              <span className="sr-only">ابحث داخل التصنيف</span>
              <input
                type="search"
                placeholder="ابحث داخل التصنيف..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pe-10 ps-3 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            </label>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 pt-1">
            {categoryTemplates.length === 0 ? (
              <div className="space-y-2 py-10 text-center">
                <p className="text-xs text-slate-500">لا توجد تصميمات تطابق بحثك.</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  مسح البحث
                </button>
              </div>
            ) : (
              categoryTemplates.map((template) => {
                const isJustInserted = insertedId === template.id;
                return (
                  <article
                    key={template.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="relative min-h-32 bg-gradient-to-br from-slate-50 to-blue-50/50 p-3">
                      <SectionWireframePreview template={template} />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl bg-slate-950/55 p-2 opacity-100 backdrop-blur-[2px] transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => setPreviewTemplate(template)}
                          className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-800 shadow-md transition hover:bg-blue-50"
                          title="معاينة مباشرة"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-600" />
                          <span>معاينة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsert(template)}
                          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white shadow-md transition hover:bg-blue-700"
                        >
                          {isJustInserted ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>تمت الإضافة</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>إضافة للقسم</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 px-3.5 py-3 text-right">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-xs font-black leading-5 text-slate-800">
                            {template.nameAr}
                          </h3>
                          <p className="mt-1 text-[10px] leading-5 text-slate-500">
                            {template.descriptionAr}
                          </p>
                        </div>
                        {isJustInserted && (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                            تمت الإضافة
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}

      {insertedId && (
        <div className="absolute bottom-3 left-3 right-3 z-40 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            تمت إضافة القسم إلى الصفحة بنجاح
          </span>
          <Check className="h-4 w-4 text-emerald-400" />
        </div>
      )}

      {previewTemplate && (
        <LiveTemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onInsert={handleInsert}
        />
      )}
    </div>
  );
};
