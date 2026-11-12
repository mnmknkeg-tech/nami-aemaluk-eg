import { redirect } from 'next/navigation';

/** الفئات بقت تبويب داخل صفحة المنتجات */
export default function CategoriesRedirect() {
  redirect('/dashboard/inventory/products?tab=categories');
}
