import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  Megaphone,
  Calendar,
  UserCog,
  BarChart3,
  Sparkles,
  Monitor,
  LucideIcon,
  ClipboardList,
  UserCircle,
  BookOpen,
  Repeat,
} from 'lucide-react';

export type ModuleId =
  | 'core'
  | 'sales'
  | 'pos'
  | 'inventory'
  | 'finance'
  | 'crm'
  | 'customers'
  | 'marketing'
  | 'bookings'
  | 'hr'
  | 'website'
  | 'analytics'
  | 'ai'
  | string;

export type FeatureDef = {
  id: string;
  label: string;
  labelAr?: string;
  defaultEnabled?: boolean;
};

export type PageDef = {
  id: string;
  label: string;
  route: string;
  tabId?: string;
  existing?: boolean;
};

export type ModuleDef = {
  id: ModuleId;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  icon: LucideIcon;
  color: string;
  dependencies: ModuleId[];
  features: FeatureDef[];
  pages: PageDef[];
  defaultEnabled: boolean;
  optional: boolean;
  estimatedSetupMinutes: number;
  /** false = local-only / not yet released (hidden from merchants in production) */
  published?: boolean;
};

// Market-launch switch: modules marked `published: false` stay visible on
// local/dev machines only — same convention as dashboard-web sidebar.
export const HIDE_UNPUBLISHED = process.env.NODE_ENV === 'production';

/** Local-only module ids: finance + accounting + HR + analytics + AI. */
export const LOCAL_ONLY_MODULES: ReadonlySet<string> = new Set([
  'finance',
  'accounting',
  'hr',
  'analytics',
  'ai',
]);

/** Filtered module list: production builds exclude local-only modules. */
export function visibleModules<T extends { id: ModuleId }>(modules: readonly T[]): T[] {
  if (!HIDE_UNPUBLISHED) return [...modules];
  return modules.filter((m) => !LOCAL_ONLY_MODULES.has(String(m.id)));
}

/**
 * Local-only modules (finance / accounting / HR / analytics / AI) are a dev-only
 * feature: they exist in the local dashboard so they can be built and tested,
 * but they were never released to merchants. So the onboarding wizard must
 * never offer or grant them — in ANY environment, not just production.
 */
export function isLocalOnly(id: ModuleId): boolean {
  return LOCAL_ONLY_MODULES.has(String(id));
}

/** Same as `visibleModules` but unconditional: always drops local-only modules. */
export function withoutLocalOnly<T extends { id: ModuleId }>(modules: readonly T[]): T[] {
  return modules.filter((m) => !isLocalOnly(m.id));
}

export type SystemSummaryData = {
  enabledModules: {
    id: ModuleId;
    name: string;
    nameAr?: string;
    icon: LucideIcon;
    color: string;
    features: number;
  }[];
  totalFeatures: number;
  totalPages: number;
  totalDashboardWidgets: number;
  totalNavigationItems: number;
  estimatedSetupMinutes: number;
  moduleCount: number;
};

const coreModule: ModuleDef = {
  id: 'core',
  name: 'Core Dashboard',
  nameAr: 'اللوحة الرئيسية',
  description: 'Overview, notifications, and system settings — always enabled.',
  descriptionAr: 'نظرة عامة، إشعارات، وإعدادات النظام — مفعّل دائماً.',
  icon: LayoutDashboard,
  color: '#0F172A',
  dependencies: [],
  features: [
    { id: 'overview', label: 'Dashboard Overview', labelAr: 'نظرة عامة', defaultEnabled: true },
    {
      id: 'notifications',
      label: 'Notifications Center',
      labelAr: 'مركز الإشعارات',
      defaultEnabled: true,
    },
    { id: 'settings', label: 'System Settings', labelAr: 'إعدادات النظام', defaultEnabled: true },
    { id: 'profile', label: 'Account Profile', labelAr: 'ملف الحساب', defaultEnabled: true },
  ],
  pages: [
    {
      id: 'overview',
      label: 'Overview',
      route: '/business/dashboard',
      tabId: 'overview',
      existing: true,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      route: '/business/dashboard?tab=notifications',
      tabId: 'notifications',
      existing: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      route: '/business/dashboard?tab=settings',
      tabId: 'settings',
      existing: true,
    },
    { id: 'profile', label: 'Profile', route: '/business/profile', existing: true },
  ],
  defaultEnabled: true,
  optional: false,
  estimatedSetupMinutes: 0,
};

const salesModule: ModuleDef = {
  id: 'sales',
  name: 'Sales & Orders',
  nameAr: 'المبيعات والطلبات',
  description: 'Manage orders, abandoned carts, and sales transactions.',
  descriptionAr: 'إدارة الطلبات، السلات المتروكة، ومعاملات البيع.',
  icon: ShoppingCart,
  color: '#2563EB',
  dependencies: ['core'],
  features: [
    { id: 'orders', label: 'Orders', labelAr: 'الطلبات', defaultEnabled: true },
    { id: 'quotes', label: 'Quotations', labelAr: 'عروض الأسعار', defaultEnabled: false },
    { id: 'invoices', label: 'Invoices', labelAr: 'الفواتير', defaultEnabled: true },
    { id: 'payments', label: 'Payments', labelAr: 'المدفوعات', defaultEnabled: true },
    { id: 'customers', label: 'Customers', labelAr: 'العملاء', defaultEnabled: true },
    { id: 'returns', label: 'Returns', labelAr: 'المرتجعات', defaultEnabled: false },
    { id: 'loyalty', label: 'Loyalty Points', labelAr: 'نقاط الولاء', defaultEnabled: false },
    { id: 'subscriptions', label: 'Subscriptions', labelAr: 'الاشتراكات', defaultEnabled: false },
    { id: 'epayment', label: 'E-Payment', labelAr: 'الدفع الإلكتروني', defaultEnabled: false },
    { id: 'orderStatus', label: 'Order Status', labelAr: 'حالات الطلب', defaultEnabled: true },
    {
      id: 'abandonedCart',
      label: 'Abandoned Cart',
      labelAr: 'السلة المتروكة',
      defaultEnabled: true,
    },
  ],
  pages: [
    {
      id: 'sales',
      label: 'Orders',
      route: '/business/dashboard?tab=sales',
      tabId: 'sales',
      existing: true,
    },
    {
      id: 'abandoned_cart',
      label: 'Abandoned Cart',
      route: '/business/dashboard?tab=abandonedCart',
      tabId: 'abandonedCart',
      existing: true,
    },
    { id: 'quotes', label: 'Quotes', route: '/business/dashboard?tab=quotes', tabId: 'quotes' },
    {
      id: 'payments',
      label: 'Payments',
      route: '/business/dashboard?tab=payments',
      tabId: 'payments',
    },
    { id: 'returns', label: 'Returns', route: '/business/dashboard?tab=returns', tabId: 'returns' },
    { id: 'loyalty', label: 'Loyalty', route: '/business/dashboard?tab=loyalty', tabId: 'loyalty' },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      route: '/business/dashboard?tab=subscriptions',
      tabId: 'subscriptions',
    },
    {
      id: 'epayment',
      label: 'E-Payment',
      route: '/business/dashboard?tab=epayment',
      tabId: 'epayment',
    },
    {
      id: 'orderStatus',
      label: 'Order Status',
      route: '/business/dashboard?tab=orderStatus',
      tabId: 'orderStatus',
    },
  ],
  defaultEnabled: true,
  optional: true,
  estimatedSetupMinutes: 5,
};

