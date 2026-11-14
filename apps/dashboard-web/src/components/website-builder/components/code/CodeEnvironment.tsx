'use client';

// ---------------------------------------------------------------------------
// CodeEnvironment — the builder's code editing environment
//
// Shopify "Edit code" / WordPress theme-editor model: a button ("الكود") opens
// a real file-based workspace — search the file tree, open a file, edit it,
// add or delete files — instead of the old single-component bottom drawer.
//
// Files map 1:1 onto the builder data model (see shared/builder/codeFiles.ts):
//   • theme/global.css  → site-wide custom CSS (settings.branding.customCss)
//   • theme/tokens.json → design tokens (the future AI assistant edits this)
//   • pages/<slug>/head|body.html → per-page injections
//   • components/<name>--<id>.html|css|js → per-component sandboxed code
//
// Shopify preview-first model: every keystroke streams (debounced) into
// BuilderContext.codeDrafts, and the canvas renders the overlaid preview
// website — merchants SEE changes live WITHOUT saving. "حفظ" commits the
// drafts into builder history (undoable, autosaved). Publishing happens
// from the normal external publish button; it commits pending drafts first.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Braces,
  Code2,
  Eye,
  FileCode2,
  FileJson,
  FilePlus2,
  FileType2,
  Loader2,
  Save,
  Search,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { css as cssLang } from '@codemirror/lang-css';
import { html as htmlLang } from '@codemirror/lang-html';
import { javascript as javascriptLang } from '@codemirror/lang-javascript';
import { json as jsonLang } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { useBuilder } from '../../context/BuilderContext';
import {
  listWebsiteFiles,
  readWebsiteFile,
  writeWebsiteFile,
  type WebsiteFileEntry,
} from '@ray-eg/shared/builder';

const GROUPS: Array<{
  id: 'theme' | 'pages' | 'components';
  label: string;
  match: (file: WebsiteFileEntry) => boolean;
}> = [
  { id: 'theme', label: 'الثيم والموقع', match: (f) => f.kind.startsWith('theme') },
  { id: 'pages', label: 'الصفحات', match: (f) => f.kind.startsWith('page') },
  { id: 'components', label: 'المكوّنات', match: (f) => f.kind.startsWith('component') },
];

const languageIcon = (language: WebsiteFileEntry['language']) => {
  if (language === 'css') return FileType2;
  if (language === 'json') return FileJson;
  if (language === 'javascript') return Braces;
  return FileCode2;
};

const fileHint = (file: WebsiteFileEntry): string => {
  switch (file.kind) {
    case 'theme-global-css':
      return 'CSS عام — يُطبّق على الموقع كله في كل الصفحات. استخدم متغيرات الثيم مثل var(--ray-color-primary).';
    case 'theme-tokens-json':
      return 'متغيرات الثيم بصيغة JSON — تغيير قيمة هنا ينعكس على كل الموقع (الألوان، الخطوط، الحواف، الظلال).';
    case 'page-head':
      return 'كود يُحقن في <head> عند النشر (ميتا تاجات التحقق، خطوط، أكواد التتبع). صفحة البداية تُطبّق على الموقع كله.';
    case 'page-body':
      return 'كود يُحقن في نهاية <body> عند النشر (سكربتات الدردشة والبكسلات).';
    case 'component-html':
      return 'HTML المكوّن — يُعرض داخل Sandbox معزول آمن.';
    case 'component-css':
      return 'CSS خاص بهذا المكوّن فقط — كل selector يُطبّق تلقائيًا داخل عنصر المكوّن، ويتغلب على الستايلات الأساسية.';
    case 'component-js':
      return 'JavaScript خاص بهذا المكوّن — يعمل بأمان داخل إطار معزول (لا يصل للكوكيز أو الصفحة الأم).';
    default:
      return '';
  }
};

// ─── Quick CSS presets ────────────────────────────────────────────────────
// One-click dramatic transformations for theme/global.css. Each preset is a
// complete, safe CSS body (no external @import, no JS) that overrides theme
// variables AND adds visible effects (animations, gradients, hover states) so
// the merchant SEES the live-preview pipeline work the moment they click.
// Apply replaces the current draft for the active CSS file; saving commits
// it to history, publishing pushes it live — same Shopify preview-first flow.
interface CssPreset {
  id: string;
  name: string;
  blurb: string;
  swatch: string; // CSS gradient for the chip preview
  css: string;
}

