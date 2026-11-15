export type InvoiceLine = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export type ReceiptTheme = {
  shopName: string;
  phone: string;
  city: string;
  address: string;
  logoDataUrl: string;
  footerNote: string;
  vatRatePercent: number;
};

export type Invoice = {
  id: string;
  source: 'legacy' | 'acc';
  kind: 'sale' | 'purchase';
  /** الحالة الموحدة للتصفية — مشتقة من حالة النظام + المدفوع + الاستحقاق */
  state: 'draft' | 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
