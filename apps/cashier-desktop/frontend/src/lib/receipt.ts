// 80mm thermal receipt HTML — same style as dashboard src/lib/pos-printer.ts
import type { Order, OrderItem } from './api';

const money = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '0.00');

export function generateReceiptHtml(
  order: Order,
  items: OrderItem[],
  shopName: string,
  cashierName: string
): string {
  const dt = new Date(order.createdAt.includes('T') ? order.createdAt : order.createdAt + 'Z');
  const dateStr = dt.toLocaleString('ar-EG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const methodMap: Record<string, string> = {
    COD: 'كاش',
    CARD: 'بطاقة',
    WALLET: 'محفظة',
    CREDIT: 'آجل',
    SPLIT: 'مقسّم',
  };

  const rows = items
    .map(
      (it) => `
      <tr>
        <td class="qty">${it.quantity}</td>
        <td class="name">${escapeHtml(it.name)}</td>
        <td class="amt">${money(it.price * it.quantity)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Tahoma, 'Segoe UI', sans-serif; width: 80mm; padding: 4mm 2mm; color: #000; }
  .center { text-align: center; }
  .shop-name { font-size: 15px; font-weight: 900; margin-bottom: 2mm; }
  .muted { font-size: 10px; color: #444; }
  .divider { border-top: 1px dashed #000; margin: 2mm 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: right; border-bottom: 1px solid #000; padding: 1mm 0; font-size: 10px; }
  td { padding: 1.2mm 0; vertical-align: top; }
  td.qty { width: 8mm; text-align: center; }
  td.amt { width: 18mm; text-align: left; white-space: nowrap; }
  .totals { width: 100%; font-size: 12px; margin-top: 1mm; }
  .totals td { padding: 0.8mm 0; }
  .totals .grand { font-size: 15px; font-weight: 900; border-top: 1px solid #000; padding-top: 1.5mm; }
  .footer { text-align: center; font-size: 10px; margin-top: 3mm; }
</style>
</head>
<body>
  <div class="center">
    <div class="shop-name">${escapeHtml(shopName || 'كاشير')}</div>
    <div class="muted">فاتورة كاشير</div>
  </div>
  <div class="divider"></div>
  <div class="muted">
    رقم: ${escapeHtml(order.id.slice(0, 8))}<br/>
    التاريخ: ${dateStr}<br/>
    الكاشير: ${escapeHtml(cashierName || '-')}<br/>
    ${order.paymentMethod ? 'الدفع: ' + (methodMap[order.paymentMethod] || order.paymentMethod) : ''}
  </div>
  <div class="divider"></div>
  <table>
    <thead>
      <tr><th class="qty">كمية</th><th>الصنف</th><th class="amt">السعر</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="divider"></div>
  <table class="totals">
    <tr><td>الإجمالي الفرعي</td><td style="text-align:left">${money(order.subtotal)} ج.م</td></tr>
    ${order.discount > 0 ? `<tr><td>الخصم</td><td style="text-align:left">- ${money(order.discount)} ج.م</td></tr>` : ''}
    <tr class="grand"><td>الإجمالي</td><td style="text-align:left">${money(order.total)} ج.م</td></tr>
  </table>
  <div class="footer">شكرًا لتعاملكم معنا 🌟</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Print through a hidden iframe like the dashboard printHtmlReceipt —
// works inside the WebView2 without opening popups.
export function printReceipt(html: string) {
  const existing = document.getElementById('receipt-print-frame');
  if (existing) existing.remove();
  const frame = document.createElement('iframe');
  frame.id = 'receipt-print-frame';
  frame.style.position = 'fixed';
  frame.style.width = '80mm';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';
  frame.srcdoc = html;
  document.body.appendChild(frame);
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      /* user cancelled */
    }
    setTimeout(() => frame.remove(), 60_000);
  };
}
