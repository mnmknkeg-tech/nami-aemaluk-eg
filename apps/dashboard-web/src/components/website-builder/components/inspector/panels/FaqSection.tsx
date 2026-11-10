import React from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { InspectorPanelProps } from './types';

export const FaqSection: React.FC<InspectorPanelProps> = ({
  node,
  parentSection,
  expandedSections,
  toggleAccordion,
  handlePropChange,
}) => {
  const targetNode = node.type === 'faq' ? node : parentSection;
  const props = targetNode.props || {};

  const handleUpdate = (key: string, value: any) => {
    handlePropChange(targetNode.id, key, value);
  };

  const defaultItems = [
    { q: 'كيف أطلب؟', a: 'اختر منتجاتك وأضفها للسلة ثم أتم الطلب، سنتواصل معك لتأكيد التوصيل.' },
    { q: 'هل الدفع آمن؟', a: 'نعم، ندعم الدفع عند الاستلام بدون أي رسوم إضافية.' },
    { q: 'ما مدة التوصيل؟', a: 'من 2-5 أيام عمل حسب موقعك.' },
  ];

  const items = Array.isArray(props.items) ? props.items : defaultItems;

  const handleAddItem = () => {
    const next = [...items, { q: 'سؤال جديد؟', a: 'الإجابة التوضيحية...' }];
    handleUpdate('items', next);
  };

  const handleUpdateItem = (index: number, key: 'q' | 'a', value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [key]: value };
    handleUpdate('items', next);
  };

  const handleRemoveItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    handleUpdate('items', next);
  };

  return (
    <div className="p-3">
      <button
        onClick={() => toggleAccordion('faqSettings')}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>الأسئلة الشائعة والأجوبة (FAQ List)</span>
        </div>
        {expandedSections.faqSettings ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {expandedSections.faqSettings && (
        <div className="space-y-3 pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">
              قائمة الأسئلة ({items.length}):
            </span>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة سؤال</span>
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700">السؤال #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="حذف السؤال"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={item.q || ''}
                  onChange={(e) => handleUpdateItem(idx, 'q', e.target.value)}
                  placeholder="نص السؤال..."
                  className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-bold text-slate-900 outline-hidden focus:border-blue-500"
                />
                <textarea
                  rows={2}
                  value={item.a || ''}
                  onChange={(e) => handleUpdateItem(idx, 'a', e.target.value)}
                  placeholder="نص الإجابة..."
                  className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-700 outline-hidden focus:border-blue-500 leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
