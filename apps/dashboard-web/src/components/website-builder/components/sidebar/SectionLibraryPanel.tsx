import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Check,
  Eye,
  Sparkles,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import {
  sectionCategoriesList,
  sectionTemplates,
  SectionCategory,
  SectionTemplate,
} from '../../data/sectionLibrary';
import { SectionWireframePreview } from './SectionWireframePreview';
import { LiveTemplatePreviewModal } from './LiveTemplatePreviewModal';

export const SectionLibraryPanel: React.FC = () => {
  const { insertSectionTemplate } = useBuilder();
  const [selectedCategory, setSelectedCategory] = useState<SectionCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<SectionTemplate | null>(null);

  const handleInsert = (tmpl: SectionTemplate) => {
    insertSectionTemplate(tmpl.id);
    setInsertedId(tmpl.id);
    setTimeout(() => setInsertedId(null), 2000);
  };

  // Get active category object
  const currentCategoryDef = selectedCategory
    ? sectionCategoriesList.find((c) => c.id === selectedCategory)
    : null;

  // Filter templates for current category & search query
  const categoryTemplates = selectedCategory
    ? sectionTemplates.filter((tmpl) => {
        const matchCat = tmpl.category === selectedCategory;
        const matchSearch =
          !searchQuery ||
          tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tmpl.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tmpl.descriptionAr.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
      })
    : [];

  return (
    <div className="h-full flex flex-col bg-white select-none relative">
      {/* ========================================================================= */}
      {/* VIEW 1: CATEGORIES LIST (Matches User Image 1)                            */}
      {/* ========================================================================= */}
      {!selectedCategory ? (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {sectionCategoriesList.map((cat) => {
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearchQuery('');
                }}
                className="w-full px-5 py-3.5 flex items-center justify-between text-right hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer group"
              >
                {/* Left chevron arrow (Pointing left in RTL) */}
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />

                {/* Right Category Title */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {cat.nameAr}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: CATEGORY DRILL-DOWN (Matches User Images 2 & 3)                    */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150">
          {/* Top Bar with Back Button & Category Name */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery('');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الأقسام</span>
            </button>

            <span className="text-xs font-bold text-slate-900 px-2">
              {currentCategoryDef?.nameAr}
            </span>
          </div>

          {/* Search Box (Rounded pill matching screenshot) */}
          <div className="p-3 pb-2 shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100/80 border border-transparent rounded-xl pr-4 pl-9 py-2 text-xs outline-hidden focus:bg-white focus:border-blue-500 transition-all text-slate-800"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Template Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {categoryTemplates.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 space-y-2">
                <p>لا توجد نماذج في هذا القسم حالياً تطابق بحثك</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 font-bold hover:underline"
                >
                  إعادة ضبط البحث
                </button>
              </div>
            ) : (
              categoryTemplates.map((tmpl) => {
                const isJustInserted = insertedId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    className="group bg-white rounded-xl border border-slate-200 hover:border-blue-400 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Visual Preview Box */}
                    <div className="p-2.5 bg-slate-50/50 hover:bg-slate-100/50 transition-colors relative">
                      <SectionWireframePreview template={tmpl} />

                      {/* Quick Action Overlay on hover (Live Preview & Direct Insert) */}
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl p-2">
                        <button
                          onClick={() => setPreviewTemplate(tmpl)}
                          className="bg-white/90 hover:bg-white text-slate-800 font-bold text-xs px-3 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                          title="معاينة حية ومباشرة"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>معاينة حية</span>
                        </button>

                        <button
                          onClick={() => handleInsert(tmpl)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {isJustInserted ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>تم الإدراج!</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>إدراج فوري</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Template ID / Name label below preview (Matching screenshot) */}
                    <div className="px-3 py-2 bg-white flex items-center justify-between border-t border-slate-100" dir="ltr">
                      <span className="text-[11px] font-mono text-slate-600 font-medium">
                        {tmpl.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewTemplate(tmpl)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                        >
                          <Eye className="w-3 h-3" />
                          <span>معاينة</span>
                        </button>
                        {isJustInserted && (
                          <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">
                            تم الإدراج
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Success Notification Toast */}
      {insertedId && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 z-40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
            <span>تم إدراج القسم في الصفحة بنجاح!</span>
          </div>
          <Check className="w-4 h-4 text-green-400" />
        </div>
      )}

      {/* Live Interactive Preview Modal */}
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
