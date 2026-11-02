'use client';

import React, { useMemo, useState } from 'react';
import { Code2, FileCode, Maximize2, Minimize2, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';

type CodeFile = 'html' | 'styles.css' | 'interactions.js';

const fileLabels: Record<CodeFile, string> = {
  html: 'HTML',
  'styles.css': 'CSS',
  'interactions.js': 'JavaScript',
};

const emptyHtml =
  '<section class="custom-section">\n  <h2>عنوان القسم</h2>\n  <p>اكتب محتوى هذا المكوّن هنا.</p>\n</section>';

export const CodeWorkspace: React.FC = () => {
  const {
    isCodeWorkspaceOpen,
    saveDraft,
    autosaveStatus,
    setIsCodeWorkspaceOpen,
    selectedNode,
    updateNodeCustomCode,
    updateNodeProps,
    insertNode,
    deleteNode,
    activePage,
  } = useBuilder();
  const [activeFile, setActiveFile] = useState<CodeFile>('html');
  const [isExpanded, setIsExpanded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const code = useMemo(() => {
    if (!selectedNode) return '';
    if (activeFile === 'html') {
      return (
        selectedNode.customCode?.tsxSnippet ||
        selectedNode.props?.html ||
        `<div class="${selectedNode.type}">\n  <!-- ${selectedNode.name} -->\n</div>`
      );
    }
    if (activeFile === 'styles.css') {
      return (
        selectedNode.customCode?.css ||
        Object.entries(selectedNode.styles?.desktop || {})
          .map(
            ([property, value]) =>
              `  ${property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value};`
          )
          .join('\\n')
      );
    }
    return selectedNode.customCode?.js || '// اكتب التفاعل الخاص بهذا المكوّن هنا';
  }, [activeFile, selectedNode]);

  if (!isCodeWorkspaceOpen) return null;

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const handleCodeChange = (value: string) => {
    if (!selectedNode) return;
    if (activeFile === 'html') {
      updateNodeCustomCode(selectedNode.id, { tsxSnippet: value, enabled: true });
      updateNodeProps(selectedNode.id, { html: value });
      return;
    }
    if (activeFile === 'styles.css') {
      updateNodeCustomCode(selectedNode.id, { css: value, enabled: true });
      return;
    }
    updateNodeCustomCode(selectedNode.id, { js: value, enabled: true });
  };

  const createCustomNode = () => {
    const id = `custom_code_${crypto.randomUUID()}`;
    const parentId = selectedNode?.parentId || activePage.rootNodeId;
    insertNode(
      {
        id,
        name: 'مكوّن مخصص جديد',
        type: 'custom-code',
        category: 'interactive',
        parentId,
        childrenIds: [],
        props: { html: emptyHtml, title: 'مكوّن مخصص جديد' },
        styles: { desktop: { paddingTop: '1rem', paddingBottom: '1rem' } },
        customCode: { enabled: true, tsxSnippet: emptyHtml, css: '', js: '' },
      },
      parentId
    );
    flash('تم إنشاء مكوّن فارغ قابل للتحرير.');
  };

  const deleteSelectedNode = () => {
    if (!selectedNode || selectedNode.id === activePage.rootNodeId) return;
    deleteNode(selectedNode.id);
    flash('تم حذف المكوّن المحدد.');
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 flex flex-col border-t border-slate-800 bg-slate-950 text-slate-200 shadow-2xl ${isExpanded ? 'h-[85vh]' : 'h-96'}`}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-slate-800 bg-slate-900 px-3">
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Code2 className="size-4 text-blue-400" />
            <span>محرر الكود للمكوّن المحدد</span>
          </div>
          {selectedNode && (
            <span className="max-w-44 truncate text-[11px] text-slate-400">
              {selectedNode.name}
            </span>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-emerald-800 bg-emerald-950/60 px-2 py-1 text-[10px] font-semibold text-emerald-300">
            <ShieldCheck className="size-3.5" />
            Sandbox آمن
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => {
              saveDraft(true);
              flash('تم حفظ تعديلات المكوّن.');
            }}
            className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500"
          >
            حفظ التعديلات
          </button>
          <span className="px-1 text-[10px] text-slate-400" aria-live="polite">
            {autosaveStatus === 'saving'
              ? 'جارٍ الحفظ...'
              : autosaveStatus === 'saved'
                ? 'محفوظ'
                : 'تعديلات غير محفوظة'}
          </span>
          <button
            onClick={createCustomNode}
            className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
          >
            <Plus className="size-3.5" /> مكوّن جديد
          </button>
          <button
            onClick={deleteSelectedNode}
            disabled={!selectedNode || selectedNode.id === activePage.rootNodeId}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-3.5" /> حذف المحدد
          </button>
          <button
            onClick={() => setIsExpanded((value) => !value)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            title={isExpanded ? 'تصغير' : 'توسيع'}
          >
            {isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button
            onClick={() => setIsCodeWorkspaceOpen(false)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {notice && (
        <div className="border-b border-emerald-800 bg-emerald-950/80 px-4 py-2 text-xs font-bold text-emerald-300">
          {notice}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="flex min-h-0 flex-1 flex-col bg-slate-950">
          <nav
            className="flex shrink-0 gap-1 border-b border-slate-800 px-2 pt-2"
            aria-label="ملفات المكوّن"
          >
            {(Object.keys(fileLabels) as CodeFile[]).map((file) => (
              <button
                key={file}
                onClick={() => setActiveFile(file)}
                className={`flex items-center gap-1 rounded-t px-3 py-2 text-xs font-mono ${activeFile === file ? 'border-t-2 border-orange-500 bg-slate-900 text-orange-300' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
              >
                <FileCode className="size-3.5" /> {fileLabels[file]}
              </button>
            ))}
          </nav>
          {selectedNode ? (
            <textarea
              value={code}
              onChange={(event) => handleCodeChange(event.target.value)}
              spellCheck={false}
              aria-label={`تحرير ${fileLabels[activeFile]}`}
              className="min-h-0 flex-1 resize-none border-0 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 outline-none"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-400">
              حدد Header أو Section أو أي مكوّن من الصفحة ليتم تحريره هنا، أو أنشئ مكوّناً جديداً
              فارغاً.
            </div>
          )}
        </main>

        <aside className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto border-r border-slate-800 bg-slate-900/80 p-4 text-xs md:flex">
          <div className="font-bold text-slate-200">تحرير مباشر</div>
          <p className="leading-6 text-slate-400">
            كل ملف هنا يخص المكوّن المحدد فقط. لا توجد قوالب إجبارية ولا يتم استبدال المكوّن
            تلقائياً.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-[11px] leading-6 text-slate-400">
            <p className="text-emerald-300">HTML</p>
            <p>محتوى وهيكل هذا المكوّن</p>
            <p className="mt-2 text-cyan-300">CSS</p>
            <p>التنسيق الخاص به فقط</p>
            <p className="mt-2 text-amber-300">JavaScript</p>
            <p>تفاعله داخل Sandbox المعزول</p>
          </div>
        </aside>
      </div>
    </div>
  );
};
