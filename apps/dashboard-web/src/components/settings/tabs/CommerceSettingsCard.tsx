'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from '../ui';
import { useToast } from '../ToastProvider';
import { apiRequest } from '@/lib/auth';
import { cn } from '@/lib/cn';

type Ordering = 'cart' | 'booking24h' | 'appointment' | 'contact';
type Pricing = 'priced' | 'hidden';

const ORDERING_OPTIONS: { id: Ordering; title: string; desc: string }[] = [
  { id: 'cart', title: 'بيع بسلة', desc: 'السعر ظاهر والعميل بيضيف للسلة ويدفع عادي.' },
  {
    id: 'booking24h',
    title: 'بدون سعر + حجز 24 ساعة',
    desc: 'نخفي السعر والعميل يبعت طلب، وأنت بترد خلال 24 ساعة بسعر.',
  },
  {
    id: 'appointment',
    title: 'حجز حقيقي بموعد',
    desc: 'العميل يحجز يوم وساعة، ويشوف ترتيبه قدام كام حد.',
  },
  {
    id: 'contact',
    title: 'تواصل فقط',
    desc: 'مفيش زر حجز ولا سلة — العميل يتواصل معاك بس.',
  },
];

export default function CommerceSettingsCard({
  shop,
  onSaved,
}: {
  shop: any;
  onSaved: () => void;
}) {
  const { toast } = useToast();

  const current = useMemo(() => {
    const c = shop?.layoutConfig?.commerce || {};
    return {
      pricing: (c.pricing === 'hidden' ? 'hidden' : 'priced') as Pricing,
      ordering: (c.ordering || 'cart') as Ordering,
      bookingWindowHours: Number(c.bookingWindowHours) || 24,
      queueEnabled: c.queueEnabled !== false,
    };
  }, [shop?.layoutConfig?.commerce]);

  const [ordering, setOrdering] = useState<Ordering>(current.ordering);
  const [pricing, setPricing] = useState<Pricing>(current.pricing);
  const [hours, setHours] = useState<number>(current.bookingWindowHours);
  const [queueEnabled, setQueueEnabled] = useState<boolean>(current.queueEnabled);
  const [saving, setSaving] = useState(false);

  // "حجز 24 ساعة" معناها إنك هترد على العميل بالسعر، فالسعر بيكون مخفي وبيتظبط أوتوماتيك.
  // "تواصل فقط" تاجر عادي — السعر يقدر يبان، والداشبورد بيسيب القرار للتاجر زي الماركت بالظبط.
  const pricingLocked = ordering === 'booking24h';

  // مع القفل ده لازم نطبّقه فعلاً، مش بس نعطّل الزرار — وإلا الواجهة بتقول "ظاهر" وهي مقفولة.
  useEffect(() => {
    if (pricingLocked && pricing !== 'hidden') setPricing('hidden');
  }, [pricingLocked, pricing]);

  const save = async () => {
    setSaving(true);
    try {
      // بندمج على الإعدادات الموجودة عشان ما نمسحش اللي التاجر ظبطه قبل كده.
      const layoutConfig = {
        ...(shop?.layoutConfig || {}),
        commerce: { ordering, pricing, bookingWindowHours: hours, queueEnabled },
      };
      await apiRequest('/shops/me', { method: 'PATCH', body: JSON.stringify({ layoutConfig }) });
      toast({ title: 'تم الحفظ', description: 'طريقة البيع اتحدّثت في الماركت' });
      onSaved();
    } catch (e: any) {
      toast({
        title: 'خطأ',
        description: e?.message || 'فشل حفظ طريقة البيع',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const optionClass = (active: boolean) =>
    cn(
      'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors',
      active
        ? 'border-slate-900 bg-slate-50'
        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>طريقة البيع في الماركت</CardTitle>
        <CardDescription>
          من هنا بتتحكم إزاي بيظهر متجرك للعميل: بسعر وسلة، ولا حجز 24 ساعة، ولا حجز حقيقي بموعد.
          الاختيار بيظهر في الماركت فورًا.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2.5">
          <Label>إزاي العميل يطلب؟</Label>
          {ORDERING_OPTIONS.map((opt) => (
            <label key={opt.id} className={optionClass(ordering === opt.id)}>
              <input
                type="radio"
                name="commerce-ordering"
                className="mt-1"
                checked={ordering === opt.id}
                onChange={() => setOrdering(opt.id)}
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">{opt.title}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{opt.desc}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <Label>السعر</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPricing('priced')}
              disabled={pricingLocked}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors',
                pricing === 'priced'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300',
                pricingLocked && 'opacity-40 cursor-not-allowed'
              )}
            >
              ظاهر
            </button>
            <button
              type="button"
              onClick={() => setPricing('hidden')}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors',
                pricing === 'hidden'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              مخفي (السعر عند الطلب)
            </button>
          </div>
          {pricingLocked && (
            <p className="text-[11px] text-slate-500">
              مع «حجز 24 ساعة» السعر بيكون مخفي تلقائيًا — غيّر طريقة البيع لو عايز تعرضه.
            </p>
          )}
        </div>

        {ordering === 'booking24h' && (
          <div className="space-y-2 max-w-[200px]">
            <Label htmlFor="booking-hours">مدة الرد المعلن (ساعات)</Label>
            <input
              id="booking-hours"
              type="number"
              min={1}
              max={72}
              value={hours}
              onChange={(e) => setHours(Math.min(72, Math.max(1, Number(e.target.value) || 24)))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
            />
          </div>
        )}

        {ordering === 'appointment' && (
          <label className={optionClass(queueEnabled)}>
            <input
              type="checkbox"
              className="mt-1"
              checked={queueEnabled}
              onChange={(e) => setQueueEnabled(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-bold text-slate-900">اعرض الطابور للعميل</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                يشوف رقم ترتيبه وكام حد قبله، وأنت تشوفهم كلهم في صفحة الحجوزات.
              </span>
            </span>
          </label>
        )}

        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? 'بنحفظ…' : 'حفظ طريقة البيع'}
        </Button>
      </CardContent>
    </Card>
  );
}
