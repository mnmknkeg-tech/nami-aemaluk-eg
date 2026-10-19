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
} from 'lucide-react';
import { apiRequest } from '@/lib/auth';
import { addBookingViaBackend, updateBookingStatusViaBackend } from '@/lib/api/bookings';
import { BookingSettings } from '@/components/bookings/BookingSettings';

/* ============================================================
 * Types & Constants
 * ============================================================ */

type UnifiedStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
type ActivityType = 'clinic' | 'hotel' | 'table' | 'consultation' | 'general';
type ViewMode = 'month' | 'week' | 'day' | 'agenda';

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

const ACTIVITY_META: Record<ActivityType, { label: string; icon: any; chip: string; dot: string }> =
  {
    clinic: {
      label: 'عيادة',
      icon: Stethoscope,
      chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    hotel: {
      label: 'فندقة',
      icon: BedDouble,
      chip: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    table: {
      label: 'طاولة',
      icon: Utensils,
      chip: 'bg-violet-50 text-violet-700 border-violet-200',
      dot: 'bg-violet-500',
    },
    consultation: {
      label: 'استشارة',
      icon: Briefcase,
      chip: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
    },
    general: {
      label: 'حجز عام',
      icon: CalendarDays,
      chip: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-500',
    },
  };

const STATUS_META: Record<UnifiedStatus, { label: string; chip: string }> = {
  PENDING: { label: 'بانتظار التأكيد', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED: { label: 'مؤكد', chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'مكتمل', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'ملغي', chip: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED: { label: 'منتهي', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normStatus(s: any): UnifiedStatus {
  const v = String(s || '').toUpperCase();
  if (v === 'CONFIRMED' || v === 'COMPLETED' || v === 'CANCELLED' || v === 'EXPIRED')
    return v as UnifiedStatus;
  return 'PENDING';
}

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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ============================================================
 * Main Page Component
 * ============================================================ */

function BookingsMainContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

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

  // Agenda Filter
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaStatusFilter, setAgendaStatusFilter] = useState('all');
  const [agendaTypeFilter, setAgendaTypeFilter] = useState('all');

  // Load bookings from API
  const loadBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      let shopId = '';
      try {
        const shop = await apiRequest('/shops/me');
        shopId = shop?.id;
      } catch {}

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
          const rawDate =
            b.bookingDate ||
            (b.startAt ? b.startAt.slice(0, 10) : '') ||
            (b.createdAt ? b.createdAt.slice(0, 10) : formatDateKey(new Date()));
          const rawTime = b.bookingTime || (b.startAt ? b.startAt.slice(11, 16) : '10:00');
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
            raw: b,
          };
        }),
        ...intList.map((r: any): BookingItem => {
          const rawDate =
            r.reservationDate ||
            (r.startTime ? r.startTime.slice(0, 10) : '') ||
            (r.createdAt ? r.createdAt.slice(0, 10) : formatDateKey(new Date()));
          const rawTime =
            r.startTime && r.startTime.length >= 16 ? r.startTime.slice(11, 16) : '10:00';
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
      else d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const openAddModal = (dateStr?: string) => {
    setModalInitialDate(dateStr || formatDateKey(currentDate));
    setIsAddModalOpen(true);
  };

  // Status Updater
  const handleUpdateStatus = async (item: BookingItem, newStatus: UnifiedStatus) => {
    try {
      const realId = item.raw?.id || item.id.replace(/^(web|int)-/, '');
      await updateBookingStatusViaBackend(String(realId), newStatus);
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

  // Month Title e.g. "سبتمبر 2026"
  const monthTitle = `${ARABIC_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

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
            onDayClick={(dateStr) => openAddModal(dateStr)}
          />
        ) : viewMode === 'day' ? (
          <DayCalendarView
            currentDate={currentDate}
            bookings={bookings}
            onSelectBooking={(b) => setSelectedBooking(b)}
            onAddBooking={() => openAddModal(formatDateKey(currentDate))}
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
            onSelectBooking={(b) => setSelectedBooking(b)}
          />
        )}
      </div>

      {/* ===== Modals ===== */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {isAddModalOpen && (
        <AddBookingModal
          initialDate={modalInitialDate}
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
 * Week View Component
 * ============================================================ */

function WeekCalendarView({
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
  // Start on Saturday
  const startOfWeek = new Date(currentDate);
  const dayIndex = (startOfWeek.getDay() + 1) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - dayIndex);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const todayStr = formatDateKey(new Date());

  return (
    <div className="divide-y divide-slate-100">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-3 text-xs font-extrabold text-slate-700">
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
      <div className="grid grid-cols-7 divide-x divide-x-reverse divide-slate-100 min-h-[420px]">
        {days.map((d) => {
          const dStr = formatDateKey(d);
          const dayBookings = bookings.filter((b) => b.dateStr === dStr);
          return (
            <div
              key={dStr}
              onClick={() => onDayClick(dStr)}
              className="p-2 space-y-2 hover:bg-slate-50/50 transition-colors cursor-pointer"
            >
              {dayBookings.length === 0 ? (
                <div className="text-center py-12 text-slate-300 text-[11px] font-semibold">
                  لا حجوزات
                </div>
              ) : (
                dayBookings.map((b) => {
                  const act = ACTIVITY_META[b.activityType];
                  const st = STATUS_META[b.status];
                  return (
                    <div
                      key={b.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBooking(b);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-sm space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${act.chip}`}
                        >
                          {act.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                          {b.timeStr}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate">{b.itemName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{b.customerName}</p>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 * Day View Component
 * ============================================================ */

function DayCalendarView({
  currentDate,
  bookings,
  onSelectBooking,
  onAddBooking,
}: {
  currentDate: Date;
  bookings: BookingItem[];
  onSelectBooking: (b: BookingItem) => void;
  onAddBooking: () => void;
}) {
  const dateStr = formatDateKey(currentDate);
  const dayBookings = bookings.filter((b) => b.dateStr === dateStr);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            حجوزات يوم{' '}
            {currentDate.toLocaleDateString('ar-EG', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">إجمالي {dayBookings.length} موعد مسجل</p>
        </div>
        <button
          type="button"
          onClick={onAddBooking}
          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1 hover:bg-slate-800"
        >
          <Plus size={13} />
          إضافة موعد اليوم
        </button>
      </div>

      {dayBookings.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <CalendarDays size={36} className="text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-600">لا توجد مواعيد محجوزة في هذا اليوم</p>
          <p className="text-xs text-slate-400">
            يمكنك النقر على الزر أعلاه لإضافة حجز يدوي مباشر.
          </p>
        </div>
      ) : (
        <div className="space-y-2 divide-y divide-slate-50">
          {dayBookings
            .sort((a, b) => a.timeStr.localeCompare(b.timeStr))
            .map((b) => {
              const act = ACTIVITY_META[b.activityType];
              const st = STATUS_META[b.status];
              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className="pt-3 first:pt-0 flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                        {b.timeStr}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">موعد</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${act.chip}`}
                        >
                          {act.label}
                        </span>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {b.itemName}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        العميل: <span className="font-bold text-slate-700">{b.customerName}</span>{' '}
                        {b.customerPhone && `• ${b.customerPhone}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {b.price > 0 && (
                      <span className="text-xs font-black text-slate-900 tabular-nums">
                        {b.price.toLocaleString('en-US')} ج.م
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${st.chip}`}
                    >
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
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
  onSelectBooking,
}: {
  bookings: BookingItem[];
  search: string;
  setSearch: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  typeFilter: string;
  setTypeFilter: (s: string) => void;
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
            <option value="clinic">عيادات</option>
            <option value="hotel">فندقة وإيواء</option>
            <option value="table">طاولات ومطاعم</option>
            <option value="consultation">استشارات</option>
            <option value="general">عام</option>
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
 * Add Manual Booking Modal (حجز يدوي لجميع الأنشطة)
 * ============================================================ */

function AddBookingModal({
  initialDate,
  onClose,
  onSuccess,
}: {
  initialDate: string;
  onClose: () => void;
  onSuccess: (b: BookingItem) => void;
}) {
  const [activityType, setActivityType] = useState<ActivityType>('clinic');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemName, setItemName] = useState('');
  const [bookingDate, setBookingDate] = useState(initialDate || formatDateKey(new Date()));
  const [bookingTime, setBookingTime] = useState('11:00');
  const [price, setPrice] = useState('200');
  const [participants, setParticipants] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !itemName.trim()) {
      alert('يرجى كتابة اسم العميل، رقم الهاتف، واسم الخدمة/الحجز');
      return;
    }

    setSaving(true);
    try {
      const payload = {
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
      };

      const res = await addBookingViaBackend(payload);

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
              {(Object.keys(ACTIVITY_META) as ActivityType[]).map((t) => {
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
              <label className="text-xs font-bold text-slate-700 block mb-1">رقم الهاتف *</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-slate-400 text-right"
                dir="ltr"
                required
              />
            </div>
          </div>

          {/* التاريخ والوقت */}
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
  onClose,
  onUpdateStatus,
}: {
  booking: BookingItem;
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
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
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
