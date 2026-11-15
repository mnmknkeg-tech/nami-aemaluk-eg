'use client';

import { Clock, Calendar, MapPin, Video, Home, Plus, CalendarOff } from 'lucide-react';
import type { DaySchedule } from './types';

interface SchedulingCardProps {
  scheduleType: 'days_only' | 'days_and_times';
  onScheduleTypeChange: (v: 'days_only' | 'days_and_times') => void;
  slotDurationMinutes: number;
  onSlotDurationChange: (v: number) => void;
  capacityPerSlot: number;
  onCapacityChange: (v: number) => void;
  allowMultipleBookings: boolean;
  onAllowMultipleChange: (v: boolean) => void;
  maxBookingsPerCustomer: number;
  onMaxBookingsChange: (v: number) => void;
  leadTimeValue: number;
  onLeadTimeValueChange: (v: number) => void;
  leadTimeUnit: 'minute' | 'hour' | 'day';
  onLeadTimeUnitChange: (v: 'minute' | 'hour' | 'day') => void;
  locationType: 'onsite' | 'online' | 'home_visit';
  onLocationTypeChange: (v: 'onsite' | 'online' | 'home_visit') => void;
  locationAddress: string;
  onLocationAddressChange: (v: string) => void;
  workingDays: DaySchedule[];
  onToggleDay: (dayKey: string) => void;
  onUpdateTime: (dayKey: string, field: 'startTime' | 'endTime', value: string) => void;
  exceptions: string[];
  newExceptionDate: string;
  onNewExceptionDateChange: (v: string) => void;
  onAddException: () => void;
  onRemoveException: (date: string) => void;
}

export default function SchedulingCard({
  scheduleType,
  onScheduleTypeChange,
  slotDurationMinutes,
  onSlotDurationChange,
  capacityPerSlot,
  onCapacityChange,
  allowMultipleBookings,
  onAllowMultipleChange,
  maxBookingsPerCustomer,
  onMaxBookingsChange,
  leadTimeValue,
  onLeadTimeValueChange,
  leadTimeUnit,
  onLeadTimeUnitChange,
  locationType,
  onLocationTypeChange,
  locationAddress,
  onLocationAddressChange,
  workingDays,
  onToggleDay,
  onUpdateTime,
  exceptions,
  newExceptionDate,
  onNewExceptionDateChange,
  onAddException,
  onRemoveException,
}: SchedulingCardProps) {
  return (
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
            onClick={() => onScheduleTypeChange('days_only')}
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
                className={scheduleType === 'days_only' ? 'text-teal-600' : 'text-slate-400'}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              حدِّد الأيام المتاحة للحجز فقط (مناسب للشاليهات، تأجير السيارات أو المعدات).
            </p>
          </button>

          <button
            type="button"
            onClick={() => onScheduleTypeChange('days_and_times')}
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
                className={scheduleType === 'days_and_times' ? 'text-teal-600' : 'text-slate-400'}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              حدِّد أيامًا وأوقاتًا معينة متاحة للحجز (مناسب للعيادات، الصالونات، والاستشارات).
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
              onChange={(e) => onSlotDurationChange(Number(e.target.value))}
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
              onChange={(e) => onCapacityChange(Math.max(1, parseInt(e.target.value) || 1))}
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
            <span className="text-xs font-bold text-slate-800">حجز عدة مواعيد لنفس العميل*</span>
            <input
              type="checkbox"
              checked={allowMultipleBookings}
              onChange={(e) => onAllowMultipleChange(e.target.checked)}
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
                onChange={(e) => onMaxBookingsChange(Math.max(1, parseInt(e.target.value) || 1))}
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
              onChange={(e) => onLeadTimeValueChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-center"
            />
            <select
              value={leadTimeUnit}
              onChange={(e) => onLeadTimeUnitChange(e.target.value as any)}
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
        <label className="block text-xs font-bold text-slate-700 mb-2">الموقع ونوع الحضور</label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            type="button"
            onClick={() => onLocationTypeChange('onsite')}
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
            onClick={() => onLocationTypeChange('online')}
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
            onClick={() => onLocationTypeChange('home_visit')}
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
            onChange={(e) => onLocationAddressChange(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        )}
      </div>

      {/* Working Days & Schedule Table */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800">أيام العمل وساعات الحجز المتاحة</h4>
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
                  onChange={() => onToggleDay(day.dayKey)}
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
                    onChange={(e) => onUpdateTime(day.dayKey, 'startTime', e.target.value)}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium"
                  />
                  <span className="text-slate-400 text-[11px]">إلى:</span>
                  <input
                    type="time"
                    value={day.endTime}
                    onChange={(e) => onUpdateTime(day.dayKey, 'endTime', e.target.value)}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-400 font-bold">مغلق (عطلة أسبوعية)</span>
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
            onChange={(e) => onNewExceptionDateChange(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
          />
          <button
            type="button"
            onClick={onAddException}
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
                  onClick={() => onRemoveException(exDate)}
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
  );
}
