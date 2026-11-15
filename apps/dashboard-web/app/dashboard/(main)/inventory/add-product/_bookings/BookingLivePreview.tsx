'use client';

import { Eye, CalendarClock, Clock, MapPin, Video, Home } from 'lucide-react';
import type { DaySchedule } from './types';

interface BookingLivePreviewProps {
  imageUrl: string;
  name: string;
  category: string;
  brand: string;
  price: string;
  discountPrice?: number | null;
  slotDurationMinutes: number;
  locationType: 'onsite' | 'online' | 'home_visit';
  workingDays: DaySchedule[];
  scheduleType: 'days_only' | 'days_and_times';
  previewSlots: string[];
  previewSelectedDay: string;
  onPreviewDayChange: (v: string) => void;
  previewSelectedSlot: string;
  onPreviewSlotChange: (v: string) => void;
}

export default function BookingLivePreview({
  imageUrl,
  name,
  category,
  brand,
  price,
  discountPrice,
  slotDurationMinutes,
  locationType,
  workingDays,
  scheduleType,
  previewSlots,
  previewSelectedDay,
  onPreviewDayChange,
  previewSelectedSlot,
  onPreviewSlotChange,
}: BookingLivePreviewProps) {
  return (
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
              {discountPrice && (
                <span className="text-xs text-slate-400 line-through font-bold">
                  {discountPrice} ج.م
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
                <span className="text-[11px] font-bold text-slate-800">1. حدد اليوم المناسب:</span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {workingDays
                  .filter((d) => d.enabled)
                  .slice(0, 4)
                  .map((day) => (
                    <button
                      key={day.dayKey}
                      type="button"
                      onClick={() => onPreviewDayChange(day.dayKey)}
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
                        onClick={() => onPreviewSlotChange(slot)}
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
            عند قيام العميل بالحجز، يتم تأكيد الموعد فورياً وحجبه من التقويم لمنع التعارض مع إرسال
            إشعار فوري لمتجرك وللعميل.
          </p>
        </div>
      </div>
    </div>
  );
}
