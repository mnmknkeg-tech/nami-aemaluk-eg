import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Check,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  ExternalLink,
  ShoppingBag,
  Star,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SectionTemplate } from '../../data/sectionLibrary';
import { ComponentNode, StyleProperties, ViewportBreakpoint } from '../../types/builder';

interface Props {
  template: SectionTemplate | null;
  onClose: () => void;
  onInsert: (template: SectionTemplate) => void;
}

// Recursive preview renderer for template nodes
const PreviewNodeRenderer: React.FC<{
  nodeId: string;
  nodes: Record<string, ComponentNode>;
  viewport: ViewportBreakpoint;
}> = ({ nodeId, nodes, viewport }) => {
  const node = nodes[nodeId];
  if (!node) return null;

  const d = node.styles.desktop || {};
  const t = node.styles.tablet || {};
  const m = node.styles.mobile || {};

  let merged: StyleProperties = { ...d };
  if (viewport === 'tablet') {
    merged = { ...merged, ...t };
  } else if (viewport === 'mobile') {
    merged = { ...merged, ...t, ...m };
  }

  const css: React.CSSProperties = {
    display: merged.display,
    flexDirection: merged.flexDirection,
    justifyContent: merged.justifyContent,
    alignItems: merged.alignItems,
    flexWrap: merged.flexWrap,
    gridTemplateColumns: merged.gridColumns,
    gap: merged.gap,
    width: merged.width,
    minWidth: merged.minWidth,
    maxWidth: merged.maxWidth,
    height: merged.height,
    minHeight: merged.minHeight,
    paddingTop: merged.paddingTop,
    paddingRight: merged.paddingRight,
    paddingBottom: merged.paddingBottom,
    paddingLeft: merged.paddingLeft,
    marginTop: merged.marginTop,
    marginRight: merged.marginRight,
    marginBottom: merged.marginBottom,
    marginLeft: merged.marginLeft,
    fontSize: merged.fontSize,
    fontWeight: merged.fontWeight as any,
    lineHeight: merged.lineHeight,
    letterSpacing: merged.letterSpacing,
    textAlign: merged.textAlign,
    color: merged.textColor,
    backgroundColor: merged.backgroundColor,
    backgroundImage: merged.backgroundImage,
    backgroundSize: merged.backgroundSize,
    borderWidth: merged.borderWidth,
    borderStyle: merged.borderStyle,
    borderColor: merged.borderColor,
    borderRadius: merged.borderRadius,
    boxShadow: merged.boxShadow,
  };

  // Library templates are desktop-first. Mirror the insertion-time responsive
  // defaults here so the phone preview shows the exact safe layout users get.
  if (viewport === 'mobile') {
    const desktopGap = Number.parseFloat(d.gap || '');
    if ((d.display === 'grid' || d.gridColumns) && !m.gridColumns) {
      css.gridTemplateColumns = 'minmax(0, 1fr)';
      css.gap = Number.isFinite(desktopGap) && desktopGap > 16 ? '16px' : d.gap || '12px';
    }
    if (
      d.display === 'flex' &&
      d.flexDirection !== 'column' &&
      node.type !== 'header' &&
      !m.flexDirection
    ) {
      css.flexDirection = 'column';
      css.alignItems = 'stretch';
      css.flexWrap = 'nowrap';
      css.gap = css.gap || '12px';
    }
    if (node.category === 'section' || ['container', 'flex', 'grid'].includes(node.type)) {
      css.width = '100%';
      css.minWidth = 0;
      css.maxWidth = '100%';
    }
    if (node.type === 'image') {
      css.width = '100%';
      css.maxWidth = '100%';
      css.height = 'auto';
    }
  }

  const renderChildren = () => {
    if (!node.childrenIds || node.childrenIds.length === 0) return null;
    return node.childrenIds.map((cId) => (
      <PreviewNodeRenderer key={cId} nodeId={cId} nodes={nodes} viewport={viewport} />
    ));
  };

  switch (node.type) {
    case 'heading': {
      const tag = node.props.tag || 'h2';
      const text = node.props.text || 'عنوان المكون';
      if (tag === 'h1') return <h1 style={css}>{text}</h1>;
      if (tag === 'h3') return <h3 style={css}>{text}</h3>;
      if (tag === 'h4') return <h4 style={css}>{text}</h4>;
      return <h2 style={css}>{text}</h2>;
    }
    case 'paragraph':
      return <p style={css}>{node.props.text || 'نص توضيحي'}</p>;
    case 'button':
      return (
        <button
          style={css}
          className="cursor-default pointer-events-none flex items-center justify-center gap-2"
        >
          {node.props.iconName === 'Sparkles' && <Sparkles className="w-4 h-4" />}
          <span>{node.props.text || 'زر الإجراء'}</span>
        </button>
      );
    case 'image':
      return (
        <div style={css} className="overflow-hidden">
          <img
            src={
              node.props.src ||
              'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=80'
            }
            alt={node.props.alt || 'صورة'}
            className="w-full h-full object-cover"
          />
        </div>
      );
    case 'badge':
      return (
        <div style={css} className="inline-flex items-center gap-1.5">
          {node.props.iconName === 'Sparkles' && <Sparkles className="w-3.5 h-3.5 text-blue-500" />}
          <span>{node.props.text || 'شارة مميزة'}</span>
        </div>
      );
    case 'input':
      return (
        <div style={css} className="opacity-90">
          <input
            type="text"
            readOnly
            placeholder={node.props.placeholder || 'أدخل النص هنا...'}
            className="w-full h-full bg-transparent outline-none cursor-default"
          />
        </div>
      );
    case 'card':
      return (
        <div style={css} className="transition-all hover:shadow-md">
          {node.props.image && (
            <div className="w-full h-44 overflow-hidden rounded-t-xl mb-3">
              <img
                src={node.props.image}
                alt={node.props.title || 'بطاقة'}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {node.props.title && (
            <h4 className="font-bold text-slate-900 text-sm mb-1">{node.props.title}</h4>
          )}
          {node.props.description && (
            <p className="text-xs text-slate-500 mb-2">{node.props.description}</p>
          )}
          {node.props.price && (
            <div className="text-blue-600 font-bold text-sm mb-2">{node.props.price}</div>
          )}
          {renderChildren()}
        </div>
      );
    default:
      return <div style={css}>{renderChildren()}</div>;
  }
};

export const LiveTemplatePreviewModal: React.FC<Props> = ({ template, onClose, onInsert }) => {
  const [viewport, setViewport] = useState<ViewportBreakpoint>('desktop');
  const [justInserted, setJustInserted] = useState(false);

  if (!template) return null;

  const handleInsertClick = () => {
    onInsert(template);
    setJustInserted(true);
    setTimeout(() => {
      setJustInserted(false);
      onClose();
    }, 800);
  };

  const getViewportWidth = () => {
    if (viewport === 'mobile') return 'max-w-[390px]';
    if (viewport === 'tablet') return 'max-w-[768px]';
    return 'max-w-[1200px]';
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-extrabold text-slate-900">
                  {template.nameAr}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-semibold">
                  {template.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{template.descriptionAr}</p>
            </div>
          </div>

          {/* Center Responsive Switcher */}
          <div className="hidden sm:flex items-center bg-slate-200/80 p-1 rounded-xl gap-1">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewport === 'desktop'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>كمبيوتر</span>
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewport === 'tablet'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tablet className="w-4 h-4" />
              <span>تابلت</span>
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewport === 'mobile'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>جوال</span>
            </button>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleInsertClick}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                justInserted
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
              }`}
            >
              {justInserted ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تم الإدراج بنجاح!</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>إدراج في الصفحة الآن</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Interactive Preview Canvas */}
        <div className="flex-1 bg-slate-100/90 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
          <div
            className={`w-full ${getViewportWidth()} bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 transition-all duration-300`}
          >
            <PreviewNodeRenderer
              nodeId={template.rootNodeId}
              nodes={template.nodes}
              viewport={viewport}
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
