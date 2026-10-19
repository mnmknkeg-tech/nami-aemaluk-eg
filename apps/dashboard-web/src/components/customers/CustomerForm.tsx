'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  User,
  Building2,
  MapPin,
  Settings,
  Tag,
  Phone,
  Mail,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { apiRequestWithMeta } from '@/lib/api/client';
import { useShop } from '@/hooks/useShop';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

/* ============================================================
 * نموذج العميل الشامل — إضافة / تعديل (محتوى كامل وغني كالصورة 2 و 3)
 * يشمل البيانات الشخصية، الشركات، العنوان، الإعدادات، والتصنيف
 * ============================================================ */

export type CustomerFormValues = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  country: string;
  postalCode: string;
  customerType: 'individual' | 'company';
  gender: string; // 'male' | 'female' | ''
  birthDate: string;
  nationalId: string;
  companyName: string;
  taxNumber: string;
  crNumber: string;
  contactPerson: string;
  branch: string;
  source: string;
  segmentId: string;
  tags: string[];
  notes: string;
  codEnabled: boolean;
  marketingOptIn: boolean;
  shippingAddresses: { label: string; address: string; city: string; phone: string }[];
};

export const EMPTY_CUSTOMER: CustomerFormValues = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  district: '',
  country: 'مصر',
  postalCode: '',
  customerType: 'individual',
  gender: '',
  birthDate: '',
  nationalId: '',
  companyName: '',
  taxNumber: '',
  crNumber: '',
  contactPerson: '',
  branch: '',
  source: 'website',
  segmentId: '',
  tags: [],
  notes: '',
  codEnabled: true,
  marketingOptIn: true,
  shippingAddresses: [],
};

const COUNTRY_OPTIONS = [
  'مصر',
  'الإمارات',
  'الكويت',
  'قطر',
  'البحرين',
  'عمان',
  'الأردن',
];

const SOURCE_OPTIONS = [
  { value: 'website', label: 'المتجر الإلكتروني' },
  { value: 'pos', label: 'الكاشير' },
  { value: 'manual', label: 'إضافة يدوية' },
  { value: 'app', label: 'تطبيق العميل' },
  { value: 'bookings', label: 'الحجوزات' },
  { value: 'services', label: 'الخدمات' },
  { value: 'import', label: 'استيراد' },
];

const inputCls =
  'w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 outline-none text-xs sm:text-sm font-bold focus:ring-2 focus:ring-purple-200 transition-all';
const labelCls = 'text-xs font-bold text-slate-600 mb-1.5 block';

