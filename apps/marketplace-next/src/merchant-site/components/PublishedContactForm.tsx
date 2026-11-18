import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type ContactNode = {
  id: string;
  props: Record<string, any>;
  childrenIds?: string[];
};

type ContactTheme = {
  colors: { primary: string };
  radius?: { lg?: string };
};

export function PublishedContactForm({
  node,
  style,
  theme,
  shopId,
  shopSlug,
  renderChildren,
}: {
  node: ContactNode;
  style: React.CSSProperties;
  theme: ContactTheme;
  shopId?: string;
  shopSlug?: string;
  renderChildren: () => React.ReactNode;
}) {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formBookingNumber, setFormBookingNumber] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const fields: any[] = Array.isArray(node.props.fields) ? node.props.fields : [];
  const buttonText = node.props.buttonText || 'إرسال';

  // Persist the request in the merchant dashboard using the guest booking API.
  const submitContactForm = async () => {
    if (formSubmitting) return;
    const resolvedShopId = String(shopId || '');
    if (!resolvedShopId) {
      setFormError('تعذر إرسال الطلب الآن — تواصل معنا هاتفيًا.');
      return;
    }

    let customerName = '';
    let customerPhone = '';
    const notesParts: string[] = [];
    fields.forEach((field: any, idx: number) => {
      const fid = field.id || field.name || `f_${idx}`;
      const value = String(inputValues[fid] || '').trim();
      if (!value) return;
      const label = String(field.label || '');
      const type = String(field.type || '');
      const fname = String(field.name || '').toLowerCase();
      if (
        type === 'tel' ||
        fname === 'phone' ||
        fname === 'tel' ||
        fname === 'mobile' ||
        /جوال|هاتف|موبايل|واتس/.test(label)
      ) {
        customerPhone = value;
      } else if (fname === 'name' || fname === 'fullname' || /اسم/.test(label)) {
        customerName = value;
      } else {
        notesParts.push(`${label}: ${value}`);
      }
    });

    if (customerName.length < 2) {
      setFormError('اكتب الاسم من فضلك');
      return;
    }
    if (customerPhone.replace(/\D/g, '').length < 10) {
      setFormError('اكتب رقم موبايل صحيح');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const intentText =
        String(node.props.title || '') + ' ' + fields.map((field: any) => field.label || '').join(' ');
      const bookingIntent = /حجز|موعد|استشارة/.test(intentText);
      const response = await api.post<any>('/bookings/guest', {
        shopId: resolvedShopId,
        itemName: String(node.props.title || 'طلب من الموقع').slice(0, 120),
        itemPrice: 0,
        customerName,
        customerPhone,
        notes: notesParts.join(' — ') || undefined,
        bookingActivityType: bookingIntent ? 'APPOINTMENT' : 'QUOTE',
        metadata: { source: 'site-contact-form', siteSlug: shopSlug },
      });
      const data = (response as any)?.data ?? response ?? {};
      setFormBookingNumber(data?.bookingNumber || null);
      setFormSubmitted(true);
      setInputValues({});
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر الإرسال الآن، جرّب تاني');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (formSubmitted) {
    return (
      <section id={node.id} style={style} data-section="contact">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 flex flex-col items-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-bold text-emerald-900">تم استلام طلبك بنجاح!</h3>
            <p className="text-sm text-emerald-700 max-w-sm leading-relaxed">
              طلبك اتحفظ في نظام التاجر — هيتم التواصل معك لتأكيد التفاصيل.
            </p>
            {formBookingNumber && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-600">
                  رقم الطلب:{' '}
                  <span className="text-emerald-700" dir="ltr">{formBookingNumber}</span>
                </p>
                <a
                  href={`/bookings/track?number=${encodeURIComponent(formBookingNumber)}`}
                  className="inline-block text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                >
                  تتبع حالة الطلب
                </a>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setFormSubmitted(false);
                setFormBookingNumber(null);
                setInputValues({});
              }}
              className="mt-2 text-xs font-semibold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
            >
              إرسال طلب جديد
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={node.id} style={style} data-section="contact">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {(node.props.title || node.props.badge) && (
          <div className="text-center mb-8 space-y-2">
            {node.props.badge && (
              <span
                style={{ backgroundColor: `${theme.colors.primary}18`, color: theme.colors.primary }}
                className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
              >
                {node.props.badge}
              </span>
            )}
            {node.props.title && (
              <h2 className="text-2xl font-extrabold text-slate-900">{node.props.title}</h2>
            )}
            {node.props.subtitle && <p className="text-sm text-slate-600">{node.props.subtitle}</p>}
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          {fields.map((field: any, idx: number) => {
            const fid = field.id || field.name || `f_${idx}`;
            if (field.type === 'select') {
              return (
                <div key={fid} className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{field.label}</label>
                  <select
                    value={inputValues[fid] || ''}
                    onChange={(event) => setInputValues((values) => ({ ...values, [fid]: event.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">اختر...</option>
                    {(field.options || []).map((option: string, optionIndex: number) => (
                      <option key={optionIndex} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              );
            }
            if (field.type === 'textarea') {
              return (
                <div key={fid} className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{field.label}</label>
                  <textarea
                    placeholder={field.placeholder || ''}
                    rows={3}
                    value={inputValues[fid] || ''}
                    onChange={(event) => setInputValues((values) => ({ ...values, [fid]: event.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              );
            }
            return (
              <div key={fid} className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">{field.label}</label>
                <input
                  type={field.type || 'text'}
                  placeholder={field.placeholder || ''}
                  value={inputValues[fid] || ''}
                  onChange={(event) => setInputValues((values) => ({ ...values, [fid]: event.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            );
          })}
          {formError && <p className="text-xs font-bold text-red-600">{formError}</p>}
          <button
            type="button"
            onClick={submitContactForm}
            disabled={formSubmitting}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius?.lg || '10px',
            }}
            className="w-full py-3 text-white font-bold text-sm shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {formSubmitting ? 'بنرسل طلبك…' : buttonText}
          </button>
        </div>
        {renderChildren()}
      </div>
    </section>
  );
}
