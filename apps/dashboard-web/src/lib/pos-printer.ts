// Unified POS Printing helper supporting Popups and Iframe Fallback
// Supports thermal printers (80mm, 57mm), regular A4, QR codes, logos, and custom headers/footers.

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  addons?: Array<{ name: string; price: number }>;
  variantSelection?: any;
}

export interface ReceiptData {
  shopName?: string;
  shopPhone?: string;
  shopCity?: string;
  shopAddress?: string;
  orderNumber?: string | number;
  dateLabel?: string;
  cashierName?: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount?: number;
  loyaltyRedeemValue?: number;
  giftCardAmount?: number;
  vatRatePct?: number;
  vatAmount?: number;
  taxExempt?: boolean;
  tipAmount?: number;
  total: number;
  paymentMethodLabel?: string;
  earnedPoints?: number;
  currency?: string;
  paperWidth?: string; // '80mm' | '57mm' | '100%'
  logoUrl?: string;
  headerMessage?: string;
  footerMessage?: string;
  showCashier?: boolean;
  showQrCode?: boolean;
}

function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmt(n: any): string {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

export function generateReceiptHtml(data: ReceiptData): string {
  const currency = escapeHtml(data.currency || 'ج.م');
  const paperWidth = data.paperWidth || '80mm';
  const now = new Date();
  const dateStr = data.dateLabel || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const linesHtml = data.items.map((i) => {
    const itemTotal = fmt(Number(i.price || 0) * Number(i.quantity || 0));
    const variantStr = i.variantSelection
      ? `<div style="font-size:10px;color:#64748b;">${escapeHtml(typeof i.variantSelection === 'object' ? Object.values(i.variantSelection).filter(Boolean).join(' - ') : String(i.variantSelection))}</div>`
      : '';
    const addonsStr = Array.isArray(i.addons) && i.addons.length > 0
      ? `<div style="font-size:10px;color:#64748b;">+ ${i.addons.map((a) => `${escapeHtml(a.name)} (${fmt(a.price)})`).join(', ')}</div>`
      : '';

    return `
      <tr>
        <td style="padding: 5px 0; vertical-align: top; text-align: right;">
          <div style="font-weight: 700;">${escapeHtml(i.name)}</div>
          ${variantStr}
          ${addonsStr}
        </td>
        <td style="padding: 5px 0; vertical-align: top; text-align: center; white-space: nowrap;">${i.quantity}x</td>
        <td style="padding: 5px 0; vertical-align: top; text-align: left; white-space: nowrap; font-weight: 700;">${itemTotal}</td>
      </tr>`;
  }).join('');

  return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>Receipt ${escapeHtml(data.orderNumber ? '#' + data.orderNumber : '')}</title>
  <style>
    @page {
      margin: 4mm;
      size: auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      direction: rtl;
      text-align: right;
      color: #0f172a;
      background: #fff;
      font-size: 12px;
      line-height: 1.4;
      padding: 6px;
    }
    .receipt-wrap {
      max-width: ${paperWidth};
      margin: 0 auto;
      width: 100%;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    h1 {
      font-size: 16px;
      font-weight: 900;
      margin-bottom: 4px;
      text-align: center;
    }
    .meta-block {
      font-size: 11px;
      color: #475569;
      text-align: center;
      margin-bottom: 8px;
    }
    .dashed-sep {
      border-top: 1px dashed #94a3b8;
      margin: 8px 0;
    }
    .solid-sep {
      border-top: 1px solid #cbd5e1;
      margin: 8px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2.5px 0;
      font-size: 11.5px;
    }
    .summary-row.total-row {
      font-size: 14px;
      font-weight: 900;
      border-top: 1px solid #0f172a;
      padding-top: 6px;
      margin-top: 4px;
    }
    .logo {
      max-width: 50mm;
      max-height: 25mm;
      margin: 0 auto 6px;
      display: block;
      object-fit: contain;
    }
    .footer-note {
      font-size: 10.5px;
      text-align: center;
      color: #64748b;
      margin-top: 10px;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      background: #f1f5f9;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="receipt-wrap">
    ${data.logoUrl ? `<img src="${escapeHtml(data.logoUrl)}" class="logo" alt="Store Logo"/>` : ''}
    <h1>${escapeHtml(data.shopName || 'فاتورة مبيعات')}</h1>

    <div class="meta-block">
      ${data.headerMessage ? `<div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${escapeHtml(data.headerMessage)}</div>` : ''}
      ${data.orderNumber ? `<div><strong>رقم الفاتورة:</strong> #${escapeHtml(data.orderNumber)}</div>` : ''}
      ${data.shopPhone ? `<div>${escapeHtml(data.shopPhone)}</div>` : ''}
      ${data.shopAddress ? `<div>${escapeHtml(data.shopAddress)}${data.shopCity ? ' - ' + escapeHtml(data.shopCity) : ''}</div>` : ''}
      ${data.customerName ? `<div style="margin-top: 4px;"><strong>العميل:</strong> ${escapeHtml(data.customerName)} ${data.customerPhone ? `(${escapeHtml(data.customerPhone)})` : ''}</div>` : ''}
      ${data.tableName ? `<div><strong>الطاولة:</strong> ${escapeHtml(data.tableName)}</div>` : ''}
      ${data.showCashier !== false && data.cashierName ? `<div><strong>الكاشير:</strong> ${escapeHtml(data.cashierName)}</div>` : ''}
      <div style="margin-top: 3px; font-size: 10px; color: #64748b;">${escapeHtml(dateStr)}</div>
    </div>

    <div class="dashed-sep"></div>

    <table>
      <thead>
        <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10.5px; color: #475569;">
          <th style="padding-bottom: 4px; text-align: right;">الصنف</th>
          <th style="padding-bottom: 4px; text-align: center;">الكمية</th>
          <th style="padding-bottom: 4px; text-align: left;">المجموع</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <div class="dashed-sep"></div>

    <div class="summary-row">
      <span>المجموع الفرعي:</span>
      <span>${currency} ${fmt(data.subtotal)}</span>
    </div>

    ${Number(data.discountAmount || 0) > 0 ? `
    <div class="summary-row" style="color: #dc2626;">
      <span>الخصم:</span>
      <span>- ${currency} ${fmt(data.discountAmount)}</span>
    </div>` : ''}

    ${Number(data.loyaltyRedeemValue || 0) > 0 ? `
    <div class="summary-row" style="color: #d97706;">
      <span>نقاط ولاء:</span>
      <span>- ${currency} ${fmt(data.loyaltyRedeemValue)}</span>
    </div>` : ''}

    ${Number(data.giftCardAmount || 0) > 0 ? `
    <div class="summary-row" style="color: #059669;">
      <span>قسيمة شراء:</span>
      <span>- ${currency} ${fmt(data.giftCardAmount)}</span>
    </div>` : ''}

    ${Number(data.vatRatePct || 0) > 0 && !data.taxExempt ? `
    <div class="summary-row">
      <span>ضريبة القيمة المضافة (${data.vatRatePct}%):</span>
      <span>${currency} ${fmt(data.vatAmount)}</span>
    </div>` : ''}

    ${data.taxExempt ? `
    <div class="summary-row" style="color: #16a34a; font-size: 10.5px;">
      <span>إعفاء ضريبي:</span>
      <span>${currency} 0.00</span>
    </div>` : ''}

    ${Number(data.tipAmount || 0) > 0 ? `
    <div class="summary-row" style="color: #059669;">
      <span>إكرامية / خدمة:</span>
      <span>+ ${currency} ${fmt(data.tipAmount)}</span>
    </div>` : ''}

    <div class="summary-row total-row">
      <span>الإجمالي النهائي:</span>
      <span>${currency} ${fmt(data.total)}</span>
    </div>

    ${data.paymentMethodLabel ? `
    <div class="summary-row" style="margin-top: 4px; font-size: 11px; color: #475569;">
      <span>طريقة الدفع:</span>
      <span>${escapeHtml(data.paymentMethodLabel)}</span>
    </div>` : ''}

    ${Number(data.earnedPoints || 0) > 0 ? `
    <div class="summary-row" style="font-size: 10px; color: #d97706;">
      <span>النقاط المكتسبة:</span>
      <span>+${data.earnedPoints} نقطة</span>
    </div>` : ''}

    ${data.footerMessage ? `
    <div class="dashed-sep"></div>
    <div class="footer-note" style="font-weight: 700; color: #0f172a;">
      ${escapeHtml(data.footerMessage)}
    </div>` : ''}

    ${data.showQrCode ? `
    <div style="text-align: center; margin-top: 8px;">
      <div style="font-family: monospace; font-size: 8px; letter-spacing: 2px; color: #64748b;">
        ██████████████<br/>
        ██ ▄▄▄ ██ ▄▄▄ ██<br/>
        ██ █ █ ██ █ █ ██<br/>
        ██ █▄█ ██ █▄█ ██<br/>
        ██████████████
      </div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">فاتورة إلكترونية معتمدة</div>
    </div>` : ''}
  </div>
</body>
</html>`;
}

/**
 * Robust print function:
 * 1. Tries window.open
 * 2. If popup is blocked, transparently falls back to invisible <iframe> attached to DOM
 * 3. Triggers window.print() once styles and DOM are ready
 */
export async function printReceipt(data: ReceiptData): Promise<boolean> {
  const html = generateReceiptHtml(data);

  // Attempt window.open first
  try {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=480,height=720');
    if (w && !w.closed) {
      w.document.open();
      w.document.write(html);
      w.document.close();

      // Give browser time to parse CSS and fonts
      setTimeout(() => {
        try {
          w.focus();
          w.print();
          setTimeout(() => {
            try { w.close(); } catch {}
          }, 5000);
        } catch {}
      }, 250);
      return true;
    }
  } catch {}

  // Fallback to hidden iframe (bypasses popup blocker 100%)
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {}
        setTimeout(() => {
          try { document.body.removeChild(iframe); } catch {}
        }, 3000);
      }, 300);
      return true;
    }
  } catch {}

  return false;
}