export default function CustomerForm({
  mode,
  customerId,
  initial,
}: {
  mode: 'create' | 'edit';
  customerId?: string;
  initial?: Partial<CustomerFormValues>;
}) {
  const router = useRouter();
  const { shop } = useShop();
  const shopId = shop?.id || '';
  const [values, setValues] = useState<CustomerFormValues>({ ...EMPTY_CUSTOMER, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tags, setTags] = useState<{ id: string; name: string; nameAr?: string; color?: string }[]>(
    []
  );
  const [segments, setSegments] = useState<{ id: string; name: string; nameAr?: string }[]>([]);
  const [dupCustomer, setDupCustomer] = useState<{ id: string; name: string; code: string } | null>(
    null
  );
  const [checking, setChecking] = useState(false);
  const [forceCreate, setForceCreate] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const debouncedPhone = useDebouncedValue(values.phone, 500);

  // تحديث القيم الابتدائية عند التمرير
  useEffect(() => {
    if (initial) {
      setValues((prev) => ({ ...prev, ...initial }));
    }
  }, [initial]);

  // تحميل الشرائح والوسوم
  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const [tagsRes, segRes] = await Promise.allSettled([
        apiRequest(`/shops/${shopId}/tags`),
        apiRequest(`/shops/${shopId}/segments`),
      ]);
      if (tagsRes.status === 'fulfilled') {
        const t = Array.isArray(tagsRes.value) ? tagsRes.value : tagsRes.value?.data || [];
        setTags(Array.isArray(t) ? t : []);
      }
      if (segRes.status === 'fulfilled') {
        const s = Array.isArray(segRes.value) ? segRes.value : segRes.value?.data || [];
        setSegments(Array.isArray(s) ? s : []);
      }
    })();
  }, [shopId]);

  // فحص التكرار live برقم الهاتف (في وضع الإنشاء فقط)
  useEffect(() => {
    if (mode !== 'create' || !shopId) return;
    const digits = debouncedPhone.replace(/\D/g, '');
    if (digits.length < 6) {
      setDupCustomer(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    (async () => {
      try {
        const res = await apiRequest(
          `/shops/${shopId}/customers?query=${encodeURIComponent(digits)}&limit=5`
        );
        const list = Array.isArray(res) ? res : res?.data || [];
        const normalized = digits;
        const match = (Array.isArray(list) ? list : []).find(
          (c: any) =>
            String(c.phone || '')
              .replace(/\D/g, '')
              .endsWith(normalized) || normalized.endsWith(String(c.phone || '').replace(/\D/g, ''))
        );
        if (!cancelled)
          setDupCustomer(match ? { id: match.id, name: match.name, code: match.code } : null);
      } catch {
        if (!cancelled) setDupCustomer(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedPhone, mode, shopId]);

  const set = <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const setShipping = (idx: number, key: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      shippingAddresses: prev.shippingAddresses.map((a, i) =>
        i === idx ? { ...a, [key]: value } : a
      ),
    }));
  };

  const toggleTag = (id: string) => {
    setValues((prev) => ({
      ...prev,
      tags: prev.tags.includes(id) ? prev.tags.filter((t) => t !== id) : [...prev.tags, id],
    }));
  };

  const addNewTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (!values.tags.includes(tag)) {
      setValues((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setNewTagInput('');
  };

  const submit = async () => {
    setError('');
    if (!values.phone.trim()) {
      setError('رقم الهاتف مطلوب');
      return;
    }
    if (!values.name.trim() && !values.companyName.trim()) {
      setError('الاسم مطلوب (أو اسم الشركة)');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        name: values.name.trim() || values.companyName.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        address: [values.address, values.district].filter(Boolean).join(' - '),
        city: values.city.trim(),
        country: values.country.trim(),
        customerType: values.customerType,
        companyName: values.companyName.trim(),
        taxNumber: values.taxNumber.trim(),
        branch: values.branch.trim(),
        source: values.source,
        segmentId: values.segmentId,
        tags: values.tags,
        notes: values.notes.trim(),
        shippingAddresses: values.shippingAddresses,
        addresses: [],
      };
      if (values.customerType === 'company') {
        body.contactPerson = values.contactPerson;
        if (!body.name) body.name = values.companyName;
      }
      if (mode === 'create') {
        const res = await apiRequestWithMeta(`/shops/${shopId}/customers`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        const customer = res?.data as any;
        const created = res?.raw?.created !== false;
        if (!created && customer?.id) {
          router.push(`/dashboard/customers/${customer.id}`);
          return;
        }
        router.push(`/dashboard/customers/${customer?.id || ''}`);
        return;
      } else if (customerId) {
        await apiRequest(`/shops/${shopId}/customers/${customerId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        router.push(`/dashboard/customers/${customerId}`);
      }
      router.refresh();
    } catch (e: any) {
      setError(String(e?.message || 'فشل الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* تنبيه فحص التكرار برقم الهاتف كالصورة 3 */}
      {mode === 'create' && (checking || dupCustomer) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
          {checking ? (
            <span className="flex items-center gap-2 text-amber-700 text-xs font-bold">
              <Loader2 size={14} className="animate-spin" /> جاري التحقق من رقم الهاتف...
            </span>
          ) : dupCustomer ? (
            <>
              <span className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                العميل مسجل بالفعل: {dupCustomer.name} ({dupCustomer.code}) — نفس رقم الهاتف
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/customers/${dupCustomer.id}`)}
                  className="h-8 px-3.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800"
                >
                  فتح الملف الموجود
                </button>
                {!forceCreate && (
                  <button
                    type="button"
                    onClick={() => setForceCreate(true)}
                    className="h-8 px-3 rounded-xl bg-white border border-amber-300 text-amber-800 text-[11px] font-bold hover:bg-amber-100"
                  >
                    متابعة الإنشاء
                  </button>
                )}
              </div>
            </>
          ) : (
            <span className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
              <CheckCircle2 size={15} /> الرقم غير مسجل — عميل جديد
            </span>
          )}
        </div>
      )}

      {/* كارت 1: البيانات الأساسية والشخصية كالصورة 2 و 3 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-[#492770] flex items-center justify-center">
              <User size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">البيانات الأساسية</h3>
              <p className="text-[11px] text-slate-400 font-semibold">
                بيانات التواصل وهوية العميل الشخصية
              </p>
            </div>
          </div>

          {/* نوع العميل: فرد / شركة */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => set('customerType', 'individual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                values.customerType === 'individual'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              فرد
            </button>
            <button
              type="button"
              onClick={() => set('customerType', 'company')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                values.customerType === 'company'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              شركة
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              {values.customerType === 'company' ? 'اسم مسؤول التواصل' : 'الاسم الكامل'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="مثلاً: محمد عبد الله"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              رقم الجوال <span className="text-red-500">*</span>
            </label>
            <input
              value={values.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="05xxxxxxxxx / 01xxxxxxxxx"
              dir="ltr"
              className={`${inputCls} text-right`}
              inputMode="tel"
            />
          </div>

          <div>
            <label className={labelCls}>البريد الإلكتروني</label>
            <input
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="name@example.com"
              dir="ltr"
              className={inputCls}
            />
          </div>

          {/* حقول إضافية مكتملة كالصورة 2: الجنس وتاريخ الميلاد والهوية */}
          {values.customerType === 'individual' && (
            <>
              <div>
                <label className={labelCls}>الجنس</label>
                <select
                  value={values.gender}
                  onChange={(e) => set('gender', e.target.value)}
                  className={inputCls}
                >
                  <option value="">غير محدد</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>تاريخ الميلاد</label>
                <input
                  type="date"
                  value={values.birthDate}
                  onChange={(e) => set('birthDate', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>رقم الهوية الوطنية / الإقامة (اختياري)</label>
                <input
                  value={values.nationalId}
                  onChange={(e) => set('nationalId', e.target.value)}
                  placeholder="رقم الهوية / الرقم القومي"
                  className={inputCls}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* كارت 2: بيانات الشركة والفوترة (تظهر عند اختيار نوع العميل: شركة) */}
      {values.customerType === 'company' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">بيانات المنشأة والفوترة</h3>
              <p className="text-[11px] text-slate-400 font-semibold">
                بيانات التسجيل الضريبي والتجاري لإصدار الفواتير
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                اسم الشركة أو المؤسسة <span className="text-red-500">*</span>
              </label>
              <input
                value={values.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="اسم الشركة الرسمي"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>الرقم الضريبي (VAT)</label>
              <input
                value={values.taxNumber}
                onChange={(e) => set('taxNumber', e.target.value)}
                placeholder="3xxxxxxxxxxxxxx"
                dir="ltr"
                className={`${inputCls} text-right`}
              />
            </div>

            <div>
              <label className={labelCls}>رقم السجل التجاري (CR)</label>
              <input
                value={values.crNumber}
                onChange={(e) => set('crNumber', e.target.value)}
                placeholder="رقم السجل التجاري"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>صفة جهة الاتصال</label>
              <input
                value={values.contactPerson}
                onChange={(e) => set('contactPerson', e.target.value)}
                placeholder="مثلاً: مدير المشتريات أو المحاسب"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}

      {/* كارت 3: العنوان والتوصيل كالصورة 2 و 3 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
            <MapPin size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">العنوان وبيانات الشحن</h3>
            <p className="text-[11px] text-slate-400 font-semibold">
              العنوان الرئيسي للتوصيل وعناوين الشحن الإضافية
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>الدولة</label>
            <select
              value={values.country}
              onChange={(e) => set('country', e.target.value)}
              className={inputCls}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>المدينة</label>
            <input
              value={values.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="مثلاً: الرياض / القاهرة"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>الحي / المنطقة</label>
            <input
              value={values.district}
              onChange={(e) => set('district', e.target.value)}
              placeholder="الحي أو المنطقة"
              className={inputCls}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>العنوان التفصيلي</label>
            <input
              value={values.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="اسم الشارع، رقم المبنى، المعلم القريب"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>الرمز البريدي (اختياري)</label>
            <input
              value={values.postalCode}
              onChange={(e) => set('postalCode', e.target.value)}
              placeholder="12345"
              className={inputCls}
            />
          </div>
        </div>

        {/* عناوين الشحن الإضافية */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-700">عناوين شحن إضافية</span>
            <button
              type="button"
              onClick={() =>
                set('shippingAddresses', [
                  ...values.shippingAddresses,
                  { label: '', address: '', city: values.city || '', phone: values.phone || '' },
                ])
              }
              className="h-8 px-3 rounded-xl bg-purple-50 text-[#492770] hover:bg-purple-100 text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Plus size={13} />
              إضافة عنوان شحن
            </button>
          </div>

          {values.shippingAddresses.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold py-1">لا توجد عناوين شحن إضافية</p>
          ) : (
            <div className="space-y-2">
              {values.shippingAddresses.map((a, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-slate-50 border border-slate-200/80 rounded-2xl p-3"
                >
                  <input
                    value={a.label}
                    onChange={(e) => setShipping(idx, 'label', e.target.value)}
                    placeholder="التسمية (مثلاً: العمل/المنزل)"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                  />
                  <input
                    value={a.address}
                    onChange={(e) => setShipping(idx, 'address', e.target.value)}
                    placeholder="العنوان التفصيلي"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                  />
                  <input
                    value={a.city}
                    onChange={(e) => setShipping(idx, 'city', e.target.value)}
                    placeholder="المدينة"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      value={a.phone}
                      onChange={(e) => setShipping(idx, 'phone', e.target.value)}
                      placeholder="هاتف المستلم"
                      dir="ltr"
                      className="flex-1 w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none text-right"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          'shippingAddresses',
                          values.shippingAddresses.filter((_, i) => i !== idx)
                        )
                      }
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                      title="حذف العنوان"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* كارت 4: تفضيلات وإعدادات العميل كالصورة 2 تماماً */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center">
            <Settings size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">إعدادات وتفضيلات العميل</h3>
            <p className="text-[11px] text-slate-400 font-semibold">
              خيارات الدفع والإشعارات التسويقية المتاحة للعميل
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* مفتاح الدفع عند الاستلام */}
          <div className="flex items-start justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div>
              <div className="text-xs font-bold text-slate-800">الدفع عند الاستلام</div>
              <div className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-tight">
                السماح للعميل بإتمام الطلبات واختيار الدفع عند الاستلام
              </div>
            </div>
            <button
              type="button"
              onClick={() => set('codEnabled', !values.codEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                values.codEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  values.codEnabled ? 'translate-x-0' : '-translate-x-5'
                }`}
              />
            </button>
          </div>

          {/* مفتاح استقبال الرسائل التسويقية */}
          <div className="flex items-start justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div>
              <div className="text-xs font-bold text-slate-800">استقبال الرسائل التسويقية</div>
              <div className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-tight">
                إرسال العروض والتخفيضات الدورية عبر البريد أو واتساب
              </div>
            </div>
            <button
              type="button"
              onClick={() => set('marketingOptIn', !values.marketingOptIn)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                values.marketingOptIn ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  values.marketingOptIn ? 'translate-x-0' : '-translate-x-5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* كارت 5: التصنيف وبيانات النظام */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-[#492770] flex items-center justify-center">
            <Tag size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">التصنيف وقناة الوصول</h3>
            <p className="text-[11px] text-slate-400 font-semibold">
              شريحة العميل، الفرع، قناة الوصول، والوسوم
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>الشريحة</label>
            <select
              value={values.segmentId}
              onChange={(e) => set('segmentId', e.target.value)}
              className={inputCls}
            >
              <option value="">بدون شريحة (افتراضي)</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameAr || s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>الفرع</label>
            <input
              value={values.branch}
              onChange={(e) => set('branch', e.target.value)}
              placeholder="الفرع المسؤول"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>قناة وصول العميل</label>
            <select
              value={values.source}
              onChange={(e) => set('source', e.target.value)}
              className={inputCls}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className={labelCls}>الوسوم (Tags)</label>
            <div className="flex items-center gap-2 mb-2.5">
              <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addNewTag();
                  }
                }}
                placeholder="اكتب وسم ثم اضغط إضافة..."
                className="max-w-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold outline-none"
              />
              <button
                type="button"
                onClick={addNewTag}
                className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                + إضافة وسم
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const active = values.tags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      active
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    style={active ? { backgroundColor: t.color || '#492770' } : {}}
                  >
                    {t.nameAr || t.name}
                  </button>
                );
              })}
              {values.tags
                .filter((t) => !tags.some((tag) => tag.id === t))
                .map((customTag) => (
                  <span
                    key={customTag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#492770] text-white"
                  >
                    {customTag}
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          'tags',
                          values.tags.filter((x) => x !== customTag)
                        )
                      }
                      className="text-white/80 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <label className={labelCls}>ملاحظات داخلية عن العميل</label>
            <textarea
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="ملاحظات سرية لفريق العمل فقط..."
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* زر الحفظ / الإنشاء كالصورة 2 و 3 */}
      <button
        type="button"
        onClick={submit}
        disabled={saving || (mode === 'create' && dupCustomer !== null && !forceCreate)}
        className="w-full py-4 rounded-2xl bg-[#492770] hover:bg-[#3d1f5e] text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {mode === 'create' ? 'إنشاء العميل' : 'حفظ التعديلات'}
      </button>
    </div>
  );
}
