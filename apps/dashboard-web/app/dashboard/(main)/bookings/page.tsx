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
import {
  type ViewMode,
  type BookingItem,
  ARABIC_MONTHS,
  WEEK_DAYS,
  UUID_RE,
  inferActivityType,
  getWeekNumber,
  formatDateKey,
  parseDateKey,
  timeToMinutes,
  minutesToTime,
  fmtTime12,
  paymentLabel,
  normNameKey,
  ensureBookingCustomers,
} from './shared';
import { MonthCalendarView } from './MonthCalendarView';
import { TimeGrid } from './TimeGrid';
import { WeekCalendarView } from './WeekCalendarView';
import { DayCalendarView } from './DayCalendarView';
import { AgendaView } from './AgendaView';
import { YearCalendarView } from './YearCalendarView';
import { BookingsTableView } from './BookingsTableView';
import { AddBookingModal } from './AddBookingModal';
import { BookingDetailModal } from './BookingDetailModal';
import { QueueTodayPanel } from './QueueTodayPanel';
import { printBookingInvoice } from './printBookingInvoice';

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

/* ============================================================
 * طباعة فاتورة الحجز — إيصال RTL جاهز للطباعة يُفتح في iframe
 * مخفي ويُرسل للطابعة مباشرة (بدون صفحات منبثقة يحجبها المتصفح).
 * ============================================================ */
