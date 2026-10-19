import { redirect } from 'next/navigation';

/** المتغيرات بقت تبويب داخل صفحة المنتجات */
export default function VariantsRedirect() {
  redirect('/dashboard/inventory/products?tab=variants');
}
