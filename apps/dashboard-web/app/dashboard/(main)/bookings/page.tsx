'use client';

import React, { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  DollarSign,
  Phone,
  MessageCircle,
  Stethoscope,
  BedDouble,
  Utensils,
  Briefcase,
  Filter,
  Search,
  X,
  Loader2,
  Info,
  AlertCircle,
  Settings,
  Check,
  Eye,
  ExternalLink,
  Sparkles,
  Printer,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
// date-fns — مرجع دقيق لعمليات التاريخ (تنسيق/تفكيك/بداية الأسبوع) بدل الحساب اليدوي
import { format as dfFormat, parse as dfParse, startOfWeek as dfStartOfWeek } from 'date-fns';
import { apiRequest } from '@/lib/auth';
import { useModuleGuard } from '@/hooks/useModuleGuard';
import { addBookingViaBackend, updateBookingStatusViaBackend } from '@/lib/api/bookings';
import { BookingSettings } from '@/components/bookings/BookingSettings';
import { readShopBookingConfig, type ShopBookingConfig } from '@ray-eg/shared/booking';
import {
  ACTIVITY_META,
  ACTIVITY_ORDER,
  STATUS_META,
  cairoPartsFromIso,
  normPhoneKey,
  normStatus,
  type ActivityType,
  type UnifiedStatus,
} from '@/lib/bookings/ui';

/* ============================================================
 * Types & Constants
 * ============================================================ */

type ViewMode = 'month' | 'week' | 'day' | 'year' | 'table' | 'agenda';

type BookingItem = {
  id: string;
  source: 'website' | 'internal';
  status: UnifiedStatus;
  activityType: ActivityType;
  itemName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  when: string; // ISO or YYYY-MM-DDTHH:mm
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  price: number;
  participants: number;
  paymentStatus?: string;
  notes?: string;
  /** ترتيب طابور الانتظار (0 = عادي مش كوتة) */
  queuePosition?: number;
  /** الطبيب المعيّن من metadata */
  doctorName?: string;
  raw?: any;
};

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const WEEK_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inferActivityType(raw: any): ActivityType {
  const t = String(
    raw?.bookingActivityType || raw?.metadata?.bookingActivityType || raw?.type || ''
  ).toLowerCase();
  const name = String(raw?.itemName || raw?.serviceName || '').toLowerCase();
  if (
    t.includes('clinic') ||
    name.includes('عيادة') ||
    name.includes('دكتور') ||
    name.includes('كشف') ||
    name.includes('طبيب')
  )
    return 'clinic';
  if (
    t.includes('hotel') ||
    t.includes('boarding') ||
    name.includes('فندق') ||
    name.includes('إيواء') ||
    name.includes('استضافة')
  )
    return 'hotel';
  if (
    t.includes('table') ||
    t.includes('restaurant') ||
    name.includes('طاولة') ||
    name.includes('مطعم') ||
    name.includes('عشاء') ||
    name.includes('غداء')
  )
    return 'table';
  if (t.includes('consult') || name.includes('استشارة') || name.includes('جلسة'))
    return 'consultation';
  return 'general';
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDateKey(d: Date): string {
  return dfFormat(d, 'yyyy-MM-dd');
}

function parseDateKey(s: string): Date {
  return dfParse(s, 'yyyy-MM-dd', new Date());
}

function timeToMinutes(t: string): number {
  const [h, m] = String(t || '').split(':');
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

function minutesToTime(min: number): string {
  const m = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 16:20 → «4:20 م» — نفس شكل الأوقات في المرجع */
function fmtTime12(hhmm: string): string {
  const min = timeToMinutes(hhmm);
  const h24 = Math.floor(min / 60);
  const h = h24 % 12 || 12;
  return `${h}:${String(min % 60).padStart(2, '0')} ${h24 < 12 ? 'ص' : 'م'}`;
}

function paymentLabel(ps?: string): string {
  const v = String(ps || '').trim();
  if (!v) return '';
  const u = v.toUpperCase();
  if (u === 'PAID') return 'مدفوع';
  if (u === 'UNPAID') return 'غير مدفوع';
  if (u.includes('DEPOSIT')) return 'عربون محجوز';
  return v;
}

/* ============================================================
 * عملاء الحجوزات → صفحة العملاء (من الموقع أو اليدوي)
 * كل عميل في أي حجز بيتأكد إن له سجل في /shops/{id}/customers —
 * الباكند بيعمل upsert بالتليفون فمفيش تكرار، وعلامة session-level
 * هنا بتمنع إعادة الإرسال لنفس العميل كل ما القايمة تعمل refresh.
 * ============================================================ */

const syncedCustomerKeys = new Set<string>();
let bookingCustomersCache: { at: number; phones: Set<string>; names: Set<string> } | null = null;

function normNameKey(n: string): string {
  return String(n || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

async function ensureBookingCustomers(shopId: string, items: BookingItem[]): Promise<void> {
  if (!shopId) return;
  const candidates = new Map<string, { name: string; phone: string; src: string }>();
  for (const b of items) {
    const name = (b.customerName || '').trim();
    if (!name || name === 'عميل') continue;
    const phone = (b.customerPhone || '').trim();
    const key = phone ? `p:${normPhoneKey(phone)}` : `n:${normNameKey(name)}`;
    if (syncedCustomerKeys.has(key) || candidates.has(key)) continue;
    candidates.set(key, { name, phone, src: b.source });
  }
  if (candidates.size === 0) return;

  try {
    if (!bookingCustomersCache || Date.now() - bookingCustomersCache.at > 5 * 60000) {
      const res = await apiRequest<any>(`/shops/${shopId}/customers?limit=500`);
      const list = Array.isArray(res)
        ? res
        : res?.data?.customers || res?.data || res?.customers || [];
      const phones = new Set<string>();
      const names = new Set<string>();
      (Array.isArray(list) ? list : []).forEach((c: any) => {
        if (c?.phone) phones.add(normPhoneKey(String(c.phone)));
        if (c?.name) names.add(normNameKey(String(c.name)));
      });
      bookingCustomersCache = { at: Date.now(), phones, names };
    }

    for (const [key, c] of candidates) {
      // نعلّم قبل الإرسال — فشل الرابط مش هيعيد المحاولة كل refresh
      syncedCustomerKeys.add(key);
      const exists = c.phone
        ? bookingCustomersCache.phones.has(normPhoneKey(c.phone))
        : bookingCustomersCache.names.has(normNameKey(c.name));
      if (exists) continue;
      apiRequest(`/shops/${shopId}/customers`, {
        method: 'POST',
        body: JSON.stringify({
          name: c.name,
          ...(c.phone ? { phone: c.phone } : {}),
          source: 'bookings',
          notes:
            c.src === 'website' ? 'اتضاف تلقائيًا من حجز على الموقع' : 'اتضاف تلقائيًا من حجز يدوي',
        }),
      })
        .then((res: any) => {
          // الباكند ممكن يرجّع عميل موجود بدل الإنشاء (upsert بالتليفون)
          if (res?.raw?.created !== false && c.phone) {
            bookingCustomersCache?.phones.add(normPhoneKey(c.phone));
          }
        })
        .catch(() => {});
    }
  } catch {}
}

/* ============================================================
 * Main Page Component
 * ============================================================ */

function BookingsMainContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  // Guard: redirect to /dashboard if bookings module is not enabled for this merchant
  const { allowed } = useModuleGuard('bookings');

  // Mode: if ?tab=settings show settings, otherwise calendar schedule
  const isSettingsTab = tabParam === 'settings';

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modals & Selections
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string>('');
  const [modalInitialTime, setModalInitialTime] = useState<string>('');
  // The merchant's own shop id, resolved from /shops/me — the manual
  // booking modal sends it so the backend never has to guess.
  const [myShopId, setMyShopId] = useState<string>('');

  // Agenda Filter
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaStatusFilter, setAgendaStatusFilter] = useState('all');
  const [agendaTypeFilter, setAgendaTypeFilter] = useState('all');

  // تخصيص الأنشطة — إعدادات التاجر من layoutConfig.booking.activityTypes
  const [bookingConfig, setBookingConfig] = useState<ShopBookingConfig>({});
  // اسم المتجر — يظهر في رأس فاتورة الحجز المطبوعة
  const [shopName, setShopName] = useState('');

  // الأنشطة المفعّلة: فاضي = كل الأنشطة، وغير كده الأنشطة المختارة فقط
  // (بتفصل الأجندة ونموذج الإضافة حسب نشاط التاجر)
  const enabledActivities = useMemo<ActivityType[]>(() => {
    const set = new Set(bookingConfig.activityTypes || []);
    const picked = ACTIVITY_ORDER.filter((t) => set.has(t));
    return picked.length > 0 ? picked : [...ACTIVITY_ORDER];
  }, [bookingConfig]);

  // لو النشاط المفلتر عليه بقى غير مفعّل من التخصيص نرجّع لـ "الكل"
  useEffect(() => {
    if (
      agendaTypeFilter !== 'all' &&
      !enabledActivities.includes(agendaTypeFilter as ActivityType)
    ) {
      setAgendaTypeFilter('all');
    }
  }, [enabledActivities, agendaTypeFilter]);

  // Load bookings from API
  const loadBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      let shopId = '';
      try {
        const shop = await apiRequest('/shops/me');
        shopId = shop?.id;
        // نحتفظ بإعدادات الحجز (تخصيص الأنشطة) واسم المتجر من نفس الاستجابة
        setBookingConfig(readShopBookingConfig(shop));
        setShopName(String(shop?.name || shop?.title || ''));
      } catch {}
      if (shopId) setMyShopId(String(shopId));

      const paramsB = new URLSearchParams({ limit: '150' });
      const paramsR = new URLSearchParams({ limit: '150' });
      if (shopId && UUID_RE.test(String(shopId))) paramsR.set('shopId', String(shopId));

      const [webRes, intRes] = await Promise.allSettled([
        apiRequest(`/bookings?${paramsB.toString()}`),
        apiRequest(`/reservations?${paramsR.toString()}`),
      ]);

      const pickList = (v: any): any[] => {
        const d = v?.data !== undefined ? v.data : v;
        if (Array.isArray(d)) return d;
        return d?.reservations || d?.bookings || d?.items || [];
      };

      const webList = webRes.status === 'fulfilled' ? pickList(webRes.value) : [];
      const intList = intRes.status === 'fulfilled' ? pickList(intRes.value) : [];

      const list: BookingItem[] = [
        ...webList.map((b: any): BookingItem => {
          const isoCairo = cairoPartsFromIso(b.startAt || b.createdAt || '');
          const rawDate =
            b.bookingDate ||
            isoCairo?.date ||
            (b.startAt ? b.startAt.slice(0, 10) : '') ||
            formatDateKey(new Date());
          const rawTime =
            b.bookingTime || isoCairo?.time || (b.startAt ? b.startAt.slice(11, 16) : '10:00');
          const whenIso = b.startAt || `${rawDate}T${rawTime}:00`;
          return {
            id: `web-${b.id}`,
            source: 'website',
            status: normStatus(b.status),
            activityType: inferActivityType(b),
            itemName: b.itemName || b.serviceName || 'حجز خدمة',
            customerName: b.customerName || 'عميل',
            customerPhone: b.customerPhone || '',
            customerEmail: b.customerEmail || '',
            when: whenIso,
            dateStr: rawDate,
            timeStr: rawTime,
            price: Number(b.totalAmount || b.itemPrice || 0),
            participants: Number(b.participants || 1),
            paymentStatus: b.paymentStatus || '',
            notes: b.notes || '',
            queuePosition: Number(b.queuePosition ?? b?.metadata?.queuePosition ?? 0),
            doctorName: String(b?.metadata?.doctorName || ''),
            raw: b,
          };
        }),
        ...intList.map((r: any): BookingItem => {
          // startTime بتوصل UTC من الباكند — بنحولها لتوقيت القاهرة بدل slice الخام
          const isoCairo = cairoPartsFromIso(r.startTime || '');
          const rawDate =
            isoCairo?.date ||
            r.reservationDate ||
            (r.startTime ? r.startTime.slice(0, 10) : '') ||
            formatDateKey(new Date());
          const rawTime =
            isoCairo?.time ||
            (r.startTime && r.startTime.length >= 16 ? r.startTime.slice(11, 16) : '10:00');
          const whenIso = r.startTime || `${rawDate}T${rawTime}:00`;
          return {
            id: `int-${r.id}`,
            source: 'internal',
            status: normStatus(r.status),
            activityType: inferActivityType(r),
            itemName: r.itemName || 'حجز داخلي',
            customerName: r.customerName || 'عميل',
            customerPhone: r.customerPhone || '',
            customerEmail: r.customerEmail || '',
            when: whenIso,
            dateStr: rawDate,
            timeStr: rawTime,
            price: Number(r.itemPrice || 0),
            participants: Number(r.guests || r.participants || 1),
            paymentStatus: r.paymentStatus || '',
            notes: r.notes || '',
            raw: r,
          };
        }),
      ];

      setBookings(list);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل بيانات الحجوزات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Navigate dates
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      else if (viewMode === 'week') d.setDate(d.getDate() - 7);
      else if (viewMode === 'day') d.setDate(d.getDate() - 1);
      else if (viewMode === 'year') d.setFullYear(d.getFullYear() - 1);
      else d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      else if (viewMode === 'week') d.setDate(d.getDate() + 7);
      else if (viewMode === 'day') d.setDate(d.getDate() + 1);
      else if (viewMode === 'year') d.setFullYear(d.getFullYear() + 1);
      else d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const openAddModal = (dateStr?: string, timeStr?: string) => {
    setModalInitialDate(dateStr || formatDateKey(currentDate));
    setModalInitialTime(timeStr || '');
    setIsAddModalOpen(true);
  };

  // عملاء الحجوزات (من الموقع أو اليدوي) بيتحولوا لصفحة العملاء تلقائيًا
  useEffect(() => {
    if (myShopId && bookings.length > 0) {
      void ensureBookingCustomers(myShopId, bookings);
    }
  }, [myShopId, bookings]);

  // Status Updater
  const handleUpdateStatus = async (item: BookingItem, newStatus: UnifiedStatus) => {
    try {
      // نمرّر الـ id كامل بالبادئة (int-/web-) — updateBookingStatusViaBackend
      // بترتّب على المسار الصحيح حسب البادئة.
      await updateBookingStatusViaBackend(item.id, newStatus);
      setBookings((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: newStatus } : x)));
      if (selectedBooking && selectedBooking.id === item.id) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
    } catch (e: any) {
      alert(e?.message || 'فشل تحديث الحالة');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Type',
      'Service',
      'Customer',
      'Phone',
      'Date',
      'Time',
      'Price',
      'Status',
    ];
    const rows = bookings.map((b) => [
      b.id,
      ACTIVITY_META[b.activityType].label,
      b.itemName,
      b.customerName,
      b.customerPhone,
      b.dateStr,
      b.timeStr,
      b.price,
      STATUS_META[b.status].label,
    ]);
    void import('@/lib/export').then(({ buildExportBlob, downloadBlob }) => {
      const blob = buildExportBlob(
        { filename: `bookings-${formatDateKey(new Date())}.csv`, headers, rows: [...rows] },
        'csv'
      );
      downloadBlob(blob, `bookings-${formatDateKey(new Date())}.csv`);
    });
  };

  // Guard checking: while checking show spinner, if forbidden return null (redirect in flight)
  if (allowed === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (allowed === false) {
    return null;
  }

  // If ?tab=settings, render settings directly
  if (isSettingsTab) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Settings size={20} />
            إعدادات الحجوزات
          </h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard/bookings')}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            العودة للتقويم
          </button>
        </div>
        <BookingSettings />
      </div>
    );
  }

  // Month Title e.g. "سبتمبر 2026" — يتغير حسب العرض (سنة / جدول)
  const monthTitle =
    viewMode === 'year'
      ? String(currentDate.getFullYear())
      : viewMode === 'table'
        ? `كل الحجوزات (${bookings.length})`
        : `${ARABIC_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  // طابور اليوم — حجوزات الموقع بالانتظار (كوتة) النهاردة، مرتبين بالترتيب.
  // حساب عادي مش useMemo: بنكون بعد الـ early returns فقواعد الـ hooks مبتسمحش.
  const queueItems = bookings
    .filter(
      (b) =>
        b.source === 'website' &&
        (b.queuePosition ?? 0) > 0 &&
        b.dateStr === formatDateKey(new Date()) &&
        (b.status === 'PENDING' || b.status === 'CONFIRMED')
    )
    .sort((a, b) => (a.queuePosition ?? 999) - (b.queuePosition ?? 999));

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-[1600px] mx-auto select-none" dir="rtl">
      {/* ===== Header Bar (مواعيد الحجوزات) ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <CalendarDays size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
              مواعيد الحجوزات
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              جدول الحجوزات والمواعيد الشامل (عيادات، فندقة، طاولات، وخدمات)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadBookings(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
            title="تحديث"
          >
            <Loader2 size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} />
            <span className="hidden sm:inline">تصدير</span>
          </button>
          <button
            type="button"
            onClick={() => openAddModal()}
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>إضافة حجز يدوي</span>
          </button>
        </div>
      </div>

      {/* ===== طابور اليوم (الحجز بالانتظار) ===== */}
      {queueItems.length > 0 && (
        <QueueTodayPanel
          items={queueItems}
          onStatusChange={async (id, status) => {
            try {
              await updateBookingStatusViaBackend(id, status);
              await loadBookings(true);
            } catch {}
          }}
        />
      )}

      {/* ===== Controls Bar (المطابق للصورة) ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: View Switcher (شهر، أسبوع، يوم، أجندة) */}
        <div className="inline-flex items-center bg-[#1e293b] rounded-lg p-1 text-xs font-bold text-slate-300 w-full md:w-auto justify-center">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-4 py-1.5 rounded-md transition-all ${
              viewMode === 'month' ? 'bg-[#0f172a] text-white shadow-sm' : 'hover:text-white'
            }`}
          >
            شهر
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-4 py-1.5 rounded-md transition-all ${
              viewMode === 'week' ? 'bg-[#0f172a] text-white shadow-sm' : 'hover:text-white'
            }`}
          >
            أسبوع
          </button>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-4 py-1.5 rounded-md transition-all ${
              viewMode === 'day' ? 'bg-[#0f172a] text-white shadow-sm' : 'hover:text-white'
            }`}
          >
            يوم
          </button>
          <button
            type="button"
            onClick={() => setViewMode('year')}
            className={`px-4 py-1.5 rounded-md transition-all ${
              viewMode === 'year' ? 'bg-[#0f172a] text-white shadow-sm' : 'hover:text-white'
            }`}
          >
            سنة
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-4 py-1.5 rounded-md transition-all ${
              viewMode === 'table' ? 'bg-[#0f172a] text-white shadow-sm' : 'hover:text-white'
            }`}
          >
            جدول
          </button>
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={`px-4 py-1.5 rounded-md transition-all ${
              viewMode === 'agenda' ? 'bg-[#0f172a] text-white shadow-sm' : 'hover:text-white'
            }`}
          >
            أجندة
          </button>
        </div>

        {/* Center: Month and Year (e.g. سبتمبر 2026) */}
        <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight order-first md:order-none">
          {monthTitle}
        </div>

        {/* Right: Navigation Controls (اليوم + الأسهم) */}
        <div className="flex items-center gap-1.5 w-full md:w-auto justify-center">
          <button
            type="button"
            onClick={handleToday}
            className="h-8 px-4 rounded-md bg-[#64748b] hover:bg-[#475569] text-white text-xs font-bold transition-colors shadow-sm"
          >
            اليوم
          </button>
          <div className="flex items-center bg-[#1e293b] rounded-md p-0.5">
            <button
              type="button"
              onClick={handleNext}
              className="h-7 w-7 flex items-center justify-center text-slate-200 hover:text-white transition-colors"
              title="التالي"
            >
              <ChevronRight size={16} />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-600 my-auto" />
            <button
              type="button"
              onClick={handlePrev}
              className="h-7 w-7 flex items-center justify-center text-slate-200 hover:text-white transition-colors"
              title="السابق"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Calendar Body ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-500">جاري تحميل جدول المواعيد...</p>
          </div>
        ) : viewMode === 'month' ? (
          <MonthCalendarView
            currentDate={currentDate}
            bookings={bookings}
            onSelectBooking={(b) => setSelectedBooking(b)}
            onDayClick={(dateStr) => openAddModal(dateStr)}
          />
        ) : viewMode === 'week' ? (
          <WeekCalendarView
            currentDate={currentDate}
            bookings={bookings}
            onSelectBooking={(b) => setSelectedBooking(b)}
            onSlotClick={(dateStr, timeStr) => openAddModal(dateStr, timeStr)}
          />
        ) : viewMode === 'day' ? (
          <DayCalendarView
            currentDate={currentDate}
            bookings={bookings}
            onSelectBooking={(b) => setSelectedBooking(b)}
            onSlotClick={(dateStr, timeStr) => openAddModal(dateStr, timeStr)}
            onAddBooking={() => openAddModal(formatDateKey(currentDate))}
          />
        ) : viewMode === 'year' ? (
          <YearCalendarView
            currentDate={currentDate}
            bookings={bookings}
            onDayClick={(dateStr) => {
              setCurrentDate(parseDateKey(dateStr));
              setViewMode('day');
            }}
          />
        ) : viewMode === 'table' ? (
          <BookingsTableView
            bookings={bookings}
            typeOptions={enabledActivities}
            onSelectBooking={(b) => setSelectedBooking(b)}
            onPrint={(b) => printBookingInvoice(b, shopName)}
          />
        ) : (
          <AgendaView
            bookings={bookings}
            search={agendaSearch}
            setSearch={setAgendaSearch}
            statusFilter={agendaStatusFilter}
            setStatusFilter={setAgendaStatusFilter}
            typeFilter={agendaTypeFilter}
            setTypeFilter={setAgendaTypeFilter}
            typeOptions={enabledActivities}
            onSelectBooking={(b) => setSelectedBooking(b)}
          />
        )}
      </div>

      {/* ===== Modals ===== */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          shopName={shopName}
          onClose={() => setSelectedBooking(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {isAddModalOpen && (
        <AddBookingModal
          initialDate={modalInitialDate}
          initialTime={modalInitialTime}
          shopId={myShopId}
          enabledActivities={enabledActivities}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(newB) => {
            setBookings((prev) => [newB, ...prev]);
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
 * Month View Component (المطابق تمامًا للصورة المرفقة)
 * ============================================================ */

function MonthCalendarView({
  currentDate,
  bookings,
  onSelectBooking,
  onDayClick,
}: {
  currentDate: Date;
  bookings: BookingItem[];
  onSelectBooking: (b: BookingItem) => void;
  onDayClick: (dateStr: string) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate calendar grid:
  // Saturday is index 0 in our RTL grid
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayWeekday = (firstDayOfMonth.getDay() + 1) % 7; // 0 = Saturday, 6 = Friday

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Prepare 6 rows of 7 days = 42 days total
  const gridCells: Array<{
    dayNumber: number;
    monthType: 'prev' | 'current' | 'next';
    fullDate: Date;
    dateStr: string;
    weekNumber: number;
  }> = [];

  // Previous month trailing days
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(year, month - 1, day);
    gridCells.push({
      dayNumber: day,
      monthType: 'prev',
      fullDate: d,
      dateStr: formatDateKey(d),
      weekNumber: getWeekNumber(d),
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    gridCells.push({
      dayNumber: day,
      monthType: 'current',
      fullDate: d,
      dateStr: formatDateKey(d),
      weekNumber: getWeekNumber(d),
    });
  }

  // Next month leading days (to fill 5 or 6 weeks)
  const remaining = 42 - gridCells.length;
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day);
    gridCells.push({
      dayNumber: day,
      monthType: 'next',
      fullDate: d,
      dateStr: formatDateKey(d),
      weekNumber: getWeekNumber(d),
    });
  }

  // Split into 6 rows
  const weeks: (typeof gridCells)[] = [];
  for (let i = 0; i < 42; i += 7) {
    weeks.push(gridCells.slice(i, i + 7));
  }

  // Group bookings by date string
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingItem[]>();
    bookings.forEach((b) => {
      const arr = map.get(b.dateStr) || [];
      arr.push(b);
      map.set(b.dateStr, arr);
    });
    return map;
  }, [bookings]);

  const todayStr = formatDateKey(new Date());

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        {/* Table Header: السبت إلى الجمعة */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-extrabold text-slate-700 py-3">
          {WEEK_DAYS.map((name) => (
            <div key={name}>{name}</div>
          ))}
        </div>

        {/* Table Body: 6 rows */}
        <div className="divide-y divide-slate-200">
          {weeks.map((week, wIdx) => {
            const rowWeekNum = week[0].weekNumber;
            return (
              <div
                key={wIdx}
                className="grid grid-cols-7 divide-x divide-x-reverse divide-slate-200 min-h-[110px] sm:min-h-[125px]"
              >
                {week.map((cell, cIdx) => {
                  const dayBookings = bookingsByDate.get(cell.dateStr) || [];
                  const isToday = cell.dateStr === todayStr;
                  const isHighlighted =
                    isToday || (cell.monthType === 'current' && cell.dayNumber === 16); // exact yellow tint like screenshot

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => onDayClick(cell.dateStr)}
                      className={`relative p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                        cell.monthType !== 'current'
                          ? 'bg-slate-50/40 text-slate-300'
                          : isHighlighted
                            ? 'bg-[#FEF9C3]/80 hover:bg-[#FEF9C3]' // Exact warm amber/yellow highlight as in screenshot
                            : 'bg-white hover:bg-slate-50/60 text-slate-800'
                      }`}
                    >
                      {/* Cell Header: Day number + Week label (only on first cell of row or Saturday) */}
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-xs font-extrabold tabular-nums ${
                            cell.monthType !== 'current'
                              ? 'text-slate-400'
                              : isToday
                                ? 'text-slate-900 font-black'
                                : 'text-slate-700'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Week Label (36 أسبوع) shown on the Saturday cell (first cell in RTL row) like screenshot */}
                        {cIdx === 0 && (
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                            {rowWeekNum} أسبوع
                          </span>
                        )}
                      </div>

                      {/* Booking Pills / Events */}
                      <div className="mt-1 space-y-1 flex-1 overflow-y-auto max-h-[75px] scrollbar-none">
                        {dayBookings.slice(0, 3).map((b) => {
                          const act = ACTIVITY_META[b.activityType];
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectBooking(b);
                              }}
                              className={`w-full text-right px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center gap-1 border transition-transform hover:scale-[1.02] ${act.chip}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${act.dot}`} />
                              <span className="truncate">{b.itemName}</span>
                              <span className="text-[9px] text-slate-500 mr-auto shrink-0 tabular-nums">
                                {b.timeStr}
                              </span>
                            </button>
                          );
                        })}
                        {dayBookings.length > 3 && (
                          <div className="text-[10px] font-bold text-slate-500 text-center">
                            +{dayBookings.length - 3} أخرى
                          </div>
                        )}
                      </div>

                      {/* Quick Add icon on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-400 flex items-center justify-end">
                        <Plus size={12} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * TimeGrid — شبكة المواعيد (اليوم/الأسبوع)
 * صفحة مسطّرة: خط كل ربع ساعة في عرض اليوم، خط أسود يحاكي الوقت
 * اللحظي ويتحدّث كل 30 ثانية، والضغط على أي وقت فاضي يفتح نموذج
 * حجز جديد مُعبأ مسبقًا بهذا التاريخ والوقت.
 * ============================================================ */

const PX_PER_HOUR = 64;
const GRID_START_HOUR = 8;
const GRID_END_HOUR = 24;
/** العرض البصري الافتراضي للحجز داخل الشبكة — مش مدة حقيقية من الباكند */
const BLOCK_MINUTES = 60;

/** خطاف الوقت اللحظي — يحدّث كل 30 ثانية فقط لما العرض فيه النهاردة */
function useNow(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

type GridBlock = { b: BookingItem; start: number; end: number; col: number; cols: number };

/** توزيع الحجوزات المتقاطعة على أعمدة جنب بعض (نفس أسلوب تقويم جوجل) */
function layoutGridBlocks(items: BookingItem[]): GridBlock[] {
  const intervals = items
    .map((b) => ({
      b,
      start: timeToMinutes(b.timeStr),
      end: timeToMinutes(b.timeStr) + BLOCK_MINUTES,
    }))
    .sort((x, y) => x.start - y.start || x.end - y.end);
  const colEnds: number[] = [];
  const placed = intervals.map((it) => {
    let col = colEnds.findIndex((end) => end <= it.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(it.end);
    } else {
      colEnds[col] = it.end;
    }
    return { ...it, col };
  });
  const cols = Math.max(1, colEnds.length);
  return placed.map((p) => ({ ...p, cols }));
}

function TimeGrid({
  days,
  bookings,
  onSelectBooking,
  onSlotClick,
  quarterLines = false,
  pxPerHour = PX_PER_HOUR,
}: {
  days: Date[];
  bookings: BookingItem[];
  onSelectBooking: (b: BookingItem) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
  /** مسطرة ربع ساعة — لعرض اليوم، الأسبوع يكفيه خط كل ساعة */
  quarterLines?: boolean;
  pxPerHour?: number;
}) {
  const todayStr = formatDateKey(new Date());
  const showsToday = days.some((d) => formatDateKey(d) === todayStr);
  const now = useNow(showsToday);

  // توسيع المدى تلقائيًا لو فيه حجوزات قبل 8 ص أو بعد 11 م
  let startHour = GRID_START_HOUR;
  let endHour = GRID_END_HOUR;
  for (const b of bookings) {
    if (!days.some((d) => formatDateKey(d) === b.dateStr)) continue;
    const mins = timeToMinutes(b.timeStr);
    startHour = Math.min(startHour, Math.floor(mins / 60));
    endHour = Math.max(endHour, Math.ceil((mins + BLOCK_MINUTES) / 60));
  }
  startHour = Math.max(0, Math.min(23, startHour));
  endHour = Math.min(24, Math.max(endHour, startHour + 1));
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const gridHeight = ((endMinutes - startMinutes) * pxPerHour) / 60;

  const hourLines: number[] = [];
  for (let h = startHour + 1; h < endHour; h++) hourLines.push(h);
  const quarterSteps: number[] = [];
  if (quarterLines) {
    for (let m = startMinutes + 15; m < endMinutes; m += 15) {
      if (m % 60 !== 0) quarterSteps.push(m);
    }
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow = showsToday && nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  const nowTop = ((nowMinutes - startMinutes) * pxPerHour) / 60;

  // الهوفر بيقرّب لمركز الربع ساعة اللي تحت المؤشر — نفس حساب الضغط بالظبط،
  // فالوقت اللي بيظهر في البالونة هو بالحرف اللي هيتسجل.
  const [hoverSlot, setHoverSlot] = useState<{
    day: string;
    y: number;
    minutes: number;
  } | null>(null);
  const minutesFromY = (y: number): number =>
    Math.min(
      endMinutes - 15,
      Math.max(startMinutes, startMinutes + Math.floor(y / (pxPerHour / 4)) * 15)
    );

  return (
    <div className="flex" dir="rtl">
      {/* عمود الساعات — يمين الشاشة */}
      <div className="w-16 shrink-0 relative select-none" style={{ height: gridHeight }}>
        {hourLines.map((h) => (
          <span
            key={h}
            className="absolute w-full pr-2 text-left text-[10px] font-bold text-slate-400 tabular-nums"
            style={{ top: ((h * 60 - startMinutes) * pxPerHour) / 60 - 7 }}
            dir="ltr"
          >
            {fmtTime12(minutesToTime(h * 60))}
          </span>
        ))}
        <span
          className="absolute w-full pr-2 text-left text-[10px] font-bold text-slate-400 tabular-nums"
          style={{ top: 0 }}
          dir="ltr"
        >
          {fmtTime12(minutesToTime(startMinutes))}
        </span>
      </div>

      {/* أعمدة الأيام */}
      <div className="flex-1 flex border-r border-slate-200">
        {days.map((d) => {
          const dStr = formatDateKey(d);
          const dayBookings = bookings.filter((b) => b.dateStr === dStr);
          const blocks = layoutGridBlocks(dayBookings);
          const isToday = dStr === todayStr;
          return (
            <div
              key={dStr}
              className={`relative flex-1 border-l border-slate-100 cursor-pointer transition-colors ${
                isToday ? 'bg-slate-50/40' : 'hover:bg-slate-50/30'
              }`}
              style={{ height: gridHeight }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const minutes = minutesFromY(e.clientY - rect.top);
                setHoverSlot({
                  day: dStr,
                  y: ((minutes - startMinutes) * pxPerHour) / 60,
                  minutes,
                });
              }}
              onMouseLeave={() => setHoverSlot(null)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onSlotClick(dStr, minutesToTime(minutesFromY(e.clientY - rect.top)));
              }}
              title="اضغط على أي وقت لإضافة حجز في هذا الموعد"
            >
              {/* خطوط الساعات */}
              {hourLines.map((h) => (
                <div
                  key={`h${h}`}
                  className="absolute inset-x-0 border-t border-slate-200 pointer-events-none"
                  style={{ top: ((h * 60 - startMinutes) * pxPerHour) / 60 }}
                />
              ))}
              {/* مسطرة ربع الساعة */}
              {quarterSteps.map((m) => (
                <div
                  key={`q${m}`}
                  className="absolute inset-x-0 border-t border-slate-100 pointer-events-none"
                  style={{ top: ((m - startMinutes) * pxPerHour) / 60 }}
                />
              ))}

              {/* كروت الحجوزات — المتقاطعة تنقسم جنب بعض بأعمدة متساوية */}
              {blocks.map(({ b, start, end, col, cols }) => {
                const act = ACTIVITY_META[b.activityType];
                const top = ((start - startMinutes) * pxPerHour) / 60;
                const blockHeight = Math.max(30, ((end - start) * pxPerHour) / 60 - 2);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBooking(b);
                    }}
                    className={`absolute rounded-lg border px-1.5 py-1 overflow-hidden text-right shadow-sm hover:brightness-95 transition-all ${act.chip}`}
                    style={{
                      top,
                      height: blockHeight,
                      right: `${col * (100 / cols)}%`,
                      width: `calc(${100 / cols}% - 2px)`,
                    }}
                    title={`${b.itemName} — ${b.customerName} (${b.timeStr})`}
                  >
                    <span className="block text-[10px] font-black tabular-nums" dir="ltr">
                      {fmtTime12(b.timeStr)}
                    </span>
                    <span className="block text-[10px] font-bold truncate">{b.customerName}</span>
                    {blockHeight > 46 && 100 / cols > 55 && (
                      <span className="block text-[9px] font-semibold truncate opacity-80">
                        {b.itemName}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* مؤشر الهوفر — السطر اللي الضغط عليه هيفتح الحجز عند نفس الدقيقة */}
              {hoverSlot && hoverSlot.day === dStr && (
                <div
                  className="absolute inset-x-0 z-10 pointer-events-none"
                  style={{ top: hoverSlot.y }}
                >
                  <div className="relative border-t-2 border-dashed border-indigo-400">
                    <span
                      className="absolute right-1 -top-[9px] bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                      dir="ltr"
                    >
                      {fmtTime12(minutesToTime(hoverSlot.minutes))}
                    </span>
                  </div>
                </div>
              )}

              {/* خط الوقت اللحظي */}
              {isToday && showNow && (
                <div
                  className="absolute inset-x-0 z-10 pointer-events-none"
                  style={{ top: nowTop }}
                >
                  <div className="relative border-t-2 border-slate-900">
                    <span className="absolute -right-1.5 -top-[5px] w-3 h-3 rounded-full bg-slate-900 shadow" />
                    <span
                      className="absolute right-3 -top-[9px] bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                      dir="ltr"
                    >
                      {fmtTime12(minutesToTime(nowMinutes))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 * Week View — أعمدة الأيام السبعة على شبكة المواعيد
 * ============================================================ */

function WeekCalendarView({
  currentDate,
  bookings,
  onSelectBooking,
  onSlotClick,
}: {
  currentDate: Date;
  bookings: BookingItem[];
  onSelectBooking: (b: BookingItem) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
}) {
  // بداية الأسبوع السبت عبر date-fns (weekStartsOn: 6)
  const startOfWeek = dfStartOfWeek(currentDate, { weekStartsOn: 6 });

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const todayStr = formatDateKey(new Date());

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-3 text-xs font-extrabold text-slate-700 pr-16">
        {days.map((d, i) => (
          <div key={i} className="space-y-1">
            <div>{WEEK_DAYS[i]}</div>
            <div
              className={`text-base font-black tabular-nums ${formatDateKey(d) === todayStr ? 'text-indigo-600' : 'text-slate-900'}`}
            >
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          <TimeGrid
            days={days}
            bookings={bookings}
            onSelectBooking={onSelectBooking}
            onSlotClick={onSlotClick}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Day View — صفحة اليوم المسطّرة (خط كل ربع ساعة + الوقت اللحظي)
 * ============================================================ */

function DayCalendarView({
  currentDate,
  bookings,
  onSelectBooking,
  onSlotClick,
  onAddBooking,
}: {
  currentDate: Date;
  bookings: BookingItem[];
  onSelectBooking: (b: BookingItem) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
  onAddBooking: () => void;
}) {
  const dayBookings = bookings.filter((b) => b.dateStr === formatDateKey(currentDate));

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            {currentDate.toLocaleDateString('ar-EG', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            إجمالي {dayBookings.length} موعد مسجل • اضغط على أي وقت في المسطرة لإضافة حجز عند هذا
            الموعد
          </p>
        </div>
        <button
          type="button"
          onClick={onAddBooking}
          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1 hover:bg-slate-800"
        >
          <Plus size={13} />
          إضافة موعد
        </button>
      </div>
      <div className="overflow-y-auto max-h-[640px]">
        <TimeGrid
          days={[currentDate]}
          bookings={bookings}
          onSelectBooking={onSelectBooking}
          onSlotClick={onSlotClick}
          quarterLines
          pxPerHour={72}
        />
      </div>
    </div>
  );
}

/* ============================================================
 * Agenda View Component (قائمة البحث والتصفية)
 * ============================================================ */

function AgendaView({
  bookings,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  typeOptions,
  onSelectBooking,
}: {
  bookings: BookingItem[];
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  typeFilter: string;
  setTypeFilter: (s: string) => void;
  /** الأنشطة المفعّلة من تخصيص التاجر — الفلتر يعرضها فقط */
  typeOptions: ActivityType[];
  onSelectBooking: (b: BookingItem) => void;
}) {
  const filtered = useMemo(() => {
    return bookings
      .filter((b) => {
        if (statusFilter !== 'all' && b.status !== statusFilter) return false;
        if (typeFilter !== 'all' && b.activityType !== typeFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = b.customerName.toLowerCase().includes(q);
          const matchService = b.itemName.toLowerCase().includes(q);
          const matchPhone = b.customerPhone.includes(q);
          if (!matchName && !matchService && !matchPhone) return false;
        }
        return true;
      })
      .sort((a, b) => b.when.localeCompare(a.when));
  }, [bookings, search, statusFilter, typeFilter]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالعميل أو الهاتف أو الخدمة..."
            className="w-full pr-9 pl-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">كل الأنشطة</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {ACTIVITY_META[t].label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">كل الحالات</option>
            <option value="PENDING">بانتظار التأكيد</option>
            <option value="CONFIRMED">مؤكد</option>
            <option value="COMPLETED">مكتمل</option>
            <option value="CANCELLED">ملغي</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs font-bold">
          لا توجد حجوزات مطابقة لمعايير البحث
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400">
                <th className="pb-2 pr-3">النشاط / الخدمة</th>
                <th className="pb-2">العميل</th>
                <th className="pb-2">الموعد</th>
                <th className="pb-2">السعر</th>
                <th className="pb-2">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((b) => {
                const act = ACTIVITY_META[b.activityType];
                const st = STATUS_META[b.status];
                return (
                  <tr
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer text-xs"
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${act.chip}`}
                        >
                          {act.label}
                        </span>
                        <span className="font-bold text-slate-900">{b.itemName}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div>
                        <span className="font-bold text-slate-800">{b.customerName}</span>
                        {b.customerPhone && (
                          <span className="text-[10px] text-slate-400 block" dir="ltr">
                            {b.customerPhone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 font-medium tabular-nums">
                      {b.dateStr} • {b.timeStr}
                    </td>
                    <td className="py-3 font-bold text-slate-900 tabular-nums">
                      {b.price > 0 ? `${b.price.toLocaleString('en-US')} ج.م` : '—'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.chip}`}
                      >
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Year View — 12 شهر مصغر، الأيام اللي فيها حجوزات معلّمة،
 * والضغط على أي يوم بينقلك لصفحة ذلك اليوم مباشرة.
 * ============================================================ */

const WEEK_DAYS_SHORT = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];

function YearCalendarView({
  currentDate,
  bookings,
  onDayClick,
}: {
  currentDate: Date;
  bookings: BookingItem[];
  onDayClick: (dateStr: string) => void;
}) {
  const year = currentDate.getFullYear();
  const countsByDate = useMemo(() => {
    const m = new Map<string, number>();
    bookings.forEach((b) => m.set(b.dateStr, (m.get(b.dateStr) || 0) + 1));
    return m;
  }, [bookings]);
  const todayStr = formatDateKey(new Date());

  return (
    <div
      className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 bg-slate-50/50"
      dir="rtl"
    >
      {ARABIC_MONTHS.map((name, mi) => {
        const firstWeekday = (new Date(year, mi, 1).getDay() + 1) % 7; // 0 = السبت
        const daysInMonth = new Date(year, mi + 1, 0).getDate();
        const cells: (number | null)[] = [
          ...Array<null>(firstWeekday).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];
        while (cells.length % 7 !== 0) cells.push(null);
        return (
          <div key={mi} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <div className="text-sm font-black text-slate-900 text-center mb-2">
              {name} {year}
            </div>
            <div className="grid grid-cols-7 text-center text-[9px] font-bold text-slate-400 mb-1">
              {WEEK_DAYS_SHORT.map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((day, i) => {
                if (day === null) return <span key={`e${i}`} />;
                const dStr = formatDateKey(new Date(year, mi, day));
                const count = countsByDate.get(dStr) || 0;
                const isToday = dStr === todayStr;
                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => onDayClick(dStr)}
                    className={`relative h-7 rounded-md text-[11px] font-bold tabular-nums transition-colors ${
                      isToday
                        ? 'bg-slate-900 text-white shadow-sm'
                        : count > 0
                          ? 'text-pink-600 bg-pink-50 hover:bg-pink-100'
                          : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={count > 0 ? `${count} حجز في ${dStr}` : dStr}
                  >
                    {day}
                    {count > 0 && (
                      <span
                        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-pink-500'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
 * Table View — جدول الحجوزات الكامل (شيبس الحالة بعداد، بحث،
 * فرز بالأعمدة، باجينيشن، وإجراءات لكل صف: تفاصيل + طباعة فاتورة)
 * ============================================================ */

function BookingsTableView({
  bookings,
  typeOptions,
  onSelectBooking,
  onPrint,
}: {
  bookings: BookingItem[];
  /** الأنشطة المفعّلة من تخصيص التاجر */
  typeOptions: ActivityType[];
  onSelectBooking: (b: BookingItem) => void;
  onPrint: (b: BookingItem) => void;
}) {
  const [statusChip, setStatusChip] = useState<'all' | UnifiedStatus>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'when' | 'price' | 'customer'>('when');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: bookings.length,
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
    };
    bookings.forEach((b) => {
      c[b.status] = (c[b.status] || 0) + 1;
    });
    return c;
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = bookings.filter((b) => {
      if (statusChip !== 'all' && b.status !== statusChip) return false;
      if (typeFilter !== 'all' && b.activityType !== typeFilter) return false;
      if (q) {
        const hit =
          b.customerName.toLowerCase().includes(q) ||
          b.itemName.toLowerCase().includes(q) ||
          b.customerPhone.includes(q) ||
          String(b.raw?.bookingNumber || '')
            .toLowerCase()
            .includes(q);
        if (!hit) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      let r = 0;
      if (sortKey === 'when') r = a.when.localeCompare(b.when);
      else if (sortKey === 'price') r = a.price - b.price;
      else r = a.customerName.localeCompare(b.customerName, 'ar');
      return sortDir === 'asc' ? r : -r;
    });
    return arr;
  }, [bookings, search, statusChip, typeFilter, sortKey, sortDir]);

  // الترقيم يرجع لأول صفحة عند تغيير الفلاتر
  useEffect(() => {
    setPage(1);
  }, [statusChip, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const chips: Array<{ key: 'all' | UnifiedStatus; label: string; chip: string; count: number }> = [
    {
      key: 'all',
      label: 'الكل',
      chip: 'bg-slate-900 text-white border-slate-900',
      count: counts.all,
    },
    ...(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as UnifiedStatus[]).map((s) => ({
      key: s,
      label: STATUS_META[s].label,
      chip: STATUS_META[s].chip,
      count: counts[s] || 0,
    })),
    ...(counts.EXPIRED > 0
      ? [
          {
            key: 'EXPIRED' as UnifiedStatus,
            label: STATUS_META.EXPIRED.label,
            chip: STATUS_META.EXPIRED.chip,
            count: counts.EXPIRED,
          },
        ]
      : []),
  ];

  const toggleSort = (k: 'when' | 'price' | 'customer') => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('desc');
    }
  };

  const SortTh = ({ k, label }: { k: 'when' | 'price' | 'customer'; label: string }) => (
    <th className="py-2.5 px-2">
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-400 hover:text-slate-700 transition-colors"
      >
        {label}
        {sortKey === k ? (
          sortDir === 'asc' ? (
            <ChevronUp size={11} />
          ) : (
            <ChevronDown size={11} />
          )
        ) : (
          <ChevronUp size={11} className="opacity-20" />
        )}
      </button>
    </th>
  );

  return (
    <div className="p-4 sm:p-5 space-y-4" dir="rtl">
      {/* شيبس الحالة مع العداد */}
      <div className="flex items-center gap-2 flex-wrap">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setStatusChip(c.key)}
            className={`h-9 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
              statusChip === c.key
                ? `${c.chip} shadow-sm`
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {c.label}
            <span
              className={`text-[10px] font-black ${statusChip === c.key ? 'opacity-80' : 'text-slate-400'}`}
            >
              {c.count}
            </span>
          </button>
        ))}
      </div>

      {/* البحث والتصفية */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search
            size={14}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم العميل / رقم العميل / رقم الحجز / الخدمة"
            className="w-full pr-9 pl-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
        >
          <option value="all">كل الأنشطة</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_META[t].label}
            </option>
          ))}
        </select>
      </div>

      {/* الجدول */}
      {pageItems.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs font-bold">
          لا توجد حجوزات مطابقة لمعايير البحث
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-right min-w-[860px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-400">
                <th className="py-2.5 px-2">إجراءات</th>
                <th className="py-2.5 px-2">الخدمة</th>
                <SortTh k="when" label="وقت الحجز" />
                <th className="py-2.5 px-2">رقم الحجز</th>
                <th className="py-2.5 px-2">المصدر</th>
                <SortTh k="customer" label="العميل" />
                <th className="py-2.5 px-2">الحالة</th>
                <SortTh k="price" label="المبلغ" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pageItems.map((b) => {
                const act = ACTIVITY_META[b.activityType];
                const st = STATUS_META[b.status];
                const pay = paymentLabel(b.paymentStatus);
                return (
                  <tr
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer text-xs"
                  >
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectBooking(b)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrint(b)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="طباعة الفاتورة"
                        >
                          <Printer size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${act.chip}`}
                        >
                          {act.label}
                        </span>
                        <span className="font-bold text-slate-900">{b.itemName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 font-medium tabular-nums">
                      <span className="block">{b.dateStr}</span>
                      <span className="block text-[10px] text-slate-400" dir="ltr">
                        {fmtTime12(b.timeStr)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 font-bold tabular-nums" dir="ltr">
                      {String(b.raw?.bookingNumber || '—')}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`text-[10px] font-bold ${b.source === 'website' ? 'text-sky-600' : 'text-slate-500'}`}
                      >
                        {b.source === 'website' ? 'الموقع' : 'داخلي'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="font-bold text-slate-800 block">{b.customerName}</span>
                      {b.customerPhone && (
                        <span className="text-[10px] text-slate-400 block tabular-nums" dir="ltr">
                          {b.customerPhone}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.chip}`}
                      >
                        {st.label}
                      </span>
                      {pay && (
                        <span className="block text-[9px] font-bold text-slate-400 mt-1">
                          {pay}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 font-black text-slate-900 tabular-nums whitespace-nowrap">
                      {b.price > 0 ? `${b.price.toLocaleString('en-US')} ج.م` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* الباجينيشن */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>إجمالي الحجوزات: {filtered.length}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center transition-colors"
            title="التالي"
          >
            <ChevronRight size={13} />
          </button>
          <span className="px-2 tabular-nums">
            صفحة {safePage} من {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center transition-colors"
            title="السابق"
          >
            <ChevronLeft size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Add Manual Booking Modal (حجز يدوي لجميع الأنشطة)
 * ============================================================ */

/**
 * أوقات سريعة للاختيار بنقرة — كل 30 دقيقة من 08:00 لـ 22:30.
 * الاختيار الحر بالدقائق ما زال متاحًا من حقل الوقت العادي.
 */
const QUICK_TIMES: string[] = Array.from({ length: 30 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function AddBookingModal({
  initialDate,
  initialTime,
  shopId,
  enabledActivities,
  onClose,
  onSuccess,
}: {
  initialDate: string;
  /** وقت مبدئي من الضغط على شبكة اليوم/الأسبوع — فاضي = الافتراضي بعد ٣٠ دقيقة */
  initialTime?: string;
  shopId?: string;
  /** الأنشطة المفعّلة من تخصيص التاجر — الشبكة تعرضها فقط وتختار الأول افتراضيًا */
  enabledActivities: ActivityType[];
  onClose: () => void;
  onSuccess: (b: BookingItem) => void;
}) {
  const [activityType, setActivityType] = useState<ActivityType>(enabledActivities[0] || 'general');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemName, setItemName] = useState('');
  const [bookingDate, setBookingDate] = useState(initialDate || formatDateKey(new Date()));
  // Walk-in default: ~30 minutes from now, rounded to 5 minutes — the
  // secretary usually registers a client standing right there.
  // أو الوقت اللي اتضغط عليه من شبكة اليوم/الأسبوع (initialTime)
  const [bookingTime, setBookingTime] = useState(
    () =>
      initialTime ||
      (() => {
        const d = new Date(Date.now() + 30 * 60000);
        d.setMinutes(Math.round(d.getMinutes() / 5) * 5, 0, 0);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      })()
  );
  const [price, setPrice] = useState('200');
  const [participants, setParticipants] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // الحجز اليدوي حر: الاسم والخدمة بس المطلوبين — التليفون اختياري،
    // وأي تاريخ (قديم أو جديد) وأي وقت بيتسجلوا زي ما هما بدون قيود.
    if (!customerName.trim() || !itemName.trim()) {
      alert('يرجى كتابة اسم العميل واسم الخدمة/الحجز');
      return;
    }
    if (customerPhone.trim() && customerPhone.replace(/\D/g, '').length < 10) {
      alert('رقم الهاتف ناقص — أكمله صح أو سيبه فاضي');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        shopId: shopId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        itemName: itemName.trim(),
        bookingDate,
        bookingTime,
        itemPrice: Number(price) || 0,
        participants: Number(participants) || 1,
        notes: notes.trim(),
        bookingActivityType: activityType,
        status: 'CONFIRMED',
        // علامة إدخال يدوي — بنطلب من الباكند تسجيل الموعد كما هو بالظبط
        // بدون إعادة جدولة أو فحص ازدحام (القيود للموقع العام مش لليدوي)
        metadata: { source: 'dashboard-manual', manual: true, exactSlot: true },
      };

      const res = await addBookingViaBackend(payload);

      // الحجز اليدوي بيتسجل على الموعد المطلوب بالظبط — الباكند مش بيحوّله
      // ولا بيأجّله حتى لو الفترة مزنوقة بالكامل (القيود للموقع العام بس).
      // عرض الوقت المطلوب نفسه فورًا؛ إعادة التحميل بعدها هتجيب القيمة
      // المعتمدة من السيرفر ولو اختلفة لأي سبب.
      const newBooking: BookingItem = {
        id: `int-${res.id || Date.now()}`,
        source: 'internal',
        status: 'CONFIRMED',
        activityType,
        itemName: payload.itemName,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        when: `${bookingDate}T${bookingTime}:00`,
        dateStr: bookingDate,
        timeStr: bookingTime,
        price: payload.itemPrice,
        participants: payload.participants,
        notes: payload.notes,
        raw: res,
      };

      onSuccess(newBooking);
    } catch (err: any) {
      alert(err?.message || 'تعذر إضافة الحجز');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-slate-700" />
            <h3 className="text-base font-extrabold text-slate-900">إضافة حجز يدوي جديد</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* نوع النشاط */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              نوع الحجز / النشاط
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {enabledActivities.map((t) => {
                const act = ACTIVITY_META[t];
                const Icon = act.icon;
                const isSelected = activityType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActivityType(t)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-[10px] font-bold leading-tight">{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* اسم الخدمة */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              اسم الخدمة أو الحجز *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="مثال: كشف أسنان، إقامة جناح قطط، طاولة 4 أفراد..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
              required
            />
          </div>

          {/* بيانات العميل */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">اسم العميل *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="محمد أحمد"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                رقم الهاتف <span className="text-slate-400 font-medium">(اختياري)</span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400 text-right"
                dir="ltr"
              />
            </div>
          </div>

          {/* التاريخ والوقت — اليدوي حر تمامًا */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">تاريخ الحجز</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
                required
              />
              <p className="text-[10px] font-bold text-slate-400 mt-1">
                أي تاريخ — قديم أو جديد، من غير قيود
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">وقت الموعد</label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
                required
              />
              <p className="text-[10px] font-bold text-slate-400 mt-1">
                أي وقت — بيتسجل زي ما دخّلته بالظبط
              </p>
            </div>
          </div>

          {/* أوقات سريعة — نقرة واحدة بدل الكتابة */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              أوقات سريعة <span className="text-slate-400 font-medium">(اختيار بنقرة)</span>
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-0.5 px-0.5">
              {QUICK_TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBookingTime(t)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                    bookingTime === t
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                  dir="ltr"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* السعر والعدد */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">السعر (ج.م)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                عدد الأفراد / الحيوانات
              </label>
              <input
                type="number"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                min="1"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* ملاحظات */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل خاصة بالحجز أو العميل..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              تأكيد وحفظ الحجز
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
 * Booking Detail & Actions Modal
 * ============================================================ */

function BookingDetailModal({
  booking,
  shopName,
  onClose,
  onUpdateStatus,
}: {
  booking: BookingItem;
  /** اسم المتجر — يظهر في فاتورة الحجز المطبوعة */
  shopName?: string;
  onClose: () => void;
  onUpdateStatus: (b: BookingItem, status: UnifiedStatus) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const act = ACTIVITY_META[booking.activityType];
  const st = STATUS_META[booking.status];

  const handleStatus = async (status: UnifiedStatus) => {
    setUpdating(true);
    await onUpdateStatus(booking, status);
    setUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${act.chip}`}>
              {act.label}
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 truncate max-w-[220px]">
              {booking.itemName}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => printBookingInvoice(booking, shopName || '')}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="طباعة الفاتورة"
            >
              <Printer size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Details */}
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">حالة الحجز:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.chip}`}>
                {st.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">توقيت الموعد:</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {booking.dateStr} الساعة {booking.timeStr}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">المصدر:</span>
              <span className="font-bold text-slate-700">
                {booking.source === 'website' ? 'من الموقع التجاري' : 'حجز داخلي'}
              </span>
            </div>
            {booking.price > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">القيمة الإجمالية:</span>
                <span className="font-black text-slate-900 tabular-nums">
                  {booking.price.toLocaleString('en-US')} ج.م
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">عدد الأفراد:</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {booking.participants || 1}
              </span>
            </div>
            {String(booking.raw?.bookingNumber || '') && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">رقم الحجز:</span>
                <span className="font-bold text-slate-900 tabular-nums" dir="ltr">
                  {String(booking.raw?.bookingNumber)}
                </span>
              </div>
            )}
            {paymentLabel(booking.paymentStatus) && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">حالة الدفع:</span>
                <span className="font-bold text-slate-700">
                  {paymentLabel(booking.paymentStatus)}
                </span>
              </div>
            )}
          </div>

          {/* بيانات العميل */}
          <div className="p-3 rounded-xl border border-slate-100 space-y-2">
            <div className="font-bold text-slate-800">بيانات العميل</div>
            <div className="flex justify-between text-slate-600">
              <span>الاسم:</span>
              <span className="font-bold text-slate-900">{booking.customerName}</span>
            </div>
            {booking.customerPhone && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600">رقم الهاتف:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${booking.customerPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    title="مراسلة واتساب"
                  >
                    <MessageCircle size={14} />
                  </a>
                  <a
                    href={`tel:${booking.customerPhone}`}
                    className="p-1 rounded bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                    title="اتصال هاتفي"
                  >
                    <Phone size={14} />
                  </a>
                  <span className="font-bold text-slate-900 tabular-nums" dir="ltr">
                    {booking.customerPhone}
                  </span>
                </div>
              </div>
            )}
            {booking.notes && (
              <div className="pt-2 border-t border-slate-50 text-slate-500">
                <span className="font-semibold text-slate-700 block mb-0.5">ملاحظات:</span>
                <p className="bg-slate-50 p-2 rounded-lg text-[11px]">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Change Status Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {booking.status !== 'CONFIRMED' && (
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatus('CONFIRMED')}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                تأكيد
              </button>
            )}
            {booking.status !== 'COMPLETED' && (
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatus('COMPLETED')}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                إتمام
              </button>
            )}
            {booking.status !== 'CANCELLED' && (
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatus('CANCELLED')}
                className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Root Export with Suspense
 * ============================================================ */

export default function BookingsUnifiedPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm font-bold text-slate-400">جاري التحميل...</div>
      }
    >
      <BookingsMainContent />
    </Suspense>
  );
}

/* ============================================================
 * QueueTodayPanel — طابور اليوم (الحجز بالانتظار)
 * حجوزات الموقع اللي دخلت الكوتة النهاردة مرتبين بالترتيب، مع
 * إشعار واتساب جاهز للعميل قبل دوره + تغيير الحالة (بدأ الدور / تم).
 * ============================================================ */

/** wa.me link مصحّح لمصر — لو بدأ بصفر بنحط 20 قبله */
function waMeLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

function QueueTodayPanel({
  items,
  onStatusChange,
}: {
  items: BookingItem[];
  onStatusChange: (backendId: string, status: string) => void | Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const setStatus = async (item: BookingItem, status: string) => {
    const backendId = item.id.startsWith('web-') ? item.id.slice(4) : item.id;
    setBusyId(item.id);
    try {
      await onStatusChange(backendId, status);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-amber-600" />
          <span className="text-sm font-extrabold text-amber-800">
            طابور اليوم — الحجز بالانتظار ({items.length})
          </span>
        </div>
        <span className="text-[10px] font-bold text-amber-500">
          مرتبين بالترتيب — اللي عليه الدور الأول معلّم
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item, idx) => {
          const isNext = idx === 0;
          const busy = busyId === item.id;
          const waText = `مرحبًا ${item.customerName}، دورك قرّب في طابور الانتظار — نرجو التوجه إلينا خلال 30 دقيقة تقريبًا.${
            item.raw?.bookingNumber ? ` رقم حجزك: ${item.raw.bookingNumber}.` : ''
          }`;
          const waHref = item.customerPhone ? waMeLink(item.customerPhone, waText) : null;
          return (
            <div
              key={item.id}
              className={`flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-3 ${
                isNext ? 'bg-amber-50/60' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                  isNext ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                }`}
                title="ترتيب في الطابور"
              >
                <span className="text-sm font-black leading-none">{item.queuePosition}</span>
                <span className="text-[8px] font-bold opacity-80">
                  {isNext ? 'الدور عليه' : 'في الانتظار'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-900 truncate">
                  {item.customerName}
                  {item.doctorName && (
                    <span className="inline-flex items-center gap-1 mr-2 text-[10px] font-bold text-cyan-600">
                      <Stethoscope size={11} />
                      {item.doctorName}
                    </span>
                  )}
                </p>
                <p className="text-[11px] font-bold text-slate-400 truncate">
                  {item.itemName}
                  {item.raw?.bookingNumber ? ` · ${item.raw.bookingNumber}` : ''}
                  {item.notes ? ` · ${item.notes}` : ''}
                </p>
              </div>
              {item.customerPhone && (
                <a
                  href={`tel:${item.customerPhone}`}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0"
                  title={`اتصال ${item.customerName}`}
                >
                  <Phone size={14} />
                </a>
              )}
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-extrabold flex items-center gap-1.5 shrink-0"
                  title="إشعار العميل إن دوره قرّب عبر واتساب"
                >
                  <MessageCircle size={13} />
                  إشعار العميل
                </a>
              )}
              {item.status === 'PENDING' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus(item, 'CONFIRMED')}
                  className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold flex items-center gap-1.5 disabled:opacity-60 shrink-0"
                >
                  {busy ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  بدأ الدور
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setStatus(item, 'COMPLETED')}
                className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-extrabold flex items-center gap-1.5 disabled:opacity-60 shrink-0"
              >
                <CheckCircle2 size={12} />
                تم
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 * طباعة فاتورة الحجز — إيصال RTL جاهز للطباعة يُفتح في iframe
 * مخفي ويُرسل للطابعة مباشرة (بدون صفحات منبثقة يحجبها المتصفح).
 * ============================================================ */

function printBookingInvoice(b: BookingItem, shopName: string): void {
  const esc = (v: any): string =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const act = ACTIVITY_META[b.activityType];
  const st = STATUS_META[b.status];
  const pay = paymentLabel(b.paymentStatus) || 'غير محدد';
  const bookingNo = String(b.raw?.bookingNumber || b.id.replace(/^(web|int)-/, ''));

  const rows: Array<[string, string]> = [
    ['رقم الحجز', bookingNo],
    ['الخدمة / النشاط', `${b.itemName} (${act.label})`],
    ['العميل', b.customerName],
    ['رقم الهاتف', b.customerPhone || '—'],
    ['تاريخ الموعد', b.dateStr],
    ['وقت الموعد', fmtTime12(b.timeStr)],
    ['عدد الأفراد', String(b.participants || 1)],
    ['حالة الدفع', pay],
    ['حالة الحجز', st.label],
  ];
  if (b.notes) rows.push(['ملاحظات', b.notes]);

  const rowsHtml = rows
    .map(([k, v]) => `<tr><td class="k">${esc(k)}:</td><td class="v">${esc(v)}</td></tr>`)
    .join('\n  ');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>فاتورة حجز ${esc(bookingNo)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', 'Tahoma', 'Segoe UI', sans-serif; color: #0f172a; padding: 28px; max-width: 640px; margin: 0 auto; }
  .head { text-align: center; border-bottom: 3px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; }
  .head h1 { font-size: 22px; font-weight: 900; }
  .head p { font-size: 12px; color: #64748b; margin-top: 4px; }
  .stamp { display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 800; padding: 3px 12px; border: 1.5px solid #0f172a; border-radius: 999px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; vertical-align: top; }
  td.k { color: #64748b; font-weight: 600; width: 130px; }
  td.v { font-weight: 800; }
  tr.total td { background: #f1f5f9; font-size: 15px; font-weight: 900; }
  .foot { margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
  @media print { body { padding: 12px; } }
</style></head><body>
<div class="head">
  <h1>${esc(shopName || 'فاتورة حجز')}</h1>
  <p>فاتورة / إيصال حجز — ${esc(new Date().toLocaleDateString('ar-EG'))}</p>
  <span class="stamp">${esc(st.label)}</span>
</div>
<table>
  ${rowsHtml}
  <tr class="total"><td class="k">الإجمالي المستحق:</td><td class="v">${esc((b.price || 0).toLocaleString('en-US'))} ج.م</td></tr>
</table>
<div class="foot">شكرًا لزيارتكم — هذا الإيصال صادر آليًا من نظام إدارة الحجوزات</div>
</body></html>`;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.opacity = '0';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const doPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {}
    setTimeout(() => frame.remove(), 1500);
  };
  if (doc.readyState === 'complete') setTimeout(doPrint, 120);
  else frame.onload = () => setTimeout(doPrint, 120);
}
