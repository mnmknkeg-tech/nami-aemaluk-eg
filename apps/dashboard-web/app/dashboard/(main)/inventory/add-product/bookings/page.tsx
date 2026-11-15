'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/auth';
import ExtendedProductSections, {
  defaultExtraData,
  ProductExtraData,
} from '@/components/products/ExtendedProductSections';
import { DaySchedule, BookingSettings, DEFAULT_DAYS } from '../_bookings/types';
import PageHeader from '../_bookings/PageHeader';
import PromoBanner from '../_bookings/PromoBanner';
import BasicInfoCard from '../_bookings/BasicInfoCard';
import SchedulingCard from '../_bookings/SchedulingCard';
import BookingLivePreview from '../_bookings/BookingLivePreview';
import QuickCategoryModal from '../_bookings/QuickCategoryModal';

import { compressForUpload } from '@/lib/upload-image';
import { uploadMediaFile } from '@/lib/api/upload';
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
        const finalUploadedUrl = await uploadMediaFile(imageFile, shopId);
        finalImageUrl = finalUploadedUrl || imageUrl;
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
      <PageHeader
        editId={editId}
        saving={saving}
        onSave={handleSave}
        onBack={() => router.push('/dashboard/inventory/add-product')}
        onCancel={() => router.push('/dashboard/inventory/products')}
      />

      {/* ─── Main Content ─── */}
      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 py-6">
        {/* Banner */}
        <PromoBanner />

        {/* Two Columns: Form (Right/Main) + Sticky Preview (Left) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── Column 1: Form (lg:col-span-8) ─── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Basic Info */}
            <BasicInfoCard
              isActive={isActive}
              onIsActiveChange={setIsActive}
              fileInputRef={fileInputRef}
              imageUrl={imageUrl}
              onImageUpload={handleImageUpload}
              youtubeUrl={youtubeUrl}
              onYoutubeUrlChange={setYoutubeUrl}
              name={name}
              onNameChange={setName}
              price={price}
              onPriceChange={setPrice}
              costPrice={costPrice}
              onCostPriceChange={setCostPrice}
              category={category}
              onCategoryChange={setCategory}
              categories={categories}
              onQuickCategory={() => setShowQuickCategoryModal(true)}
              brand={brand}
              onBrandChange={setBrand}
              googleCategory={googleCategory}
              onGoogleCategoryChange={setGoogleCategory}
              localCategory={localCategory}
              onLocalCategoryChange={setLocalCategory}
              description={description}
              onDescriptionChange={setDescription}
            />

            {/* Card 2: Booking Scheduling Settings (خاص بالحجوزات) */}
            <SchedulingCard
              scheduleType={scheduleType}
              onScheduleTypeChange={setScheduleType}
              slotDurationMinutes={slotDurationMinutes}
              onSlotDurationChange={setSlotDurationMinutes}
              capacityPerSlot={capacityPerSlot}
              onCapacityChange={setCapacityPerSlot}
              allowMultipleBookings={allowMultipleBookings}
              onAllowMultipleChange={setAllowMultipleBookings}
              maxBookingsPerCustomer={maxBookingsPerCustomer}
              onMaxBookingsChange={setMaxBookingsPerCustomer}
              leadTimeValue={leadTimeValue}
              onLeadTimeValueChange={setLeadTimeValue}
              leadTimeUnit={leadTimeUnit}
              onLeadTimeUnitChange={setLeadTimeUnit}
              locationType={locationType}
              onLocationTypeChange={setLocationType}
              locationAddress={locationAddress}
              onLocationAddressChange={setLocationAddress}
              workingDays={workingDays}
              onToggleDay={handleToggleDay}
              onUpdateTime={handleUpdateTime}
              exceptions={exceptions}
              newExceptionDate={newExceptionDate}
              onNewExceptionDateChange={setNewExceptionDate}
              onAddException={handleAddException}
              onRemoveException={handleRemoveException}
            />

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
          <BookingLivePreview
            imageUrl={imageUrl}
            name={name}
            category={category}
            brand={brand}
            price={price}
            discountPrice={extraData.discountPrice}
            slotDurationMinutes={slotDurationMinutes}
            locationType={locationType}
            workingDays={workingDays}
            scheduleType={scheduleType}
            previewSlots={previewSlots}
            previewSelectedDay={previewSelectedDay}
            onPreviewDayChange={setPreviewSelectedDay}
            previewSelectedSlot={previewSelectedSlot}
            onPreviewSlotChange={setPreviewSelectedSlot}
          />
        </div>
      </main>

      {/* ─── Quick Add Category Modal ─── */}
      {showQuickCategoryModal && (
        <QuickCategoryModal
          value={newCategoryName}
          onValueChange={setNewCategoryName}
          onClose={() => setShowQuickCategoryModal(false)}
          onAdd={handleQuickAddCategory}
        />
      )}
    </div>
  );
}
