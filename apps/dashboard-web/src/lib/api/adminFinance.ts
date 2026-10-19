/**
 * طبقة بيانات قسم المالية في أدمن المنصة.
 *
 * كل الأرقام هنا تخص شركة "نمّي أعمالك" نفسها (مش المتاجر):
 * إيراد الاشتراكات، المصاريف التشغيلية، تسويات المتاجر، والوعاء الضريبي.
 *
 * الـ endpoints مش موجودة في الـ backend لسه — لذلك كل دالة بترجع `null`
 * بدل ما ترمي استثناء، والواجهة بتعرض حالة "بانتظار الربط" بدل ما
 * تعرض أرقام وهمية أو تكرر نفس الـ placeholder في كل تبويب.
 */
import { apiRequest } from '@/lib/auth';

export type RevenueRow = {
  id: string;
  shopName: string;
  plan: string;
  amount: number;
  renewsAt: string;
  status: 'active' | 'overdue' | 'canceled' | 'trial';
};

export type ExpenseRow = {
  id: string;
  label: string;
  amount: number;
  category: string;
  spentAt: string;
  recurring: boolean;
};

export type SettlementRow = {
  id: string;
  shopName: string;
  grossSales: number;
  commission: number;
  netPayout: number;
  status: 'pending' | 'transferred' | 'disputed';
  transferredAt: string | null;
};

export type FinanceOverview = {
  monthRevenue: number;
  monthExpenses: number;
  netProfit: number;
  mrr: number;
  overdueSubscriptions: number;
  series: { month: string; revenue: number; expenses: number }[];
};

export type TaxSummary = {
  /** المبيعات المحتسبة (مدخلات). */
  outputVat: number;
  /** المشتريات (مخرجات). */
  inputVat: number;
  /** وعاء ضريبة القيمة المضافة = المدخلات − المخرجات. */
  netVatBase: number;
  /** الضريبة المستحقة = الوعاء × النسبة. */
  vatPayable: number;
  vatRate: number;
  periodLabel: string;
  dueAt: string;
  paid: boolean;
};

export type TaxObligation = {
  id: string;
  name: string;
  period: string;
  amount: number;
  dueAt: string;
  status: 'paid' | 'upcoming' | 'overdue';
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  amount: number | null;
  createdAt: string;
};

/** ترجع null بدل الرمي: الـ endpoint غير موجود = "لسه ما اتربطش". */
async function tryGet<T>(path: string): Promise<T | null> {
  try {
    return (await apiRequest(path)) as T;
  } catch {
    return null;
  }
}

export const fetchFinanceOverview = () => tryGet<FinanceOverview>('/admin/finance/overview');
export const fetchRevenueRows = () => tryGet<RevenueRow[]>('/admin/finance/revenue');
export const fetchExpenseRows = () => tryGet<ExpenseRow[]>('/admin/finance/expenses');
export const fetchSettlements = () => tryGet<SettlementRow[]>('/admin/finance/settlements');
export const fetchTaxSummary = () => tryGet<TaxSummary>('/admin/tax/vat');
export const fetchTaxObligations = () => tryGet<TaxObligation[]>('/admin/tax/obligations');
export const fetchAuditLog = (limit = 100) =>
  tryGet<AuditEntry[]>(`/admin/audit-log?limit=${limit}`);

/** نص تاريخ الاستحقاق بالعربي + تمييز المتأخر. */
export function dueTone(dueAt: string): 'red' | 'amber' | 'green' {
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) return 'amber';
  const days = (due - Date.now()) / 86_400_000;
  if (days < 0) return 'red';
  if (days <= 14) return 'amber';
  return 'green';
}
