'use client';

import React, { useState, useMemo } from 'react';
import { Printer, X } from 'lucide-react';
import { readCurrentCashier } from '@/lib/posSettings';

/* ============================================================
 * Shared print utilities — used by sales list and order detail page.
 * ============================================================ */

export type PrintOrder = {
  id?: string;
  total?: number;
  items?: any[];
  notes?: string;
  createdAt?: string;
  created_at?: string;
  customerName?: string;
  customer_name?: string;
  customerPhone?: string;
  customer_phone?: string;
  customerNote?: string;
  customer_note?: string;
  user?: { name?: string; phone?: string };
};

export type PrintOverrides = {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerNote?: string;
  footerNote?: string;
  cashierName?: string;
};

// order notes carry "discount:fixed:8|tip:fixed:34" style metadata from POS checkout
export function parseOrderNotes(order: any): { discount: number; tip: number } {
  const notes = String(order?.notes || '');
  const grab = (key: string) => {
    const m = notes.match(new RegExp(`${key}:fixed:(\\d+(?:\\.\\d+)?)`));
    return m ? Number(m[1]) : 0;
  };
  return { discount: grab('discount'), tip: grab('tip') };
}

function escapeHtmlText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// Builds the exact print document for the invoice (80mm thermal) or the
// delivery waybill (A6 landscape). `ov` carries merchant edits from the preview.
export function buildPrintHtml(order: PrintOrder, shop: any, mode: 'invoice' | 'waybill', ov: PrintOverrides = {}): string {
  const normalizeNumber = (v: any) => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };
  const money = (n: number) => Math.round(n * 100) / 100;

  const items = Array.isArray(order?.items) ? order.items : [];
  const total = normalizeNumber(order?.total);
  const computedSubtotal = items.reduce((sum: number, it: any) => {
    const qty = normalizeNumber(it?.quantity ?? it?.qty ?? 0);
    const unit = normalizeNumber(it?.unitPrice ?? it?.unit_price ?? it?.price ?? 0);
    return sum + (qty * unit);
  }, 0);

  // discount/tip live inside notes, delivery fee is whatever remains of the total
  const { discount, tip } = parseOrderNotes(order);
  const deliveryFee = Math.max(total - computedSubtotal - discount - tip, 0);

  const orderId = String(order?.id || '').slice(0, 8).toUpperCase();
  const customerName = ov.customerName ?? order?.customerName ?? order?.customer_name ?? order?.user?.name ?? '';
  const customerPhone = ov.customerPhone ?? order?.customerPhone ?? order?.customer_phone ?? order?.user?.phone ?? '';
  const customerAddressRaw = ov.customerAddress;
  const customerAddress = customerAddressRaw !== undefined ? customerAddressRaw : deliveryAddressOf(order);
  const customerNote = ov.customerNote ?? order?.customerNote ?? order?.customer_note ?? '';
  const createdAtLabel = order?.createdAt || order?.created_at
    ? new Date(order.createdAt || order.created_at || '').toLocaleString('ar-EG')
    : '';

  const shopName = shop?.name || 'المتجر';
  const phone = shop?.phone || '';
  const city = shop?.city || '';
  const address = shop?.address || '';
  const footerNote = ov.footerNote ?? 'شكراً لتسوقك معنا!';

  if (mode === 'waybill') {
    return `<!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>بوليصة توصيل ${orderId}</title>
          <style>
            @page { size: A6 landscape; margin: 8mm; }
            body { font-family: Arial, sans-serif; direction: rtl; color: #111; margin: 0; padding: 4mm; }
            .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 6px; }
            .shop { font-size: 15px; font-weight: 700; }
            .tag { font-size: 11px; border: 1.5px solid #111; border-radius: 6px; padding: 2px 8px; font-weight: 700; }
            .oid { font-size: 20px; font-weight: 800; letter-spacing: 1px; margin-top: 8px; }
            .block { border: 1.5px solid #111; border-radius: 8px; padding: 8px 10px; margin-top: 8px; }
            .block .lbl { font-size: 10px; color: #444; font-weight: 700; }
            .block .val { font-size: 17px; font-weight: 800; margin-top: 2px; }
            .addr .val { font-size: 15px; line-height: 1.5; }
            .row2 { display: flex; gap: 8px; }
            .row2 .block { flex: 1; }
            .cod { display: flex; justify-content: space-between; align-items: center; border: 2px solid #111; border-radius: 8px; padding: 8px 10px; margin-top: 8px; font-size: 14px; font-weight: 800; }
            .cod .amt { font-size: 20px; }
            .sign { display: flex; gap: 8px; margin-top: 10px; }
            .sign div { flex: 1; border-top: 1.5px dashed #666; padding-top: 4px; font-size: 10px; color: #444; text-align: center; }
            .note { font-size: 11px; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="head">
            <span class="shop">${escapeHtmlText(shopName)}</span>
            <span class="tag">بوليصة توصيل</span>
          </div>
          <div class="oid">طلب: ${escapeHtmlText(orderId)}</div>
          <div class="block">
            <div class="lbl">العميل</div>
            <div class="val">${escapeHtmlText(customerName || '—')}</div>
          </div>
          <div class="row2">
            <div class="block">
              <div class="lbl">الهاتف</div>
              <div class="val" dir="ltr">${escapeHtmlText(customerPhone || '—')}</div>
            </div>
            <div class="block">
              <div class="lbl">التاريخ</div>
              <div class="val" style="font-size:13px;">${escapeHtmlText(createdAtLabel)}</div>
            </div>
          </div>
          <div class="block addr">
            <div class="lbl">عنوان التوصيل</div>
            <div class="val">${escapeHtmlText(customerAddress || 'استلام من المتجر')}${city ? ' — ' + escapeHtmlText(city) : ''}</div>
          </div>
          <div class="cod">
            <span>المبلغ المطلوب تحصيله (دفع عند الاستلام)</span>
            <span class="amt">ج.م ${money(total)}</span>
          </div>
          ${customerNote ? `<div class="note"><strong>ملاحظة:</strong> ${escapeHtmlText(customerNote)}</div>` : ''}
          <div class="sign">
            <div>توقيع المستلم</div>
            <div>توقيع المندوب</div>
          </div>
        </body>
      </html>`;
  }

  return `<!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>فاتورة ${orderId}</title>
          <style>
            @page { margin: 8mm; }
            body { font-family: Arial, sans-serif; direction: rtl; margin: 0; padding: 4mm; }
            .wrap { max-width: 80mm; margin: 0 auto; }
            h1 { font-size: 16px; margin: 0 0 6px; text-align: center; }
            .meta { font-size: 11px; color: #111; text-align: center; margin-bottom: 10px; }
            .sep { border-top: 1px dashed #999; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .totals { font-size: 12px; }
            .row { display:flex; justify-content: space-between; gap: 10px; padding: 4px 0; }
            .row.total { font-weight:700; border-top: 1px solid #111; margin-top: 4px; padding-top: 6px; font-size: 13px; }
            .foot { font-size: 11px; text-align:center; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <h1>${escapeHtmlText(shopName)}</h1>
            <div class="meta">
              ${orderId ? `<div><strong>طلب:</strong> ${escapeHtmlText(orderId)}</div>` : ''}
              ${phone ? `<div>${escapeHtmlText(phone)}</div>` : ''}
              ${city ? `<div>${escapeHtmlText(city)}</div>` : ''}
              ${address ? `<div>${escapeHtmlText(address)}</div>` : ''}
              ${customerName ? `<div style="margin-top:6px;"><strong>العميل:</strong> ${escapeHtmlText(customerName)}</div>` : ''}
              ${customerAddress ? `<div style="margin-top:4px;"><strong>العنوان:</strong> ${escapeHtmlText(customerAddress)}</div>` : ''}
              ${customerNote ? `<div style="margin-top:4px;"><strong>ملاحظة:</strong> ${escapeHtmlText(customerNote)}</div>` : ''}
              ${customerPhone ? `<div style="margin-top:6px;"><strong>الهاتف:</strong> ${escapeHtmlText(customerPhone)}</div>` : ''}
              ${createdAtLabel ? `<div style="margin-top:6px;">${escapeHtmlText(createdAtLabel)}</div>` : ''}
              ${ov.cashierName ? `<div style="margin-top:4px;"><strong>الكاشير:</strong> ${escapeHtmlText(ov.cashierName)}</div>` : ''}
            </div>
            <div class="sep"></div>
            <table>
              <tbody>
                ${items
                  .map((it: any) => {
                    const baseName = it?.product?.name || it?.name || it?.title || '-';
                    const name = escapeHtmlText(String(baseName).trim());
                    const qty = normalizeNumber(it?.quantity ?? it?.qty ?? 0);
                    const unit = normalizeNumber(it?.unitPrice ?? it?.unit_price ?? it?.price ?? 0);
                    const lineTotal = qty * unit;
                    return `
                      <tr>
                        <td style="padding: 6px 0;">${name || '-'}</td>
                        <td style="padding: 6px 0; text-align:left;">${qty || 0}x</td>
                        <td style="padding: 6px 0; text-align:left;">${money(lineTotal)}</td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
            <div class="sep"></div>
            <div class="totals">
              <div class="row"><span>المجموع الفرعي</span><span>ج.م ${money(computedSubtotal)}</span></div>
              ${deliveryFee > 0 ? `<div class="row"><span>الشحن</span><span>ج.م ${money(deliveryFee)}</span></div>` : ''}
              ${discount > 0 ? `<div class="row"><span>الخصم</span><span>ج.م -${money(discount)}</span></div>` : ''}
              ${tip > 0 ? `<div class="row"><span>إكرامية</span><span>ج.م ${money(tip)}</span></div>` : ''}
              <div class="row total"><span>الإجمالي</span><span>ج.م ${money(total)}</span></div>
            </div>
            ${footerNote ? `<div class="sep"></div><div class="foot">${escapeHtmlText(footerNote)}</div>` : ''}
          </div>
        </body>
      </html>`;
}

// mirror of lib/sales-utils getDeliveryAddress to avoid pulling extra deps here
function deliveryAddressOf(order: any): string {
  return String(
    order?.deliveryAddress
    || order?.delivery_address
    || order?.deliveryAddressManual
    || order?.delivery_address_manual
    || order?.user?.address
    || '',
  );
}

export function PrintPreviewModal({ order, shop, mode, onClose }: {
  order: PrintOrder; shop: any; mode: 'invoice' | 'waybill'; onClose: () => void;
}) {
  const [ov, setOv] = useState<PrintOverrides>({});
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  // current cashier session (set at POS gate login) — shows on the invoice
  const sessionCashier = React.useMemo(() => {
    try {
      const c = readCurrentCashier();
      return c?.name || '';
    } catch {
      return '';
    }
  }, []);
  const html = useMemo(
    () => buildPrintHtml(order, shop, mode, { cashierName: sessionCashier, ...ov }),
    [order, shop, mode, ov, sessionCashier]
  );
  const isInvoice = mode === 'invoice';

  const originalName = order?.customerName || order?.customer_name || order?.user?.name || '';
  const originalPhone = order?.customerPhone || order?.customer_phone || order?.user?.phone || '';
  const originalAddress = deliveryAddressOf(order);
  const originalNote = order?.customerNote || order?.customer_note || '';

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  const field = (label: string, key: keyof PrintOverrides, placeholder: string, multiline = false) => (
    <div>
      <label className="text-[11px] font-bold text-slate-500 mb-1 block">{label}</label>
      {multiline ? (
        <textarea
          rows={2}
          value={ov[key] ?? ''}
          onChange={(e) => setOv((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-slate-900 resize-none"
        />
      ) : (
        <input
          type="text"
          value={ov[key] ?? ''}
          onChange={(e) => setOv((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-slate-900"
        />
      )}
      {(ov[key] ?? '') !== '' && (
        <button type="button" onClick={() => setOv((p) => ({ ...p, [key]: undefined }))} className="text-[10px] font-bold text-slate-400 hover:text-slate-700 mt-0.5">
          رجوع للأصلي
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-5xl w-full h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-[15px] font-extrabold text-slate-900">
            {isInvoice ? 'معاينة الفاتورة' : 'معاينة بوليصة التوصيل'}
            <span className="text-slate-400 font-bold text-xs mr-2">#{String(order.id || '').slice(0, 8).toUpperCase()}</span>
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 flex items-center gap-1.5">
              <Printer size={14} /> طباعة
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg">
              <X size={18} className="text-slate-400" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex min-h-0">
          {/* preview */}
          <div className="flex-1 bg-slate-100 p-4 overflow-auto">
            <iframe
              ref={iframeRef}
              title="print-preview"
              srcDoc={html}
              className="w-full h-full bg-white border border-slate-200 rounded-lg shadow-sm"
            />
          </div>
          {/* edit panel */}
          <div className="w-72 shrink-0 border-l border-slate-200 p-4 space-y-3 overflow-y-auto">
            <p className="text-[11px] font-bold text-slate-400 leading-4">
              عدّل أي بيانات قبل الطباعة — المعاينة تتحدث فورًا. التعديل هنا لا يغير بيانات الطلب نفسه.
            </p>
            {field('اسم العميل', 'customerName', originalName || 'اكتب اسم العميل')}
            {field('رقم الهاتف', 'customerPhone', originalPhone || '01xxxxxxxxx')}
            {field('عنوان التوصيل', 'customerAddress', originalAddress || 'اكتب العنوان', true)}
            {field('ملاحظة على الورقة', 'customerNote', originalNote || 'ملاحظة (اختياري)', true)}
            {isInvoice && field('تذييل الفاتورة', 'footerNote', 'شكراً لتسوقك معنا!')}
          </div>
        </div>
      </div>
    </div>
  );
}
