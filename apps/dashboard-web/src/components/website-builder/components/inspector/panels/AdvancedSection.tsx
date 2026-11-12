import React from 'react';
import { Maximize2, ChevronDown, ChevronUp, Code2 } from 'lucide-react';
import { useBuilder } from '../../../context/BuilderContext';
import type { InspectorPanelProps } from './types';

type AdvancedSectionProps = Pick<
  InspectorPanelProps,
  | 'node'
  | 'parentSection'
  | 'sectionStyles'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handleStyleChange'
>;

export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  node,
  parentSection,
  sectionStyles,
  expandedSections,
  toggleAccordion,
  handleStyleChange,
}) => {
  const { setIsCodeWorkspaceOpen, setCodeActiveFile, editingMode } = useBuilder();
  const canEditCss = editingMode !== 'html_only';
  return (
    <div className="p-3">
      <button
        onClick={() => toggleAccordion('advanced')}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
          <span>المظهر المتقدم</span>
        </div>
        {expandedSections.advanced ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {expandedSections.advanced && (
        <div className="space-y-3 pt-2.5">
          {parentSection.id !== node.id && (
            <div>
              <h4 className="text-[10px] font-bold text-slate-700 mb-1">المسافات الداخلية للقسم</h4>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                الحشو الداخلي للقسم (Padding Top/Bottom)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-slate-400 block mb-0.5">من الأعلى (Top)</span>
                  <input
                    type="text"
                    value={sectionStyles.paddingTop || '72px'}
                    onChange={(e) =>
                      handleStyleChange(parentSection.id, 'paddingTop', e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-center font-mono text-xs"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block mb-0.5">من الأسفل (Bottom)</span>
                  <input
                    type="text"
                    value={sectionStyles.paddingBottom || '80px'}
                    onChange={(e) =>
                      handleStyleChange(parentSection.id, 'paddingBottom', e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-center font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            disabled={!canEditCss}
            aria-label="فتح محرر CSS للمكوّن المحدد"
            title={canEditCss ? 'فتح ملف CSS للمكوّن المحدد' : 'وضع HTML فقط لا يسمح بتحرير CSS'}
            onClick={() => {
              setCodeActiveFile('styles.css');
              setIsCodeWorkspaceOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Code2 className="w-3.5 h-3.5" />
            تحرير CSS المخصص
          </button>
        </div>
      )}
    </div>
  );
};
