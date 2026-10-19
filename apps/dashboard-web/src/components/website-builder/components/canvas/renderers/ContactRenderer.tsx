import React, { useState } from 'react';
import { BaseRendererProps } from './types';
import { Phone, Mail, MapPin, CheckCircle } from 'lucide-react';
import { sectionBadgeStyle, sectionHeaderWrapClass, sectionShellClass, sectionSubtitleClass, sectionTitleClass, cardBaseStyle } from '@ray-eg/shared/builder';

export const ContactRenderer: React.FC<BaseRendererProps> = ({
  node,
  website,
  outlineClass,
  getComputedStyles,
  handleClick,
  handleMouseEnter,
  handleMouseLeave,
  renderChildren,
  currentViewport,
}) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const isMobile = currentViewport === 'mobile';
  const themeColors = website.theme?.colors;
  const themeCardStyle: React.CSSProperties = cardBaseStyle(website.theme);
  const themeMutedStyle: React.CSSProperties = { color: themeColors?.textSecondary || '#475569' };

  const contactFields = [
    { name: 'name', type: 'text', placeholder: 'الاسم', required: true },
    { name: 'phone', type: 'tel', placeholder: 'رقم الهاتف', required: true },
    { name: 'message', type: 'text', placeholder: 'رسالتك...' },
  ];

  return (
    <section
      id={node.id}
      style={getComputedStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`cursor-pointer transition-all ${outlineClass}`}
    >
      <div className={`${sectionShellClass} text-right`}>
        <div className={sectionHeaderWrapClass}>
          <h2
            style={{ color: themeColors?.textPrimary }}
            className={`${sectionTitleClass} text-slate-900`}
          >
            {node.props.title || 'تواصل معنا'}
          </h2>
          <p style={themeMutedStyle} className={`${sectionSubtitleClass} text-slate-600`}>
            {node.props.subtitle || 'نحن هنا للمساعدة'}
          </p>
        </div>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6 sm:gap-8`}>
          <div className="space-y-4">
            {(node.props.phone || node.props.whatsapp) && (
              <a
                href={`tel:${String(node.props.phone || node.props.whatsapp).replace(/\s/g, '')}`}
                style={themeCardStyle}
                className="flex items-center gap-3 p-3.5 sm:p-4 border shadow-sm transition-transform md:hover:scale-[1.01]"
              >
                <div
                  style={{
                    backgroundColor: `${themeColors?.primary || '#2563eb'}18`,
                    color: themeColors?.primary,
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                >
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p style={{ color: themeColors?.textMuted }} className="text-xs">
                    هاتف / واتساب
                  </p>
                  <p
                    style={{ color: themeColors?.textPrimary }}
                    className="font-bold"
                    dir="ltr"
                  >
                    {node.props.phone || node.props.whatsapp}
                  </p>
                </div>
              </a>
            )}
            {node.props.email && (
              <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">البريد الإلكتروني</p>
                  <p className="font-bold text-slate-800">{node.props.email}</p>
                </div>
              </div>
            )}
            {node.props.address && (
              <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">العنوان</p>
                  <p className="font-bold text-slate-800">{node.props.address}</p>
                </div>
              </div>
            )}
          </div>
          <form
            style={themeCardStyle}
            className="p-4 sm:p-6 border shadow-sm space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setFormSubmitted(true);
            }}
          >
            {formSubmitted ? (
              <div className="text-center py-6">
                <CheckCircle
                  style={{ color: themeColors?.success }}
                  className="w-8 h-8 mx-auto mb-2"
                />
                <p style={{ color: themeColors?.textPrimary }} className="font-bold">
                  تم إرسال رسالتك بنجاح.
                </p>
                <button
                  type="button"
                  style={{ color: themeColors?.primary }}
                  className="text-sm mt-2 underline"
                  onClick={() => setFormSubmitted(false)}
                >
                  إرسال رسالة أخرى
                </button>
              </div>
            ) : (
              contactFields.map((field) =>
                field.name === 'message' ? (
                  <textarea
                    key={field.name}
                    required={field.required}
                    value={inputValues[field.name] || ''}
                    onChange={(event) =>
                      setInputValues((previous) => ({
                        ...previous,
                        [field.name]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-right resize-none"
                    style={{ borderColor: themeColors?.border }}
                  />
                ) : (
                  <input
                    key={field.name}
                    type={field.type}
                    required={field.required}
                    value={inputValues[field.name] || ''}
                    onChange={(event) =>
                      setInputValues((previous) => ({
                        ...previous,
                        [field.name]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-right"
                    style={{ borderColor: themeColors?.border }}
                    dir={field.type === 'tel' ? 'ltr' : undefined}
                  />
                )
              )
            )}
            {!formSubmitted && (
              <button
                type="submit"
                style={{
                  backgroundColor: themeColors?.primary,
                  borderRadius: website.theme?.radius?.md || '8px',
                }}
                className="w-full text-white py-2.5 text-sm font-bold"
              >
                إرسال
              </button>
            )}
          </form>
        </div>
      </div>
      {renderChildren()}
    </section>
  );
};
