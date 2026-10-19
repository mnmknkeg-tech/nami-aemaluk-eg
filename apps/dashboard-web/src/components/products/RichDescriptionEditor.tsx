'use client';

import {
  Bold,
  ChevronDown,
  Code,
  GripVertical,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Quote,
  Strikethrough,
  Underline,
  type LucideIcon,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* AccordionSection                                                    */
/* ------------------------------------------------------------------ */

export interface AccordionSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
}

export function AccordionSection({
  title,
  children,
  defaultOpen = false,
  badge,
}: AccordionSectionProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 bg-teal-50 px-4 py-3 text-start transition-colors hover:bg-teal-100/60"
      >
        {/* far-right grip (RTL: first item renders rightmost) */}
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-teal-500" aria-hidden />
        <span className="flex-1 truncate text-sm font-bold text-teal-700">{title}</span>
        {badge ? <span className="shrink-0">{badge}</span> : null}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-teal-600 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RichDescriptionEditor                                               */
/* ------------------------------------------------------------------ */

export interface RichDescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

type ToolbarButton = {
  icon: LucideIcon;
  title: string;
  command: string;
  value?: string;
};

const FORMAT_BUTTONS: ToolbarButton[] = [
  { icon: Bold, title: 'عريض (Ctrl+B)', command: 'bold' },
  { icon: Italic, title: 'مائل (Ctrl+I)', command: 'italic' },
  { icon: Underline, title: 'تسطير (Ctrl+U)', command: 'underline' },
  { icon: Strikethrough, title: 'يتوسطه خط', command: 'strikeThrough' },
  {
    icon: ListOrdered,
    title: 'قائمة مرقمة',
    command: 'insertOrderedList',
  },
  { icon: List, title: 'قائمة نقطية', command: 'insertUnorderedList' },
  {
    icon: Quote,
    title: 'اقتباس',
    command: 'formatBlock',
    value: 'BLOCKQUOTE',
  },
  { icon: Code, title: 'كود', command: 'formatBlock', value: 'PRE' },
];

const HEADING_BUTTONS: ToolbarButton[] = [
  { icon: ListOrdered, title: 'عنوان 1', command: 'formatBlock', value: 'H1' },
  { icon: ListOrdered, title: 'عنوان 2', command: 'formatBlock', value: 'H2' },
  { icon: ListOrdered, title: 'عنوان 3', command: 'formatBlock', value: 'H3' },
];

const ALIGN_BUTTONS: ToolbarButton[] = [
  { icon: AlignRight, title: 'محاذاة لليمين', command: 'justifyRight' },
  { icon: AlignCenter, title: 'توسيط', command: 'justifyCenter' },
  { icon: AlignLeft, title: 'محاذاة لليسار', command: 'justifyLeft' },
];

function exec(command: string, commandValue?: string): void {
  try {
    document.execCommand(command, false, commandValue);
  } catch {
    // ignore unsupported commands
  }
}

function ToolbarIconButton({
  icon: Icon,
  title,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" aria-hidden />;
}

export function RichDescriptionEditor({
  value,
  onChange,
  placeholder = 'اكتب الوصف هنا',
  minHeight = 160,
}: RichDescriptionEditorProps) {
  const [showHtml, setShowHtml] = useState<boolean>(false);
  const [htmlDraft, setHtmlDraft] = useState<string>(value);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Keep the WYSIWYG DOM in sync when value changes externally (or when
  // leaving HTML mode), without clobbering the caret while typing.
  useEffect(() => {
    if (showHtml) return;
    const el = editorRef.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value, showHtml]);

  const saveSelection = useCallback(() => {
    const selection = document.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const saved = savedRangeRef.current;
    if (saved && el.contains(saved.commonAncestorContainer)) {
      const selection = document.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(saved);
      }
    } else {
      el.focus();
    }
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (el) {
      onChange(el.innerHTML);
    }
  }, [onChange]);

  const runCommand = useCallback(
    (command: string, commandValue?: string) => {
      if (showHtml) return;
      restoreSelection();
      exec(command, commandValue);
      saveSelection();
      const el = editorRef.current;
      if (el) {
        onChange(el.innerHTML);
      }
    },
    [onChange, restoreSelection, saveSelection, showHtml]
  );

  const insertLink = useCallback(() => {
    if (showHtml) return;
    restoreSelection();
    const url = window.prompt('أدخل رابط URL:');
    if (url) {
      exec('createLink', url);
    }
    saveSelection();
    const el = editorRef.current;
    if (el) {
      onChange(el.innerHTML);
    }
  }, [onChange, restoreSelection, saveSelection, showHtml]);

  const toggleHtml = useCallback(() => {
    if (!showHtml) {
      // WYSIWYG -> HTML: freeze current editor content into the draft.
      const el = editorRef.current;
      setHtmlDraft(el ? el.innerHTML : value);
      setShowHtml(true);
    } else {
      // HTML -> WYSIWYG: commit draft then re-render editor from value.
      onChange(htmlDraft);
      setShowHtml(false);
    }
  }, [htmlDraft, onChange, showHtml, value]);

  const toolbarButton = (btn: ToolbarButton, key: string) => (
    <ToolbarIconButton
      key={key}
      icon={btn.icon}
      title={btn.title}
      onClick={() => runCommand(btn.command, btn.value)}
    />
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/50 px-2 py-1.5">
        {/* Decorative AR language chip */}
        <span
          className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-white px-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200"
          aria-hidden
        >
          AR
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </span>

        <Divider />

        {FORMAT_BUTTONS.slice(0, 4).map((btn, i) => toolbarButton(btn, `f${i}`))}
        <Divider />
        {FORMAT_BUTTONS.slice(4, 6).map((btn, i) => toolbarButton(btn, `l${i}`))}
        <Divider />
        {FORMAT_BUTTONS.slice(6, 8).map((btn, i) => toolbarButton(btn, `b${i}`))}
        <Divider />
        <ToolbarIconButton icon={LinkIcon} title="إضافة رابط" onClick={insertLink} />
        <Divider />
        {HEADING_BUTTONS.map((btn, i) => (
          <button
            key={`h${i}`}
            type="button"
            title={btn.title}
            aria-label={btn.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand(btn.command, btn.value)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            H{i + 1}
          </button>
        ))}
        <Divider />
        {ALIGN_BUTTONS.map((btn, i) => toolbarButton(btn, `a${i}`))}

        <span className="flex-1" />

        <button
          type="button"
          title="تبديل وضع HTML"
          aria-pressed={showHtml}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleHtml}
          className={`flex h-8 items-center rounded-lg px-2 text-xs font-bold transition-colors ${
            showHtml ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {'<HTML>'}
        </button>
      </div>

      {/* Editor / HTML view */}
      {showHtml ? (
        <textarea
          dir="ltr"
          value={htmlDraft}
          onChange={(e) => {
            setHtmlDraft(e.target.value);
            onChange(e.target.value);
          }}
          style={{ minHeight }}
          className="block w-full resize-y bg-white p-3 font-mono text-sm text-slate-700 outline-none"
          spellCheck={false}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="وصف المنتج"
          data-placeholder={placeholder}
          onInput={handleInput}
          onBlur={saveSelection}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          style={{ minHeight }}
          className="prose-sm block w-full bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none empty:before:pointer-events-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 [&_blockquote]:border-e-2 [&_blockquote]:border-slate-300 [&_blockquote]:ps-3 [&_blockquote]:text-slate-500 [&_ol]:list-inside [&_ol]:list-decimal [&_pre]:rounded-lg [&_pre]:bg-slate-50 [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs [&_ul]:list-inside [&_ul]:list-disc"
        />
      )}
    </div>
  );
}
