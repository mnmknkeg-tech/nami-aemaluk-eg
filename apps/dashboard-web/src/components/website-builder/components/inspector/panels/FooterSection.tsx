import React from 'react';
import { Layout, ChevronDown, ChevronUp, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import type { InspectorPanelProps } from './types';

export const FooterSection: React.FC<InspectorPanelProps> = ({
  node,
  parentSection,
  expandedSections,
  toggleAccordion,
  handlePropChange,
}) => {
  const targetNode = node.type === 'footer' ? node : parentSection;
  const props = targetNode.props || {};
  const transparentFooter = Boolean(props.transparent);

  const handleUpdate = (key: string, value: any) => {
    handlePropChange(targetNode.id, key, value);
  };

  const links = Array.isArray(props.links) ? props.links : [];

  const handleAddLink = () => {
    const nextLinks = [...links, { label: 'رابط جديد', url: '#' }];
    handleUpdate('links', nextLinks);
  };

  const handleUpdateLink = (index: number, key: string, val: string) => {
    const nextLinks = [...links];
    nextLinks[index] = { ...nextLinks[index], [key]: val };
    handleUpdate('links', nextLinks);
  };

  const handleRemoveLink = (index: number) => {
    const nextLinks = links.filter((_, i) => i !== index);
    handleUpdate('links', nextLinks);
  };

  return (
    <div className="p-3">
      <button
        onClick={() => toggleAccordion('footerSettings')}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors py-1 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Layout className="w-3.5 h-3.5 text-blue-600" />
          <span>إعدادات الفوتر ومحتواه (Footer Settings)</span>
        </div>
        {expandedSections.footerSettings ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {expandedSections.footerSettings && (
        <div className="space-y-4 pt-3">
          <div className="space-y-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">خلفية الفوتر</span>
                <span className="text-[10px] text-slate-500 block">
                  اجعل الفوتر شفافًا ليندمج مع خلفية الموقع الممتدة
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-pressed={transparentFooter}
                onClick={() => handleUpdate('transparent', !transparentFooter)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  transparentFooter
                    ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {transparentFooter ? 'شفاف (مفعّل)' : 'شفاف'}
              </button>
            </div>

            {/* مظهر ألوان النصوص والتباين */}
            <div className="pt-2 border-t border-slate-200/70">
              <label className="text-[10px] font-bold text-slate-600 block mb-1.5">
                مظهر ولون النصوص (Text Tone)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdate('textColorMode', 'light_text')}
                  className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    props.textColorMode !== 'dark_text'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
                  <span>نصوص فاتحة (للصور الداكنة)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate('textColorMode', 'dark_text')}
                  className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    props.textColorMode === 'dark_text'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                  <span>نصوص داكنة (للخلفيات الفاتحة)</span>
                </button>
              </div>
            </div>
          </div>
          {/* Brand Info */}
          <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[11px] font-bold text-slate-700 block">الهوية والوصف</span>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                اسم المتجر
              </label>
              <input
                type="text"
                value={props.brandName || ''}
                onChange={(e) => handleUpdate('brandName', e.target.value)}
                placeholder="اسم متجرك..."
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                وصف المتجر في الفوتر
              </label>
              <textarea
                rows={2}
                value={props.description || ''}
                onChange={(e) => handleUpdate('description', e.target.value)}
                placeholder="نبذة عن متجرك..."
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-hidden focus:border-blue-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">بيانات التواصل</span>
              <button
                type="button"
                onClick={() => handleUpdate('hideContactInfo', !props.hideContactInfo)}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-blue-600 cursor-pointer"
              >
                {props.hideContactInfo ? (
                  <EyeOff className="w-3 h-3 text-slate-400" />
                ) : (
                  <Eye className="w-3 h-3 text-blue-600" />
                )}
                <span>{props.hideContactInfo ? 'مخفي' : 'ظاهر'}</span>
              </button>
            </div>
            {!props.hideContactInfo && (
              <>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                    عنوان قسم التواصل
                  </label>
                  <input
                    type="text"
                    value={props.contactTitle || ''}
                    onChange={(e) => handleUpdate('contactTitle', e.target.value)}
                    placeholder="معلومات التواصل"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                    رقم الهاتف / واتساب
                  </label>
                  <input
                    type="text"
                    value={props.phone || ''}
                    onChange={(e) => handleUpdate('phone', e.target.value)}
                    placeholder="+20 100 000 0000"
                    dir="ltr"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={props.email || ''}
                    onChange={(e) => handleUpdate('email', e.target.value)}
                    placeholder="support@example.com"
                    dir="ltr"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                    العنوان أو المقر
                  </label>
                  <input
                    type="text"
                    value={props.address || ''}
                    onChange={(e) => handleUpdate('address', e.target.value)}
                    placeholder="القاهرة، مصر"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 outline-hidden focus:border-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Trust Column */}
          <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">عمود الضمان والثقة</span>
              <button
                type="button"
                onClick={() => handleUpdate('hideTrustCol', !props.hideTrustCol)}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-blue-600 cursor-pointer"
              >
                {props.hideTrustCol ? (
                  <EyeOff className="w-3 h-3 text-slate-400" />
                ) : (
                  <Eye className="w-3 h-3 text-blue-600" />
                )}
                <span>{props.hideTrustCol ? 'مخفي' : 'ظاهر'}</span>
              </button>
            </div>
            {!props.hideTrustCol && (
              <>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                    العنوان
                  </label>
                  <input
                    type="text"
                    value={props.trustTitle || ''}
                    onChange={(e) => handleUpdate('trustTitle', e.target.value)}
                    placeholder="ضمان واعتماد"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                    نص الضمان والدعم
                  </label>
                  <textarea
                    rows={2}
                    value={props.trustDescription || ''}
                    onChange={(e) => handleUpdate('trustDescription', e.target.value)}
                    placeholder="جميع المعاملات والخدمات مشمولة بضمان معتمد..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 outline-hidden focus:border-blue-500 leading-relaxed"
                  />
                </div>
              </>
            )}
          </div>

          {/* Links Management */}
          <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">
                روابط الفوتر ({links.length})
              </span>
              <button
                type="button"
                onClick={handleAddLink}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة رابط</span>
              </button>
            </div>
            <div className="space-y-2 pt-1">
              {links.map((link: any, idx: number) => {
                const label = typeof link === 'string' ? link : link.label || '';
                const url = typeof link === 'string' ? '#' : link.url || link.href || '';
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-white p-1.5 border border-slate-200 rounded-lg"
                  >
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => handleUpdateLink(idx, 'label', e.target.value)}
                      placeholder="اسم الرابط"
                      className="flex-1 p-1 text-[11px] border border-slate-200 rounded font-medium"
                    />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => handleUpdateLink(idx, 'url', e.target.value)}
                      placeholder="الرابط /url"
                      dir="ltr"
                      className="w-24 p-1 text-[11px] border border-slate-200 rounded font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Copyright text */}
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <label className="text-[10px] font-semibold text-slate-500 block">
              نص حقوق الملكية (Copyright)
            </label>
            <input
              type="text"
              value={props.copyright || ''}
              onChange={(e) => handleUpdate('copyright', e.target.value)}
              placeholder={`جميع الحقوق محفوظة © ${new Date().getFullYear()}`}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
