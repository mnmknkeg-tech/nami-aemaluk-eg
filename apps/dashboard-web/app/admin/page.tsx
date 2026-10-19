import { redirect } from 'next/navigation';

// /admin بدون مسار — توجيه مباشر للوحة الأدمن الرئيسية بدل 404
export default function AdminIndexPage() {
  redirect('/admin/dashboard');
}