const inventoryModule: ModuleDef = {
  id: 'inventory',
  name: 'Inventory & Products',
  nameAr: 'المخزون والمنتجات',
  description: 'Manage products, categories, stock levels, variants, and suppliers.',
  descriptionAr: 'إدارة المنتجات، الفئات، مستويات المخزون، المتغيرات، والموردين.',
  icon: Package,
  color: '#16A34A',
  dependencies: ['core'],
  features: [
    { id: 'products', label: 'Products', labelAr: 'المنتجات', defaultEnabled: true },
    { id: 'categories', label: 'Categories', labelAr: 'الفئات', defaultEnabled: true },
    { id: 'variants', label: 'Variants', labelAr: 'المتغيرات', defaultEnabled: false },
    { id: 'warehouses', label: 'Warehouses', labelAr: 'المخازن', defaultEnabled: false },
    { id: 'stocktake', label: 'Stocktake', labelAr: 'الجرد', defaultEnabled: false },
    { id: 'suppliers', label: 'Suppliers', labelAr: 'الموردين', defaultEnabled: false },
    {
      id: 'purchaseOrders',
      label: 'Purchase Orders',
      labelAr: 'أوامر الشراء',
      defaultEnabled: false,
    },
    { id: 'transfers', label: 'Transfers', labelAr: 'النقل بين المخازن', defaultEnabled: false },
    { id: 'barcode', label: 'Barcode', labelAr: 'الباركود', defaultEnabled: false },
    { id: 'qrCode', label: 'QR Code', labelAr: 'QR Code', defaultEnabled: false },
    {
      id: 'stockTracking',
      label: 'Stock Tracking',
      labelAr: 'تتبع الكميات',
      defaultEnabled: false,
    },
    {
      id: 'lowStockAlerts',
      label: 'Low Stock Alerts',
      labelAr: 'تنبيهات النفاد',
      defaultEnabled: false,
    },
  ],
  pages: [
    {
      id: 'products',
      label: 'Products',
      route: '/business/dashboard?tab=products',
      tabId: 'products',
      existing: true,
    },
    {
      id: 'categories',
      label: 'Categories',
      route: '/business/dashboard?tab=categories',
      tabId: 'categories',
    },
    {
      id: 'variants',
      label: 'Variants',
      route: '/business/dashboard?tab=variants',
      tabId: 'variants',
    },
    {
      id: 'warehouses',
      label: 'Warehouses',
      route: '/business/dashboard?tab=warehouses',
      tabId: 'warehouses',
    },
    {
      id: 'stocktake',
      label: 'Stocktake',
      route: '/business/dashboard?tab=stocktake',
      tabId: 'stocktake',
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      route: '/business/dashboard?tab=suppliers',
      tabId: 'suppliers',
    },
    {
      id: 'purchaseOrders',
      label: 'Purchase Orders',
      route: '/business/dashboard?tab=purchaseOrders',
      tabId: 'purchaseOrders',
    },
    {
      id: 'transfers',
      label: 'Transfers',
      route: '/business/dashboard?tab=transfers',
      tabId: 'transfers',
    },
    { id: 'barcode', label: 'Barcode', route: '/business/dashboard?tab=barcode', tabId: 'barcode' },
    { id: 'qrCode', label: 'QR Code', route: '/business/dashboard?tab=qrCode', tabId: 'qrCode' },
    {
      id: 'stockTracking',
      label: 'Stock Tracking',
      route: '/business/dashboard?tab=stockTracking',
      tabId: 'stockTracking',
    },
    {
      id: 'lowStockAlerts',
      label: 'Low Stock Alerts',
      route: '/business/dashboard?tab=lowStockAlerts',
      tabId: 'lowStockAlerts',
    },
  ],
  defaultEnabled: true,
  optional: true,
  estimatedSetupMinutes: 10,
};

const financeModule: ModuleDef = {
  id: 'finance',
  name: 'Finance & Invoicing',
  nameAr: 'المالية والفواتير',
  description: 'Invoices, expenses, transactions, and financial reporting.',
  descriptionAr: 'فواتير، مصروفات، معاملات، وتقارير مالية.',
  icon: Receipt,
  color: '#7C3AED',
  dependencies: ['core'],
  features: [
    { id: 'invoice', label: 'Invoices', labelAr: 'الفواتير', defaultEnabled: true },
    { id: 'revenue', label: 'Revenue', labelAr: 'الإيرادات', defaultEnabled: true },
    { id: 'expenses', label: 'Expenses', labelAr: 'المصروفات', defaultEnabled: true },
    { id: 'profits', label: 'Profits', labelAr: 'الأرباح', defaultEnabled: false },
    { id: 'taxes', label: 'Taxes', labelAr: 'الضرائب', defaultEnabled: false },
    { id: 'journal', label: 'Journal Entries', labelAr: 'القيود', defaultEnabled: false },
    { id: 'cashflow', label: 'Cash Flow', labelAr: 'التدفقات النقدية', defaultEnabled: false },
    { id: 'accounts', label: 'Accounts', labelAr: 'الحسابات', defaultEnabled: false },
    { id: 'wallets', label: 'Wallets', labelAr: 'المحافظ', defaultEnabled: false },
    {
      id: 'financialReports',
      label: 'Financial Reports',
      labelAr: 'التقارير المالية',
      defaultEnabled: true,
    },
  ],
  pages: [
    {
      id: 'invoice',
      label: 'Invoices',
      route: '/business/dashboard?tab=invoice',
      tabId: 'invoice',
      existing: true,
    },
    {
      id: 'expenses',
      label: 'Expenses',
      route: '/business/dashboard?tab=expenses',
      tabId: 'expenses',
      existing: true,
    },
    { id: 'revenue', label: 'Revenue', route: '/business/dashboard?tab=revenue', tabId: 'revenue' },
    { id: 'profits', label: 'Profits', route: '/business/dashboard?tab=profits', tabId: 'profits' },
    { id: 'taxes', label: 'Taxes', route: '/business/dashboard?tab=taxes', tabId: 'taxes' },
    { id: 'journal', label: 'Journal', route: '/business/dashboard?tab=journal', tabId: 'journal' },
    {
      id: 'cashflow',
      label: 'Cash Flow',
      route: '/business/dashboard?tab=cashflow',
      tabId: 'cashflow',
    },
    {
      id: 'accounts',
      label: 'Accounts',
      route: '/business/dashboard?tab=accounts',
      tabId: 'accounts',
    },
    { id: 'wallets', label: 'Wallets', route: '/business/dashboard?tab=wallets', tabId: 'wallets' },
    {
      id: 'financialReports',
      label: 'Financial Reports',
      route: '/business/dashboard?tab=financialReports',
      tabId: 'financialReports',
    },
  ],
  defaultEnabled: false,
  optional: true,
  estimatedSetupMinutes: 8,
};

