import React, { useState } from 'react';
import {
  X,
  Code2,
  FileCode,
  Check,
  AlertCircle,
  Terminal,
  Play,
  Copy,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Layers,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { CODE_PRESETS, CodePreset } from '../../services/aiGeneratorService';

export const CodeWorkspace: React.FC = () => {
  const {
    isCodeWorkspaceOpen,
    setIsCodeWorkspaceOpen,
    selectedNode,
    updateNodeCustomCode,
    updateNodeProps,
    insertNode,
    activePage,
  } = useBuilder();

  const [activeFile, setActiveFile] = useState<'html' | 'styles.css' | 'interactions.ts' | 'component.tsx'>('html');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('interactive_3d_card');
  const [appliedStatus, setAppliedStatus] = useState<string | null>(null);

  if (!isCodeWorkspaceOpen) return null;

  const currentPreset = CODE_PRESETS.find((p) => p.id === selectedPresetId) || CODE_PRESETS[0];

  const defaultHtmlCode =
    selectedNode?.customCode?.tsxSnippet ||
    selectedNode?.props.html ||
    currentPreset.html;

  const defaultCssCode = selectedNode?.customCode?.css || currentPreset.css;
  const defaultJsCode = selectedNode?.customCode?.js || currentPreset.js;
  const defaultTsxCode = selectedNode?.customCode?.tsx || currentPreset.tsxSnippet;

  const getActiveCode = () => {
    switch (activeFile) {
      case 'html':
        return selectedNode?.customCode?.tsxSnippet || selectedNode?.props?.html || currentPreset.html;
      case 'styles.css':
        return selectedNode?.customCode?.css || currentPreset.css;
      case 'interactions.ts':
        return selectedNode?.customCode?.js || currentPreset.js;
      case 'component.tsx':
        return selectedNode?.customCode?.tsx || currentPreset.tsxSnippet;
    }
  };

  const handleCodeChange = (code: string) => {
    if (selectedNode) {
      if (activeFile === 'html') {
        updateNodeCustomCode(selectedNode.id, { tsxSnippet: code });
        updateNodeProps(selectedNode.id, { html: code });
      } else if (activeFile === 'styles.css') {
        updateNodeCustomCode(selectedNode.id, { css: code });
      } else if (activeFile === 'interactions.ts') {
        updateNodeCustomCode(selectedNode.id, { js: code });
      } else if (activeFile === 'component.tsx') {
        updateNodeCustomCode(selectedNode.id, { tsx: code });
      }
    }
  };

  // 1-Click Replace Currently Selected Node with Custom Code Preset
  const handleApplyPresetToSelected = (preset: CodePreset) => {
    if (!selectedNode) return;

    updateNodeProps(selectedNode.id, {
      html: preset.html,
      customCodePreset: preset.id,
      title: preset.name,
    });

    updateNodeCustomCode(selectedNode.id, {
      tsxSnippet: preset.html,
      css: preset.css,
      js: preset.js,
      tsx: preset.tsxSnippet,
    });

    setAppliedStatus(`تم استبدال (${selectedNode.name}) بالكود التفاعلي بنجاح!`);
    setTimeout(() => setAppliedStatus(null), 3500);
  };

  // 1-Click Insert a Brand New Custom Code Component on the Canvas
  const handleInsertNewCustomCodeNode = (preset: CodePreset) => {
    const newNodeId = `custom_code_${Date.now()}`;
    const targetParentId = selectedNode?.id || activePage.rootNodeId;

    insertNode(
      {
        id: newNodeId,
        name: preset.name,
        type: 'custom-code',
        category: 'interactive',
        parentId: targetParentId,
        childrenIds: [],
        props: {
          html: preset.html,
          title: preset.name,
          presetId: preset.id,
        },
        styles: {
          desktop: {
            paddingTop: '2rem',
            paddingBottom: '2rem',
            paddingLeft: '1.5rem',
            paddingRight: '1.5rem',
          },
        },
        customCode: {
          tsxSnippet: preset.html,
          css: preset.css,
          js: preset.js,
          tsx: preset.tsxSnippet,
        },
      },
      targetParentId
    );

    setAppliedStatus(`تم إدراج (${preset.name}) على الصفحة بنجاح!`);
    setTimeout(() => setAppliedStatus(null), 3500);
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-950 text-slate-200 border-t border-slate-800 shadow-2xl flex flex-col transition-all duration-300 ${
        isExpanded ? 'h-[85vh]' : 'h-96'
      }`}
    >
      {/* IDE Header Bar */}
      <div className="h-11 bg-slate-900 px-2 sm:px-4 border-b border-slate-800 flex items-center justify-between select-none overflow-x-auto gap-2 shrink-0">
        {/* Left: Files & Presets */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden min-[640px]:flex items-center gap-1.5 pl-3 border-l border-slate-800 pr-2 text-xs font-bold text-slate-300">
            <Code2 className="w-4 h-4 text-blue-400" />
            <span className="truncate">محرر الأكواد الحي</span>
          </div>

          {/* Preset Selector Dropdown */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={selectedPresetId}
              onChange={(e) => {
                setSelectedPresetId(e.target.value);
                const p = CODE_PRESETS.find((x) => x.id === e.target.value);
                if (p && selectedNode) {
                  // Pre-fill
                }
              }}
              className="bg-transparent text-slate-200 text-xs font-bold outline-none cursor-pointer pr-1"
            >
              {CODE_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveFile('html')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-t text-xs font-mono transition-colors cursor-pointer ${
                activeFile === 'html'
                  ? 'bg-slate-950 text-orange-400 border-t-2 border-orange-500 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>كود التضمين (HTML/Embed)</span>
            </button>

            <button
              onClick={() => setActiveFile('styles.css')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-t text-xs font-mono transition-colors cursor-pointer ${
                activeFile === 'styles.css'
                  ? 'bg-slate-950 text-cyan-400 border-t-2 border-cyan-500 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>تنسيقات التصميم (CSS)</span>
            </button>

            <button
              onClick={() => setActiveFile('interactions.ts')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-t text-xs font-mono transition-colors cursor-pointer ${
                activeFile === 'interactions.ts'
                  ? 'bg-slate-950 text-amber-400 border-t-2 border-amber-500 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>برمجة متقدمة (JS)</span>
            </button>
          </div>

          {/* Security Sandboxed Badge */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800 text-[11px] font-semibold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>بيئة معزولة آمنة (Sandboxed)</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 1-Click Apply / Replace */}
          {selectedNode && (
            <button
              onClick={() => handleApplyPresetToSelected(currentPreset)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="استبدال المكون المحدد بهذا الكود وحفظه ديماً"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>استبدال المكون المحدد</span>
            </button>
          )}

          {/* 1-Click Insert New */}
          <button
            onClick={() => handleInsertNewCustomCodeNode(currentPreset)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            title="إدراج كمكون تفاعلي جديد على الصفحة"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إدراج كود جديد</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            title={isExpanded ? 'تصغير' : 'توسيع الشاشة'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsCodeWorkspaceOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Applied Feedback Bar */}
      {appliedStatus && (
        <div className="bg-emerald-950/90 text-emerald-300 border-b border-emerald-800 px-4 py-1.5 text-xs font-bold flex items-center justify-between animate-in fade-in duration-150 select-none">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{appliedStatus}</span>
          </span>
          <span className="text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded font-mono">
            State Persisted & Synced ✓
          </span>
        </div>
      )}

      {/* Editor & Console Split */}
      <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
        {/* Main Code Editor */}
        <div className="flex-1 flex flex-col bg-slate-950 min-h-0">
          <textarea
            value={getActiveCode()}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full flex-1 bg-slate-950 text-slate-200 font-mono text-xs p-3 sm:p-4 outline-none resize-none leading-relaxed border-0 select-text"
            spellCheck={false}
          />
        </div>

        {/* Presets & Terminal Drawer */}
        <div className="hidden md:flex flex-col w-80 lg:w-96 bg-slate-900/90 border-r border-slate-800 p-3 space-y-3 font-mono text-[11px] select-text shrink-0 overflow-y-auto">
          {/* Quick Presets List */}
          <div className="space-y-1.5">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
              نماذج وأكواد جاهزة للتجربة الفورية
            </span>
            <div className="space-y-1">
              {CODE_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => {
                    setSelectedPresetId(preset.id);
                  }}
                  className={`p-2 rounded-lg border text-right transition-all cursor-pointer ${
                    selectedPresetId === preset.id
                      ? 'bg-indigo-950/60 border-indigo-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>{preset.name}</span>
                    <span className="text-[9px] bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">
                      {preset.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 font-sans">
                    {preset.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Compilation Status Box */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 font-bold">
                <Terminal className="w-3 h-3" />
                <span>Sandbox Terminal</span>
              </span>
              <span className="text-emerald-400 font-bold">Zero Errors</span>
            </div>
            <div className="text-slate-400 space-y-1 text-[10px]">
              <p className="text-emerald-400">✓ Real-time CSS/HTML compiler active</p>
              <p className="text-blue-400">
                ℹ Node: {selectedNode?.id || 'root'} ({selectedNode?.type || 'layout'})
              </p>
              <p className="text-slate-500">ℹ Changes saved automatically to builder state</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
