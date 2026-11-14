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
  Sparkles,
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
  type Website,
  type BuilderPage,
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

// ─── Quick CSS presets (additive enhancements) ────────────────────────────
// Each preset is an ADDITIVE effect that layers ON TOP of the merchant's
// current template — it does NOT override --ray-color-primary / accent /
// background, so the chosen template keeps its identity. The preset only
// adds shadows, transitions, typography tweaks, or animations that are
// visible regardless of the underlying template.
//
// (Earlier rev shipped full-theme replacements like 'Neon Night' that wiped
// the pharmacy template's green identity — merchant feedback: 'I picked a
// template, I want to see changes ON the template, not from scratch'.)
//
// 'ابدأ من الصفر' is a SEPARATE action below the preset row: it clears the
// website's components and CSS so the canvas becomes blank, then the merchant
// builds via CSS — also handled here so the two flows live together.
interface CssPreset {
  id: string;
  name: string;
  blurb: string;
  swatch: string; // CSS gradient for the chip preview
  css: string;
}

const CSS_PRESETS: CssPreset[] = [
  {
    id: 'shadows-motion',
    name: 'ظلال وحركات',
    blurb: 'ظلال ناعمة + الأزرار بترتفع عند المرور عليها',
    swatch: 'linear-gradient(135deg, rgba(99,102,241,0.6) 0%, rgba(168,85,247,0.6) 100%)',
    css: `/* ظلال وحركات — طبقة فوق ثيمك الحالي، بلا تغيير الألوان */
:root {
  --ray-shadow-sm: 0 4px 10px rgba(15, 23, 42, 0.06);
  --ray-shadow-md: 0 12px 28px rgba(15, 23, 42, 0.10);
  --ray-shadow-lg: 0 24px 50px rgba(15, 23, 42, 0.14);
}
.ray-site-root { scroll-behavior: smooth; }
.ray-site-root button {
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.ray-site-root button:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.18);
}
.ray-site-root img {
  transition: transform 0.25s ease;
}
.ray-site-root img:hover { transform: scale(1.02); }
`,
  },
  {
    id: 'typography',
    name: 'خطوط أنيقة',
    blurb: 'تباعد بين الحروف + ارتفاع سطر مريح للقراءة',
    swatch: 'linear-gradient(135deg, rgba(244,63,94,0.6) 0%, rgba(251,146,60,0.6) 100%)',
    css: `/* خطوط أنيقة — تحسين القراءة دون تغيير الألوان */
.ray-site-root h1,
.ray-site-root h2,
.ray-site-root h3 {
  letter-spacing: -0.4px;
  line-height: 1.15;
}
.ray-site-root p {
  line-height: 1.8;
  letter-spacing: 0.1px;
}
.ray-site-root { scroll-behavior: smooth; }
`,
  },
  {
    id: 'pill-buttons',
    name: 'أزرار دائرية',
    blurb: 'كل الأزرار بقت شكل دوائر (pill shape)',
    swatch: 'linear-gradient(135deg, rgba(16,185,129,0.6) 0%, rgba(34,211,238,0.6) 100%)',
    css: `/* أزرار دائرية — pill shape فوق كل الأزرار */
.ray-site-root button {
  border-radius: 999px !important;
  padding-inline: 1.5rem !important;
  transition: transform 0.18s ease;
}
.ray-site-root button:hover { transform: scale(1.03); }
`,
  },
  {
    id: 'glass-surfaces',
    name: 'تأثير زجاجي',
    blurb: 'خلفيات شفافة مع blur ناعم على البطاقات',
    swatch: 'linear-gradient(135deg, rgba(56,189,248,0.5) 0%, rgba(232,232,255,0.6) 100%)',
    css: `/* تأثير زجاجي — glassmorphism على العناصر السطحية */
.ray-site-root [class*="card"],
.ray-site-root [class*="surface"],
.ray-site-root section {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background-color: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.4);
}
`,
  },
  {
    id: 'entrance-animations',
    name: 'حركات دخول',
    blurb: 'العناوين بتظهر بـ fade-in-up ناعم عند فتح الصفحة',
    swatch: 'linear-gradient(135deg, rgba(168,85,247,0.6) 0%, rgba(236,72,153,0.6) 100%)',
    css: `/* حركات دخول — fade-in-up للعناوين والصور */
@keyframes rayFadeInUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ray-site-root h1,
.ray-site-root h2,
.ray-site-root img {
  animation: rayFadeInUp 0.55s ease-out both;
}
.ray-site-root h2 { animation-delay: 0.1s; }
.ray-site-root img { animation-delay: 0.2s; }
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

  // Start a brand-new site from scratch: clears all components and CSS from
  // the current draft so the canvas becomes blank, then the merchant builds
  // via CSS. The published version is untouched (this only edits the draft).
  // Preserves shop identity (id, tenant, domain, activity) and theme so the
  // merchant doesn't lose their account or domain — only the page content.
  const handleStartFromScratch = useCallback(() => {
    const ok = window.confirm(
      'بدء موقع من الصفر؟ كل الأقسام والمكوّنات والكود في المسودة الحالية هيتمسحوا. ' +
        'النسخة المنشورة على الإنترنت مش هتتأثر — بس الكانفاس هيفضي وتبدأ تاني. ' +
        'تقدر تراجع (Undo) لو غلطت.'
    );
    if (!ok) return;
    const now = new Date().toISOString();
    const blankPage: BuilderPage = {
      id: 'page_home',
      name: 'الرئيسية',
      slug: 'home',
      rootNodeId: 'root_blank',
      metadata: {
        title: website.name || 'موقعي',
        description: 'موقعي الجديد — ابدأ بإضافة الأقسام من القائمة الجانبية.',
        slug: 'home',
        isHomePage: true,
      },
      customHeadCode: '',
      customBodyCode: '',
      createdAt: now,
      updatedAt: now,
    };
    const blankWebsite: Website = {
      ...website,
      pages: [blankPage],
      components: {},
      globalHeaderId: undefined,
      globalFooterId: undefined,
      settings: {
        ...(website.settings || {}),
        branding: { ...(website.settings?.branding || {}), customCss: '' },
      },
    };
    // Drop any pending code drafts so the canvas shows the truly blank state.
    Object.keys(drafts).forEach((path) => setCodeDraftFile(path, null));
    pendingSyncRef.current.clear();
    setDrafts({});
    recordHistory('بدء موقع من الصفر', blankWebsite);
    setActivePath('theme/global.css');
    flash(
      'ok',
      'بدأنا من الصفر — الكانفاس فاضي دلوقتي. اكتب CSS أو أضف أقسام من القائمة الجانبية.'
    );
  }, [website, drafts, recordHistory, setCodeDraftFile, flash]);

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

          {/* Quick CSS Presets — additive effects that layer ON TOP of the
              merchant's current template (don't override primary colors, so
              the chosen template keeps its identity). Only shown for CSS
              files; applying replaces the draft and streams to the canvas
              immediately so the merchant sees the change live. */}
          {activeFile?.language === 'css' && (
            <div
              className="flex shrink-0 flex-col gap-2 border-b border-slate-800 bg-slate-900/80 px-3 py-2.5"
              dir="rtl"
            >
              <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-300">
                <Wand2 className="size-3.5" />
                <span>تأثيرات على القالب الحالي — طبقة فوق ثيمك، بلا تغيير الألوان</span>
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

              {/* Second row: destructive / reset actions, visually separated.
                  'Start from scratch' wipes the page content so the merchant
                  can build a brand new site via CSS — independent of any
                  template. The published site is untouched (only the draft). */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-slate-500 shrink-0">خيارات:</span>
                <button
                  type="button"
                  onClick={handleStartFromScratch}
                  title="يمسح كل الأقسام والمكوّنات من المسودة — الكانفاس يفضل فاضي وتبدأ تكتب CSS من الصفر"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-900 bg-red-950/40 px-2.5 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-900/50 hover:border-red-700 transition-colors cursor-pointer"
                >
                  <Sparkles className="size-3.5" />
                  <span>ابدأ من الصفر</span>
                </button>
                <span className="text-[9px] text-slate-500 leading-tight">
                  يمسح المسودة بس (المنشور زي ما هو) — تقدر تراجع Undo.
                </span>
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