const accountingModule: ModuleDef = {
  id: 'accounting',
  name: 'Accounting & Ledger',
  nameAr: 'المحاسبة والدفاتر',
  description: 'Chart of accounts, double-entry journal, trial balance, and financial statements.',
  descriptionAr: 'دليل الحسابات، القيود المزدوجة، ميزان المراجعة، والقوائم المالية.',
  icon: BookOpen,
  color: '#16A34A',
  dependencies: ['core', 'finance'],
  features: [
    { id: 'accounts', label: 'Chart of Accounts', labelAr: 'دليل الحسابات', defaultEnabled: true },
    { id: 'journal', label: 'Journal Entries', labelAr: 'القيود المحاسبية', defaultEnabled: true },
    { id: 'trialBalance', label: 'Trial Balance', labelAr: 'ميزان المراجعة', defaultEnabled: true },
    {
      id: 'financialReports',
      label: 'Financial Reports',
      labelAr: 'القوائم المالية',
      defaultEnabled: true,
    },
    { id: 'expenses', label: 'Expenses', labelAr: 'المصروفات', defaultEnabled: true },
    { id: 'taxes', label: 'Taxes', labelAr: 'الضرائب', defaultEnabled: true },
  ],
  pages: [
    {
      id: 'accounts',
      label: 'Chart of Accounts',
      route: '/dashboard/finance/accounts',
      existing: true,
    },
    { id: 'journal', label: 'Journal', route: '/dashboard/finance/journal', existing: true },
    {
      id: 'trialBalance',
      label: 'Trial Balance',
      route: '/dashboard/finance/trial-balance',
      existing: true,
    },
    {
      id: 'financialReports',
      label: 'Financial Reports',
      route: '/dashboard/finance/financial-reports',
      existing: true,
    },
    { id: 'expenses', label: 'Expenses', route: '/dashboard/finance/expenses', existing: true },
    { id: 'taxes', label: 'Taxes', route: '/dashboard/finance/taxes', existing: true },
  ],
  defaultEnabled: false,
  optional: true,
  estimatedSetupMinutes: 6,
};

const crmModule: ModuleDef = {
  id: 'crm',
  name: 'Customer Relations',
  nameAr: 'علاقات العملاء',
  description: 'Customer profiles, groups, loyalty programs, and communication history.',
  descriptionAr: 'ملفات العملاء، المجموعات، برامج الولاء، وسجل التواصل.',
  icon: Users,
  color: '#DC2626',
  dependencies: ['core', 'sales'],
  features: [
    { id: 'customers', label: 'Customers', labelAr: 'العملاء', defaultEnabled: true },
    { id: 'chats', label: 'Chats', labelAr: 'المحادثات', defaultEnabled: false },
    { id: 'tickets', label: 'Tickets', labelAr: 'التذاكر', defaultEnabled: false },
    { id: 'complaints', label: 'Complaints', labelAr: 'الشكاوى', defaultEnabled: false },
    { id: 'reviews', label: 'Reviews', labelAr: 'التقييمات', defaultEnabled: false },
    { id: 'notes', label: 'Notes', labelAr: 'الملاحظات', defaultEnabled: false },
    { id: 'followUps', label: 'Follow-ups', labelAr: 'المتابعة', defaultEnabled: false },
    { id: 'contactLog', label: 'Contact Log', labelAr: 'سجل التواصل', defaultEnabled: false },
  ],
  pages: [
    {
      id: 'customers',
      label: 'Customers',
      route: '/business/dashboard?tab=customers',
      tabId: 'customers',
      existing: true,
    },
    { id: 'chats', label: 'Chats', route: '/business/dashboard?tab=chats', tabId: 'chats' },
    { id: 'tickets', label: 'Tickets', route: '/business/dashboard?tab=tickets', tabId: 'tickets' },
    {
      id: 'complaints',
      label: 'Complaints',
      route: '/business/dashboard?tab=complaints',
      tabId: 'complaints',
    },
    { id: 'reviews', label: 'Reviews', route: '/business/dashboard?tab=reviews', tabId: 'reviews' },
    { id: 'notes', label: 'Notes', route: '/business/dashboard?tab=notes', tabId: 'notes' },
    {
      id: 'followUps',
      label: 'Follow-ups',
      route: '/business/dashboard?tab=followUps',
      tabId: 'followUps',
    },
    {
      id: 'contactLog',
      label: 'Contact Log',
      route: '/business/dashboard?tab=contactLog',
      tabId: 'contactLog',
    },
  ],
  defaultEnabled: false,
  optional: true,
  estimatedSetupMinutes: 5,
};

