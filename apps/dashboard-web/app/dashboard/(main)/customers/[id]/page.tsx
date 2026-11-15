'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  Pencil,
  Trash2,
  MessageCircle,
  Phone,
  Mail,
  Copy,
  Check,
  Trophy,
  MoreVertical,
  Share2,
  AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { useShop } from '@/hooks/useShop';
import { hasExplicitConfig, isModuleEnabled } from '@/hooks/useModuleGuard';
import EmptyState from '@/components/EmptyState';
import {
  ACTIVITY_META,
  STATUS_META,
  cairoPartsFromIso,
  normPhoneKey,
  normStatus,
  type ActivityType,
  type UnifiedStatus,
} from '@/lib/bookings/ui';
import {
  type ShopCustomer,
  type ActivityRow,
  type CustomerBooking,
  SOURCE_LABELS,
} from '../_customer/meta';
import StatsCards from '../_customer/StatsCards';
import OrdersHistory from '../_customer/OrdersHistory';
import BookingsSection from '../_customer/BookingsSection';
import LoyaltyAdjustModal from '../_customer/LoyaltyAdjustModal';

/* ============================================================
 * صفحة تفاصيل العميل الكاملة — مطابقة لتصميم لوحة التاجر (الصورة 2)
 * ============================================================ */

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { shop } = useShop();
  const shopId = shop?.id || '';
  const customerId = String(params?.id || '');

  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Settings & Toggles
  const [codEnabled, setCodEnabled] = useState(true);
  const [marketingOptIn, setMarketingOptIn] = useState(true);

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Tags adding
  const [newTagInput, setNewTagInput] = useState('');
  const [tagSaving, setTagSaving] = useState(false);

  // Orders tab filter & search
  const [orderTab, setOrderTab] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');

  // Bookings tab — سجل حجوزات العميل (مربوط بالتليفون)
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingTab, setBookingTab] = useState('all');

  // Accordion states
  const [openAccordion, setOpenAccordion] = useState<string | null>('addresses');

  // Loyalty modal
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);

  const loadCustomer = useCallback(async () => {
    if (!shopId || !customerId) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/shops/${shopId}/customers/${customerId}`);
      const data = res?.data ?? res;
      if (!data?.id) {
        setNotFound(true);
        return;
      }
      setCustomer(data);
      setNotesValue(data.notes || '');
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [shopId, customerId]);

  const loadOrders = useCallback(async () => {
    if (!shopId || !customerId) return;
    setActivityLoading(true);
    try {
      const rows = await apiRequest(
        `/shops/${shopId}/customers/${customerId}/activity?type=orders`
      );
      setActivity(Array.isArray(rows) ? rows : []);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, [shopId, customerId]);

  useEffect(() => {
    loadCustomer();
    loadOrders();
  }, [loadCustomer, loadOrders]);

  // ── حجوزات العميل: نجيبها لما يتوفر التليفون والوحدة مفعّلة ──
  // ملاحظة: useModuleGuard fail-open للمتاجر الجديدة — نفس المبدأ هنا:
  // متجر من غير إعداد صريح نشوفله كل حاجة، والمفصول بالاسم بنخفيه.
  const bookingsModuleEnabled = useMemo(
    () =>
      Boolean(shop) &&
      (isModuleEnabled(shop as any, 'bookings') || !hasExplicitConfig(shop as any)),
    [shop]
  );

  const loadBookings = useCallback(async () => {
    if (!shopId || !customer?.phone || !bookingsModuleEnabled) return;
    setBookingsLoading(true);
    try {
      const params = new URLSearchParams({ phone: customer.phone, limit: '100' });
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopId)) {
        params.set('shopId', shopId);
      }
      const res = await apiRequest(`/bookings?${params.toString()}`);
      const list = Array.isArray(res) ? res : res?.data || [];
      const phoneKey = normPhoneKey(customer.phone);
      const rows: CustomerBooking[] = (Array.isArray(list) ? list : [])
        .filter((b: any) => {
          const bk = normPhoneKey(String(b?.customerPhone || ''));
          return !phoneKey || !bk || bk === phoneKey;
        })
        .map((b: any): CustomerBooking => {
          const iso = cairoPartsFromIso(b.startAt || b.createdAt || '');
          const raw = b.startAt || b.createdAt || '';
          const explicit = String(
            b.bookingActivityType || b?.metadata?.bookingActivityType || ''
          ).toLowerCase();
          const activityType = (['clinic', 'hotel', 'table', 'consultation'] as const).includes(
            explicit as any
          )
            ? (explicit as ActivityType)
            : 'general';
          return {
            id: String(b.id || ''),
            bookingNumber: String(b.bookingNumber || ''),
            status: normStatus(b.status),
            activityType,
            serviceName: String(b.serviceName || b.metadata?.itemName || 'حجز'),
            dateStr: iso?.date || String(raw).slice(0, 10) || '—',
            timeStr: iso?.time || String(raw).slice(11, 16) || '—',
            price: Number(b.totalAmount || 0),
            participants: Number(b.participants || 1),
            paymentStatus: String(b.paymentStatus || ''),
          };
        });
      setBookings(rows);
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [shopId, customer?.phone, bookingsModuleEnabled]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // السوق المستهدف مصر — العملة جنيه مصري دائمًا.
  const currency = useMemo(() => 'ج.م', []);

  const toggleArchive = async () => {
    if (!customer) return;
    if (
      !confirm(
        customer.archived
          ? 'هل أنت متأكد من استعادة هذا العميل؟'
          : 'هل أنت متأكد من حذف/أرشفة هذا العميل؟'
      )
    )
      return;
    setArchiving(true);
    try {
      await apiRequest(
        `/shops/${shopId}/customers/${customer.id}/${customer.archived ? 'restore' : 'archive'}`,
        { method: 'POST' }
      );
      router.push('/dashboard/customers');
    } catch {
      alert('حدث خطأ أثناء تنفيذ الإجراء');
    } finally {
      setArchiving(false);
    }
  };

  const saveNotes = async () => {
    if (!customer) return;
    setNotesSaving(true);
    try {
      await apiRequest(`/shops/${shopId}/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: notesValue.trim() }),
      });
      setCustomer((prev) => (prev ? { ...prev, notes: notesValue.trim() } : null));
      setEditingNotes(false);
    } catch {
      alert('فشل حفظ الملاحظات');
    } finally {
      setNotesSaving(false);
    }
  };

  const addTag = async () => {
    if (!newTagInput.trim() || !customer) return;
    const tagToAdd = newTagInput.trim();
    const currentTags = customer.tags || [];
    if (currentTags.includes(tagToAdd)) {
      setNewTagInput('');
      return;
    }
    const updatedTags = [...currentTags, tagToAdd];
    setTagSaving(true);
    try {
      await apiRequest(`/shops/${shopId}/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ tags: updatedTags }),
      });
      setCustomer((prev) => (prev ? { ...prev, tags: updatedTags } : null));
      setNewTagInput('');
    } catch {
      alert('فشل إضافة الوسم');
    } finally {
      setTagSaving(false);
    }
  };

  const removeTag = async (tagToRemove: string) => {
    if (!customer) return;
    const updatedTags = (customer.tags || []).filter((t) => t !== tagToRemove);
    try {
      await apiRequest(`/shops/${shopId}/customers/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ tags: updatedTags }),
      });
      setCustomer((prev) => (prev ? { ...prev, tags: updatedTags } : null));
    } catch {
      alert('فشل حذف الوسم');
    }
  };

  const adjustLoyalty = async () => {
    if (!adjustDelta || !adjustReason.trim()) return;
    setAdjustSaving(true);
    try {
      await apiRequest(`/shops/${shopId}/loyalty/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          delta: adjustDelta,
          reason: adjustReason.trim(),
          staffName: 'الإدارة',
        }),
      });
      setAdjustOpen(false);
      setAdjustDelta(0);
      setAdjustReason('');
      await loadCustomer();
    } catch {
      alert('فشل تعديل النقاط');
    } finally {
      setAdjustSaving(false);
    }
  };

  const copyCustomerInfo = () => {
    if (!customer) return;
    const text = `${customer.name} - ${customer.phone} - ${customer.email || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = useMemo(() => {
    if (!customer?.name) return 'ع';
    const parts = customer.name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    return customer.name.slice(0, 2);
  }, [customer?.name]);

  const filteredOrders = useMemo(() => {
    let list = [...activity];
    if (orderTab !== 'all') {
      list = list.filter((o) => {
        const s = String(o.status || '').toLowerCase();
        if (orderTab === 'new') return s === 'new' || s === 'جديد' || s === 'pending';
        if (orderTab === 'processing') return s === 'processing' || s === 'جاري التجهيز';
        if (orderTab === 'ready') return s === 'ready' || s === 'جاهز';
        if (orderTab === 'delivering')
          return s === 'delivering' || s === 'جاري التوصيل' || s === 'shipped';
        if (orderTab === 'completed')
          return s === 'completed' || s === 'مكتمل' || s === 'delivered';
        if (orderTab === 'cancelled') return s === 'cancelled' || s === 'ملغي';
        if (orderTab === 'refunding') return s === 'refunding' || s === 'قيد الاسترجاع';
        if (orderTab === 'partial_refund') return s === 'partial_refund' || s === 'مسترجع جزئياً';
        return true;
      });
    }
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      list = list.filter((o) => String(o.id).toLowerCase().includes(q));
    }
    return list;
  }, [activity, orderTab, orderSearch]);

  const completedOrdersCount = useMemo(() => {
    return activity.filter(
      (o) => o.status === 'COMPLETED' || o.status === 'DELIVERED' || o.status === 'مكتمل'
    ).length;
  }, [activity]);

  // ── مشتقات تاب الحجوزات ──
  const filteredBookings = useMemo(() => {
    if (bookingTab === 'all') return bookings;
    return bookings.filter((b) => b.status === bookingTab);
  }, [bookings, bookingTab]);

  const bookingsStats = useMemo(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
    const active = bookings.filter((b) => b.status !== 'CANCELLED');
    return {
      total: bookings.length,
      upcoming: active.filter(
        (b) => (b.status === 'PENDING' || b.status === 'CONFIRMED') && b.dateStr >= today
      ).length,
      completed: bookings.filter((b) => b.status === 'COMPLETED').length,
      value: active.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
    };
  }, [bookings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] p-6 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 md:p-12 text-center max-w-md w-full shadow-sm">
          <AlertTriangle size={36} className="mx-auto mb-3 text-amber-500" />
          <h2 className="text-base font-bold text-slate-900 mb-1">العميل غير موجود</h2>
          <p className="text-xs text-slate-400 mb-4">قد يكون تم حذفه أو أن الرابط غير صحيح</p>
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#492770] text-white text-xs font-bold hover:bg-[#3d1f5e] transition-all"
          >
            <ArrowRight size={14} />
            الرجوع لقائمة العملاء
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-full bg-[#F4F5F7] text-slate-900 pb-12"
      style={{ fontFamily: "'Cairo','Tajawal',system-ui,sans-serif" }}
    >
      {/* هيدر الصفحة — سهم الرجوع لقائمة العملاء كالصورة 2 + أزرار التعديل والحذف */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-4 sm:px-6 py-4 max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          {/* الجانب الأيمن: سهم الرجوع الدائري + عنوان تفاصيل العميل */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/customers"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-all shadow-sm"
              title="الرجوع لقائمة العملاء"
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                تفاصيل العميل
              </h1>
            </div>
          </div>

          {/* الجانب الأيسر: زر تعديل التفاصيل بنفسجي + زر حذف + زر خيارات ... كالصورة 2 */}
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/customers/${customer.id}/edit`}
              className="h-9 px-4 sm:px-5 rounded-full bg-[#492770] hover:bg-[#3d1f5e] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Pencil size={13} />
              تعديل التفاصيل
            </Link>

            <button
              onClick={toggleArchive}
              disabled={archiving}
              className="h-9 px-3.5 sm:px-4 rounded-full border border-slate-200 bg-white text-slate-700 hover:text-red-700 hover:border-red-200 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {archiving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              {customer.archived ? 'استعادة' : 'حذف'}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-all"
                title="خيارات إضافية"
              >
                <MoreVertical size={15} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute left-0 top-11 w-48 bg-white border border-slate-200 rounded-2xl shadow-lg p-1.5 z-30 space-y-0.5 text-right">
                    {customer.phone && (
                      <a
                        href={`https://wa.me/2${(customer.phone || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl"
                        onClick={() => setMenuOpen(false)}
                      >
                        <MessageCircle size={14} />
                        مراسلة عبر واتساب
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        copyCustomerInfo();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                    >
                      <Copy size={14} />
                      نسخ بيانات العميل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setAdjustOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                    >
                      <Trophy size={14} />
                      تعديل نقاط الولاء
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* تخطيط الصفحة: عمود جانبي يمين (كارت البروفايل) + المحتوى الأيسر (الإحصائيات وسجل الطلبات) */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ============================================================
           * العمود الأيمن (Sidebar) كالصورة 2: بروفايل، دعوة، وسوم، إعدادات، ملاحظات
           * ============================================================ */}
          <div className="lg:col-span-4 space-y-4">
            {/* كارت بروفايل العميل الرئيسي كالصورة 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-13 h-13 rounded-2xl bg-purple-100/80 text-[#492770] font-black text-lg flex items-center justify-center shadow-inner">
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight">
                      {customer.name}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      عميل منذ {new Date(customer.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>
              </div>

              {/* أزرار الاتصال والمراسلة السريعة كالصورة 2 */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 px-2 text-slate-500">
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    title="اتصال هاتفي"
                  >
                    <Phone size={15} />
                  </a>
                )}
                {customer.phone && (
                  <a
                    href={`https://wa.me/2${(customer.phone || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    title="واتساب"
                  >
                    <MessageCircle size={15} />
                  </a>
                )}
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    title="إرسال بريد"
                  >
                    <Mail size={15} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={copyCustomerInfo}
                  className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors relative"
                  title="نسخ البيانات"
                >
                  {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                </button>
                <button
                  type="button"
                  onClick={toggleArchive}
                  className="p-2 rounded-xl hover:bg-red-50 hover:text-red-700 transition-colors"
                  title="حذف العميل"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* تفاصيل العميل كالصورة 2: الدولة، نوع العميل، الجنس، تاريخ الميلاد، قناة الوصول، آخر تسجيل دخول */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">الدولة</span>
                  <span className="font-bold text-slate-800">
                    {[customer.country, customer.city].filter(Boolean).join('، ') || 'مصر'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">نوع العميل</span>
                  <span className="font-bold text-slate-800">
                    {customer.customerType === 'company' ? customer.companyName || 'شركة' : 'فرد'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">الجنس</span>
                  <span className="font-bold text-slate-800">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">تاريخ الميلاد</span>
                  <span className="font-bold text-slate-800">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">قناة وصول العميل</span>
                  <span className="font-bold text-slate-800">
                    {SOURCE_LABELS[customer.source] || customer.source || 'المتجر الإلكتروني'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">آخر تسجيل دخول</span>
                  <span className="font-bold text-slate-800">
                    {customer.lastPurchaseAt
                      ? new Date(customer.lastPurchaseAt).toLocaleDateString('ar-EG')
                      : 'لا توجد بيانات سابقة'}
                  </span>
                </div>
              </div>
            </div>

            {/* كارت رابط الدعوة كالصورة 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
              <div className="flex items-center justify-between mb-3 text-right">
                <h3 className="text-xs font-bold text-slate-900">رابط الدعوة</h3>
              </div>
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                <Share2 size={20} />
              </div>
              <h4 className="text-xs font-bold text-slate-800 mb-1">برنامج أمنيات شركائك</h4>
              <p className="text-[11px] text-slate-400 font-semibold mb-3">
                شارك رابط العطاء لأصدقائهم ويكسب المكافآت.
              </p>
              <button
                type="button"
                onClick={() => alert('ميزة برنامج الدعوات قيد التفعيل لهذا العميل')}
                className="w-full py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                تفاصيل
              </button>
            </div>

            {/* كارت الوسوم كالصورة 2 مع إمكانية إضافة وسم سريع */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 mb-2">الوسوم</h3>
              <div className="relative mb-2.5">
                <input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="اكتب للبحث أو اضغط Enter لإنشاء وسم جديد..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(customer.tags || []).length === 0 ? (
                  <span className="text-[11px] text-slate-400 font-semibold">
                    لا توجد وسوم مخصصة
                  </span>
                ) : (
                  customer.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="text-slate-400 hover:text-red-600 mr-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* كارت الإعدادات مع مفاتيح التبديل (Toggles) كالصورة 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
              <h3 className="text-xs font-bold text-slate-900 mb-1">الإعدادات</h3>

              {/* سويتش الدفع عند الاستلام */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800">الدفع عند الاستلام</div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">
                    على خيار التاجر عند استلام كود العميل وإمكانية الطلب بالدفع عند الاستلام
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCodEnabled((v) => !v)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                    codEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      codEnabled ? 'translate-x-0' : '-translate-x-5'
                    }`}
                  />
                </button>
              </div>

              {/* سويتش استقبال الرسائل التسويقية */}
              <div className="flex items-start justify-between gap-3 pt-2.5 border-t border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-800">استقبال الرسائل التسويقية</div>
                  <div className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">
                    يستقبل العميل رسائل العروض والمسابقات الدورية
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMarketingOptIn((v) => !v)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                    marketingOptIn ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      marketingOptIn ? 'translate-x-0' : '-translate-x-5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* كارت ملاحظات العميل كالصورة 2 مع إمكانية التعديل */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold text-slate-900">ملاحظات العميل</h3>
                {!editingNotes && (
                  <button
                    type="button"
                    onClick={() => setEditingNotes(true)}
                    className="text-xs font-bold text-[#492770] hover:underline"
                  >
                    تعديل
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mb-2">
                ملاحظات داخلية عن العميل، يطلع عليها فريق العمل فقط.
              </p>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    rows={3}
                    placeholder="اكتب ملاحظة داخلية عن العميل..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingNotes(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={saveNotes}
                      disabled={notesSaving}
                      className="px-3 py-1.5 rounded-lg bg-[#492770] text-white text-xs font-bold hover:bg-[#3d1f5e] flex items-center gap-1"
                    >
                      {notesSaving && <Loader2 size={12} className="animate-spin" />}
                      حفظ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  {customer.notes || 'لا توجد ملاحظات مسجلة بعد.'}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================
           * العمود الأيسر (Main Content) كالصورة 2:
           * 6 كروت إحصائية + السلات المتروكة + سجل الطلبات + الأكورديونات
           * ============================================================ */}
          <div className="lg:col-span-8 space-y-4">
            {/* شبكة البطاقات الست كالصورة 2 */}
            <StatsCards
              customer={customer}
              completedOrdersCount={completedOrdersCount}
              currency={currency}
              onShowAllOrders={() => setOrderTab('all')}
              onOpenWallet={() => setOpenAccordion('wallet')}
              onOpenLoyaltyAdjust={() => setAdjustOpen(true)}
            />

            {/* كارت السلات المتروكة كالصورة 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 mb-2">السلات المتروكة</h3>
              <p className="text-xs text-slate-400 font-semibold py-1">لم يترك أي سلة</p>
            </div>

            {/* قسم سجل الطلبات كالصورة 2 */}
            <OrdersHistory
              orderTab={orderTab}
              onOrderTabChange={setOrderTab}
              orderSearch={orderSearch}
              onOrderSearchChange={setOrderSearch}
              loading={activityLoading}
              orders={filteredOrders}
              currency={currency}
              onNewOrder={() => router.push(`/dashboard/orders/new?customerId=${customer.id}`)}
            />

            {/* ============================================================
             * سجل حجوزات العميل — يظهر فقط لو وحدة الحجوزات مفعّلة
             * والعميل له رقم موبايل (الحجوزات مربوطة بالتليفون)
             * ============================================================ */}
            {bookingsModuleEnabled && customer.phone && (
              <BookingsSection
                stats={bookingsStats}
                currency={currency}
                bookingTab={bookingTab}
                onBookingTabChange={setBookingTab}
                loading={bookingsLoading}
                bookings={filteredBookings}
              />
            )}

            {/* الأكورديونات السفلية القابلة للفتح والطي كالصورة 2 */}
            <div className="space-y-2">
              {/* 1. العناوين */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenAccordion((v) => (v === 'addresses' ? null : 'addresses'))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="text-xs font-bold text-slate-900">العناوين</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      openAccordion === 'addresses' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'addresses' && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 text-xs space-y-3">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 mb-1">
                        العنوان الأساسي:
                      </div>
                      <div className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {[customer.address, customer.city, customer.country]
                          .filter(Boolean)
                          .join('، ') || 'لم يتم تسجيل عنوان أساسي'}
                      </div>
                    </div>
                    {customer.shippingAddresses && customer.shippingAddresses.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1">
                          عناوين الشحن الإضافية:
                        </div>
                        <div className="space-y-1.5">
                          {customer.shippingAddresses.map((sa, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between"
                            >
                              <span className="font-bold text-slate-800">
                                {sa.label || `عنوان ${idx + 1}`}: {sa.address} - {sa.city}
                              </span>
                              <span className="text-slate-400 tabular-nums">{sa.phone}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. المحفظة */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenAccordion((v) => (v === 'wallet' ? null : 'wallet'))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="text-xs font-bold text-slate-900">المحفظة</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      openAccordion === 'wallet' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'wallet' && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 text-xs">
                    <p className="text-slate-500 font-semibold py-2">
                      الرصيد المتاح في المحفظة:{' '}
                      <span className="font-bold text-slate-900">
                        {customer.balanceDue < 0
                          ? Math.abs(customer.balanceDue).toLocaleString()
                          : 0}{' '}
                        {currency}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* 3. نقاط الولاء */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenAccordion((v) => (v === 'loyalty' ? null : 'loyalty'))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="text-xs font-bold text-slate-900">نقاط الولاء</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      openAccordion === 'loyalty' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'loyalty' && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 text-xs flex items-center justify-between">
                    <span className="text-slate-600 font-semibold">
                      إجمالي رصيد النقاط:{' '}
                      <strong className="text-slate-900 tabular-nums">
                        {customer.loyaltyBalance}
                      </strong>{' '}
                      نقطة
                    </span>
                    <button
                      type="button"
                      onClick={() => setAdjustOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-[#492770] text-white text-[11px] font-bold hover:bg-[#3d1f5e]"
                    >
                      تعديل الرصيد
                    </button>
                  </div>
                )}
              </div>

              {/* 4. برنامج الدعوات */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenAccordion((v) => (v === 'referral' ? null : 'referral'))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="text-xs font-bold text-slate-900">برنامج الدعوات</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      openAccordion === 'referral' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'referral' && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 text-xs text-slate-500 font-semibold py-2">
                    العميل مؤهل لدعوة أصدقائه والحصول على مكافآت الشراء المشتركة.
                  </div>
                )}
              </div>

              {/* 5. قائمة الأمنيات */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenAccordion((v) => (v === 'wishlist' ? null : 'wishlist'))}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                >
                  <span className="text-xs font-bold text-slate-900">قائمة الأمنيات</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${
                      openAccordion === 'wishlist' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'wishlist' && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100 text-xs text-slate-500 font-semibold py-2">
                    لم يقم العميل بإضافة منتجات إلى قائمة الأمنيات بعد.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* نافذة تعديل نقاط الولاء */}
      {adjustOpen && (
        <LoyaltyAdjustModal
          delta={adjustDelta}
          onDeltaChange={setAdjustDelta}
          reason={adjustReason}
          onReasonChange={setAdjustReason}
          saving={adjustSaving}
          onConfirm={adjustLoyalty}
          onClose={() => setAdjustOpen(false)}
        />
      )}
    </div>
  );
}
