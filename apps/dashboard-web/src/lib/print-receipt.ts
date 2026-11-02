'use client';

/**
 * Popup-blocker-proof receipt printing.
 *
 * window.open('', '_blank') gets blocked by browsers («المتصفح منعو») — instead
 * we mount a hidden <iframe>, write the receipt HTML into it, and call print()
 * on its contentWindow. Same-document printing is never popup-blocked.
 */

let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

export function printHtmlReceipt(html: string): void {
  if (typeof window === 'undefined') return;
  try {
    // Remove any leftover frame from a previous print first
    document.getElementById('pos-receipt-print-frame')?.remove();
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'pos-receipt-print-frame';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('title', 'receipt-print');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.style.right = '0';
    iframe.style.bottom = '0';

    const cleanup = () => {
      try {
        iframe.remove();
      } catch {}
    };

    iframe.addEventListener('load', () => {
      try {
        const win = iframe.contentWindow;
        if (!win) return;
        win.focus();
        win.print();
      } catch {}
    });

    iframe.srcdoc = html;
    document.body.appendChild(iframe);

    // Remove the frame after printing (afterprint when available, else ~60s)
    try {
      const win = iframe.contentWindow;
      win?.addEventListener('afterprint', cleanup);
      window.addEventListener('afterprint', cleanup, { once: true });
    } catch {}
    cleanupTimer = setTimeout(cleanup, 60_000);
  } catch {}
}

/** Data for the «إشعار مرتجع» 80mm receipt. */
export interface ReturnReceiptData {
  shopName: string;
  orderNo: string;
  cashierName?: string;
  items: { name: string; qty: number; amount: number }[];
  total: number;
  reason?: string;
  currency?: string;
}

function esc(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Builds the «إشعار مرتجع» receipt HTML (80mm thermal, RTL). */
export function buildReturnReceiptHtml(data: ReturnReceiptData): string {
  const currency = data.currency || 'ج.م';
  const fmt = (n: number) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');
  const when = new Date().toLocaleString('ar-EG');
  const rows = (Array.isArray(data.items) ? data.items : [])
    .map(
      (it) =>
        `<tr><td style="padding:5px 0;color:#dc2626;">${esc(it.name)}</td><td style="padding:5px 0;text-align:left;color:#dc2626;">${Number(
          it.qty
        )}x</td><td style="padding:5px 0;text-align:left;color:#dc2626;">${esc(fmt(Number(it.amount)))}</td></tr>`
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><title>إشعار مرتجع</title>
  <style>@page{margin:8mm}body{font-family:Arial,sans-serif;direction:rtl}.wrap{max-width:80mm;margin:0 auto}h1{font-size:16px;text-align:center}.meta{font-size:11px;text-align:center;margin-bottom:10px}.sep{border-top:1px dashed #999;margin:10px 0}table{width:100%;border-collapse:collapse;font-size:12px}.row{display:flex;justify-content:space-between;padding:4px 0}.foot{font-size:12px;text-align:center;margin-top:12px;font-weight:700}</style>
  </head><body><div class="wrap">
  <h1>${esc(data.shopName || 'Receipt')}</h1>
  <div class="meta">
  <div><strong>إشعار مرتجع</strong></div>
  <div>فاتورة أصل #${esc(
    String(data.orderNo || '')
      .slice(0, 8)
      .toUpperCase()
  )}</div>
  <div>${esc(when)}</div>
  ${data.cashierName ? `<div>الكاشير: ${esc(data.cashierName)}</div>` : ''}
  </div>
  <div class="sep"></div>
  <table><tbody>${rows}</tbody></table>
  <div class="sep"></div>
  <div class="row" style="color:#dc2626;font-weight:700;"><span>إجمالي المرتجع</span><span>- ${esc(currency)} ${esc(fmt(Number(data.total)))}</span></div>
  ${data.reason ? `<div class="row" style="font-size:11px;color:#666;"><span>السبب</span><span>${esc(data.reason)}</span></div>` : ''}
  <div class="foot">تم إرجاع المبلغ للعميل</div>
  </div></body></html>`;
}