const marketingModule: ModuleDef = {
  id: 'marketing',
  name: 'Marketing & Promotions',
  nameAr: 'التسويق والعروض',
  description: 'Promotions, discount campaigns, marketing tools, and abandoned cart recovery.',
  descriptionAr: 'عروض، حملات خصم، أدوات تسويق، واسترداد السلات المتروكة.',
  icon: Megaphone,
  color: '#EA580C',
  dependencies: ['core'],
  features: [
    { id: 'promotions', label: 'Promotions', labelAr: 'العروض', defaultEnabled: true },
    { id: 'marketing', label: 'Marketing Center', labelAr: 'مركز التسويق', defaultEnabled: true },
    { id: 'campaigns', label: 'Campaigns', labelAr: 'الحملات', defaultEnabled: false },
    { id: 'coupons', label: 'Coupons', labelAr: 'الكوبونات', defaultEnabled: false },
    { id: 'discounts', label: 'Discounts', labelAr: 'الخصومات', defaultEnabled: false },
    { id: 'messages', label: 'Messages', labelAr: 'الرسائل', defaultEnabled: false },
    {
      id: 'emailCampaigns',
      label: 'Email Campaigns',
      labelAr: 'البريد الإلكتروني',
      defaultEnabled: false,
    },
    {
      id: 'pushNotifications',
      label: 'Push Notifications',
      labelAr: 'الإشعارات الفورية',
      defaultEnabled: false,
    },
    {
      id: 'smsCampaigns',
      label: 'SMS Campaigns',
      labelAr: 'حملات الرسائل النصية',
      defaultEnabled: false,
    },
    {
      id: 'loyaltyPrograms',
      label: 'Loyalty Programs',
      labelAr: 'برامج الولاء',
      defaultEnabled: false,
    },
    {
      id: 'seasonalOffers',
      label: 'Seasonal Offers',
      labelAr: 'العروض الموسمية',
      defaultEnabled: false,
    },
  ],
  pages: [
    {
      id: 'promotions',
      label: 'Promotions',
      route: '/business/dashboard?tab=promotions',
      tabId: 'promotions',
      existing: true,
    },
    {
      id: 'marketing',
      label: 'Marketing Center',
      route: '/business/dashboard?tab=marketing',
      tabId: 'marketing',
      existing: true,
    },
    {
      id: 'campaigns',
      label: 'Campaigns',
      route: '/business/dashboard?tab=campaigns',
      tabId: 'campaigns',
    },
    { id: 'coupons', label: 'Coupons', route: '/business/dashboard?tab=coupons', tabId: 'coupons' },
    {
      id: 'discounts',
      label: 'Discounts',
      route: '/business/dashboard?tab=discounts',
      tabId: 'discounts',
    },
    {
      id: 'messages',
      label: 'Messages',
      route: '/business/dashboard?tab=messages',
      tabId: 'messages',
    },
    {
      id: 'emailCampaigns',
      label: 'Email Campaigns',
      route: '/business/dashboard?tab=emailCampaigns',
      tabId: 'emailCampaigns',
    },
    {
      id: 'pushNotifications',
      label: 'Push Notifications',
      route: '/business/dashboard?tab=pushNotifications',
      tabId: 'pushNotifications',
    },
    {
      id: 'smsCampaigns',
      label: 'SMS Campaigns',
      route: '/business/dashboard?tab=smsCampaigns',
      tabId: 'smsCampaigns',
    },
    {
      id: 'loyaltyPrograms',
      label: 'Loyalty Programs',
      route: '/business/dashboard?tab=loyaltyPrograms',
      tabId: 'loyaltyPrograms',
    },
    {
      id: 'seasonalOffers',
      label: 'Seasonal Offers',
      route: '/business/dashboard?tab=seasonalOffers',
      tabId: 'seasonalOffers',
    },
  ],
  defaultEnabled: true,
  optional: true,
  estimatedSetupMinutes: 5,
};

const posModule: ModuleDef = {
  id: 'pos',
  name: 'POS / Cashier',
  nameAr: 'الكاشير',
  description: 'Point of sale checkout, invoices, shifts, and cashier reports.',
  descriptionAr: 'نقطة البيع، الفواتير، الورديات، وتقارير الكاشير.',
  icon: ShoppingCart,
  color: '#7C3AED',
  dependencies: ['core', 'sales'],
  features: [
    { id: 'posCheckout', label: 'Cashier Checkout', labelAr: 'الكاشير', defaultEnabled: true },
    { id: 'posInvoices', label: 'POS Invoices', labelAr: 'فواتير الكاشير', defaultEnabled: true },
    { id: 'posReturns', label: 'POS Returns', labelAr: 'مرتجعات الكاشير', defaultEnabled: false },
    {
      id: 'posWebsiteReturns',
      label: 'Website Returns',
      labelAr: 'مرتجعات الموقع',
      defaultEnabled: false,
    },
    { id: 'posShifts', label: 'Shifts', labelAr: 'الورديات', defaultEnabled: true },
    { id: 'posReports', label: 'POS Reports', labelAr: 'تقارير الكاشير', defaultEnabled: false },
  ],
  pages: [
    {
      id: 'posCheckout',
      label: 'Cashier',
      route: '/business/dashboard?tab=pos',
      tabId: 'pos',
      existing: true,
    },
    {
      id: 'posInvoices',
      label: 'POS Invoices',
      route: '/business/dashboard?tab=posInvoices',
      tabId: 'posInvoices',
    },
    {
      id: 'posReturns',
      label: 'POS Returns',
      route: '/business/dashboard?tab=posReturns',
      tabId: 'posReturns',
    },
    {
      id: 'posWebsiteReturns',
      label: 'Website Returns',
      route: '/business/dashboard?tab=posWebsiteReturns',
      tabId: 'posWebsiteReturns',
    },
    {
      id: 'posShifts',
      label: 'Shifts',
      route: '/business/dashboard?tab=posShifts',
      tabId: 'posShifts',
    },
    {
      id: 'posReports',
      label: 'POS Reports',
      route: '/business/dashboard?tab=posReports',
      tabId: 'posReports',
    },
  ],
  defaultEnabled: true,
  optional: true,
  estimatedSetupMinutes: 3,
};

const customersModule: ModuleDef = {
  id: 'customers',
  name: 'Customers',
  nameAr: 'العملاء',
  description: 'Customer profiles, segments, tags, and customer management.',
  descriptionAr: 'ملفات العملاء، الشرائح، الوسوم، وإدارة العملاء.',
  icon: UserCircle,
  color: '#DB2777',
  dependencies: ['core'],
  features: [
    { id: 'customers', label: 'Customers', labelAr: 'العملاء', defaultEnabled: true },
    { id: 'customerSegments', label: 'Segments', labelAr: 'الشرائح', defaultEnabled: false },
    { id: 'customerTags', label: 'Tags', labelAr: 'الوسوم', defaultEnabled: false },
  ],
  pages: [
    {
      id: 'customers',
      label: 'Customers',
      route: '/business/dashboard?tab=customers',
      tabId: 'customers',
      existing: true,
    },
    {
      id: 'customerSegments',
      label: 'Segments',
      route: '/business/dashboard?tab=customerSegments',
      tabId: 'customerSegments',
    },
    {
      id: 'customerTags',
      label: 'Tags',
      route: '/business/dashboard?tab=customerTags',
      tabId: 'customerTags',
    },
  ],
  defaultEnabled: true,
  optional: true,
  estimatedSetupMinutes: 2,
};

