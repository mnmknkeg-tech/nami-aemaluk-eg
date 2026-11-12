import { redirect } from 'next/navigation';

/** تنبيهات النفاد بقت تبويب داخل صفحة المخزون */
export default function LowStockRedirect() {
  redirect('/dashboard/inventory?tab=alerts');
}
