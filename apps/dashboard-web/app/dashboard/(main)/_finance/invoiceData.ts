import { apiRequest } from '@/lib/auth';
import type { Invoice } from './types';

/** جلب الفواتير من النظامين (القديم + المحاسبة) وتوحيدها في شكل واحد — null يعني لا يوجد متجر */
export async function fetchUnifiedInvoices(): Promise<Invoice[] | null> {
  const shopData = await apiRequest('/shops/me');
  const sid = shopData?.id;
  if (!sid) return null;

  const [legacyRes, accRes] = await Promise.all([
    apiRequest(`/invoices/shop/${sid}`).catch(() => []),
    apiRequest(`/accounting/invoices/shop/${sid}`).catch(() => ({ data: [] })),
  ]);
  const legacy = Array.isArray(legacyRes) ? legacyRes : legacyRes?.data || [];
  const acc = Array.isArray(accRes) ? accRes : accRes?.data || [];

  const today = new Date().toISOString().split('T')[0];
  const deriveState = (
    rawStatus: string,
    kind: 'sale' | 'purchase',
    due: string,
    total: number,
    paid: number
  ): Invoice['state'] => {
    const s = String(rawStatus || '').toLowerCase();
    if (s === 'cancelled' || s === 'canceled') return 'cancelled';
    if (s === 'draft') return 'draft';
    if (s === 'paid') return 'paid';
    if (s === 'overdue') return 'overdue';
    // posted / sent / viewed / pending → اشتقاق من المدفوع والاستحقاق
    if (total > 0 && paid >= total - 0.005) return 'paid';
    if (total > 0 && paid > 0) return 'partial';
    if (due && due < today) return 'overdue';
    return 'unpaid';
  };

  const legacyMapped: Invoice[] = legacy.map((i: any) => {
    const rawStatus = String(i.status || 'draft').toLowerCase();
    const totalAmount = Number(i.totalAmount || i.total_amount || i.amount || 0);
    const paidAmount = Number(i.paidAmount || i.paid_amount || 0);
    const dueDate = i.dueDate || i.due_date || '';
    return {
      id: String(i.id),
      source: 'legacy' as const,
      kind: 'sale' as const,
      state: deriveState(rawStatus, 'sale', dueDate, totalAmount, paidAmount),
      invoiceNumber: i.invoiceNumber || i.invoice_number || '---',
      customerId: i.customerId || i.customer_id || '---',
      customerName: i.customerName || i.customer_name || '---',
      customerEmail: i.customerEmail || i.customer_email || '---',
      status: rawStatus,
      issueDate: i.issueDate || i.issue_date || i.createdAt || new Date().toISOString(),
      dueDate,
      paidDate: i.paidDate || i.paid_date || null,
      subtotal: Number(i.subtotal || 0),
      taxAmount: Number(i.taxAmount || i.tax_amount || 0),
      discountAmount: Number(i.discountAmount || i.discount_amount || 0),
      totalAmount,
      paidAmount,
      notes: i.notes || '',
      createdBy: i.createdBy || i.created_by || '---',
      createdAt: i.createdAt || new Date().toISOString(),
      updatedAt: i.updatedAt || new Date().toISOString(),
    };
  });

  // فواتير المحاسبة — تدعم البيع والشراء وتتغذى من المشتريات
  const accMapped: Invoice[] = acc
    .filter((i: any) => {
      const t = String(i.invoice_type || i.invoiceType || 'sale').toLowerCase();
      return t === 'sale' || t === 'purchase';
    })
    .map((i: any) => {
      const kind =
        String(i.invoice_type || i.invoiceType || 'sale').toLowerCase() === 'purchase'
          ? ('purchase' as const)
          : ('sale' as const);
      const rawStatus = String(i.status || 'draft').toLowerCase();
      const totalAmount = Number(i.total_amount || i.totalAmount || i.total || 0);
      const paidAmount = Number(i.paid_amount || i.paidAmount || i.paid || 0);
      const dueDate = i.due_date || i.dueDate || '';
      return {
        id: `acc-${String(i.id)}`,
        source: 'acc' as const,
        kind,
        state: deriveState(rawStatus, kind, dueDate, totalAmount, paidAmount),
        invoiceNumber: i.number || i.invoice_number || '---',
        customerId: i.entity_id || i.entityId || '---',
        customerName: i.entity_name || i.entityName || (kind === 'purchase' ? 'مورد' : 'عميل'),
        customerEmail: i.entity_email || '',
        status: rawStatus,
        issueDate: i.invoice_date || i.invoiceDate || i.created_at || new Date().toISOString(),
        dueDate,
        paidDate: null,
        subtotal: totalAmount,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount,
        paidAmount,
        notes: '',
        createdBy: '---',
        createdAt: i.created_at || new Date().toISOString(),
        updatedAt: i.updated_at || i.created_at || new Date().toISOString(),
      };
    });

  return [...legacyMapped, ...accMapped];
}