const subscriptionsModule: ModuleDef = {
  id: 'subscriptions',
  name: 'Subscriptions & Memberships',
  nameAr: 'الاشتراكات والعضويات',
  description: 'Manage gym members, recurring monthly/yearly plans, and renewals.',
  descriptionAr: 'إدارة اشتراكات الأعضاء، الجيم، باقات العضويات والتجديدات التلقائية.',
  icon: Repeat,
  color: '#7C3AED',
  dependencies: ['core', 'customers'],
  features: [
    {
      id: 'subscriptionsOverview',
      label: 'Member Subscriptions',
      labelAr: 'اشتراكات الأعضاء',
      defaultEnabled: true,
    },
    {
      id: 'subscriptionPlans',
      label: 'Subscription Plans',
      labelAr: 'باقات الاشتراك',
      defaultEnabled: true,
    },
    {
      id: 'subscriptionRenewals',
      label: 'Renewals',
      labelAr: 'التجديدات',
      defaultEnabled: true,
    },
  ],
  pages: [
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      route: '/dashboard/subscriptions',
      tabId: 'subscriptions',
      existing: true,
    },
    {
      id: 'subscriptionPlans',
      label: 'Subscription Plans',
      route: '/dashboard/subscriptions/plans',
      tabId: 'subscriptionPlans',
      existing: true,
    },
    {
      id: 'subscriptionRenewals',
      label: 'Renewals',
      route: '/dashboard/subscriptions/renewals',
      tabId: 'subscriptionRenewals',
      existing: true,
    },
  ],
  defaultEnabled: false,
  optional: true,
  estimatedSetupMinutes: 3,
  published: true,
};

const bookingsModule: ModuleDef = {
  id: 'bookings',
  name: 'Bookings & Reservations',
  nameAr: 'الحجوزات والمواعيد',
  description: 'Appointment scheduling, service providers, room management, and booking calendar.',
  descriptionAr: 'جدولة المواعيد، مقدمو الخدمة، إدارة الغرف، وتقويم الحجوزات.',
  icon: Calendar,
  color: '#0891B2',
  dependencies: ['core'],
  features: [
    {
      id: 'reservations',
      label: 'Booking Calendar & Dashboard',
      labelAr: 'الحجوزات',
      defaultEnabled: true,
    },
    {
      id: 'providers',
      label: 'Service Providers / Staff',
      labelAr: 'مقدمو الخدمة',
      defaultEnabled: true,
    },
    { id: 'services', label: 'Services Catalog', labelAr: 'الخدمات', defaultEnabled: true },
    {
      id: 'rooms',
      label: 'Rooms / Chairs / Units',
      labelAr: 'الغرف / الوحدات',
      defaultEnabled: true,
    },
    {
      id: 'patient_records',
      label: 'Customer/Patient Records',
      labelAr: 'سجلات العملاء',
      defaultEnabled: true,
    },
    { id: 'appointments', label: 'Appointments', labelAr: 'المواعيد', defaultEnabled: true },
    { id: 'calendar', label: 'Calendar', labelAr: 'التقويم', defaultEnabled: true },
    { id: 'doctors', label: 'Doctors', labelAr: 'الأطباء', defaultEnabled: false },
    {
      id: 'bookingConfirm',
      label: 'Booking Confirmation',
      labelAr: 'التأكيد',
      defaultEnabled: false,
    },
    {
      id: 'bookingCancel',
      label: 'Booking Cancellation',
      labelAr: 'الإلغاء',
      defaultEnabled: false,
    },
    {
      id: 'bookingReminder',
      label: 'Booking Reminders',
      labelAr: 'التذكير',
      defaultEnabled: false,
    },
    {
      id: 'activity_inventory',
      label: 'Activity-Specific Inventory',
      labelAr: 'مخزون النشاط',
      defaultEnabled: false,
    },
    {
      id: 'restaurant_tables',
      label: 'Restaurant Table Management',
      labelAr: 'إدارة طاولات المطعم',
      defaultEnabled: false,
    },
  ],
  pages: [
    {
      id: 'reservations',
      label: 'Reservations',
      route: '/business/dashboard?tab=reservations',
      tabId: 'reservations',
      existing: true,
    },
    {
      id: 'providers',
      label: 'Providers',
      route: '/business/dashboard?tab=providers',
      tabId: 'providers',
      existing: true,
    },
    {
      id: 'services',
      label: 'Services',
      route: '/business/dashboard?tab=services',
      tabId: 'services',
      existing: true,
    },
    {
      id: 'activity_rooms',
      label: 'Rooms / Units',
      route: '/business/dashboard?tab=activityRooms',
      tabId: 'activityRooms',
      existing: true,
    },
    {
      id: 'activity_patients',
      label: 'Customer Records',
      route: '/business/dashboard?tab=activityPatients',
      tabId: 'activityPatients',
      existing: true,
    },
    {
      id: 'activity_inventory',
      label: 'Activity Inventory',
      route: '/business/dashboard?tab=activityInventory',
      tabId: 'activityInventory',
      existing: true,
    },
    {
      id: 'restaurant_tables',
      label: 'Restaurant Tables',
      route: '/business/dashboard?tab=restaurantTables',
      tabId: 'restaurantTables',
      existing: true,
    },
    {
      id: 'appointments',
      label: 'Appointments',
      route: '/business/dashboard?tab=appointments',
      tabId: 'appointments',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      route: '/business/dashboard?tab=calendar',
      tabId: 'calendar',
    },
    { id: 'rooms', label: 'Rooms', route: '/business/dashboard?tab=rooms', tabId: 'rooms' },
    { id: 'doctors', label: 'Doctors', route: '/business/dashboard?tab=doctors', tabId: 'doctors' },
    {
      id: 'bookingConfirm',
      label: 'Booking Confirm',
      route: '/business/dashboard?tab=bookingConfirm',
      tabId: 'bookingConfirm',
    },
    {
      id: 'bookingCancel',
      label: 'Booking Cancel',
      route: '/business/dashboard?tab=bookingCancel',
      tabId: 'bookingCancel',
    },
    {
      id: 'bookingReminder',
      label: 'Booking Reminder',
      route: '/business/dashboard?tab=bookingReminder',
      tabId: 'bookingReminder',
    },
  ],
  defaultEnabled: false,
  optional: true,
  estimatedSetupMinutes: 15,
};

