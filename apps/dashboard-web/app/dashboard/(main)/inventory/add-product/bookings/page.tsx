'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  Plus,
  Trash2,
  Image as ImageIcon,
  Youtube,
  Upload,
  Check,
  CheckCircle2,
  HelpCircle,
  MapPin,
  Video,
  Home,
  Users,
  AlertCircle,
  CalendarOff,
  ChevronDown,
  ChevronUp,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  Code,
  Info,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import ExtendedProductSections, {
  defaultExtraData,
  ProductExtraData,
} from '@/components/products/ExtendedProductSections';

export interface DaySchedule {
  dayKey: string;
  dayLabel: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface BookingSettings {
  scheduleType: 'days_only' | 'days_and_times';
  slotDurationMinutes: number;
  allowMultipleBookingsPerCustomer: boolean;
  maxBookingsPerCustomer: number;
  capacityPerSlot: number;
  leadTimeValue: number;
  leadTimeUnit: 'minute' | 'hour' | 'day';
  locationType: 'onsite' | 'online' | 'home_visit';
  locationAddress: string;
  workingDays: DaySchedule[];
  exceptions: string[];
}

const DEFAULT_DAYS: DaySchedule[] = [
  { dayKey: 'saturday', dayLabel: 'السبت', enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayKey: 'sunday', dayLabel: 'الأحد', enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayKey: 'monday', dayLabel: 'الإثنين', enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayKey: 'tuesday', dayLabel: 'الثلاثاء', enabled: true, startTime: '09:00', endTime: '18:00' },
  {
    dayKey: 'wednesday',
    dayLabel: 'الأربعاء',
    enabled: true,
    startTime: '09:00',
    endTime: '18:00',
  },
  { dayKey: 'thursday', dayLabel: 'الخميس', enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayKey: 'friday', dayLabel: 'الجمعة', enabled: false, startTime: '14:00', endTime: '20:00' },
];

import { compressForUpload } from '@/lib/upload-image';
export default function AddBookingsProductPage() {
  const router = useRouter();

  // Basic Info
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [brand, setBrand] = useState('');
  const [googleCategory, setGoogleCategory] = useState('الصحة والجمال');
  const [localCategory, setLocalCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Booking specific scheduling
  const [scheduleType, setScheduleType] = useState<'days_only' | 'days_and_times'>(
    'days_and_times'
  );
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [allowMultipleBookings, setAllowMultipleBookings] = useState(false);
  const [maxBookingsPerCustomer, setMaxBookingsPerCustomer] = useState(1);
  const [capacityPerSlot, setCapacityPerSlot] = useState(1);
  const [leadTimeValue, setLeadTimeValue] = useState(2);
  const [leadTimeUnit, setLeadTimeUnit] = useState<'minute' | 'hour' | 'day'>('hour');
  const [locationType, setLocationType] = useState<'onsite' | 'online' | 'home_visit'>('onsite');
  const [locationAddress, setLocationAddress] = useState('');
  const [workingDays, setWorkingDays] = useState<DaySchedule[]>(DEFAULT_DAYS);

  // Exceptions
  const [exceptions, setExceptions] = useState<string[]>([]);
  const [newExceptionDate, setNewExceptionDate] = useState('');

  // Extended Data (Sections: SEO, OrderForm, Advanced, Discounts, Channels, Options, CustomFields)
  const [extraData, setExtraData] = useState<ProductExtraData>(() => ({
    ...defaultExtraData(),
    requiresShipping: false,
    unlimitedStock: true,
  }));

  // Quick Category
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Edit Mode
  const [editId, setEditId] = useState('');
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Interactive Live Preview Selection
  const [previewSelectedDay, setPreviewSelectedDay] = useState('saturday');
  const [previewSelectedSlot, setPreviewSelectedSlot] = useState('10:00 ص');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
    const editParam = new URLSearchParams(window.location.search).get('edit');
    if (editParam) loadProductForEdit(editParam);
  }, []);

