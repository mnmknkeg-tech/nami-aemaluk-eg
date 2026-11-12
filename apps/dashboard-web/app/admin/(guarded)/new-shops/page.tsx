import { redirect } from 'next/navigation';

// صفحة المتاجر الجديدة اتدمجت في صفحة المتاجر كتبويب — الرابط القديم بيحوّل للتبويب مباشرة
export default function AdminNewShopsRedirect() {
  redirect('/admin/shops?tab=new');
}