const hrModule: ModuleDef = {
  id: 'hr',
  name: 'Human Resources',
  nameAr: 'الموارد البشرية',
  description: 'Employee management, attendance tracking, payroll, and shift scheduling.',
  descriptionAr: 'إدارة الموظفين، تتبع الحضور، الرواتب، وجدولة الورديات.',
  icon: UserCog,
  color: '#9333EA',
  dependencies: ['core'],
  features: [
    { id: 'employees', label: 'Employees', labelAr: 'الموظفين', defaultEnabled: true },
    { id: 'permissions', label: 'Permissions', labelAr: 'الصلاحيات', defaultEnabled: false },
    { id: 'attendance', label: 'Attendance', labelAr: 'الحضور', defaultEnabled: false },
    { id: 'checkOut', label: 'Check-out', labelAr: 'الانصراف', defaultEnabled: false },
    { id: 'payroll', label: 'Payroll', labelAr: 'الرواتب', defaultEnabled: false },
    { id: 'leaves', label: 'Leaves', labelAr: 'الإجازات', defaultEnabled: false },
    { id: 'tasks', label: 'Tasks', labelAr: 'المهام', defaultEnabled: false },
  ],
  pages: [
    {
      id: 'employees',
      label: 'Employees',
      route: '/business/dashboard?tab=employees',
      tabId: 'employees',
    },
    {
      id: 'attendance',
      label: 'Attendance',
      route: '/business/dashboard?tab=attendance',
      tabId: 'attendance',
    },
    { id: 'payroll', label: 'Payroll', route: '/business/dashboard?tab=payroll', tabId: 'payroll' },
    {
      id: 'permissions',
      label: 'Permissions',
      route: '/business/dashboard?tab=permissions',
      tabId: 'permissions',
    },
    {
      id: 'checkOut',
      label: 'Check-out',
      route: '/business/dashboard?tab=checkOut',
      tabId: 'checkOut',
    },
    { id: 'leaves', label: 'Leaves', route: '/business/dashboard?tab=leaves', tabId: 'leaves' },
    { id: 'tasks', label: 'Tasks', route: '/business/dashboard?tab=tasks', tabId: 'tasks' },
  ],
  defaultEnabled: false,
  optional: true,
  estimatedSetupMinutes: 10,
};

const websiteModule: ModuleDef = {
  id: 'website',
  name: 'Website & Store Builder',
  nameAr: 'بناء الموقع والمتجر',
  description: 'Page builder, theme customization, gallery, custom pages, and storefront design.',
  descriptionAr: 'منشئ الصفحات، تخصيص الثيم، معرض الصور، صفحات مخصصة، وتصميم المتجر.',
  icon: Monitor,
  color: '#0EA5E9',
  dependencies: ['core'],
  features: [
    {
      id: 'builder',
      label: 'Page Builder & Theme Designer',
      labelAr: 'منشئ الصفحات',
      defaultEnabled: true,
    },
    { id: 'gallery', label: 'Image Gallery', labelAr: 'معرض الصور', defaultEnabled: true },
    { id: 'pages', label: 'Pages', labelAr: 'الصفحات', defaultEnabled: false },
    { id: 'templates', label: 'Templates', labelAr: 'القوالب', defaultEnabled: false },
    { id: 'seo', label: 'SEO', labelAr: 'SEO', defaultEnabled: false },
    { id: 'blog', label: 'Blog', labelAr: 'المدونة', defaultEnabled: false },
    { id: 'forms', label: 'Forms', labelAr: 'النماذج', defaultEnabled: false },
    { id: 'media', label: 'Media', labelAr: 'الوسائط', defaultEnabled: false },
    { id: 'domains', label: 'Domains', labelAr: 'الدومينات', defaultEnabled: false },
    { id: 'publishing', label: 'Publishing', labelAr: 'النشر', defaultEnabled: false },
  ],
  pages: [
    {
      id: 'builder',
      label: 'Page Builder',
      route: '/business/dashboard?tab=builder',
      tabId: 'builder',
      existing: true,
    },
    {
      id: 'gallery',
      label: 'Gallery',
      route: '/business/dashboard?tab=gallery',
      tabId: 'gallery',
      existing: true,
    },
    { id: 'pages', label: 'Pages', route: '/business/dashboard?tab=pages', tabId: 'pages' },
    {
      id: 'templates',
      label: 'Templates',
      route: '/business/dashboard?tab=templates',
      tabId: 'templates',
    },
    { id: 'seo', label: 'SEO', route: '/business/dashboard?tab=seo', tabId: 'seo' },
    { id: 'blog', label: 'Blog', route: '/business/dashboard?tab=blog', tabId: 'blog' },
    { id: 'forms', label: 'Forms', route: '/business/dashboard?tab=forms', tabId: 'forms' },
    { id: 'media', label: 'Media', route: '/business/dashboard?tab=media', tabId: 'media' },
    { id: 'domains', label: 'Domains', route: '/business/dashboard?tab=domains', tabId: 'domains' },
    {
      id: 'publishing',
      label: 'Publishing',
      route: '/business/dashboard?tab=publishing',
      tabId: 'publishing',
    },
  ],
  defaultEnabled: true,
  optional: true,
  estimatedSetupMinutes: 15,
};

const analyticsModule: ModuleDef = {
  id: 'analytics',
  name: 'Analytics & Reports',
  nameAr: 'التحليلات والتقارير',
  description: 'Business intelligence dashboard, sales reports, customer insights, and trends.',
  descriptionAr: 'لوحة ذكاء أعمال، تقارير مبيعات، رؤى عملاء، واتجاهات.',
  icon: BarChart3,
  color: '#059669',
  dependencies: ['core', 'sales'],
  features: [
    { id: 'reports', label: 'Reports', labelAr: 'التقارير', defaultEnabled: true },
    { id: 'kpi', label: 'KPI', labelAr: 'مؤشرات الأداء', defaultEnabled: false },
    { id: 'charts', label: 'Charts', labelAr: 'الرسوم البيانية', defaultEnabled: false },
    {
      id: 'salesPerformance',
      label: 'Sales Performance',
      labelAr: 'أداء المبيعات',
      defaultEnabled: false,
    },
    {
      id: 'productPerformance',
      label: 'Product Performance',
      labelAr: 'أداء المنتجات',
      defaultEnabled: false,
    },
    { id: 'visitors', label: 'Visitors', labelAr: 'الزوار', defaultEnabled: false },
    { id: 'conversions', label: 'Conversions', labelAr: 'التحويلات', defaultEnabled: false },
  ],
  pages: [
    {
      id: 'reports',
      label: 'Reports',
      route: '/business/dashboard?tab=reports',
      tabId: 'reports',
      existing: true,
    },
    { id: 'kpi', label: 'KPI', route: '/business/dashboard?tab=kpi', tabId: 'kpi' },
    { id: 'charts', label: 'Charts', route: '/business/dashboard?tab=charts', tabId: 'charts' },
    {
      id: 'salesPerformance',
      label: 'Sales Performance',
      route: '/business/dashboard?tab=salesPerformance',
      tabId: 'salesPerformance',
    },
    {
      id: 'productPerformance',
      label: 'Product Performance',
      route: '/business/dashboard?tab=productPerformance',
      tabId: 'productPerformance',
    },
    {
      id: 'visitors',
      label: 'Visitors',
      route: '/business/dashboard?tab=visitors',
      tabId: 'visitors',
    },
    {
      id: 'conversions',
      label: 'Conversions',
      route: '/business/dashboard?tab=conversions',
      tabId: 'conversions',
    },
  ],
  defaultEnabled: false,
  optional: true,
  estimatedSetupMinutes: 3,
};

