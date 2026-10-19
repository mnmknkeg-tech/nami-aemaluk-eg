import React, { useState } from 'react';
import { BaseRendererProps } from './types';
import { Check, MessageCircle } from 'lucide-react';

export const FormRenderer: React.FC<BaseRendererProps> = ({
  node,
  website,
  outlineClass,
  getComputedStyles,
  handleClick,
  handleMouseEnter,
  handleMouseLeave,
  renderChildren,
  isInteractivePreview,
  currentViewport,
}) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const isMobile = currentViewport === 'mobile';

  const fieldsList = node.props.fields || [
    { name: 'name', label: 'الاسم الكريم', type: 'text', placeholder: 'الاسم بالكامل' },
    { name: 'phone', label: 'رقم الهاتف / واتساب', type: 'tel', placeholder: '05xxxxxxxx' },
    {
      name: 'notes',
      label: 'ملاحظات أو تفاصيل الطلب',
      type: 'text',
      placeholder: 'اكتب رسالتك...',
    },
  ];
  const primaryColor = website.theme?.colors?.primary || '#2563eb';

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInteractivePreview) {
      setFormSubmitted(true);
    }
  };

  return (
    <section
      id={node.id}
      style={getComputedStyles()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`cursor-pointer transition-all ${outlineClass}`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {node.props.title || 'تواصل معنا واحجز موعدك'}
            </h2>
            {node.props.subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
                {node.props.subtitle}
              </p>
            )}
          </div>

          {isInteractivePreview && formSubmitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">تم إرسال طلبك بنجاح!</h3>
              <p className="text-xs sm:text-sm text-emerald-700 leading-relaxed">
                شكراً لتواصلك معنا. سيقوم فريق خدمة العملاء بالرد عليك وتأكيد حجزك في أقرب وقت.
              </p>
              <button
                onClick={() => setFormSubmitted(false)}
                className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer pt-2"
              >
                إرسال طلب آخر
              </button>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
                {fieldsList.map((f: any, fIdx: number) => (
                  <div
                    key={f.name || fIdx}
                    className={
                      fIdx === fieldsList.length - 1 && fieldsList.length % 2 !== 0
                        ? 'sm:col-span-2'
                        : ''
                    }
                  >
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={f.type || 'text'}
                      placeholder={f.placeholder || ''}
                      required={f.required}
                      value={inputValues[f.name] || ''}
                      onChange={(e) =>
                        setInputValues({ ...inputValues, [f.name]: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors text-right"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: primaryColor,
                  borderRadius: website.theme?.radius?.lg || '12px',
                }}
                className="w-full py-3 sm:py-3.5 text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{node.props.buttonText || 'تأكيد إرسال الطلب'}</span>
              </button>
            </form>
          )}
        </div>

        {renderChildren()}
      </div>
    </section>
  );
};
