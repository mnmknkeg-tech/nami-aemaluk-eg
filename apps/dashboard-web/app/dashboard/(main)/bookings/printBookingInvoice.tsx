'use client';
import React, { Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
import { format as dfFormat, parse as dfParse, startOfWeek as dfStartOfWeek } from 'date-fns';
import { apiRequest } from '@/lib/auth';
import { addBookingViaBackend, updateBookingStatusViaBackend } from '@/lib/api/bookings';
import { readShopBookingConfig, type ShopBookingConfig } from '@ray-eg/shared/booking';
import {
  ACTIVITY_META,
  ACTIVITY_ORDER,
  STATUS_META,
  cairoPartsFromIso,
  normStatus,
  type ActivityType,
  type UnifiedStatus,
} from '@/lib/bookings/ui';
import {
  type ViewMode,
  type BookingItem,
  type GridBlock,
  ARABIC_MONTHS,
  WEEK_DAYS,
  UUID_RE,
  QUICK_TIMES,
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
  useNow,
  layoutGridBlocks,
  waMeLink,
} from './shared';

const MotionDiv = motion.div as any;

export function printBookingInvoice(b: BookingItem, shopName: string): void {
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
