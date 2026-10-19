// Typed wrapper around the Wails bindings. During `wails build` the runtime
// exposes window.go.main.App.* and window.runtime.Events*.

/* eslint-disable @typescript-eslint/no-explicit-any */
const app = () => (window as any).go?.main?.App;
const rt = () => (window as any).runtime;

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  trackStock: boolean;
  barcode: string | null;
};

export type Shift = {
  id: string;
  remoteId: string | null;
  openedById: string | null;
  openedByName: string | null;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  totalSales: number;
  ordersCount: number;
  status: string;
  note: string | null;
  openedAt: string;
  closedAt: string | null;
  synced: boolean;
};

export type GateCashier = { id: string; name: string; permissions: string[] };

export type GateInfo = {
  mode: 'open' | 'resume' | 'none';
  activeShift: Shift | null;
  cashiers: GateCashier[];
  hasAdminPin: boolean;
  current: { id: string; name: string; isAdmin: boolean; permissions: string[] } | null;
  shopName: string;
  lastSync: string | null;
};

export type AppState = {
  configured: boolean;
  shopName: string;
  serverUrl: string;
  email: string;
  hasProducts: boolean;
  currentSet: boolean;
  sessionExpired: boolean;
};

export type SyncStatus = {
  online: boolean;
  syncing: boolean;
  lastSync: string | null;
  pending: number;
  error?: string;
};

export type CheckoutItem = { productId: string; name: string; quantity: number; price: number };

export type CheckoutRequest = {
  items: CheckoutItem[];
  paymentMethod: string;
  discountType: string;
  discountValue: number;
  customerName: string;
  customerPhone: string;
  notes: string;
};

export type Order = {
  id: string;
  remoteId: string | null;
  shiftId: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: string;
  status: string;
  cashierName: string | null;
  createdAt: string;
  synced: boolean;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

export type HeldOrder = { id: string; label: string; payload: string; createdAt: string };

export type CashMovement = {
  id: string;
  shiftId: string;
  kind: string;
  amount: number;
  note: string | null;
  createdAt: string;
};

export type ShiftReport = {
  shift: Shift;
  opening: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
  netCash: number;
  expected: number;
  closing: number;
  difference: number;
  movements: CashMovement[];
  orders: Order[];
  pendingSync: number;
};

export const api = {
  getState: (): Promise<AppState> => app().GetState(),
  connect: (serverUrl: string, email: string, password: string): Promise<void> =>
    app().Connect(serverUrl, email, password),
  disconnect: (): Promise<void> => app().Disconnect(),
  getGate: (): Promise<GateInfo> => app().GetGate(),
  gateAdmin: (pin: string): Promise<void> => app().GateAdmin(pin),
  gateSubmit: (cashierId: string, pin: string, openingCash: number): Promise<Shift> =>
    app().GateSubmit(cashierId, pin, openingCash),
  lockScreen: (): Promise<void> => app().LockScreen(),
  getProducts: (search: string, category: string): Promise<Product[]> =>
    app().GetProducts(search, category),
  getCategories: (): Promise<string[]> => app().GetCategories(),
  checkout: (req: CheckoutRequest): Promise<{ order: Order; items: OrderItem[]; change: number }> =>
    app().Checkout(req),
  getActiveShift: (): Promise<Shift | null> => app().GetActiveShift(),
  closeShift: (closingAmount: number, note: string): Promise<Shift> =>
    app().CloseShift(closingAmount, note),
  getShiftsHistory: (): Promise<Shift[]> => app().GetShiftsHistory(),
  getShiftReport: (): Promise<ShiftReport> => app().GetShiftReport(),
  addCashMovement: (kind: string, amount: number, note: string): Promise<void> =>
    app().AddCashMovement(kind, amount, note),
  getCashMovements: (): Promise<CashMovement[]> => app().GetCashMovements(),
  holdOrder: (label: string, payload: string): Promise<void> => app().HoldOrder(label, payload),
  getHeldOrders: (): Promise<HeldOrder[]> => app().GetHeldOrders(),
  deleteHeldOrder: (id: string): Promise<void> => app().DeleteHeldOrder(id),
  getOrders: (shiftId: string): Promise<Order[]> => app().GetOrders(shiftId),
  syncNow: (): Promise<SyncStatus> => app().SyncNow(),
  getSyncStatus: (): Promise<SyncStatus> => app().GetSyncStatus(),
};

export function onEvent(name: string, cb: (data: any) => void): () => void {
  const r = rt();
  if (!r?.EventsOn) return () => {};
  r.EventsOn(name, cb);
  return () => r.EventsOff(name);
}
