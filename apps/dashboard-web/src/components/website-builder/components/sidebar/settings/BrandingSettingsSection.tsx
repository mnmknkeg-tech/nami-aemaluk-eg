import React, { useState } from 'react';
import { Braces, ChevronDown, ChevronUp } from 'lucide-react';
import { useBuilder } from '../../../context/BuilderContext';
import type { WebsiteSettings } from '../../../types/builder';

interface BrandingSettingsSectionProps {
  isOpen?: boolean;
  onToggle?: () => void;
  settings?: WebsiteSettings;
}

/**
 * Site-wide custom CSS (Shopify "Theme settings → Custom CSS" equivalent).
 * Persists into settings.branding.customCss — the SAME field the code
 * environment exposes as theme/global.css, and the published renderers
 * inject it scoped under `.ray-site-root` on every page.
 */
export const BrandingSettingsSection: React.FC<BrandingSettingsSectionProps> = ({
  isOpen = true,
  onToggle,
  settings,
}) => {
  const { website, updateWebsiteSettings } = useBuilder();
  const branding = (settings || website.settings)?.branding || {};
  const [expanded, setExpanded] = useState(false);

  const customCss = String(branding.customCss || '');
  const updateCustomCss = (value: string) =>
    updateWebsiteSettings({ branding: { ...branding, customCss: value } });

  return (
    <div className="p-3.5 space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-right cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              customCss.trim() ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Braces className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">CSS المخصص العام</span>
              {customCss.trim() && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800">
                  مطبق
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">تنسيقات تُطبق على كل صفحات الموقع</p>
          </div>
        </div>
        {onToggle &&
          (isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ))}
      </button>
      {isOpen && (
        <div className="pt-2 space-y-2 border-t border-slate-100 text-xs text-slate-700 animate-in fade-in duration-150">
          <textarea
            dir="ltr"
            value={customCss}
            onChange={(event) => updateCustomCss(event.target.value)}
            placeholder={
              '.pub-site h2 { letter-spacing: -0.5px; }\n.ray-site-root .pub-card:hover { transform: translateY(-2px); }'
            }
            rows={expanded ? 12 : 6}
            spellCheck={false}
            aria-label="CSS المخصص العام للموقع"
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] leading-5 text-slate-700 outline-hidden focus:border-blue-500 resize-y"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
            >
              {expanded ? 'تصغير الصندوق' : 'تكبير الصندوق'}
            </button>
            <span className="text-[10px] text-slate-400">{customCss.length} حرف</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[10px] leading-5 text-slate-500">
            <p className="font-bold text-slate-600">متغيرات الثيم الجاهزة:</p>
            <code dir="ltr" className="block font-mono text-[9px] text-cyan-700 mt-1 break-all">
              var(--ray-color-primary) · var(--ray-font-heading) · var(--ray-radius-lg) · القائمة
              كاملة في ملف theme/tokens.json داخل بيئة الكود
            </code>
            <p className="mt-1.5">
              للتحرير المتقدم (شجرة ملفات + JS + Head) افتح{' '}
              <span className="font-bold">الكود — بيئة تحرير الملفات</span> من قائمة الإعدادات
              بالأعلى.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
