import { redirect } from 'next/navigation';

/** النقل بين المخازن بقي تبويب داخل صفحة المخازن */
export default function TransfersRedirect() {
  redirect('/dashboard/inventory/warehouses?tab=transfers');
}
