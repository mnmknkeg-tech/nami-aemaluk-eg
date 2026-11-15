/* ============================================================
 * Types (matching backend responses)
 * ============================================================ */

/* ============================================================
 * Types (matching backend responses)
 * ============================================================ */

export type Booking = {
  id: string;
  source: 'website' | 'internal';
  status: string;
  itemName: string;
  customerName: string;
  customerPhone: string;
  when: string;
  price: number;
  participants?: number;
  notes?: string;
  raw?: any;
};

export type OverviewStat = {
  label: string;
  label_ar: string;
  value: string;
  change: string;
  up: boolean;
  icon: string;
  color: string;
};
export type WeeklyPoint = { day: string; value: number };
export type TopProduct = { name: string; sales: number; revenue: number };
export type AnalyticsOverview = {
  shop_id: string;
  stats: OverviewStat[];
  weekly_data: WeeklyPoint[];
  top_products: TopProduct[];
};
export type SalesReport = {
  shop_id: string;
  stats: Array<{ label: string; label_ar: string; value: string; change: string; up: boolean }>;
  trend: Array<{ date: string; revenue: number; orders: number }>;
};
export type Shop = {
  id?: string;
  name?: string;
  slug?: string;
  status?: string;
  isActive?: boolean;
  category?: string;
  governorate?: string;
  city?: string;
  followers?: number;
  visitors?: number;
  rating?: number;
  logoUrl?: string | null;
};
export type Order = {
  id?: string;
  total?: number;
  status?: string;
  createdAt?: string;
  customerName?: string;
  customerPhone?: string;
};
export type AppNotification = {
  id: string;
  title?: string;
  content?: string;
  type?: string;
  created_at?: string;
  createdAt?: string;
};
export type LoginSession = {
  ID?: string;
  id?: string;
  UserEmail?: string;
  userEmail?: string;
  LoginAt?: string;
  loginAt?: string;
  LogoutAt?: string | null;
  logoutAt?: string | null;
};

export type PeriodKey = '7' | '30' | '90' | '365';

export type OverviewPrefs = { hidden: string[]; forced: string[] };

export type Metric = 'revenue' | 'orders';
