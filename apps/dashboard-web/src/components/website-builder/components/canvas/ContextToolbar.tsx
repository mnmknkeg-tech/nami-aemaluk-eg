import React from 'react';
import { HIDE_UNPUBLISHED } from '@/config/sidebar';
import {
  Paintbrush,
  Code2,
  Sparkles,
  Copy,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Trash2,
  X,
  SlidersHorizontal,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';

export const ContextToolbar: React.FC = () => {
  const {
    selectedNode,
    selectNode,
    duplicateNode,
    deleteNode,
    moveNode,
    toggleNodeLock,
    toggleNodeVisibility,
    setIsCodeWorkspaceOpen,
    setIsAiModalOpen,
    setActiveInspectorTab,
  } = useBuilder();

  // ONLY render when an element is explicitly selected for editing
  if (!selectedNode) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-1.5 border border-slate-700/90 animate-in fade-in slide-in-from-top-2 duration-150 select-none text-xs max-w-[95vw] overflow-x-auto">
      {/* Node Info Badge */}
      <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-700/80 pr-1 shrink-0">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
        <span className="font-bold text-slate-100 max-w-[80px] sm:max-w-[130px] truncate text-[11px] sm:text-[12px]">
          {selectedNode.name}
        </span>
        <span className="text-[9px] sm:text-[10px] bg-slate-800 text-blue-300 font-mono px-1.5 py-0.5 rounded shrink-0">
          {selectedNode.type}
        </span>
      </div>

      {/* Design Inspector Tab Trigger */}
      <button
        onClick={() => setActiveInspectorTab('style')}
        className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
        title="تعديل المظهر والتصميم"
      >
        <Paintbrush className="w-3.5 h-3.5 text-purple-400" />
        <span className="font-medium hidden min-[480px]:inline">تصميم</span>
      </button>

      {/* Content Props Trigger */}
      <button
        onClick={() => setActiveInspectorTab('props')}
        className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
        title="تعديل المحتوى والخصائص"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-medium hidden min-[480px]:inline">محتوى</span>
      </button>

      {/* Code Workspace Trigger */}
      <button
        onClick={() => setIsCodeWorkspaceOpen(true)}
        className="hidden sm:flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer shrink-0"
        title="تعديل الكود المخصص للمكون"
      >
        <Code2 className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-medium">كود</span>
      </button>

      {/* AI Patch Trigger — market-launch switch: AI is local-only for now. */}
      {!HIDE_UNPUBLISHED && (
        <button
          onClick={() => setIsAiModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold transition-all shadow-xs cursor-pointer shrink-0 animate-in fade-in"
          title="تعديل هذا المكون بالذكاء الاصطناعي (AI)"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
          <span className="font-bold text-[11px] sm:text-xs">تعديل AI</span>
        </button>
      )}

      <div className="h-4 w-px bg-slate-700/80 mx-0.5 shrink-0" />

      {/* Move Up */}
      <button
        onClick={() => moveNode(selectedNode.id, 'up')}
        className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
        title="تحريك لأعلى"
      >
        <ArrowUp className="w-3.5 h-3.5" />
      </button>

      {/* Move Down */}
      <button
        onClick={() => moveNode(selectedNode.id, 'down')}
        className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
        title="تحريك لأسفل"
      >
        <ArrowDown className="w-3.5 h-3.5" />
      </button>

      {/* Duplicate */}
      <button
        onClick={() => duplicateNode(selectedNode.id)}
        className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
        title="تكرار المكون"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      {/* Quick Visibility Toggle */}
      <button
        onClick={() => toggleNodeVisibility(selectedNode.id)}
        className={`p-1 sm:p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
          selectedNode.isHidden
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            : 'hover:bg-slate-800 text-slate-300 hover:text-white'
        }`}
        title={selectedNode.isHidden ? 'إظهار المكوّن في الصفحة' : 'إخفاء المكوّن مؤقتاً'}
      >
        {selectedNode.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>

      {/* Lock */}
      <button
        onClick={() => toggleNodeLock(selectedNode.id)}
        className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
        title={selectedNode.isLocked ? 'إلغاء القفل' : 'قفل'}
      >
        {selectedNode.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
      </button>

      {/* Delete */}
      {selectedNode.parentId && (
        <button
          onClick={() => deleteNode(selectedNode.id)}
          className="p-1 sm:p-1.5 rounded-lg hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors cursor-pointer shrink-0"
          title="حذف المكون"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="h-4 w-px bg-slate-700/80 mx-0.5 shrink-0" />

      {/* Deselect / Close button */}
      <button
        onClick={() => selectNode(null)}
        className="p-1 sm:p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
        title="إنهاء التعديل (إلغاء التحديد)"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

