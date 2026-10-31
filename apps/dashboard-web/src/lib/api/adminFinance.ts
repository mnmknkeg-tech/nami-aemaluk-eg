/**
 * طبقة بيانات قسم المالية: ربط بـ Go backend (gobackend/internal/domains/finance).
 *
 * المسارات المتوفرة بالخادم:
 *   GET /finance/reports/cashflow/shop/:shopId
 *   GET /finance/reports/profit/shop/:shopId
 *   GET /finance/reports/revenue/shop/:shopId
 *
 * ملاحظة:
 *   - كل request يأخذ shopId من سياق المستخدم (User.ShopID).
 *   - الـ economics للمتجر (التسويات، الضريبة، سجلات المراجعة) مش متاحة لسه
 *     -> ردد `null` واعرض "لسه متاح" في الواجهة بدل رقم وهمي.
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

export const fetchFinanceOverview = (shopId?: string) => {
  const id = shopId || 'me';
  return tryGet<FinanceOverview>(`/finance/reports/revenue/shop/${id}`);
};
export const fetchRevenueRows = (shopId?: string) => {
  const id = shopId || 'me';
  return tryGet<RevenueRow[]>(`/finance/reports/revenue/shop/${id}`);
};
export const fetchExpenseRows = (shopId?: string) => {
  const id = shopId || 'me';
  return tryGet<ExpenseRow[]>(`/finance/reports/profit/shop/${id}`);
};
export const fetchSettlements = (): Promise<SettlementRow[] | null> => Promise.resolve(null); // not available in backend yet
export const fetchTaxSummary = (): Promise<TaxSummary | null> => Promise.resolve(null); // not available in backend
export const fetchTaxObligations = (): Promise<TaxObligation[] | null> => Promise.resolve(null); // not available
export const fetchAuditLog = (shopId?: string, limit = 100) => {
  const id = shopId || 'me';
  return tryGet<AuditEntry[]>(`/accounting/audit-log/shop/${id}?limit=${limit}`);
};

/** نص تاريخ الاستحقاق بالعربي + تمييز المتأخر. */
export function dueTone(dueAt: string): 'red' | 'amber' | 'green' {
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) return 'amber';
  const days = (due - Date.now()) / 86_400_000;
  if (days < 0) return 'red';
  if (days <= 14) return 'amber';
  return 'green';
}
