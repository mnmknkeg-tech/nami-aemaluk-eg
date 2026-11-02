import { redirect } from 'next/navigation';

/** الباركود بقت تبويب داخل صفحة المنتجات */
export default function BarcodeRedirect() {
  redirect('/dashboard/inventory/products?tab=barcode');
}
