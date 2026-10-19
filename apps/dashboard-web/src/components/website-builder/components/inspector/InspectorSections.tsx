import React from 'react';
import {
  Paintbrush,
  Sliders,
  Type,
  Maximize2,
  Box,
  Layers,
  Sparkles,
  Smartphone,
  Check,
  Eye,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { StyleProperties, ViewportBreakpoint } from '../../types/builder';

export const LayoutSection: React.FC = () => {
  const { selectedNode, updateNodeStyle, viewport } = useBuilder();
  if (!selectedNode) return null;

  const currentStyles = (selectedNode.styles[viewport] || selectedNode.styles.desktop || {}) as StyleProperties;

  const handleStyleChange = (key: keyof StyleProperties, val: any) => {
    updateNodeStyle(selectedNode.id, { [key]: val }, viewport);
  };

  return (
    <div className="space-y-3 p-3 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
          <span>التخطيط والأبعاد (Layout & Box Model)</span>
        </span>
        <span className="text-[10px] text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded uppercase font-bold">
          {viewport}
        </span>
      </div>

      {/* Display & Direction */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">نوع العرض (Display)</label>
          <select
            value={currentStyles.display || 'block'}
            onChange={(e) => handleStyleChange('display', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
          >
            <option value="block">Block</option>
            <option value="flex">Flex</option>
            <option value="grid">Grid</option>
            <option value="none">Hidden (none)</option>
          </select>
        </div>

        {currentStyles.display === 'flex' && (
          <div>
            <label className="text-[10px] text-slate-500 block mb-1 font-semibold">الاتجاه (Direction)</label>
            <select
              value={currentStyles.flexDirection || 'row'}
              onChange={(e) => handleStyleChange('flexDirection', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
            >
              <option value="row">أفقي (Row)</option>
              <option value="column">عمودي (Column)</option>
              <option value="row-reverse">أفقي معكوس</option>
            </select>
          </div>
        )}
      </div>

      {/* Flex / Grid Alignment */}
      {currentStyles.display === 'flex' && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-500 block mb-1 font-semibold">المحاذاة (Align)</label>
            <select
              value={currentStyles.alignItems || 'stretch'}
              onChange={(e) => handleStyleChange('alignItems', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
            >
              <option value="flex-start">بداية (Start)</option>
              <option value="center">توسيط (Center)</option>
              <option value="flex-end">نهاية (End)</option>
              <option value="stretch">تمدد (Stretch)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1 font-semibold">التوزيع (Justify)</label>
            <select
              value={currentStyles.justifyContent || 'flex-start'}
              onChange={(e) => handleStyleChange('justifyContent', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
            >
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="space-between">Space Between</option>
              <option value="space-around">Space Around</option>
            </select>
          </div>
        </div>
      )}

      {/* Spacing: Padding & Margin Box */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          الحشو الداخلي (Padding)
        </span>
        <div className="grid grid-cols-4 gap-1.5 text-xs">
          <div>
            <label className="text-[9px] text-slate-400 text-center block">أعلى</label>
            <input
              type="text"
              value={currentStyles.paddingTop || ''}
              onChange={(e) => handleStyleChange('paddingTop', e.target.value)}
              placeholder="16px"
              className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-400 text-center block">يمين</label>
            <input
              type="text"
              value={currentStyles.paddingRight || ''}
              onChange={(e) => handleStyleChange('paddingRight', e.target.value)}
              placeholder="24px"
              className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-400 text-center block">أسفل</label>
            <input
              type="text"
              value={currentStyles.paddingBottom || ''}
              onChange={(e) => handleStyleChange('paddingBottom', e.target.value)}
              placeholder="16px"
              className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-400 text-center block">يسار</label>
            <input
              type="text"
              value={currentStyles.paddingLeft || ''}
              onChange={(e) => handleStyleChange('paddingLeft', e.target.value)}
              placeholder="24px"
              className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center font-mono text-[11px]"
            />
          </div>
        </div>
      </div>

      {/* Dimensions: Width, Height, Gap */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">العرض (Width)</label>
          <input
            type="text"
            value={currentStyles.width || ''}
            onChange={(e) => handleStyleChange('width', e.target.value)}
            placeholder="100%"
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">الارتفاع (Height)</label>
          <input
            type="text"
            value={currentStyles.height || ''}
            onChange={(e) => handleStyleChange('height', e.target.value)}
            placeholder="auto"
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">الفراغ (Gap)</label>
          <input
            type="text"
            value={currentStyles.gap || ''}
            onChange={(e) => handleStyleChange('gap', e.target.value)}
            placeholder="24px"
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
};

export const TypographySection: React.FC = () => {
  const { selectedNode, updateNodeStyle, viewport } = useBuilder();
  if (!selectedNode) return null;

  const currentStyles = (selectedNode.styles[viewport] || selectedNode.styles.desktop || {}) as StyleProperties;

  const handleStyleChange = (key: keyof StyleProperties, val: any) => {
    updateNodeStyle(selectedNode.id, { [key]: val }, viewport);
  };

  return (
    <div className="space-y-3 p-3 bg-white border-b border-slate-200">
      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
        <Type className="w-3.5 h-3.5 text-emerald-600" />
        <span>الخطوط والنصوص (Typography)</span>
      </span>

      {/* Font Size & Weight */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">الحجم (Size)</label>
          <input
            type="text"
            value={currentStyles.fontSize || ''}
            onChange={(e) => handleStyleChange('fontSize', e.target.value)}
            placeholder="16px"
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">الوزن (Weight)</label>
          <select
            value={currentStyles.fontWeight || '400'}
            onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-medium"
          >
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">SemiBold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">ExtraBold (800)</option>
          </select>
        </div>
      </div>

      {/* Text Color & Alignment */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">لون النص (Color)</label>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded p-1">
            <input
              type="color"
              value={currentStyles.textColor || '#0f172a'}
              onChange={(e) => handleStyleChange('textColor', e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border-0 p-0"
            />
            <span className="text-[10px] font-mono text-slate-600">{currentStyles.textColor || '#0f172a'}</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">المحاذاة (Align)</label>
          <select
            value={currentStyles.textAlign || 'right'}
            onChange={(e) => handleStyleChange('textAlign', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-medium"
          >
            <option value="right">يمين (Right)</option>
            <option value="center">وسط (Center)</option>
            <option value="left">يسار (Left)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export const ColorBackgroundSection: React.FC = () => {
  const { selectedNode, updateNodeStyle, viewport, theme } = useBuilder();
  if (!selectedNode) return null;

  const currentStyles = (selectedNode.styles[viewport] || selectedNode.styles.desktop || {}) as StyleProperties;

  const handleStyleChange = (key: keyof StyleProperties, val: any) => {
    updateNodeStyle(selectedNode.id, { [key]: val }, viewport);
  };

  return (
    <div className="space-y-3.5 p-3 bg-white border-b border-slate-200">
      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
        <Paintbrush className="w-3.5 h-3.5 text-purple-600" />
        <span>الخلفية والحدود والظلال (Colors & Effects)</span>
      </span>

      {/* Background Color & Quick Palette Swatches */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-800 block">لون الخلفية</span>
            <span className="text-[10px] text-slate-400 font-mono">{currentStyles.backgroundColor || 'شفاف'}</span>
          </div>
          <input
            type="color"
            value={currentStyles.backgroundColor?.startsWith('#') ? currentStyles.backgroundColor : '#ffffff'}
            onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
            className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
          />
        </div>

        {/* Quick Theme Swatches */}
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] text-slate-400 font-semibold">لوحة الهوية:</span>
          <button
            onClick={() => handleStyleChange('backgroundColor', theme.colors.primary)}
            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
            style={{ backgroundColor: theme.colors.primary }}
            title="اللون الرئيسي"
          />
          <button
            onClick={() => handleStyleChange('backgroundColor', theme.colors.secondary)}
            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
            style={{ backgroundColor: theme.colors.secondary }}
            title="اللون الثانوي"
          />
          <button
            onClick={() => handleStyleChange('backgroundColor', theme.colors.accent)}
            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
            style={{ backgroundColor: theme.colors.accent }}
            title="لون التمييز"
          />
          <button
            onClick={() => handleStyleChange('backgroundColor', '#ffffff')}
            className="w-4 h-4 rounded-full border border-slate-300 bg-white shadow-2xs"
            title="أبيض"
          />
          <button
            onClick={() => handleStyleChange('backgroundColor', 'transparent')}
            className="text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded font-mono"
          >
            شفاف
          </button>
        </div>
      </div>

      {/* Border Radius & Width */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">استدارة الحواف (Radius)</label>
          <input
            type="text"
            value={currentStyles.borderRadius || ''}
            onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
            placeholder="12px"
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">سمك الإطار (Border)</label>
          <input
            type="text"
            value={currentStyles.borderWidth || ''}
            onChange={(e) => handleStyleChange('borderWidth', e.target.value)}
            placeholder="1px"
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-xs"
          />
        </div>
      </div>

      {/* Border Style & Color */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">نوع الإطار</label>
          <select
            value={currentStyles.borderStyle || 'solid'}
            onChange={(e) => handleStyleChange('borderStyle', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-medium"
          >
            <option value="solid">مصمت (Solid)</option>
            <option value="dashed">متقطع (Dashed)</option>
            <option value="dotted">منقط (Dotted)</option>
            <option value="none">بدون (None)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1 font-semibold">لون الإطار</label>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded p-1">
            <input
              type="color"
              value={currentStyles.borderColor?.startsWith('#') ? currentStyles.borderColor : '#e2e8f0'}
              onChange={(e) => handleStyleChange('borderColor', e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border-0 p-0"
            />
            <span className="text-[10px] font-mono text-slate-600 truncate">{currentStyles.borderColor || '#e2e8f0'}</span>
          </div>
        </div>
      </div>

      {/* Box Shadow Presets */}
      <div>
        <label className="text-[10px] text-slate-500 block mb-1 font-semibold">الظلال والارتفاع (Box Shadow)</label>
        <select
          value={currentStyles.boxShadow || 'none'}
          onChange={(e) => handleStyleChange('boxShadow', e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-medium"
        >
          <option value="none">بدون ظل (None)</option>
          <option value="0 1px 2px 0 rgb(0 0 0 / 0.05)">خفيف جداً (Subtle)</option>
          <option value="0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)">متوسط (Medium)</option>
          <option value="0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)">بارز (Elevated Card)</option>
          <option value="0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)">عائم (Floating)</option>
        </select>
      </div>
    </div>
  );
};

export const PropsInspector: React.FC = () => {
  const { selectedNode, updateNodeProps } = useBuilder();
  if (!selectedNode) return null;

  const handlePropChange = (key: string, val: any) => {
    updateNodeProps(selectedNode.id, { [key]: val });
  };

  return (
    <div className="space-y-3.5 p-3 bg-white">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-blue-600" />
          <span>محتوى وخصائص المكون ({selectedNode.name})</span>
        </span>
        <span className="text-[10px] font-mono text-slate-400">Props</span>
      </div>

      {/* Heading / Paragraph Text */}
      {selectedNode.props.text !== undefined && (
        <div>
          <label className="text-[10px] font-bold text-slate-600 block mb-1">نص المحتوى (Text Content)</label>
          <textarea
            rows={3}
            value={selectedNode.props.text}
            onChange={(e) => handlePropChange('text', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-hidden focus:border-blue-500"
          />
        </div>
      )}

      {/* Title */}
      {selectedNode.props.title !== undefined && (
        <div>
          <label className="text-[10px] font-bold text-slate-600 block mb-1">العنوان الرئيسي (Title)</label>
          <input
            type="text"
            value={selectedNode.props.title}
            onChange={(e) => handlePropChange('title', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-hidden focus:border-blue-500 font-semibold"
          />
        </div>
      )}

      {/* Subtitle / Description */}
      {selectedNode.props.subtitle !== undefined && (
        <div>
          <label className="text-[10px] font-bold text-slate-600 block mb-1">العنوان الفرعي (Subtitle)</label>
          <textarea
            rows={2}
            value={selectedNode.props.subtitle}
            onChange={(e) => handlePropChange('subtitle', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-hidden focus:border-blue-500 leading-relaxed"
          />
        </div>
      )}

      {/* Link / URL / Action Target (For Buttons, Links, and Cards) */}
      {(selectedNode.type === 'button' || selectedNode.props.href !== undefined || selectedNode.props.url !== undefined) && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label className="text-[10px] font-bold text-slate-700 block">رابط التوجيه (Link URL / Action)</label>
          <input
            type="text"
            value={selectedNode.props.href || selectedNode.props.url || ''}
            onChange={(e) => {
              handlePropChange('href', e.target.value);
              handlePropChange('url', e.target.value);
            }}
            placeholder="مثال: https://wa.me/966... أو #contact أو /fleet"
            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-[11px] outline-hidden focus:border-blue-500"
          />
        </div>
      )}

      {/* Image Src */}
      {selectedNode.props.src !== undefined && (
        <div>
          <label className="text-[10px] font-bold text-slate-600 block mb-1">رابط الصورة (Image URL)</label>
          <input
            type="text"
            value={selectedNode.props.src}
            onChange={(e) => handlePropChange('src', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-[11px] outline-hidden focus:border-blue-500"
          />
        </div>
      )}

      {/* Price */}
      {selectedNode.props.price !== undefined && (
        <div>
          <label className="text-[10px] font-bold text-slate-600 block mb-1">السعر (Price)</label>
          <input
            type="text"
            value={selectedNode.props.price}
            onChange={(e) => handlePropChange('price', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-blue-700 outline-hidden focus:border-blue-500"
          />
        </div>
      )}
    </div>
  );
};
