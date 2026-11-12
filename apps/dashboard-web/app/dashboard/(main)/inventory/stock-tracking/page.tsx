import { redirect } from 'next/navigation';

/** تتبع الكميات بقي تبويب "حركة المخزون" داخل صفحة المخزون */
export default function StockTrackingRedirect() {
  redirect('/dashboard/inventory?tab=movements');
}
