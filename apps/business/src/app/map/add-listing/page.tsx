'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Globe,
  Phone,
  MessageCircle,
  Store,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Home,
} from 'lucide-react';

type Step = 1 | 2 | 3;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api2.mnmknk.com';

export default function AddMapListingPage() {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const [branchName, setBranchName] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);

  const handlePickLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('الجهاز لا يدعم تحديد الموقع');
      return;
    }
    setPickingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setPickingLocation(false);
        setError('');
      },
      () => {
        setError('تعذّر تحديد موقعك — تأكد من السماح بالوصول للموقع');
        setPickingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('اسم النشاط مطلوب');
      return;
    }
    if (latitude == null || longitude == null) {
      setError('الموقع على الخريطة مطلوب');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/map-listings/public/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          phone: phone.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          branch: {
            name: branchName.trim() || undefined,
            latitude,
            longitude,
            addressLabel: addressLabel.trim() || undefined,
            governorate: governorate.trim() || undefined,
            city: city.trim() || undefined,
            phone: phone.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'حدث خطأ أثناء الإرسال');
      setSubmitted(true);
    } catch (e: any) {
      setError(String(e?.message || 'حدث خطأ أثناء الإرسال'));
    } finally {
      setSubmitting(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) return title.trim().length > 0;
    if (step === 2) return latitude != null && longitude != null;
    return true;
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50/60" dir="rtl">
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 md:p-12 space-y-6 shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="text-emerald-600" size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">تم إرسال طلبك بنجاح</h2>
            <p className="text-slate-500 font-bold">هتتم مراجعة طلبك وإضافته للخريطة قريباً.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all inline-flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                العودة للرئيسية
              </Link>
              <Link
                href="/signup"
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all inline-flex items-center justify-center gap-2"
              >
                <Store className="w-4 h-4" />
                ابدأ متجرك معنا
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60" dir="rtl">
      <div className="max-w-xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="text-slate-500 hover:text-slate-900 font-bold text-sm flex items-center gap-1 mb-4"
          >
            <ChevronRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900">
            سجّل موقعك على الخريطة
          </h1>
          <p className="text-slate-400 font-bold mt-2">
            عندك موقع أو متجر خارجي؟ سجّله على خريطتنا بدون ما تنقل أي حاجة.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step >= s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s ? <Check size={14} /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 rounded-full ${step > s ? 'bg-slate-900' : 'bg-slate-100'}`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-red-600 text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Step 1: Business info */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">اسم النشاط *</label>
              <div className="relative">
                <Store
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مطعم الذواقة"
                  className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">التصنيف</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="مطاعم، ملابس، خدمات..."
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">الوصف</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="نبذة مختصرة عن نشاطك..."
                rows={3}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">الهاتف</label>
                <div className="relative">
                  <Phone
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">واتساب</label>
                <div className="relative">
                  <MessageCircle
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                الموقع الإلكتروني
              </label>
              <div className="relative">
                <Globe
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">اسم الفرع</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="الفرع الرئيسي"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">
                تحديد الموقع على الخريطة *
              </label>
              <button
                onClick={handlePickLocation}
                disabled={pickingLocation}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-slate-800 transition-all"
              >
                {pickingLocation ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <MapPin size={16} />
                    {latitude != null ? 'تم تحديد الموقع ✓' : 'تحديد موقعي الحالي'}
                  </>
                )}
              </button>
              {latitude != null && longitude != null && (
                <p className="text-xs text-slate-400 font-bold mt-2 text-center">
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">العنوان</label>
              <input
                type="text"
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                placeholder="شارع ... عمارة ..."
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">المحافظة</label>
                <input
                  type="text"
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  placeholder="القاهرة"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">المدينة</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مدينة نصر"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & submit */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="font-black text-slate-900">مراجعة البيانات</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">الاسم</span>
                  <span className="font-black text-slate-900">{title}</span>
                </div>
                {category && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">التصنيف</span>
                    <span className="font-black text-slate-900">{category}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">الهاتف</span>
                    <span className="font-black text-slate-900">{phone}</span>
                  </div>
                )}
                {whatsapp && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">واتساب</span>
                    <span className="font-black text-slate-900">{whatsapp}</span>
                  </div>
                )}
                {websiteUrl && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">الموقع</span>
                    <span className="font-black text-slate-900 truncate max-w-[200px]">
                      {websiteUrl}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 space-y-3">
              <h3 className="font-black text-amber-900">مراجعة الموقع</h3>
              <div className="space-y-2 text-sm">
                {branchName && (
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">الفرع</span>
                    <span className="font-black text-amber-900">{branchName}</span>
                  </div>
                )}
                {addressLabel && (
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">العنوان</span>
                    <span className="font-black text-amber-900">{addressLabel}</span>
                  </div>
                )}
                {governorate && (
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">المحافظة</span>
                    <span className="font-black text-amber-900">{governorate}</span>
                  </div>
                )}
                {city && (
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">المدينة</span>
                    <span className="font-black text-amber-900">{city}</span>
                  </div>
                )}
                {latitude != null && (
                  <div className="flex justify-between">
                    <span className="text-amber-700 font-bold">الإحداثيات</span>
                    <span className="font-black text-amber-900">
                      {latitude.toFixed(4)}, {longitude!.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4">
              <p className="text-blue-800 text-xs font-bold">
                سيتم مراجعة طلبك وإضافة موقعك للخريطة بعد التأكد من البيانات.
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 gap-4">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all flex items-center gap-1"
            >
              <ChevronRight size={16} />
              السابق
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canGoNext()}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm disabled:opacity-40 hover:bg-slate-800 transition-all flex items-center gap-1"
            >
              التالي
              <ChevronLeft size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm disabled:opacity-50 hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              إرسال الطلب
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
