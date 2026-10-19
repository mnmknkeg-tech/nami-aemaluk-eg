import React from 'react';
import { Image as ImageIcon, Upload, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { InspectorPanelProps } from './types';

type MediaSectionProps = Pick<
  InspectorPanelProps,
  | 'node'
  | 'parentSection'
  | 'isHero'
  | 'heroImageNode'
  | 'currentStyles'
  | 'sectionStyles'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handlePropChange'
  | 'handleStyleChange'
  | 'handleFileUpload'
  | 'setActiveGalleryTarget'
  | 'setShowPresetGallery'
>;

export const MediaSection: React.FC<MediaSectionProps> = ({
  node,
  parentSection,
  isHero,
  heroImageNode,
  currentStyles,
  sectionStyles,
  expandedSections,
  toggleAccordion,
  handlePropChange,
  handleStyleChange,
  handleFileUpload,
  setActiveGalleryTarget,
  setShowPresetGallery,
}) => (
  <div className="p-3">
    <button
      onClick={() => toggleAccordion('media')}
      className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
    >
      <div className="flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
        <span>الصور والوسائط (Media & Imagery)</span>
      </div>
      {expandedSections.media ? (
        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>

    {expandedSections.media && (
      <div className="space-y-3 pt-2.5">
        {/* CURRENT IMAGE PREVIEW & QUICK REPLACE */}
        {((isHero && heroImageNode) || node.type === 'image' || node.props.image || node.props.src || currentStyles.backgroundImage) && (
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600">الصورة الحالية</span>
              <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">Live Preview</span>
            </div>

            <div className="relative h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
              <img
                src={
                  (isHero && heroImageNode?.props?.src) ||
                  node.props.src ||
                  node.props.image ||
                  currentStyles.backgroundImage?.replace(/url\(['"](.*?)['"]\)/, '$1') ||
                  'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80'
                }
                alt="معاينة الصورة"
                className="w-full h-full object-cover"
              />
            </div>

            {/* ACTION BUTTONS: UPLOAD & PRESETS */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-center gap-1.5 p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-colors">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>رفع من الجهاز</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const targetId = isHero && heroImageNode ? heroImageNode.id : node.id;
                    handleFileUpload(e, targetId);
                  }}
                />
              </label>

              <button
                onClick={() => {
                  setActiveGalleryTarget(isHero && heroImageNode ? heroImageNode.id : node.id);
                  setShowPresetGallery(true);
                }}
                className="flex items-center justify-center gap-1.5 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>معرض الصور</span>
              </button>
            </div>

            {/* DIRECT IMAGE URL INPUT */}
            <div>
              <label className="text-[9px] text-slate-400 block mb-1">رابط مباشر للصورة (Image URL)</label>
              <input
                type="text"
                value={
                  (isHero && heroImageNode?.props?.src) ||
                  node.props.src ||
                  node.props.image ||
                  ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (isHero && heroImageNode) {
                    handlePropChange(heroImageNode.id, 'src', val);
                  } else if (node.props.image) {
                    handlePropChange(node.id, 'image', val);
                  } else {
                    handlePropChange(node.id, 'src', val);
                  }
                }}
                placeholder="https://..."
                className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono text-[10px] text-slate-600 outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* BACKGROUND IMAGE FOR SECTION CONTAINER */}
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700">صورة خلفية القسم (Section Background)</span>
            {sectionStyles.backgroundImage && (
              <button
                onClick={() => handleStyleChange(parentSection.id, 'backgroundImage', undefined)}
                className="text-[9px] text-rose-600 hover:underline cursor-pointer"
              >
                إزالة الخلفية
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex items-center justify-center gap-1.5 p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer transition-colors">
              <Upload className="w-3 h-3 text-blue-600" />
              <span>رفع خلفية</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, parentSection.id, true)}
              />
            </label>

            <button
              onClick={() => {
                setActiveGalleryTarget(parentSection.id);
                setShowPresetGallery(true);
              }}
              className="flex items-center justify-center gap-1.5 p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3 h-3 text-blue-600" />
              <span>خلفيات جاهزة</span>
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
