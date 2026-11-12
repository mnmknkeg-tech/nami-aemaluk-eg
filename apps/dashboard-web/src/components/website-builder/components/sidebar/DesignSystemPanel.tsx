import React from 'react';
import Link from 'next/link';
import {
  Palette,
  Sparkles,
  Check,
  Eye,
  CheckCircle2,
  LayoutTemplate,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { normalizeThemeTokens } from '../../data/defaultTheme';
import { getThemePresetRecords } from '../../data/registry';

const registeredThemePresets = getThemePresetRecords();

export const DesignSystemPanel: React.FC = () => {
  const { theme: rawTheme, updateThemeToken, applyThemePreset, allTemplatesList } = useBuilder();

  const theme = normalizeThemeTokens(rawTheme);

  // Common luxury color palettes for quick 1-click styling
  const quickPrimaryPalettes = [
    { name: 'أزرق ملكي', color: '#1d4ed8' },
    { name: 'ذهبي عنبري', color: '#b45309' },
    { name: 'أحمر رياضي', color: '#dc2626' },
    { name: 'زمردي فاخر', color: '#047857' },
    { name: 'سماوي بحري', color: '#0891b2' },
    { name: 'بنفسجي ملكي', color: '#7c3aed' },
  ];

  const quickSecondaryPalettes = [
    { name: 'كحلي داكن', color: '#0f172a' },
    { name: 'أسود فحمي', color: '#18181b' },
    { name: 'رمادي غامق', color: '#334155' },
    { name: 'زيتي عميق', color: '#064e3b' },
    { name: 'أزرق محيطي', color: '#164e63' },
    { name: 'بنفسجي ليلي', color: '#1e1b4b' },
  ];

  const quickAccentPalettes = [
    { name: 'تركواز متوهج', color: '#06b6d4' },
    { name: 'ذهبي مشرق', color: '#d97706' },
    { name: 'برتقالي حيوي', color: '#f97316' },
    { name: 'أخضر نعناعي', color: '#10b981' },
    { name: 'سماوي نقي', color: '#38bdf8' },
    { name: 'وردي بنفسجي', color: '#c084fc' },
  ];

  return (
    <div className="p-3.5 space-y-5 text-right" dir="rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 leading-tight">نظام الألوان والسمات</h2>
            <p className="text-[10px] text-slate-500 font-medium">الهوية البصرية الشاملة الموحدة</p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
          مباشر ومُتجاوب
        </span>
      </div>

      {/* Banner / Shortcut to Dedicated Full Themes Page */}
      <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-3.5 rounded-2xl border border-blue-200/80 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900">مكتبة قوالب الثيمات</h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {allTemplatesList.length} قالب جاهز لكافة الأنشطة التجارية
              </p>
            </div>
          </div>
          <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
            صفحة كاملة
          </span>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
          لاستعراض جميع القوالب مع المعاينة الحية المباشرة وتطبيق قالب جديد متكامل لموقعك، انتقل
          لصفحة قوالب الثيمات.
        </p>

        <Link
          href="/dashboard/website/themes"
          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
        >
          <span>فتح معرض القوالب الشامل</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Theme Presets Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>سمات الأنشطة الجاهزة</span>
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">تطبيق بنقرة واحدة</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {registeredThemePresets.map(({ presetKey: key, preset }) => {
            const isCurrentActive = theme.colors.primary === preset.tokens.colors?.primary;
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyThemePreset(key)}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 relative group cursor-pointer ${
                  isCurrentActive
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={`text-xs font-bold leading-snug ${isCurrentActive ? 'text-blue-900' : 'text-slate-800'}`}
                  >
                    {preset.nameAr}
                  </span>
                  {isCurrentActive && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* 3 Swatch Dots */}
                <div className="flex items-center gap-1.5 pt-1">
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                    style={{ backgroundColor: preset.tokens.colors?.primary || '#1d4ed8' }}
                    title="اللون الرئيسي"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                    style={{ backgroundColor: preset.tokens.colors?.secondary || '#0f172a' }}
                    title="اللون الثانوي"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                    style={{ backgroundColor: preset.tokens.colors?.accent || '#06b6d4' }}
                    title="لون التمييز"
                  />
                  <span className="text-[9px] text-slate-400 font-mono mr-auto">
                    {preset.tokens.colors?.primary}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Brand Colors Editor */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <span className="text-xs font-bold text-slate-800 block">
          ألوان الهوية الأساسية (Brand Palette)
        </span>

        {/* 1. Primary Color */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 cursor-pointer shadow-2xs block shrink-0">
                <input
                  type="color"
                  value={theme.colors.primary}
                  onChange={(e) => updateThemeToken('colors', 'primary', e.target.value)}
                  className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer border-0 p-0"
                />
                <div className="w-full h-full" style={{ backgroundColor: theme.colors.primary }} />
              </label>
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  اللون الرئيسي (Primary)
                </span>
                <span className="text-[10px] text-slate-500">
                  للأزرار الأساسية والعناوين المميزة والأسعار
                </span>
              </div>
            </div>
            <input
              type="text"
              value={theme.colors.primary}
              onChange={(e) => updateThemeToken('colors', 'primary', e.target.value)}
              className="w-20 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-[11px] font-mono font-bold text-center text-slate-700"
            />
          </div>

          {/* Quick Swatches */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
            <span className="text-[9px] text-slate-400 font-semibold shrink-0">تدرجات سريعة:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {quickPrimaryPalettes.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => updateThemeToken('colors', 'primary', p.color)}
                  className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${
                    theme.colors.primary.toLowerCase() === p.color.toLowerCase()
                      ? 'ring-2 ring-blue-500 border-white'
                      : 'border-black/10'
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 2. Secondary Color */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 cursor-pointer shadow-2xs block shrink-0">
                <input
                  type="color"
                  value={theme.colors.secondary}
                  onChange={(e) => updateThemeToken('colors', 'secondary', e.target.value)}
                  className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer border-0 p-0"
                />
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: theme.colors.secondary }}
                />
              </label>
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  اللون الثانوي (Secondary)
                </span>
                <span className="text-[10px] text-slate-500">
                  للأزرار الداكنة والترويسة والبطاقات
                </span>
              </div>
            </div>
            <input
              type="text"
              value={theme.colors.secondary}
              onChange={(e) => updateThemeToken('colors', 'secondary', e.target.value)}
              className="w-20 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-[11px] font-mono font-bold text-center text-slate-700"
            />
          </div>

          {/* Quick Swatches */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
            <span className="text-[9px] text-slate-400 font-semibold shrink-0">تدرجات سريعة:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {quickSecondaryPalettes.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => updateThemeToken('colors', 'secondary', p.color)}
                  className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${
                    theme.colors.secondary.toLowerCase() === p.color.toLowerCase()
                      ? 'ring-2 ring-blue-500 border-white'
                      : 'border-black/10'
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 3. Accent Color */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 cursor-pointer shadow-2xs block shrink-0">
                <input
                  type="color"
                  value={theme.colors.accent}
                  onChange={(e) => updateThemeToken('colors', 'accent', e.target.value)}
                  className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer border-0 p-0"
                />
                <div className="w-full h-full" style={{ backgroundColor: theme.colors.accent }} />
              </label>
              <div>
                <span className="text-xs font-bold text-slate-800 block">لون التمييز (Accent)</span>
                <span className="text-[10px] text-slate-500">
                  للأيقونات والشارات والنجوم واللمسات
                </span>
              </div>
            </div>
            <input
              type="text"
              value={theme.colors.accent}
              onChange={(e) => updateThemeToken('colors', 'accent', e.target.value)}
              className="w-20 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-[11px] font-mono font-bold text-center text-slate-700"
            />
          </div>

          {/* Quick Swatches */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
            <span className="text-[9px] text-slate-400 font-semibold shrink-0">تدرجات سريعة:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {quickAccentPalettes.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => updateThemeToken('colors', 'accent', p.color)}
                  className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${
                    theme.colors.accent.toLowerCase() === p.color.toLowerCase()
                      ? 'ring-2 ring-blue-500 border-white'
                      : 'border-black/10'
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={p.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 4. Background Color */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 cursor-pointer shadow-2xs block shrink-0">
                <input
                  type="color"
                  value={theme.colors.background || '#ffffff'}
                  onChange={(e) => updateThemeToken('colors', 'background', e.target.value)}
                  className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer border-0 p-0"
                />
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: theme.colors.background || '#ffffff' }}
                />
              </label>
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  لون خلفية الموقع (Background)
                </span>
                <span className="text-[10px] text-slate-500">الخلفية العامة للموقع والصفحات</span>
              </div>
            </div>
            <input
              type="text"
              value={theme.colors.background || '#ffffff'}
              onChange={(e) => updateThemeToken('colors', 'background', e.target.value)}
              className="w-20 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-[11px] font-mono font-bold text-center text-slate-700"
            />
          </div>
        </div>

        {/* 5. Text Primary Color */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 cursor-pointer shadow-2xs block shrink-0">
                <input
                  type="color"
                  value={theme.colors.textPrimary || '#0f172a'}
                  onChange={(e) => updateThemeToken('colors', 'textPrimary', e.target.value)}
                  className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer border-0 p-0"
                />
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: theme.colors.textPrimary || '#0f172a' }}
                />
              </label>
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  لون النص الرئيسي (Text Primary)
                </span>
                <span className="text-[10px] text-slate-500">العناوين والنصوص البارزة</span>
              </div>
            </div>
            <input
              type="text"
              value={theme.colors.textPrimary || '#0f172a'}
              onChange={(e) => updateThemeToken('colors', 'textPrimary', e.target.value)}
              className="w-20 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-[11px] font-mono font-bold text-center text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Typography Tokens */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <span className="text-xs font-bold text-slate-800 block">
          خطوط الطباعة (Typography Scale)
        </span>

        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            خط العناوين الرئيسية
          </label>
          <select
            value={theme?.typography?.fontHeading || 'Tajawal, sans-serif'}
            onChange={(e) => updateThemeToken('typography', 'fontHeading', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800"
          >
            <option value="Tajawal, sans-serif">Tajawal (عصري ومناسب للمواقع الرقمية)</option>
            <option value="Cairo, sans-serif">Cairo (رسمي ومناسب للشركات والمؤسسات)</option>
            <option value="Amiri, serif">Amiri (كلاسيكي فاخر - للسيارات والعقارات الفارهة)</option>
            <option value="Almarai, sans-serif">Almarai (أنيق وسلس)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            خط النصوص والفقرات
          </label>
          <select
            value={theme?.typography?.fontBody || 'Cairo, sans-serif'}
            onChange={(e) => updateThemeToken('typography', 'fontBody', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800"
          >
            <option value="Cairo, sans-serif">Cairo (واضح ومريح للقراءة)</option>
            <option value="Tajawal, sans-serif">Tajawal (عصري وسلس)</option>
            <option value="Alexandria, sans-serif">Alexandria (هندسي وحديث)</option>
          </select>
        </div>
      </div>

      {/* Corner Radius Tokens */}
      <div className="space-y-2.5 pt-3 border-t border-slate-200">
        <span className="text-xs font-bold text-slate-800 block">
          استدارة الحواف (Border Radius)
        </span>
        <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
          {[
            { label: 'حاد', val: '4px', radius: 'rounded-sm' },
            { label: 'متوسط', val: '10px', radius: 'rounded-md' },
            { label: 'دائري', val: '16px', radius: 'rounded-xl' },
            { label: 'فائق', val: '24px', radius: 'rounded-2xl' },
          ].map((r) => {
            const isSelected = (theme?.radius?.lg || '16px') === r.val;
            return (
              <button
                key={r.val}
                type="button"
                onClick={() => updateThemeToken('radius', 'lg', r.val)}
                className={`py-2 px-1 border transition-all cursor-pointer ${r.radius} ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="block text-[11px] font-bold">{r.label}</span>
                <span className="block text-[9px] text-slate-400 font-mono mt-0.5">{r.val}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Design Tokens Preview */}
      <div className="space-y-2 pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>معاينة حية للمظهر</span>
          </span>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            متزامن مع المعاينة
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
          {/* Sample Buttons & Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              style={{
                backgroundColor: theme?.colors?.primary || '#1d4ed8',
                borderRadius: theme?.radius?.lg || '16px',
                fontFamily: theme?.typography?.fontHeading || 'Tajawal, sans-serif',
                boxShadow: `0 4px 10px ${theme?.colors?.primary || '#1d4ed8'}30`,
              }}
              className="text-white text-xs font-bold px-3 py-1.5"
            >
              زر رئيسي
            </button>
            <button
              style={{
                backgroundColor: theme?.colors?.secondary || '#0f172a',
                borderRadius: theme?.radius?.lg || '16px',
              }}
              className="text-white text-xs font-bold px-3 py-1.5"
            >
              زر ثانوي
            </button>
            <span
              style={{
                backgroundColor: `${theme?.colors?.primary || '#1d4ed8'}18`,
                color: theme?.colors?.primary || '#1d4ed8',
                borderRadius: theme?.radius?.sm || '6px',
              }}
              className="text-[11px] font-bold px-2 py-0.5 border border-black/5"
            >
              شارة مميزة
            </span>
          </div>

          {/* Sample Card */}
          <div
            style={{
              borderRadius: theme?.radius?.lg || '16px',
              borderColor: theme?.colors?.border || '#e2e8f0',
              fontFamily: theme?.typography?.fontBody || 'Cairo, sans-serif',
            }}
            className="p-2.5 bg-white border text-xs text-slate-700 leading-relaxed shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="font-bold text-slate-900"
                style={{ fontFamily: theme?.typography?.fontHeading || 'Tajawal, sans-serif' }}
              >
                معاينة الخط والسمة
              </span>
              <span
                style={{ color: theme?.colors?.primary || '#1d4ed8' }}
                className="font-extrabold font-mono text-xs"
              >
                999 ج.م
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              تطبيق خط ({(theme?.typography?.fontBody || 'Cairo, sans-serif').split(',')[0]})
              والاستدارة ({theme?.radius?.lg || '16px'}) مع اللون (
              {theme?.colors?.primary || '#1d4ed8'}).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