const CSS_PRESETS: CssPreset[] = [
  {
    id: 'test-connection',
    name: 'اختبار المعاينة',
    blurb: 'لو الكانفاس اتحول لأحمر يبقى الكود بيشتغل صح',
    swatch: 'linear-gradient(135deg, #ef4444 0%, #facc15 100%)',
    css: `/* اختبار اتصال المعاينة — لو الموقع اتحول لأحمر/أصفر يبقى الـ CSS شغال */
:root {
  --ray-color-primary: #ef4444;
  --ray-color-primary-hover: #dc2626;
  --ray-color-accent: #facc15;
  --ray-color-background: #fef2f2;
  --ray-color-surface: #ffffff;
  --ray-color-text-primary: #7f1d1d;
}
.ray-site-root h1,
.ray-site-root h2 {
  background: linear-gradient(90deg, #ef4444, #facc15);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.ray-site-root button {
  background: #ef4444 !important;
  color: #fff !important;
  border: 3px solid #facc15 !important;
}
`,
  },
  {
    id: 'pharmacy',
    name: 'صيدلية احترافية',
    blurb: 'أخضر طبي ناعم + ظلال + حركة عند المرور',
    swatch: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
    css: `/* ثيم الصيدلية الاحترافي */
:root {
  --ray-color-primary: #10b981;
  --ray-color-primary-hover: #059669;
  --ray-color-accent: #0ea5e9;
  --ray-radius-sm: 8px;
  --ray-radius-md: 14px;
  --ray-radius-lg: 22px;
  --ray-shadow-sm: 0 4px 10px rgba(16, 185, 129, 0.08);
  --ray-shadow-md: 0 14px 32px rgba(16, 185, 129, 0.18);
  --ray-shadow-lg: 0 28px 56px rgba(16, 185, 129, 0.25);
}
.ray-site-root { scroll-behavior: smooth; }
.ray-site-root h1,
.ray-site-root h2 { letter-spacing: -0.4px; }
.ray-site-root button {
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.ray-site-root button:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(16, 185, 129, 0.35);
}
`,
  },
  {
    id: 'neon-night',
    name: 'نيون ليلي',
    blurb: 'خلفية داكنة + أزرار متوهجة بنفسجي',
    swatch: 'linear-gradient(135deg, #0b0b14 0%, #d946ef 100%)',
    css: `/* ثيم النيون الليلي */
:root {
  --ray-color-primary: #d946ef;
  --ray-color-primary-hover: #c026d3;
  --ray-color-accent: #22d3ee;
  --ray-color-background: #0b0b14;
  --ray-color-surface: #15152a;
  --ray-color-text-primary: #f5f5ff;
  --ray-color-text-secondary: #c7c7e6;
  --ray-color-border: rgba(255, 255, 255, 0.08);
  --ray-shadow-md: 0 0 24px rgba(217, 70, 239, 0.35);
  --ray-shadow-lg: 0 0 40px rgba(217, 70, 239, 0.5);
}
.ray-site-root {
  background: radial-gradient(ellipse at top, #1a0b2e 0%, #0b0b14 60%);
}
.ray-site-root button {
  box-shadow: 0 0 12px rgba(217, 70, 239, 0.4);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.ray-site-root button:hover {
  box-shadow: 0 0 28px rgba(217, 70, 239, 0.75);
  transform: translateY(-1px);
}
`,
  },
  {
    id: 'egyptian-warm',
    name: 'دافئ مصري',
    blurb: 'برتقالي صحراوي + أزرار دائرية + خلفية كريمي',
    swatch: 'linear-gradient(135deg, #ea580c 0%, #facc15 100%)',
    css: `/* ثيم دافئ مصري */
:root {
  --ray-color-primary: #ea580c;
  --ray-color-primary-hover: #c2410c;
  --ray-color-accent: #facc15;
  --ray-color-background: #fffbeb;
  --ray-color-surface: #ffffff;
  --ray-radius-md: 16px;
  --ray-radius-lg: 24px;
  --ray-shadow-sm: 0 4px 10px rgba(234, 88, 12, 0.08);
  --ray-shadow-md: 0 14px 28px rgba(234, 88, 12, 0.15);
}
.ray-site-root h1,
.ray-site-root h2 {
  font-weight: 800;
  letter-spacing: -0.3px;
}
.ray-site-root button {
  border-radius: 999px !important;
  transition: transform 0.18s ease;
}
.ray-site-root button:hover { transform: scale(1.04); }
`,
  },
  {
    id: 'elegant',
    name: 'كلاسيكي أنيق',
    blurb: 'خطوط Serif + فراغات واسعة + ظلال ناعمة',
    swatch: 'linear-gradient(135deg, #1f2937 0%, #9ca3af 100%)',
    css: `/* ثيم كلاسيكي أنيق */
:root {
  --ray-font-heading: 'Playfair Display', 'Amiri', Georgia, serif;
  --ray-font-body: 'Cairo', system-ui, sans-serif;
  --ray-color-primary: #1f2937;
  --ray-color-primary-hover: #111827;
  --ray-color-accent: #b45309;
  --ray-radius-sm: 2px;
  --ray-radius-md: 4px;
  --ray-radius-lg: 8px;
  --ray-shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
  --ray-shadow-md: 0 8px 20px rgba(0, 0, 0, 0.06);
}
.ray-site-root h1,
.ray-site-root h2 {
  letter-spacing: -0.5px;
  line-height: 1.15;
  font-weight: 700;
}
.ray-site-root p { line-height: 1.8; }
.ray-site-root button { transition: background 0.2s ease; }
`,
  },
];