  const loadCategories = async () => {
    try {
      const data = await apiRequest('/categories');
      const list = Array.isArray(data) ? data : data?.categories || data?.data || [];
      setCategories(list);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadProductForEdit = async (id: string) => {
    setLoadingProduct(true);
    try {
      const data: any = await apiRequest(`/products/${id}`);
      const p = data?.data || data;
      if (!p || !p.id) throw new Error('المنتج غير موجود');
      setEditId(String(p.id));
      setName(String(p.name || ''));
      setDescription(String(p.description || ''));
      setPrice(p.price != null ? String(p.price) : '');
      setCategory(typeof p.category === 'string' ? p.category : String(p.category?.name || ''));
      setImageUrl(String(p.imageUrl || p.image_url || ''));
      setIsActive(p.isActive !== false);
      setBrand(String(p.brand || ''));

      const ex = (p.extraData || {}) as ProductExtraData & {
        bookingSettings?: BookingSettings;
      };
      setExtraData({ ...defaultExtraData(), ...ex, requiresShipping: false });
      setCostPrice(ex.costPrice != null ? String(ex.costPrice) : '');
      setGoogleCategory(String(ex.googleCategory || 'الصحة والجمال'));
      setLocalCategory(String(ex.localCategory || ''));
      setYoutubeUrl(String(ex.youtubeUrl || ''));

      if (ex.bookingSettings) {
        const bs = ex.bookingSettings;
        if (bs.scheduleType) setScheduleType(bs.scheduleType);
        if (bs.slotDurationMinutes) setSlotDurationMinutes(bs.slotDurationMinutes);
        if (bs.allowMultipleBookingsPerCustomer != null)
          setAllowMultipleBookings(bs.allowMultipleBookingsPerCustomer);
        if (bs.maxBookingsPerCustomer) setMaxBookingsPerCustomer(bs.maxBookingsPerCustomer);
        if (bs.capacityPerSlot) setCapacityPerSlot(bs.capacityPerSlot);
        if (bs.leadTimeValue) setLeadTimeValue(bs.leadTimeValue);
        if (bs.leadTimeUnit) setLeadTimeUnit(bs.leadTimeUnit);
        if (bs.locationType) setLocationType(bs.locationType);
        if (bs.locationAddress) setLocationAddress(bs.locationAddress);
        if (Array.isArray(bs.workingDays) && bs.workingDays.length > 0)
          setWorkingDays(bs.workingDays);
        if (Array.isArray(bs.exceptions)) setExceptions(bs.exceptions);
      }
    } catch (err: any) {
      console.error('Failed to load booking product for edit:', err);
      alert(err?.message || 'تعذر تحميل بيانات الحجز للتعديل');
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleQuickAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      const shopData = await apiRequest('/shops/me');
      const sid = shopData?.id;
      if (!sid) return;
      await apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed, nameAr: trimmed, shopId: sid, status: 'active' }),
      });
      setNewCategoryName('');
      setShowQuickCategoryModal(false);
      await loadCategories();
      setCategory(trimmed);
    } catch {
      alert('حدث خطأ أثناء إضافة الفئة');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(await compressForUpload(file, 'product'));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleDay = (dayKey: string) => {
    setWorkingDays((prev) =>
      prev.map((d) => (d.dayKey === dayKey ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const handleUpdateTime = (dayKey: string, field: 'startTime' | 'endTime', value: string) => {
    setWorkingDays((prev) => prev.map((d) => (d.dayKey === dayKey ? { ...d, [field]: value } : d)));
  };

  const handleAddException = () => {
    if (!newExceptionDate) return;
    if (exceptions.includes(newExceptionDate)) return;
    setExceptions((prev) => [...prev, newExceptionDate].sort());
    setNewExceptionDate('');
  };

  const handleRemoveException = (date: string) => {
    setExceptions((prev) => prev.filter((d) => d !== date));
  };

  // Sample generated time slots for live preview
  const previewSlots = useMemo(() => {
    if (scheduleType === 'days_only') return [];
    const activeDay = workingDays.find((d) => d.dayKey === previewSelectedDay);
    if (!activeDay || !activeDay.enabled) return [];
    return ['09:00 ص', '10:00 ص', '11:00 ص', '12:00 م', '01:30 م', '03:00 م', '04:30 م', '05:30 م'];
  }, [scheduleType, workingDays, previewSelectedDay]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('يرجى إدخال اسم الخدمة أو الحجز');
      return;
    }
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      alert('يرجى إدخال سعر صحيح للحجز');
      return;
    }

    setSaving(true);
    try {
      const shopData = await apiRequest('/shops/me');
      const shopId = shopData?.id;
      if (!shopId) {
        alert('لم يتم العثور على المتجر');
        return;
      }

      let finalImageUrl = imageUrl;
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('purpose', 'product_image');
        const uploadResponse = await apiRequest(`/media/upload?shopId=${shopId}`, {
          method: 'POST',
          body: formData,
        });
        finalImageUrl = uploadResponse?.url || imageUrl;
      }

      const bookingSettings: BookingSettings = {
        scheduleType,
        slotDurationMinutes: Number(slotDurationMinutes),
        allowMultipleBookingsPerCustomer: allowMultipleBookings,
        maxBookingsPerCustomer: allowMultipleBookings ? Number(maxBookingsPerCustomer) : 1,
        capacityPerSlot: Number(capacityPerSlot) || 1,
        leadTimeValue: Number(leadTimeValue) || 1,
        leadTimeUnit,
        locationType,
        locationAddress: locationAddress.trim(),
        workingDays,
        exceptions,
      };

      const productData: any = {
        name: name.trim(),
        description: description.trim() || null,
        price: numericPrice,
        category: category || 'حجوزات ومواعيد',
        imageUrl: finalImageUrl,
        isActive,
        shopId,
        unit: 'booking',
        trackStock: false,
        stock: 9999,
        ...(brand ? { brand } : {}),
        extraData: {
          ...extraData,
          costPrice: costPrice ? Number(costPrice) : null,
          brand: brand || undefined,
          googleCategory: googleCategory || undefined,
          localCategory: localCategory || undefined,
          youtubeUrl: youtubeUrl || undefined,
          requiresShipping: false,
          isBooking: true,
          bookingSettings,
        },
      };

      if (editId) {
        await apiRequest(`/products/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(productData),
        });
        alert('تم تحديث الحجز بنجاح');
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(productData),
        });
        alert('تم إنشاء خدمة الحجز بنجاح');
      }
      router.push('/dashboard/inventory/products');
    } catch (err: any) {
      console.error('Failed to save booking product:', err);
      alert(err?.message || 'فشل حفظ الحجز');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProduct) {
    return (
      <div
        className="min-h-screen bg-[#F4F5F7] flex items-center justify-center"
        style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
      >
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-bold">جاري تحميل بيانات الحجز للتعديل...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F4F5F7]"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* ─── Top Header ─── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/dashboard/inventory/add-product')}
              className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
              title="رجوع لاختيار النوع"
            >
              <ArrowRight size={18} />
            </button>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {editId ? 'تعديل خدمة حجز ومواعيد' : 'إضافة حجز ومواعيد'}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-bold shrink-0">
                  خدمة حجز
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                حدّد المواعيد، ونظّم الطاقة الاستيعابية والتقويم من مكان واحد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => router.push('/dashboard/inventory/products')}
              className="px-3 sm:px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 sm:px-5 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>{editId ? 'حفظ التعديلات' : 'حفظ ونشر الحجز'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-6">
        {/* Banner */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-bold">
              <Sparkles size={12} />
              <span>متاحة في باقتك</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black">نظّم حجوزات متجرك بسهولة</h2>
            <p className="text-xs text-teal-100 leading-relaxed max-w-2xl">
              حدّد المواعيد وأدِر الحجوزات والطاقة الاستيعابية من مكان واحد. يتيح لعملائك اختيار
              اليوم والوقت المناسب وحجز الجلسة أو الموعد مباشرة مع تأكيد فوري.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
                ✓ حدّد مواعيد وتواريخ الحجز بسهولة
              </span>
              <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
                ✓ نظّم الطاقة الاستيعابية حسب وقت الحجز
              </span>
              <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
                ✓ تابع الحجوزات وأدِرها من مكان واحد
              </span>
              <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md">
                ✓ مناسب للخدمات والجلسات والمواعيد
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <span className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold border border-white/20 flex items-center gap-1.5">
              <CalendarClock size={14} />
              <span>حجوزات ومواعيد</span>
            </span>
          </div>
        </div>

        {/* Two Columns: Form (Right/Main) + Sticky Preview (Left) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── Column 1: Form (lg:col-span-8) ─── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Basic Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <CalendarClock size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">المعلومات الأساسية</h3>
                    <p className="text-[11px] text-slate-400">بيانات الخدمة، الاسم، والصور</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                  <span>مفعلة بالمتجر</span>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                </label>
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  صورة الحجز ورابط الفيديو
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 flex flex-col items-center justify-center min-h-[140px]"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {imageUrl ? (
                      <div className="relative group w-full h-28">
                        <img
                          src={imageUrl}
                          alt="Booking"
                          className="w-full h-full object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-xs font-bold">
                          تغيير الصورة
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-2">
                          <Upload size={18} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">اسحب الصورة وأفلتها هنا</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          أو اضغط للاختيار من جهازك
                        </p>
                      </>
                    )}
                  </div>

                  {/* YouTube Link */}
                  <div className="flex flex-col justify-center gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50/30">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Youtube size={16} className="text-red-500" />
                      <span>رابط فيديو يوتيوب (اختياري)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                      dir="ltr"
                    />
                    <p className="text-[10px] text-slate-400">
                      يمكنك وضع رابط فيديو توضيحي للخدمة أو الجلسة
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم الخدمة أو الحجز <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="مثال: استشارة قانونية، جلسة مساج وسبا، كشف أسنان، ورشة تدريبية"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <span className="absolute left-3 top-2.5 text-[10px] font-black text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                    AR
                  </span>
                </div>
              </div>

              {/* Price & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    سعر الحجز للعميل <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] font-bold text-slate-400">
                      ج.م
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    سعر التكلفة (اختياري)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] font-bold text-slate-400">
                      ج.م
                    </span>
                  </div>
                </div>
              </div>

              {/* Categories & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">التصنيف</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickCategoryModal(true)}
                      className="text-[10px] text-teal-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={12} />
                      <span>إضافة تصنيف جديد</span>
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                  >
                    <option value="">اختر التصنيف...</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id || cat.name} value={cat.name || cat.nameAr}>
                        {cat.nameAr || cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    العلامة التجارية / مقدم الخدمة
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: عيادة د. أحمد، مركز الرعاية، Ray Spa"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Google & Local Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تصنيفات جوجل (Google Shopping)
                  </label>
                  <select
                    value={googleCategory}
                    onChange={(e) => setGoogleCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                  >
                    <option value="الصحة والجمال">الصحة والجمال</option>
                    <option value="الفن والترفيه">الفن والترفيه</option>
                    <option value="تجاري وصناعي">تجاري وصناعي</option>
                    <option value="ملابس وإكسسوارات">ملابس وإكسسوارات</option>
                    <option value="إلكترونيات">إلكترونيات</option>
                    <option value="المأكولات والمشروبات والتبغ">المأكولات والمشروبات والتبغ</option>
                    <option value="الأثاث">الأثاث</option>
                    <option value="الحديقة والمنزل">الحديقة والمنزل</option>
                    <option value="الرضيع والطفل">الرضيع والطفل</option>
                    <option value="وسائط">وسائط</option>
                    <option value="المستلزمات المكتبية">المستلزمات المكتبية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تصنيف محلي
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: حجوزات VIP، عروض نهاية الأسبوع"
                    value={localCategory}
                    onChange={(e) => setLocalCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Description with Toolbar mockup */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">وصف الخدمة أو الحجز</label>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
                      title="محاذاة لليمين"
                    >
                      <AlignRight size={13} />
                    </button>
                    <button
                      type="button"
                      className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
                      title="توسيط"
                    >
                      <AlignCenter size={13} />
                    </button>
                    <button
                      type="button"
                      className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
                      title="محاذاة لليسار"
                    >
                      <AlignLeft size={13} />
                    </button>
                    <button
                      type="button"
                      className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded"
                      title="ضبط"
                    >
                      <AlignJustify size={13} />
                    </button>
                    <span className="w-px h-3 bg-slate-300 mx-0.5" />
                    <button
                      type="button"
                      className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded flex items-center gap-0.5"
                      title="HTML"
                    >
                      <Code size={13} />
                      <span className="text-[10px]">HTML</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    rows={4}
                    placeholder="اكتب وصفاً مفصلاً عن الخدمة، ماذا تشمل الجلسة، الشروط والتعليمات..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 leading-relaxed"
                  />
                  <span className="absolute left-3 bottom-3 text-[10px] font-black text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                    AR
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Booking Scheduling Settings (خاص بالحجوزات) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">جدولة الحجوزات</h3>
                    <p className="text-[11px] text-slate-400">
                      طريقة تحديد المواعيد، الطاقة الاستيعابية، وأيام وأوقات العمل
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule Type (Days only vs Days and Times) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  اختر طريقة تحديد المواعيد
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScheduleType('days_only')}
                    className={`p-3.5 rounded-xl border text-right transition-all ${
                      scheduleType === 'days_only'
                        ? 'border-teal-600 bg-teal-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">الأيام</span>
                      <Calendar
                        size={16}
                        className={
                          scheduleType === 'days_only' ? 'text-teal-600' : 'text-slate-400'
                        }
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      حدِّد الأيام المتاحة للحجز فقط (مناسب للشاليهات، تأجير السيارات أو المعدات).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleType('days_and_times')}
                    className={`p-3.5 rounded-xl border text-right transition-all ${
                      scheduleType === 'days_and_times'
                        ? 'border-teal-600 bg-teal-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">الأيام والأوقات</span>
                      <Clock
                        size={16}
                        className={
                          scheduleType === 'days_and_times' ? 'text-teal-600' : 'text-slate-400'
                        }
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      حدِّد أيامًا وأوقاتًا معينة متاحة للحجز (مناسب للعيادات، الصالونات،
                      والاستشارات).
                    </p>
                  </button>
                </div>
              </div>

              {/* Slot Duration & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {scheduleType === 'days_and_times' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      مدة الموعد / الجلسة
                    </label>
                    <select
                      value={slotDurationMinutes}
                      onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                    >
                      <option value="15">15 دقيقة</option>
                      <option value="30">30 دقيقة (نصف ساعة)</option>
                      <option value="45">45 دقيقة</option>
                      <option value="60">60 دقيقة (ساعة كاملة)</option>
                      <option value="90">90 دقيقة (ساعة ونصف)</option>
                      <option value="120">120 دقيقة (ساعتان)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    العدد المتاح للحجز في الموعد الواحد (الطاقة الاستيعابية)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={capacityPerSlot}
                      onChange={(e) =>
                        setCapacityPerSlot(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-full px-3.5 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <span className="absolute left-3 top-2 text-[10px] font-bold text-slate-400">
                      عميل / مقعد
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    مثال: 1 لجلسة فردية خاصة، أو أكثر لورشة عمل ومجموعة
                  </p>
                </div>
              </div>

              {/* Customer booking limits & buffer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Allow multiple bookings */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-bold text-slate-800">
                      حجز عدة مواعيد لنفس العميل*
                    </span>
                    <input
                      type="checkbox"
                      checked={allowMultipleBookings}
                      onChange={(e) => setAllowMultipleBookings(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                  </label>
                  {allowMultipleBookings && (
                    <div className="pt-2 border-t border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        الحد الأعلى للحجوزات للعميل الواحد
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={maxBookingsPerCustomer}
                        onChange={(e) =>
                          setMaxBookingsPerCustomer(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* Lead time / buffer */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    الحد من الحجوزات المتأخرة*
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={leadTimeValue}
                      onChange={(e) => setLeadTimeValue(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-center"
                    />
                    <select
                      value={leadTimeUnit}
                      onChange={(e) => setLeadTimeUnit(e.target.value as any)}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="minute">دقيقة</option>
                      <option value="hour">ساعة</option>
                      <option value="day">يوم</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    يمنع حجز موعد قبل بدايته بأقل من هذه المدة
                  </p>
                </div>
              </div>

              {/* Location / Meeting Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  الموقع ونوع الحضور
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setLocationType('onsite')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      locationType === 'onsite'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin size={14} />
                    <span>في المقر / العيادة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationType('online')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      locationType === 'online'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Video size={14} />
                    <span>أونلاين (Zoom / Meet)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationType('home_visit')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      locationType === 'home_visit'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Home size={14} />
                    <span>زيارة منزلية</span>
                  </button>
                </div>

                {locationType === 'onsite' && (
                  <input
                    type="text"
                    placeholder="عنوان المقر بالتفصيل (مثال: القاهرة، مدينة نصر، شارع عباس العقاد، عمارة 14)"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                )}
              </div>

              {/* Working Days & Schedule Table */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">
                    أيام العمل وساعات الحجز المتاحة
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    فعّل الأيام وحدد أوقات البداية والنهاية
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {workingDays.map((day) => (
                    <div
                      key={day.dayKey}
                      className={`p-3 flex flex-wrap items-center justify-between gap-3 transition-colors ${
                        day.enabled ? 'bg-white' : 'bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 w-28 shrink-0">
                        <input
                          type="checkbox"
                          checked={day.enabled}
                          onChange={() => handleToggleDay(day.dayKey)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-xs font-bold text-slate-800">{day.dayLabel}</span>
                      </div>

                      {day.enabled ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 text-[11px]">من:</span>
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(e) =>
                              handleUpdateTime(day.dayKey, 'startTime', e.target.value)
                            }
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium"
                          />
                          <span className="text-slate-400 text-[11px]">إلى:</span>
                          <input
                            type="time"
                            value={day.endTime}
                            onChange={(e) =>
                              handleUpdateTime(day.dayKey, 'endTime', e.target.value)
                            }
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">
                          مغلق (عطلة أسبوعية)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking Exceptions (الإجازات والعطلات) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">استثناءات الحجز</h4>
                    <p className="text-[10px] text-slate-400">
                      استثنِ تواريخ محددة (كالأعياد أو الإجازات السنوية) من الحجز
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newExceptionDate}
                    onChange={(e) => setNewExceptionDate(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddException}
                    className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>إضافة استثناء</span>
                  </button>
                </div>

                {exceptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {exceptions.map((exDate) => (
                      <span
                        key={exDate}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold border border-red-200"
                      >
                        <CalendarOff size={13} />
                        <span>{exDate}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveException(exDate)}
                          className="text-red-400 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Extended Product Sections (المعلومات المتقدمة، التخفيضات، قنوات العرض، خيارات الشراء، الوسوم، SEO، نموذج الطلب، الحقول المخصصة) */}
            <ExtendedProductSections
              value={extraData}
              onChange={setExtraData}
              showOrderForm={true}
              showShipping={false}
              showInventory={false}
              showCalories={false}
              showProductOptions={false}
              showQuantities={false}
              showFiles={false}
            />
          </div>

          {/* ─── Column 2: Sticky Live Preview (lg:col-span-4) ─── */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Eye size={15} className="text-teal-600" />
                  <span>معاينة حجز العميل</span>
                </div>
                <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                  مباشر
                </span>
              </div>

              {/* Service Booking Card */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="aspect-video bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  {imageUrl ? (
                    <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <CalendarClock size={36} className="mx-auto text-slate-300 mb-1" />
                      <span className="text-[11px] text-slate-400 block font-medium">
                        صورة الخدمة / الجلسة
                      </span>
                    </div>
                  )}
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-black shadow-xs">
                    حجز موعد
                  </span>
                </div>

                <div className="p-4 space-y-3.5">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-snug">
                      {name || 'اسم الخدمة أو الحجز'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {category || 'حجوزات واستشارات'} {brand ? `• ${brand}` : ''}
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-teal-600">
                      {price ? `${Number(price).toFixed(2)} ج.م` : '0.00 ج.م'}
                    </span>
                    {extraData.discountPrice && (
                      <span className="text-xs text-slate-400 line-through font-bold">
                        {extraData.discountPrice} ج.م
                      </span>
                    )}
                  </div>

                  {/* Booking details badge */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1.5 text-slate-600">
                      <Clock size={13} className="text-teal-600 shrink-0" />
                      <span>{slotDurationMinutes} دقيقة</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1.5 text-slate-600">
                      {locationType === 'onsite' ? (
                        <>
                          <MapPin size={13} className="text-teal-600 shrink-0" />
                          <span className="truncate">في المقر</span>
                        </>
                      ) : locationType === 'online' ? (
                        <>
                          <Video size={13} className="text-teal-600 shrink-0" />
                          <span className="truncate">أونلاين</span>
                        </>
                      ) : (
                        <>
                          <Home size={13} className="text-teal-600 shrink-0" />
                          <span className="truncate">زيارة منزلية</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Calendar & Time selector preview */}
                  <div className="border-t border-slate-100 pt-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">
                        1. حدد اليوم المناسب:
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {workingDays
                        .filter((d) => d.enabled)
                        .slice(0, 4)
                        .map((day) => (
                          <button
                            key={day.dayKey}
                            type="button"
                            onClick={() => setPreviewSelectedDay(day.dayKey)}
                            className={`py-1.5 px-1 rounded-lg text-center text-[10px] font-bold transition-colors ${
                              previewSelectedDay === day.dayKey
                                ? 'bg-teal-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {day.dayLabel}
                          </button>
                        ))}
                    </div>

                    {scheduleType === 'days_and_times' && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-800 block">
                          2. حدد الوقت المتاح:
                        </span>
                        <div className="grid grid-cols-4 gap-1">
                          {previewSlots.slice(0, 4).map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setPreviewSelectedSlot(slot)}
                              className={`py-1 rounded-md text-[10px] font-bold transition-colors ${
                                previewSelectedSlot === slot
                                  ? 'bg-teal-50 border border-teal-500 text-teal-700'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Button preview */}
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 opacity-90 cursor-default shadow-xs"
                  >
                    <CalendarClock size={14} />
                    <span>تأكيد حجز الموعد</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-[11px] text-teal-800 space-y-1">
                <span className="font-bold block">💡 تنظيم الحجوزات:</span>
                <p className="leading-relaxed text-teal-700">
                  عند قيام العميل بالحجز، يتم تأكيد الموعد فورياً وحجبه من التقويم لمنع التعارض مع
                  إرسال إشعار فوري لمتجرك وللعميل.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Quick Add Category Modal ─── */}
      {showQuickCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-slate-900">إضافة تصنيف جديد سريع</h3>
            <input
              type="text"
              placeholder="اسم التصنيف..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowQuickCategoryModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleQuickAddCategory}
                className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
