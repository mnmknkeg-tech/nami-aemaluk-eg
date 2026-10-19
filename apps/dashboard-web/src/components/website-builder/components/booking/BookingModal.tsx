'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  CheckCircle,
  MessageCircle,
  Sparkles,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';

export interface BookingModalProps {
  contained?: boolean;
}

export const BookingModal: React.FC<BookingModalProps> = ({ contained = false }) => {
  const { website, isBookingModalOpen, bookingItem, closeBookingModal } = useBuilder() as any;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isBookingModalOpen) return null;

  const title = bookingItem?.title || 'طلب حجز واستشارة';
  const price = bookingItem?.price ? `${bookingItem.price}` : '';
  const isSubscription = bookingItem?.type === 'subscription' || title.includes('اشتراك') || title.includes('باقة');

  const themePrimary = website.theme?.colors?.primary || '#2563eb';
  const whatsappNum = String(
    website.settings?.floatingActions?.whatsappNumber || '201001234567'
  ).replace(/[^0-9]/g, '');

  const handleWhatsAppConfirm = () => {
    const textMsg = encodeURIComponent(
      `مرحباً ${website.name || ''}، أود تأكيد ${isSubscription ? 'الاشتراك في' : 'حجز'}:\n` +
      `📌 التفاصيل: ${title} ${price ? `(${price})` : ''}\n` +
      `👤 الاسم: ${fullName || 'غير محدد'}\n` +
      `📞 الهاتف: ${phone || 'غير محدد'}\n` +
      (date ? `📅 الموعد المفضل: ${date} ${time ? `الساعة ${time}` : ''}\n` : '') +
      (notes ? `📝 ملاحظات: ${notes}` : '')
    );
    window.open(`https://wa.me/${whatsappNum}?text=${textMsg}`, '_blank', 'noopener,noreferrer');
    setIsSubmitted(true);
  };

  const handleDirectConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;
    setIsSubmitted(true);
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setFullName('');
    setPhone('');
    setDate('');
    setTime('');
    setNotes('');
    closeBookingModal();
  };

  return (
    <div
      onClick={handleClose}
      className={`${
        contained ? 'absolute' : 'fixed'
      } inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 text-right animate-in fade-in duration-200`}
      dir={website.defaultDirection || 'rtl'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div
          className="p-4 sm:p-5 text-white flex items-center justify-between relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${themePrimary}, ${website.theme?.colors?.accent || themePrimary})`,
          }}
        >
          <div className="space-y-1 z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block">
              {isSubscription ? 'بطاقة الاشتراك المباشر' : 'بطاقة تأكيد الحجز'}
            </span>
            <h3 className="font-extrabold text-base sm:text-lg text-white truncate max-w-[280px]">
              {title}
            </h3>
            {price && (
              <span className="text-xs font-bold text-white/90 block">
                القيمة: <strong className="text-white text-sm">{price}</strong>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer z-10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {isSubmitted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="font-extrabold text-base text-slate-900">
                {isSubscription ? 'تم تسجيل طلب اشتراكك بنجاح!' : 'تم تأكيد طلب حجزك بنجاح!'}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                شكراً لك. سيقوم فريق خدمة العملاء بالتواصل معك هاتفياً أو عبر واتساب لتأكيد التفاصيل.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono text-center">
                رقم المرجع: #BK-{Math.floor(100000 + Math.random() * 900000)}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          ) : (
            <form onSubmit={handleDirectConfirm} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>الاسم بالكامل <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد الله"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 focus:bg-white font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>رقم الجوال أو واتساب <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 focus:bg-white font-semibold text-slate-800 text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>التاريخ المفضل</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>الوقت المفضل</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>ملاحظات أو استفسارات إضافية</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="اكتب أي ملاحظات أو متطلبات خاصة هنا..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 focus:bg-white text-slate-800 resize-none"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={!fullName || !phone}
                  style={{ backgroundColor: themePrimary }}
                  className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-md hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSubscription ? 'تأكيد طلب الاشتراك' : 'تأكيد الحجز الفوري'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppConfirm}
                  disabled={!fullName || !phone}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تأكيد وإرسال التفاصيل عبر واتساب</span>
                </button>
              </div>

              <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>بياناتك محمية ولن يتم مشاركتها مع أي طرف ثالث</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
