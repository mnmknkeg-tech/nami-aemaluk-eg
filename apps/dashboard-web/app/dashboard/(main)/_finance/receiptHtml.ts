import type { InvoiceLine, ReceiptTheme } from './types';

export type InvoiceHtmlParams = {
  lines: InvoiceLine[];
  isArabic: boolean;
  receiptTheme: ReceiptTheme;
  selectedInvoiceId: string;
  invoiceDate: string;
  subtotal: number;
  discount: number;
  showVat: boolean;
  vatRatePct: number;
  vatAmount: number;
  total: number;
};

/** بناء HTML إيصال الطباعة (نافذة منفصلة) */
export function buildPrintInvoiceHtml(p: InvoiceHtmlParams): string {
  const { lines, isArabic, receiptTheme, selectedInvoiceId, invoiceDate } = p;
  const { subtotal, discount, showVat, vatRatePct, vatAmount, total } = p;
  const escapeHtml = (v: any) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const fmt = (n: any) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');

  const linesHtml = lines
    .map(
      (l) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(l.name)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${l.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmt(l.price)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmt(l.price * l.quantity)}</td>
      </tr>
    `
    )
    .join('');

  const html = `<!doctype html>
    <html dir="${isArabic ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8"/>
      <title>${escapeHtml(receiptTheme.shopName || 'Invoice')}</title>
      <style>
        @page { margin: 10mm; size: A4; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: #f5f5f5;
        }
        .invoice-container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #BD00FF;
        }
        .logo img { max-height: 60px; max-width: 200px; }
        .shop-info h1 { margin: 0; color: #BD00FF; font-size: 24px; }
        .shop-info p { margin: 5px 0; color: #666; font-size: 14px; }
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
        }
        .meta-item { flex: 1; }
        .meta-label { font-weight: bold; color: #333; font-size: 12px; }
        .meta-value { color: #666; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { 
          background: #BD00FF; 
          color: white; 
          padding: 12px; 
          text-align: ${isArabic ? 'right' : 'left'}; 
          font-weight: bold;
        }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .totals {
          margin-top: 20px;
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .total-row.final {
          border-bottom: none;
          font-size: 18px;
          font-weight: bold;
          color: #BD00FF;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #BD00FF;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        @media print {
          body { background: white; }
          .invoice-container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="logo">
            ${receiptTheme.logoDataUrl ? `<img src="${escapeHtml(receiptTheme.logoDataUrl)}" alt="Logo">` : ''}
          </div>
          <div class="shop-info">
            <h1>${escapeHtml(receiptTheme.shopName || 'Shop Name')}</h1>
            <p>${escapeHtml(receiptTheme.address || '')}</p>
            <p>${escapeHtml(receiptTheme.city || '')} | ${escapeHtml(receiptTheme.phone || '')}</p>
          </div>
        </div>

        <div class="invoice-meta">
          <div class="meta-item">
            <div class="meta-label">${isArabic ? 'رقم الفاتورة' : 'Invoice #'}</div>
            <div class="meta-value">${escapeHtml(selectedInvoiceId || 'NEW')}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">${isArabic ? 'التاريخ' : 'Date'}</div>
            <div class="meta-value">${escapeHtml(invoiceDate)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${isArabic ? 'الصنف' : 'Item'}</th>
              <th style="text-align: center;">${isArabic ? 'الكمية' : 'Qty'}</th>
              <th style="text-align: right;">${isArabic ? 'السعر' : 'Price'}</th>
              <th style="text-align: right;">${isArabic ? 'المجموع' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>${isArabic ? 'المجموع الفرعي' : 'Subtotal'}</span>
            <span>${fmt(subtotal)}</span>
          </div>
          ${
            discount > 0
              ? `
          <div class="total-row">
            <span>${isArabic ? 'الخصم' : 'Discount'}</span>
            <span>-${fmt(discount)}</span>
          </div>
          `
              : ''
          }
          ${
            showVat
              ? `
          <div class="total-row">
            <span>${isArabic ? `ضريبة القيمة المضافة (${vatRatePct}%)` : `VAT (${vatRatePct}%)`}</span>
            <span>${fmt(vatAmount)}</span>
          </div>
          `
              : ''
          }
          <div class="total-row final">
            <span>${isArabic ? 'الإجمالي' : 'Total'}</span>
            <span>${fmt(total)}</span>
          </div>
        </div>

        <div class="footer">
          <p>${escapeHtml(receiptTheme.footerNote || '')}</p>
          <p>${isArabic ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</p>
        </div>
      </div>
    </body>
    </html>`;

  return html;
}

/** طباعة الإيصال عبر نافذة منفصلة */
export function printInvoiceWindow(html: string): void {
  try {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=800,height=1000');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try {
        w.print();
      } catch {}
    }, 500);
  } catch (e) {
    console.error('Print error:', e);
  }
}

/** بناء HTML تصدير PDF (iframe) */
export function buildPdfInvoiceHtml(p: InvoiceHtmlParams): string {
  const { lines, isArabic, receiptTheme, selectedInvoiceId, invoiceDate } = p;
  const { subtotal, discount, showVat, vatRatePct, vatAmount, total } = p;
  const escapeHtml = (v: any) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const fmt = (n: any) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00');

  const linesHtml = lines
    .map(
      (l) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(l.name)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${l.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmt(l.price)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${fmt(l.price * l.quantity)}</td>
      </tr>
    `
    )
    .join('');

  const html = `<!doctype html>
    <html dir="${isArabic ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8"/>
      <title>${escapeHtml(receiptTheme.shopName || 'Invoice')}</title>
      <style>
        @page { margin: 10mm; size: A4; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 20px; 
        }
        .invoice-container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 30px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #BD00FF;
        }
        .logo img { max-height: 60px; max-width: 200px; }
        .shop-info h1 { margin: 0; color: #BD00FF; font-size: 24px; }
        .shop-info p { margin: 5px 0; color: #666; font-size: 14px; }
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
        }
        .meta-item { flex: 1; }
        .meta-label { font-weight: bold; color: #333; font-size: 12px; }
        .meta-value { color: #666; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { 
          background: #BD00FF; 
          color: white; 
          padding: 12px; 
          text-align: ${isArabic ? 'right' : 'left'}; 
          font-weight: bold;
        }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .totals {
          margin-top: 20px;
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        .total-row.final {
          border-bottom: none;
          font-size: 18px;
          font-weight: bold;
          color: #BD00FF;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #BD00FF;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="logo">
            ${receiptTheme.logoDataUrl ? `<img src="${escapeHtml(receiptTheme.logoDataUrl)}" alt="Logo">` : ''}
          </div>
          <div class="shop-info">
            <h1>${escapeHtml(receiptTheme.shopName || 'Shop Name')}</h1>
            <p>${escapeHtml(receiptTheme.address || '')}</p>
            <p>${escapeHtml(receiptTheme.city || '')} | ${escapeHtml(receiptTheme.phone || '')}</p>
          </div>
        </div>

        <div class="invoice-meta">
          <div class="meta-item">
            <div class="meta-label">${isArabic ? 'رقم الفاتورة' : 'Invoice #'}</div>
            <div class="meta-value">${escapeHtml(selectedInvoiceId || 'NEW')}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">${isArabic ? 'التاريخ' : 'Date'}</div>
            <div class="meta-value">${escapeHtml(invoiceDate)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${isArabic ? 'الصنف' : 'Item'}</th>
              <th style="text-align: center;">${isArabic ? 'الكمية' : 'Qty'}</th>
              <th style="text-align: right;">${isArabic ? 'السعر' : 'Price'}</th>
              <th style="text-align: right;">${isArabic ? 'المجموع' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>${isArabic ? 'المجموع الفرعي' : 'Subtotal'}</span>
            <span>${fmt(subtotal)}</span>
          </div>
          ${
            discount > 0
              ? `
          <div class="total-row">
            <span>${isArabic ? 'الخصم' : 'Discount'}</span>
            <span>-${fmt(discount)}</span>
          </div>
          `
              : ''
          }
          ${
            showVat
              ? `
          <div class="total-row">
            <span>${isArabic ? `ضريبة القيمة المضافة (${vatRatePct}%)` : `VAT (${vatRatePct}%)`}</span>
            <span>${fmt(vatAmount)}</span>
          </div>
          `
              : ''
          }
          <div class="total-row final">
            <span>${isArabic ? 'الإجمالي' : 'Total'}</span>
            <span>${fmt(total)}</span>
          </div>
        </div>

        <div class="footer">
          <p>${escapeHtml(receiptTheme.footerNote || '')}</p>
          <p>${isArabic ? 'شكراً لتعاملكم معنا' : 'Thank you for your business'}</p>
        </div>
      </div>
    </body>
    </html>`;

  return html;
}

/** تصدير PDF عبر iframe مخفي */
export function printPdfViaIframe(html: string): void {
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('PDF export error:', e);
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 1000);
    };
  } catch (e) {
    console.error('PDF export error:', e);
  }
}