export const CodeEnvironment: React.FC = () => {
  const {
    isCodeWorkspaceOpen,
    setIsCodeWorkspaceOpen,
    codeActiveFile,
    website,
    codeDrafts: contextDrafts,
    setCodeDraftFile,
    selectedNodeId,
    selectedNode,
    activePage,
    recordHistory,
    insertNode,
    autosaveStatus,
  } = useBuilder();

  // Local mirror of the drafts for instant typing; synced (debounced) into the
  // context so the canvas preview picks changes up without any save. Seeded
  // from the context so drafts made before (re)opening are shown and remain
  // editable in place.
  const [drafts, setDrafts] = useState<Record<string, string>>({ ...contextDrafts });
  const [activePath, setActivePath] = useState<string>('theme/global.css');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [createdNodeId, setCreatedNodeId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const noticeTimerRef = useRef<number | null>(null);
  const initializedForOpenRef = useRef(false);
  // Debounced streaming of drafts into the context (canvas live preview).
  const pendingSyncRef = useRef<Map<string, string>>(new Map());
  const syncTimerRef = useRef<number | null>(null);

  const flushDraftSync = useCallback(() => {
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    if (pendingSyncRef.current.size === 0) return;
    pendingSyncRef.current.forEach((content, path) => setCodeDraftFile(path, content));
    pendingSyncRef.current.clear();
  }, [setCodeDraftFile]);

  // Flush on unmount so closing the environment never drops pending edits —
  // the preview keeps showing (and publishing commits) exactly what was typed.
  useEffect(() => {
    return () => flushDraftSync();
  }, [flushDraftSync]);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const flash = useCallback((tone: 'ok' | 'error', text: string) => {
    setNotice({ tone, text });
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 3200);
  }, []);

  const files = useMemo(
    () =>
      listWebsiteFiles(website, {
        includeNodeIds: [selectedNodeId, createdNodeId].filter((id): id is string => Boolean(id)),
      }),
    [website, selectedNodeId, createdNodeId]
  );

  // First open: land on the file implied by the entry point (inspector CSS
  // button → the selected component's CSS; top bar → global.css).
  useEffect(() => {
    if (!isCodeWorkspaceOpen) {
      initializedForOpenRef.current = false;
      return;
    }
    if (initializedForOpenRef.current) return;
    initializedForOpenRef.current = true;
    let target = 'theme/global.css';
    if (selectedNodeId) {
      const ext =
        codeActiveFile === 'styles.css'
          ? '.css'
          : codeActiveFile === 'interactions.ts'
            ? '.js'
            : '.html';
      const match = files.find((f) => f.nodeId === selectedNodeId && f.path.endsWith(ext));
      if (match) target = match.path;
    }
    setActivePath(target);
    setSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCodeWorkspaceOpen]);

  // After creating a component, jump straight into its HTML file.
  useEffect(() => {
    if (!createdNodeId) return;
    const created = files.find((f) => f.nodeId === createdNodeId && f.kind === 'component-html');
    if (created) {
      setActivePath(created.path);
      setCreatedNodeId(null);
    }
  }, [files, createdNodeId]);

  const activeFile = files.find((f) => f.path === activePath) || null;
  const draftValue = drafts[activePath];
  const content =
    draftValue !== undefined ? draftValue : (readWebsiteFile(website, activePath) ?? '');

  const dirtyPaths = useMemo(() => Object.keys(drafts), [drafts]);
  const isDirty = dirtyPaths.length > 0;

  const handleChange = useCallback(
    (value: string) => {
      setDrafts((prev) => ({ ...prev, [activePath]: value }));
      // Stream into the context (debounced) → canvas preview updates live.
      pendingSyncRef.current.set(activePath, value);
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        flushDraftSync();
      }, 400);
    },
    [activePath, flushDraftSync]
  );

  const applyDrafts = useCallback((): boolean => {
    flushDraftSync();
    const paths = Object.keys(drafts);
    if (paths.length === 0) return true;
    let next = website;
    const applied: string[] = [];
    const failed = new Set<string>();
    paths.forEach((path) => {
      const result = writeWebsiteFile(next, path, drafts[path]);
      if (!result || result.error) {
        failed.add(path);
        if (result?.error) flash('error', `${path}: ${result.error}`);
        return;
      }
      if (result.changed) {
        next = result.website;
        applied.push(path);
      }
    });
    if (applied.length > 0) {
      recordHistory(
        `تعديل الكود عبر بيئة الكود (${applied.length} ${applied.length === 1 ? 'ملف' : 'ملفات'})`,
        next
      );
    }
    // Successful drafts are cleared (locally AND from the context overlay —
    // they are now the saved state); failed ones stay so nothing is lost.
    applied.forEach((path) => setCodeDraftFile(path, null));
    setDrafts((prev) => {
      const remaining: Record<string, string> = {};
      paths.forEach((path) => {
        if (failed.has(path)) remaining[path] = prev[path];
      });
      return remaining;
    });
    if (applied.length > 0 && failed.size === 0) {
      flash('ok', 'تم تثبيت التعديلات — المعاينة بتعرضها، والنشر من زرار النشر.');
    }
    return failed.size === 0;
  }, [drafts, website, recordHistory, flash, flushDraftSync, setCodeDraftFile]);

  const handleSaveDraft = useCallback(() => {
    applyDrafts();
  }, [applyDrafts]);

  // Apply a preset CSS body to the active CSS file. Replaces the current
  // draft (with confirmation if there's existing content) and streams it into
  // the context — the canvas updates live within the 400ms debounce.
  const handleApplyPreset = useCallback(
    (preset: CssPreset) => {
      if (!activeFile || activeFile.language !== 'css') {
        flash('error', 'القوالب الجاهزة بتشتغل مع ملفات CSS فقط.');
        return;
      }
      const existing = drafts[activePath] ?? readWebsiteFile(website, activePath) ?? '';
      if (existing.trim() && existing.trim() !== preset.css.trim()) {
        const ok = window.confirm(
          `استبدال محتوى «${activeFile.label}» بالقالب «${preset.name}»؟ المحتوى الحالي هيتمسح من المسودة (مش من المنشور).`
        );
        if (!ok) return;
      }
      setDrafts((prev) => ({ ...prev, [activePath]: preset.css }));
      pendingSyncRef.current.set(activePath, preset.css);
      // Flush immediately so the merchant SEES the dramatic change at once —
      // no 400ms wait for the first impressions of the live-preview pipeline.
      flushDraftSync();
      flash('ok', `تم تطبيق قالب «${preset.name}» — المعاينة بتعرضه فورًا.`);
    },
    [activeFile, activePath, drafts, website, flash, flushDraftSync]
  );

  const handleDeleteFile = useCallback(
    (file: WebsiteFileEntry) => {
      if (!file.deletable) return;
      if (!window.confirm(`مسح كود "${file.label}" نهائيًا؟`)) return;
      const result = writeWebsiteFile(website, file.path, '');
      if (result?.changed) {
        recordHistory(`حذف كود (${file.label})`, result.website);
      }
      pendingSyncRef.current.delete(file.path);
      setCodeDraftFile(file.path, null);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[file.path];
        return next;
      });
      if (file.path === activePath) setActivePath('theme/global.css');
      flash('ok', 'تم مسح الكود.');
    },
    [website, recordHistory, activePath, flash, setCodeDraftFile]
  );

  const handleCreateComponent = useCallback(() => {
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
        props: {
          html: '<section class="custom-section">\n  <h2>عنوان القسم</h2>\n  <p>اكتب محتوى هذا المكوّن هنا.</p>\n</section>',
          title: 'مكوّن مخصص جديد',
        },
        styles: { desktop: { paddingTop: '1rem', paddingBottom: '1rem' } },
        customCode: { enabled: true, tsxSnippet: '', cssSnippet: '', jsSnippet: '' },
      },
      parentId
    );
    setCreatedNodeId(id);
    flash('ok', 'تم إنشاء مكوّن جديد — افتح ملفاته وعدّلها.');
  }, [selectedNode, activePage, insertNode, flash]);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return files;
    return files.filter(
      (f) => f.path.toLowerCase().includes(query) || f.label.toLowerCase().includes(query)
    );
  }, [files, search]);

  const extensions = useMemo(() => {
    switch (activeFile?.language) {
      case 'css':
        return [cssLang()];
      case 'javascript':
        return [javascriptLang()];
      case 'json':
        return [jsonLang()];
      case 'html':
        return [htmlLang()];
      default:
        return [];
    }
  }, [activeFile?.language]);

  if (!isCodeWorkspaceOpen) return null;

  const saveStateLabel =
    autosaveStatus === 'saving'
      ? 'جارٍ الحفظ التلقائي…'
      : autosaveStatus === 'saved'
        ? 'محفوظ'
        : 'تعديلات غير محفوظة';

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-slate-100 shadow-2xl">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2 text-sm font-black">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
              <Code2 className="size-4" />
            </span>
            <span className="hidden sm:inline">الكود — بيئة تحرير الملفات</span>
            <span className="sm:hidden">الكود</span>
          </div>
          {activeFile && (
            <code className="hidden max-w-[24rem] truncate rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-cyan-300 md:block">
              {activeFile.path}
            </code>
          )}
          {isDirty && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              {dirtyPaths.length} تغيير غير محفوظ
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden px-1 text-[10px] text-slate-400 lg:inline" aria-live="polite">
            {saveStateLabel}
          </span>
          {isDirty && (
            <span
              className="hidden items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 sm:flex"
              title="المعاينة خلف المحرر بتعرض تعديلاتك فورًا حتى بدون حفظ"
            >
              <Eye className="size-3" /> المعاينة بتعرض تعديلاتك
            </span>
          )}
          <button
            onClick={handleSaveDraft}
            disabled={!isDirty}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="size-3.5" /> حفظ
          </button>
          <button
            onClick={() => setIsCodeWorkspaceOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="إغلاق بيئة الكود"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className={`border-b px-4 py-2 text-xs font-bold ${
            notice.tone === 'ok'
              ? 'border-emerald-800 bg-emerald-950/70 text-emerald-300'
              : 'border-red-800 bg-red-950/70 text-red-300'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* File tree */}
        <aside className="flex w-56 shrink-0 flex-col border-l border-slate-800 bg-slate-900/70 sm:w-72">
          <div className="border-b border-slate-800 p-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5">
              <Search className="size-3.5 shrink-0 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن ملف…"
                aria-label="بحث في ملفات الكود"
                className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
              />
            </div>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="شجرة ملفات الكود">
            {GROUPS.map((group) => {
              const groupFiles = filteredFiles.filter(group.match);
              if (groupFiles.length === 0) return null;
              return (
                <div key={group.id} className="mb-3">
                  <div className="px-2 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {group.label}
                  </div>
                  <ul className="space-y-0.5">
                    {groupFiles.map((file) => {
                      const Icon = languageIcon(file.language);
                      const isActive = file.path === activePath;
                      const hasDraft = drafts[file.path] !== undefined;
                      return (
                        <li key={file.path} className="group/file">
                          <div
                            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${
                              isActive
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-300 hover:bg-slate-800/60'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setActivePath(file.path)}
                              className="flex min-w-0 flex-1 items-center gap-2 text-right"
                              title={file.path}
                            >
                              <Icon
                                className={`size-3.5 shrink-0 ${
                                  file.kind === 'theme-global-css'
                                    ? 'text-cyan-400'
                                    : file.kind === 'theme-tokens-json'
                                      ? 'text-violet-400'
                                      : 'text-slate-500'
                                }`}
                              />
                              <span className="truncate text-xs font-semibold">{file.label}</span>
                              {hasDraft && (
                                <span className="size-1.5 shrink-0 rounded-full bg-amber-400" />
                              )}
                            </button>
                            {file.deletable && (
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(file)}
                                className="shrink-0 rounded p-1 text-slate-600 opacity-0 transition-opacity hover:bg-red-950 hover:text-red-400 group-hover/file:opacity-100"
                                title="مسح هذا الكود"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
          <div className="border-t border-slate-800 p-2.5">
            <button
              onClick={handleCreateComponent}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60"
            >
              <FilePlus2 className="size-3.5" /> مكوّن كود جديد
            </button>
            <p className="mt-2 px-1 text-[10px] leading-5 text-slate-500">
              اكتب الكود والمعاينة بتعرضه فورًا حتى بدون حفظ. اضغط حفظ لتثبيت التعديل، والنشر يتم من
              زرار النشر العادي بره بيئة الكود — والنشر بيلحق معاه أي كود مش محفوظ.
            </p>
          </div>
        </aside>

        {/* Editor */}
        <main className="flex min-w-0 flex-1 flex-col" dir="ltr">
          {activeFile && (
            <div
              className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/50 px-4 py-2"
              dir="rtl"
            >
              <p className="truncate text-[11px] font-semibold text-slate-300">
                {fileHint(activeFile)}
              </p>
              <code className="hidden shrink-0 rounded bg-slate-950 px-2 py-0.5 text-[10px] text-slate-500 lg:block">
                {activeFile.path}
              </code>
            </div>
          )}

          {/* Quick CSS Presets — one-click dramatic transformations.
              Only shown for CSS files; applying replaces the draft and
              streams to the canvas immediately so the merchant sees the
              change live. */}
          {activeFile?.language === 'css' && (
            <div
              className="flex shrink-0 flex-col gap-2 border-b border-slate-800 bg-slate-900/80 px-3 py-2.5"
              dir="rtl"
            >
              <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-300">
                <Wand2 className="size-3.5" />
                <span>قوالب جاهزة — اضغط وحد يطبّق فورًا على المعاينة</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CSS_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    title={preset.blurb}
                    className="group/preset flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-right hover:border-cyan-500 hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <span
                      aria-hidden
                      className="size-5 shrink-0 rounded-md ring-1 ring-white/10"
                      style={{ background: preset.swatch }}
                    />
                    <span className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-100 group-hover/preset:text-cyan-300">
                        {preset.name}
                      </span>
                      <span className="text-[9px] text-slate-500 group-hover/preset:text-slate-400 max-w-[140px] truncate">
                        {preset.blurb}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">
            {mounted && activeFile ? (
              <CodeMirror
                value={content}
                height="100%"
                theme={oneDark}
                extensions={extensions}
                onChange={handleChange}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  autocompletion: true,
                  highlightSelectionMatches: true,
                  bracketMatching: true,
                  closeBrackets: true,
                }}
                style={{ height: '100%', fontSize: '13px' }}
                aria-label={`تحرير ${activeFile.label}`}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {activeFile ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  'اختر ملفًا من القائمة لتحريره'
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CodeEnvironment;