const aiModule: ModuleDef = {
  id: 'ai',
  name: 'AI Assistant',
  nameAr: 'مساعد الذكاء الاصطناعي',
  description:
    'AI-powered theme generation, page design, brand identity, and intelligent insights.',
  descriptionAr: 'توليد الثيم بالذكاء الاصطناعي، تصميم الصفحات، هوية العلامة، ورؤى ذكية.',
  icon: Sparkles,
  color: '#BD00FF',
  dependencies: ['core', 'website'],
  features: [
    { id: 'ai_theme', label: 'AI Theme Generator', labelAr: 'مولد الثيم', defaultEnabled: true },
    {
      id: 'ai_pages',
      label: 'AI Page Schema Generator',
      labelAr: 'مولد صفحات AI',
      defaultEnabled: true,
    },
    { id: 'ai_brand', label: 'AI Brand Identity', labelAr: 'هوية العلامة', defaultEnabled: true },
    {
      id: 'ai_chat',
      label: 'AI Design Chat Assistant',
      labelAr: 'مساعد التصميم',
      defaultEnabled: true,
    },
    {
      id: 'aiContent',
      label: 'AI Content Writer',
      labelAr: 'كتابة المحتوى',
      defaultEnabled: false,
    },
    { id: 'aiImages', label: 'AI Image Generator', labelAr: 'إنشاء الصور', defaultEnabled: false },
    { id: 'aiSEO', label: 'AI SEO Optimizer', labelAr: 'تحسين SEO', defaultEnabled: false },
    {
      id: 'aiAnalysis',
      label: 'AI Activity Analysis',
      labelAr: 'تحليل النشاط',
      defaultEnabled: false,
    },
    {
      id: 'aiReplies',
      label: 'AI Auto Replies',
      labelAr: 'الردود التلقائية',
      defaultEnabled: false,
    },
    { id: 'aiSuggestions', label: 'AI Suggestions', labelAr: 'الاقتراحات', defaultEnabled: false },
    { id: 'aiPages', label: 'AI Page Builder', labelAr: 'إنشاء الصفحات', defaultEnabled: false },
    {
      id: 'aiDataAnalysis',
      label: 'AI Data Analysis',
      labelAr: 'تحليل البيانات',
      defaultEnabled: false,
    },
  ],
  pages: [
    {
      id: 'ai_builder',
      label: 'AI Builder',
      route: '/business/dashboard?tab=builder&builderTab=ai',
      tabId: 'builder',
      existing: true,
    },
    {
      id: 'aiContent',
      label: 'AI Content',
      route: '/business/dashboard?tab=aiContent',
      tabId: 'aiContent',
    },
    {
      id: 'aiImages',
      label: 'AI Images',
      route: '/business/dashboard?tab=aiImages',
      tabId: 'aiImages',
    },
    { id: 'aiSEO', label: 'AI SEO', route: '/business/dashboard?tab=aiSEO', tabId: 'aiSEO' },
    {
      id: 'aiAnalysis',
      label: 'AI Analysis',
      route: '/business/dashboard?tab=aiAnalysis',
      tabId: 'aiAnalysis',
    },
    {
      id: 'aiReplies',
      label: 'AI Replies',
      route: '/business/dashboard?tab=aiReplies',
      tabId: 'aiReplies',
    },
    {
      id: 'aiSuggestions',
      label: 'AI Suggestions',
      route: '/business/dashboard?tab=aiSuggestions',
      tabId: 'aiSuggestions',
    },
    {
      id: 'aiPages',
      label: 'AI Pages',
      route: '/business/dashboard?tab=aiPages',
      tabId: 'aiPages',
    },
    {
      id: 'aiDataAnalysis',
      label: 'AI Data Analysis',
      route: '/business/dashboard?tab=aiDataAnalysis',
      tabId: 'aiDataAnalysis',
    },
  ],
  defaultEnabled: false,
  optional: true,
  estimatedSetupMinutes: 2,
};

export const MODULE_DEFINITIONS: ModuleDef[] = [
  coreModule,
  salesModule,
  posModule,
  inventoryModule,
  financeModule,
  accountingModule,
  crmModule,
  customersModule,
  subscriptionsModule,
  marketingModule,
  bookingsModule,
  hrModule,
  websiteModule,
  analyticsModule,
  aiModule,
];

export const MODULE_MAP: Record<string, ModuleDef> = MODULE_DEFINITIONS.reduce(
  (acc, mod) => {
    acc[mod.id] = mod;
    return acc;
  },
  {} as Record<string, ModuleDef>
);

export const OPTIONAL_MODULES = MODULE_DEFINITIONS.filter((m) => m.optional);
export const CORE_MODULES = MODULE_DEFINITIONS.filter((m) => !m.optional);

export function resolveDependencies(moduleIds: ModuleId[]): ModuleId[] {
  const result = new Set<ModuleId>(moduleIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of Array.from(result)) {
      const mod = MODULE_MAP[id];
      if (!mod) continue;
      for (const dep of mod.dependencies) {
        if (!result.has(dep)) {
          result.add(dep);
          changed = true;
        }
      }
    }
  }
  return Array.from(result);
}

export function getDependents(moduleIds: ModuleId[], targetId: ModuleId): ModuleId[] {
  const result: ModuleId[] = [];
  for (const id of moduleIds) {
    if (id === targetId) continue;
    const mod = MODULE_MAP[id];
    if (!mod) continue;
    if (mod.dependencies.includes(targetId)) {
      result.push(id);
    }
  }
  return result;
}

export function toggleModule(
  enabledIds: ModuleId[],
  moduleId: ModuleId
): { next: ModuleId[]; added: ModuleId[]; removed: ModuleId[]; blocked: ModuleId[] } {
  const mod = MODULE_MAP[moduleId];
  if (!mod || !mod.optional) {
    return { next: enabledIds, added: [], removed: [], blocked: [moduleId] };
  }

  const currentSet = new Set(enabledIds);

  if (currentSet.has(moduleId)) {
    const dependents = getDependents(Array.from(currentSet), moduleId);
    currentSet.delete(moduleId);
    const removed = [moduleId];
    for (const dep of dependents) {
      if (currentSet.has(dep)) {
        currentSet.delete(dep);
        removed.push(dep);
      }
    }
    return {
      next: Array.from(currentSet),
      added: [],
      removed,
      blocked: [],
    };
  }

  currentSet.add(moduleId);
  const resolved = resolveDependencies(Array.from(currentSet));
  const newlyAdded = resolved.filter((id) => !enabledIds.includes(id));

  return {
    next: resolved,
    added: newlyAdded,
    removed: [],
    blocked: [],
  };
}

