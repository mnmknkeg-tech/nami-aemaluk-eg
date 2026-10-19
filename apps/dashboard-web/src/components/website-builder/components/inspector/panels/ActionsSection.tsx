import React from 'react';
import { Link, MessageCircle, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import type { InspectorPanelProps } from './types';

type ActionsSectionProps = Pick<
  InspectorPanelProps,
  | 'node'
  | 'isHero'
  | 'heroPrimaryBtnNode'
  | 'heroSecondaryBtnNode'
  | 'expandedSections'
  | 'toggleAccordion'
  | 'handlePropChange'
>;

export const ActionsSection: React.FC<ActionsSectionProps> = ({
  node,
  isHero,
  heroPrimaryBtnNode,
  heroSecondaryBtnNode,
  expandedSections,
  toggleAccordion,
  handlePropChange,
}) => (
  <div className="p-3">
    <button
      onClick={() => toggleAccordion('actions')}
      className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
    >
      <div className="flex items-center gap-1.5">
        <Link className="w-3.5 h-3.5 text-blue-600" />
        <span>الروابط وأزرار الإجراءات (Actions & Links)</span>
      </div>
      {expandedSections.actions ? (
        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>

    {expandedSections.actions && (
      <div className="space-y-3 pt-2.5">
        {/* PRIMARY ACTION */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700">رابط الزر الرئيسي (Primary Link)</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const waUrl = 'https://wa.me/966500000000?text=مرحباً، أود الاستفسار عن أسطول السيارات المتاح';
                  if (isHero && heroPrimaryBtnNode) {
                    handlePropChange(heroPrimaryBtnNode.id, 'url', waUrl);
                    handlePropChange(heroPrimaryBtnNode.id, 'href', waUrl);
                  } else {
                    handlePropChange(node.id, 'url', waUrl);
                    handlePropChange(node.id, 'href', waUrl);
                  }
                }}
                className="text-[9px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer"
              >
                <MessageCircle className="w-2.5 h-2.5" />
                <span>واتساب</span>
              </button>
              <button
                onClick={() => {
                  const telUrl = 'tel:+966500000000';
                  if (isHero && heroPrimaryBtnNode) {
                    handlePropChange(heroPrimaryBtnNode.id, 'url', telUrl);
                  } else {
                    handlePropChange(node.id, 'url', telUrl);
                  }
                }}
                className="text-[9px] bg-blue-100 hover:bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer"
              >
                <Phone className="w-2.5 h-2.5" />
                <span>اتصال</span>
              </button>
            </div>
          </div>

          <input
            type="text"
            value={
              (isHero && heroPrimaryBtnNode?.props?.url) ||
              node.props.url ||
              node.props.href ||
              '#fleet'
            }
            onChange={(e) => {
              const val = e.target.value;
              if (isHero && heroPrimaryBtnNode) {
                handlePropChange(heroPrimaryBtnNode.id, 'url', val);
                handlePropChange(heroPrimaryBtnNode.id, 'href', val);
              } else {
                handlePropChange(node.id, 'url', val);
                handlePropChange(node.id, 'href', val);
              }
            }}
            placeholder="https://... أو #fleet"
            className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono text-[11px] text-slate-700 outline-hidden focus:border-blue-500"
          />
        </div>

        {/* SECONDARY ACTION */}
        {isHero && heroSecondaryBtnNode && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[10px] font-bold text-slate-700 block">رابط الزر الثانوي</span>
            <input
              type="text"
              value={heroSecondaryBtnNode.props.url || heroSecondaryBtnNode.props.href || '#contact'}
              onChange={(e) => {
                handlePropChange(heroSecondaryBtnNode.id, 'url', e.target.value);
                handlePropChange(heroSecondaryBtnNode.id, 'href', e.target.value);
              }}
              placeholder="#contact"
              className="w-full bg-white border border-slate-200 rounded p-1.5 font-mono text-[11px] text-slate-700 outline-hidden focus:border-blue-500"
            />
          </div>
        )}
      </div>
    )}
  </div>
);
