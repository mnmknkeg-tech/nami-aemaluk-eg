import React from 'react';
import { Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
import type { InspectorPanelProps } from './types';

type AdvancedSectionProps = Pick<
  InspectorPanelProps,
  | 'node'
  | 'parentSection'
  | 'currentStyles'
  | 'sectionStyles'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handleStyleChange'
>;

export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  node,
  parentSection,
  currentStyles,
  sectionStyles,
  expandedSections,
  toggleAccordion,
  handleStyleChange,
}) => (
  <div className="p-3">
    <button
      onClick={() => toggleAccordion('advanced')}
      className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
    >
      <div className="flex items-center gap-1.5">
        <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
        <span>المسافات والبادينج المتقدم (Padding & Spacing)</span>
      </div>
      {expandedSections.advanced ? (
        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>

    {expandedSections.advanced && (
      <div className="space-y-3 pt-2.5">
        <div>
          <label className="text-[10px] font-bold text-slate-500 block mb-1">الحشو الداخلي للقسم (Padding Top/Bottom)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-slate-400 block mb-0.5">من الأعلى (Top)</span>
              <input
                type="text"
                value={sectionStyles.paddingTop || '72px'}
                onChange={(e) => handleStyleChange(parentSection.id, 'paddingTop', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-center font-mono text-xs"
              />
            </div>
            <div>
              <span className="text-[9px] text-slate-400 block mb-0.5">من الأسفل (Bottom)</span>
              <input
                type="text"
                value={sectionStyles.paddingBottom || '80px'}
                onChange={(e) => handleStyleChange(parentSection.id, 'paddingBottom', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-center font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* BORDER RADIUS & SHADOW */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">استدارة الحواف</label>
            <input
              type="text"
              value={currentStyles.borderRadius || ''}
              onChange={(e) => handleStyleChange(node.id, 'borderRadius', e.target.value)}
              placeholder="12px"
              className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">الظل (Shadow)</label>
            <select
              value={currentStyles.boxShadow || 'none'}
              onChange={(e) => handleStyleChange(node.id, 'boxShadow', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-medium"
            >
              <option value="none">بدون</option>
              <option value="0 4px 6px -1px rgb(0 0 0 / 0.1)">ناعم</option>
              <option value="0 10px 15px -3px rgb(0 0 0 / 0.1)">بارز</option>
              <option value="0 20px 25px -5px rgb(0 0 0 / 0.1)">عائم</option>
            </select>
          </div>
        </div>
      </div>
    )}
  </div>
);