export function computeSystemSummary(enabledModuleIds: ModuleId[]): SystemSummaryData {
  const resolved = resolveDependencies(enabledModuleIds);
  const enabledModules = resolved
    .map((id) => MODULE_MAP[id])
    .filter(Boolean)
    .map((mod) => ({
      id: mod.id,
      name: mod.name,
      nameAr: mod.nameAr,
      icon: mod.icon,
      color: mod.color,
      features: mod.features.length,
    }));

  let totalFeatures = 0;
  let totalPages = 0;
  const totalDashboardWidgets = 0;
  const totalNavigationItems = 0;
  let estimatedSetupMinutes = 0;

  for (const id of resolved) {
    const mod = MODULE_MAP[id];
    if (!mod) continue;
    totalFeatures += mod.features.length;
    totalPages += mod.pages.length;
    estimatedSetupMinutes += mod.estimatedSetupMinutes;
  }

  return {
    enabledModules,
    totalFeatures,
    totalPages,
    totalDashboardWidgets,
    totalNavigationItems,
    estimatedSetupMinutes,
    moduleCount: enabledModules.length,
  };
}

export const BOOKING_ACTIVITIES = new Set([
  'bookings',
  'clinic',
  'dentalClinic',
  'vetClinic',
  'salon',
  'spa',
  'gym',
  'yogaStudio',
  'sportsCenter',
  'hotel',
  'travelAgency',
  'drivingSchool',
  'musicSchool',
  'tutoringCenter',
  'photographyStudio',
]);

export function getActivityDefaultModules(activityId: string): ModuleId[] {
  if (BOOKING_ACTIVITIES.has(activityId)) {
    return ['core', 'sales', 'pos', 'customers', 'website', 'marketing'];
  }
  return MODULE_DEFINITIONS.filter((m) => m.defaultEnabled && m.id !== 'bookings').map((m) => m.id);
}

export function getActivityDefaultFeatures(activityId: string): Record<string, string[]> {
  const defaults: Record<string, string[]> = {};
  const enabledIds = getActivityDefaultModules(activityId);
  const enabledSet = new Set(enabledIds);
  MODULE_DEFINITIONS.forEach((mod) => {
    if (enabledSet.has(mod.id)) {
      defaults[mod.id] = mod.features.filter((f) => f.defaultEnabled !== false).map((f) => f.id);
    } else {
      defaults[mod.id] = [];
    }
  });
  return defaults;
}

export const PAGE_LABEL_AR: Record<string, string> = {
  Overview: 'نظرة عامة',
  Notifications: 'الإشعارات',
  Settings: 'الإعدادات',
  Profile: 'الملف الشخصي',
  Orders: 'الطلبات',
  'Abandoned Cart': 'السلة المتروكة',
  Products: 'المنتجات',
  Invoices: 'الفواتير',
  Expenses: 'المصروفات',
  Customers: 'العملاء',
  Promotions: 'العروض',
  'Marketing Center': 'مركز التسويق',
  Reservations: 'الحجوزات',
  Providers: 'مقدمو الخدمة',
  Services: 'الخدمات',
  'Rooms / Units': 'الغرف / الوحدات',
  'Customer Records': 'سجلات العملاء',
  'Activity Inventory': 'مخزون النشاط',
  'Restaurant Tables': 'طاولات المطعم',
  Employees: 'الموظفون',
  Attendance: 'الحضور',
  Payroll: 'الرواتب',
  'Page Builder': 'منشئ الصفحات',
  Gallery: 'المعرض',
  Reports: 'التقارير',
  'AI Builder': 'منشئ الذكاء الاصطناعي',
  Quotes: 'عروض الأسعار',
  Payments: 'المدفوعات',
  Returns: 'المرتجع',
  Loyalty: 'الولاء',
  Subscriptions: 'الاشتراكات',
  'E-Payment': 'الدفع الإلكتروني',
  'Order Status': 'حالات الطلب',
  Categories: 'الفئات',
  Variants: 'المتغيرات',
  Warehouses: 'المخازن',
  Stocktake: 'الجرد',
  Suppliers: 'الموردين',
  'Purchase Orders': 'أوامر الشراء',
  Transfers: 'النقل بين المخازن',
  Barcode: 'الباركود',
  'QR Code': 'QR Code',
  'Stock Tracking': 'تتبع الكميات',
  'Low Stock Alerts': 'تنبيهات النفاد',
  Revenue: 'الإيرادات',
  Profits: 'الأرباح',
  Taxes: 'الضرائب',
  Journal: 'القيود اليومية',
  'Cash Flow': 'التدفقات النقدية',
  Accounts: 'الحسابات',
  Wallets: 'المحافظ',
  'Financial Reports': 'التقارير المالية',
  Campaigns: 'الحملات',
  Coupons: 'الكوبونات',
  Discounts: 'الخصومات',
  Messages: 'الرسائل',
  'Email Campaigns': 'حملات البريد الإلكتروني',
  'Push Notifications': 'الإشعارات الفورية',
  'SMS Campaigns': 'حملات SMS',
  'Loyalty Programs': 'برامج الولاء',
  'Seasonal Offers': 'العروض الموسمية',
  Appointments: 'المواعيد',
  Calendar: 'التقويم',
  Rooms: 'الغرف',
  Doctors: 'الأطباء',
  'Booking Confirm': 'تأكيد الحجز',
  'Booking Cancel': 'إلغاء الحجز',
  'Booking Reminder': 'تذكير الحجز',
  Permissions: 'الصلاحيات',
  'Check-out': 'الانصراف',
  Leaves: 'الإجازات',
  Tasks: 'المهام',
  Pages: 'الصفحات',
  Templates: 'القوالب',
  SEO: 'SEO',
  Blog: 'المدونة',
  Forms: 'النماذج',
  Media: 'الوسائط',
  Domains: 'الدومينات',
  Publishing: 'النشر',
  KPI: 'مؤشرات الأداء',
  Charts: 'الرسوم البيانية',
  'Sales Performance': 'أداء المبيعات',
  'Product Performance': 'أداء المنتجات',
  Visitors: 'الزوار',
  Conversions: 'التحويلات',
  'AI Content': 'محتوى AI',
  'AI Images': 'صور AI',
  'AI SEO': 'SEO بالذكاء الاصطناعي',
  'AI Analysis': 'تحليل AI',
  'AI Replies': 'ردود AI',
  'AI Suggestions': 'اقتراحات AI',
  'AI Pages': 'صفحات AI',
  'AI Data Analysis': 'تحليل بيانات AI',
  Cashier: 'الكاشير',
  'POS Invoices': 'فواتير الكاشير',
  'POS Returns': 'مرتجعات الكاشير',
  'Website Returns': 'مرتجعات الموقع',
  Shifts: 'الورديات',
  'POS Reports': 'تقارير الكاشير',
};
