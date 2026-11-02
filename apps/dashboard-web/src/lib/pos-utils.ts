'use client';

/**
 * POS shared utilities:
 *  - Held orders (suspend/resume) persisted to localStorage
 *  - Barcode scanning (USB HID + camera via BarcodeDetector API)
 *  - Keyboard shortcuts helper
 *  - CSV export helper for reports
 */

const HELD_ORDERS_KEY = (shopId: string) => `pos_held_orders_${shopId}`;

export interface HeldOrder {
  id: string;
  savedAt: number;
  cart: any[];
  customerName?: string;
  customerPhone?: string;
  discountType?: 'none' | 'percent' | 'fixed';
  discountValue?: number;
  paymentMethod?: 'cash' | 'card' | 'wallet' | 'credit';
  note?: string;
}

export const HeldOrders = {
  list: (shopId: string): HeldOrder[] => {
    if (!shopId) return [];
    try {
      const raw = localStorage.getItem(HELD_ORDERS_KEY(shopId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  save: (shopId: string, order: HeldOrder): void => {
    if (!shopId || !order?.id) return;
    try {
      const list = HeldOrders.list(shopId);
      const next = [order, ...list.filter((x) => x.id !== order.id)].slice(0, 20);
      localStorage.setItem(HELD_ORDERS_KEY(shopId), JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('pos-held-orders:updated', { detail: { shopId } }));
    } catch {}
  },

  remove: (shopId: string, id: string): void => {
    if (!shopId || !id) return;
    try {
      const list = HeldOrders.list(shopId).filter((x) => x.id !== id);
      localStorage.setItem(HELD_ORDERS_KEY(shopId), JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('pos-held-orders:updated', { detail: { shopId } }));
    } catch {}
  },

  clear: (shopId: string): void => {
    if (!shopId) return;
    try {
      localStorage.removeItem(HELD_ORDERS_KEY(shopId));
      window.dispatchEvent(new CustomEvent('pos-held-orders:updated', { detail: { shopId } }));
    } catch {}
  },
};

// ─── Barcode scanning ──────────────────────────────────────────────────────

/**
 * USB HID barcode scanners act as keyboards: they type digits fast and end
 * with Enter. We detect a rapid sequence of keystrokes (<=40ms between keys)
 * ending with Enter to distinguish scanner input from human typing.
 */
export interface BarcodeScannerHandle {
  stop: () => void;
}

export function startUsbBarcodeListener(
  onScan: (code: string) => void,
  opts: { minChars?: number; maxGapMs?: number } = {}
): BarcodeScannerHandle {
  const minChars = opts.minChars ?? 4;
  const maxGapMs = opts.maxGapMs ?? 40;
  let buffer = '';
  let lastTime = 0;

  const handler = (e: KeyboardEvent) => {
    const now = Date.now();
    const gap = now - lastTime;
    lastTime = now;

    // Reset if the gap is too long (human typing)
    if (gap > maxGapMs && buffer.length > 0) {
      buffer = '';
    }

    if (e.key === 'Enter') {
      if (buffer.length >= minChars) {
        const code = buffer;
        buffer = '';
        e.preventDefault();
        onScan(code);
        return;
      }
      buffer = '';
      return;
    }

    // Only accept printable single chars
    if (e.key && e.key.length === 1) {
      buffer += e.key;
    }
  };

  window.addEventListener('keydown', handler, true);
  return {
    stop: () => window.removeEventListener('keydown', handler, true),
  };
}

/**
 * Camera-based barcode scanning using the native BarcodeDetector API
 * (Chromium browsers). Returns a stop handle.
 */
export async function startCameraBarcodeListener(
  onScan: (code: string) => void,
  videoEl: HTMLVideoElement
): Promise<BarcodeScannerHandle> {
  const BarcodeDetectorCtor = (window as any).BarcodeDetector;
  if (!BarcodeDetectorCtor || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('BarcodeDetector غير مدعوم في هذا المتصفح');
  }

  const detector = new BarcodeDetectorCtor({
    formats: ['code_39', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
  });
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play().catch(() => {});

  let stopped = false;
  let rafId = 0;

  const tick = async () => {
    if (stopped) return;
    try {
      const codes = await detector.detect(videoEl);
      if (codes && codes.length > 0) {
        const raw = codes[0]?.rawValue;
        if (raw) {
          onScan(String(raw));
        }
      }
    } catch {}
    rafId = window.setTimeout(tick, 400) as unknown as number;
  };
  tick();

  return {
    stop: () => {
      stopped = true;
      clearTimeout(rafId);
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    },
  };
}

// ─── Keyboard shortcuts helper ─────────────────────────────────────────────

export type ShortcutHandler = (e: KeyboardEvent) => void;

export interface ShortcutDef {
  key: string; // e.g. 'F2', 'Enter', 'Escape'
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: ShortcutHandler;
  /** When true, prevent default + stop propagation. Default true. */
  preventDefault?: boolean;
}

export function bindShortcuts(defs: ShortcutDef[]): () => void {
  const handler = (e: KeyboardEvent) => {
    for (const d of defs) {
      if (!e.key || !d.key) continue;
      const keyMatch = e.key.toLowerCase() === d.key.toLowerCase();
      if (!keyMatch) continue;
      if (!!d.ctrl !== e.ctrlKey) continue;
      if (!!d.shift !== e.shiftKey) continue;
      if (!!d.alt !== e.altKey) continue;
      if (!!d.meta !== e.metaKey) continue;
      if (d.preventDefault !== false) {
        e.preventDefault();
        e.stopPropagation();
      }
      d.handler(e);
      return;
    }
  };
  window.addEventListener('keydown', handler, true);
  return () => window.removeEventListener('keydown', handler, true);
}

// ─── CSV export helper (delegates to the unified export engine) ────────────

export async function exportToCsv(filename: string, rows: Record<string, any>[]): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const { buildExportBlob, downloadBlob } = await import('@/lib/export');
  const blob = buildExportBlob(
    { filename, headers, rows: rows.map((r) => headers.map((h) => r[h])) },
    'csv'
  );
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

// ─── Pagination helper ─────────────────────────────────────────────────────

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = Math.max(0, (page - 1) * pageSize);
  return items.slice(start, start + pageSize);
}

// ─── Split payment ────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'credit';

export interface SplitPaymentEntry {
  method: PaymentMethod;
  amount: number;
}

export function validateSplitPayments(
  entries: SplitPaymentEntry[],
  total: number
): { ok: boolean; diff: number; sum: number } {
  const sum = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const diff = Number((sum - total).toFixed(2));
  return { ok: Math.abs(diff) < 0.01, diff, sum };
}

// ─── Receipt customization ─────────────────────────────────────────────────

export interface ReceiptTheme {
  shopName?: string;
  phone?: string;
  address?: string;
  city?: string;
  logoUrl?: string;
  headerMessage?: string;
  footerMessage?: string;
  vatRatePercent?: number;
  currency?: string;
  showCashier?: boolean;
  showQrCode?: boolean;
  paperWidth?: '58mm' | '80mm';
}

export function loadReceiptTheme(shopId: string): ReceiptTheme {
  if (!shopId) return {};
  try {
    const raw = localStorage.getItem(`receipt_theme_${shopId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveReceiptTheme(shopId: string, theme: ReceiptTheme): void {
  if (!shopId) return;
  try {
    localStorage.setItem(`receipt_theme_${shopId}`, JSON.stringify(theme));
  } catch {}
}

// ─── Tip / Gratuity ────────────────────────────────────────────────────────

export function computeTip(
  subtotal: number,
  tipType: 'none' | 'percent' | 'fixed',
  tipValue: number
): number {
  if (tipType === 'percent') return subtotal * (Math.min(100, Math.max(0, tipValue)) / 100);
  if (tipType === 'fixed') return Math.max(0, tipValue);
  return 0;
}

// ─── Loyalty points ────────────────────────────────────────────────────────

export interface LoyaltyConfig {
  pointsPerEgp: number; // e.g. 0.1 = 1 point per 10 EGP
  redeemRate: number; // e.g. 0.05 = 1 point = 0.05 EGP
  enabled: boolean;
}

export function loadLoyaltyConfig(shopId: string): LoyaltyConfig {
  if (!shopId) return { pointsPerEgp: 0.1, redeemRate: 0.05, enabled: false };
  try {
    const raw = localStorage.getItem(`loyalty_config_${shopId}`);
    if (raw) return { pointsPerEgp: 0.1, redeemRate: 0.05, enabled: false, ...JSON.parse(raw) };
  } catch {}
  return { pointsPerEgp: 0.1, redeemRate: 0.05, enabled: false };
}

export function saveLoyaltyConfig(shopId: string, cfg: LoyaltyConfig): void {
  if (!shopId) return;
  try {
    localStorage.setItem(`loyalty_config_${shopId}`, JSON.stringify(cfg));
  } catch {}
}

export function computeEarnedPoints(total: number, cfg: LoyaltyConfig): number {
  if (!cfg.enabled) return 0;
  return Math.floor(total * (cfg.pointsPerEgp || 0));
}

export function computeRedeemValue(points: number, cfg: LoyaltyConfig): number {
  if (!cfg.enabled) return 0;
  return Math.min(points, 100000) * (cfg.redeemRate || 0);
}

// ─── Gift cards / vouchers ─────────────────────────────────────────────────

export interface GiftCard {
  code: string;
  balance: number;
  expiresAt?: string | null;
}

export async function validateGiftCard(shopId: string, code: string): Promise<GiftCard | null> {
  // Local-only gift cards (stored in localStorage) for offline support.
  // Real backends can override this by calling /shops/:id/gift-cards/:code.
  if (!shopId || !code) return null;
  try {
    const raw = localStorage.getItem(`gift_cards_${shopId}`);
    const list: GiftCard[] = raw ? JSON.parse(raw) : [];
    const card = list.find((c) => c.code === code.trim());
    if (!card) return null;
    if (card.expiresAt && new Date(card.expiresAt) < new Date()) return null;
    return card;
  } catch {
    return null;
  }
}

export function applyGiftCardAmount(
  card: GiftCard,
  amount: number
): { applied: number; remaining: number } {
  const applied = Math.min(card.balance, Math.max(0, amount));
  return { applied, remaining: Math.max(0, amount - applied) };
}

// ─── Price levels ──────────────────────────────────────────────────────────

export type PriceLevel = 'retail' | 'wholesale' | 'employee';

export function getPriceForLevel(product: any, level: PriceLevel): number {
  const base = Number(product?.price || 0);
  if (level === 'wholesale') {
    const w = Number(product?.wholesalePrice ?? product?.wholesale_price ?? 0);
    return w > 0 ? w : base * 0.85;
  }
  if (level === 'employee') {
    const e = Number(product?.employeePrice ?? product?.employee_price ?? 0);
    return e > 0 ? e : base * 0.9;
  }
  return base;
}

// ─── Signature capture (canvas) ────────────────────────────────────────────

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ─── Cash drawer control ───────────────────────────────────────────────────

export function openCashDrawer(): void {
  // Most USB cash drawers are triggered by the printer's "kick" command.
  // We emit a custom event so a printer integration can listen and fire it.
  try {
    window.dispatchEvent(new CustomEvent('pos:open-cash-drawer'));
  } catch {}
}

// ─── Audit trail ───────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  ts: number;
  action: string;
  detail?: string;
  cashierId?: string;
  amount?: number;
}

export function logAudit(shopId: string, entry: Omit<AuditEntry, 'id' | 'ts'>): void {
  if (!shopId) return;
  try {
    const key = `pos_audit_${shopId}`;
    const raw = localStorage.getItem(key);
    const list: AuditEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift({
      ...entry,
      id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ts: Date.now(),
    });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 500)));
  } catch {}
}

export function readAudit(shopId: string): AuditEntry[] {
  if (!shopId) return [];
  try {
    const raw = localStorage.getItem(`pos_audit_${shopId}`);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// ─── Scale integration (serial/USB) ────────────────────────────────────────
// Browser-based scale integration is limited; we expose a hook for Web Serial.
export async function readScaleViaWebSerial(): Promise<number | null> {
  const nav = navigator as any;
  if (!nav.serial?.requestPort) return null;
  try {
    const port = await nav.serial.requestPort();
    await port.open({ baudRate: 9600 });
    const reader = port.readable?.getReader();
    if (!reader) return null;
    const { value } = await reader.read();
    reader.releaseLock();
    await port.close();
    // Parse common scale protocols: assume ASCII "SNN.NNNkg" or "+NN.NN"
    const text = new TextDecoder().decode(value);
    const m = text.match(/([-+]?\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

// ─── Realtime sync (BroadcastChannel) ──────────────────────────────────────

export function createPosSync(shopId: string, onMessage: (msg: any) => void): () => void {
  if (!shopId || typeof BroadcastChannel === 'undefined') return () => {};
  const ch = new BroadcastChannel(`pos_sync_${shopId}`);
  const handler = (e: MessageEvent) => onMessage(e.data);
  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}

export function broadcastPosSync(shopId: string, msg: any): void {
  if (!shopId || typeof BroadcastChannel === 'undefined') return;
  try {
    const ch = new BroadcastChannel(`pos_sync_${shopId}`);
    ch.postMessage(msg);
    ch.close();
  } catch {}
}

// ─── Tables (restaurant) ───────────────────────────────────────────────────

export interface RestaurantTable {
  id: string;
  name: string;
  seats: number;
  status: 'free' | 'occupied' | 'reserved';
  orderId?: string;
}

export function loadTables(shopId: string): RestaurantTable[] {
  if (!shopId) return [];
  try {
    const raw = localStorage.getItem(`pos_tables_${shopId}`);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveTables(shopId: string, tables: RestaurantTable[]): void {
  if (!shopId) return;
  try {
    localStorage.setItem(`pos_tables_${shopId}`, JSON.stringify(tables));
  } catch {}
}

// ─── Email receipt (mailto fallback + API hook) ────────────────────────────

export function emailReceiptViaMailto(to: string, subject: string, body: string): void {
  try {
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  } catch {}
}

// ─── Layaway (installment plans) ───────────────────────────────────────────

export interface LayawayPlan {
  id: string;
  orderId: string;
  total: number;
  deposit: number;
  paid: number;
  createdAt: number;
  dueAt?: number;
  status: 'active' | 'completed' | 'cancelled';
}

export function loadLayaways(shopId: string): LayawayPlan[] {
  if (!shopId) return [];
  try {
    const raw = localStorage.getItem(`pos_layaways_${shopId}`);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveLayaways(shopId: string, list: LayawayPlan[]): void {
  if (!shopId) return;
  try {
    localStorage.setItem(`pos_layaways_${shopId}`, JSON.stringify(list));
  } catch {}
}

// ─── Tax exempt ────────────────────────────────────────────────────────────

export function isCustomerTaxExempt(customer: any): boolean {
  return Boolean(customer?.taxExempt || customer?.tax_exempt || customer?.exemptFromVat);
}

// ─── Cash in/out (petty cash during shift) ─────────────────────────────────

export interface CashMovement {
  id: string;
  ts: number;
  type: 'in' | 'out';
  amount: number;
  reason: string;
  cashierId?: string;
}

export function loadCashMovements(shopId: string, shiftId?: string): CashMovement[] {
  if (!shopId) return [];
  try {
    const key = `pos_cash_movements_${shopId}${shiftId ? `_${shiftId}` : ''}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveCashMovements(
  shopId: string,
  shiftId: string | undefined,
  list: CashMovement[]
): void {
  if (!shopId) return;
  try {
    const key = `pos_cash_movements_${shopId}${shiftId ? `_${shiftId}` : ''}`;
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

export function addCashMovement(
  shopId: string,
  shiftId: string | undefined,
  movement: Omit<CashMovement, 'id' | 'ts'>
): CashMovement {
  const entry: CashMovement = {
    ...movement,
    id: `cm_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
  };
  const list = [entry, ...loadCashMovements(shopId, shiftId)];
  saveCashMovements(shopId, shiftId, list.slice(0, 200));
  return entry;
}

// ─── Quick keys / favorite products ────────────────────────────────────────

export function loadQuickKeys(shopId: string): string[] {
  if (!shopId) return [];
  try {
    const raw = localStorage.getItem(`pos_quick_keys_${shopId}`);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveQuickKeys(shopId: string, productIds: string[]): void {
  if (!shopId) return;
  try {
    localStorage.setItem(`pos_quick_keys_${shopId}`, JSON.stringify(productIds.slice(0, 30)));
  } catch {}
}

export function toggleQuickKey(shopId: string, productId: string): string[] {
  const list = loadQuickKeys(shopId);
  const next = list.includes(productId)
    ? list.filter((x) => x !== productId)
    : [...list, productId];
  saveQuickKeys(shopId, next);
  return next;
}

// ─── Z-Report / X-Report data ──────────────────────────────────────────────

export interface ReportPeriodData {
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  cardSales: number;
  walletSales: number;
  creditSales: number;
  totalVat: number;
  totalDiscounts: number;
  totalTips: number;
  totalReturns: number;
  netCash: number; // opening + cash sales - returns + cash in - cash out
  openingAmount: number;
  cashIn: number;
  cashOut: number;
  hourlyBuckets: number[];
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
}

export function buildReportData(
  orders: any[],
  shift: any,
  cashMovements: CashMovement[]
): ReportPeriodData {
  const totalSales = orders.reduce((s, o) => s + Number(o?.total || 0), 0);
  const totalOrders = orders.length;
  const buckets = new Array(24).fill(0);
  orders.forEach((o) => {
    const h = new Date(o?.createdAt || 0).getHours();
    if (h >= 0 && h < 24) buckets[h] += Number(o?.total || 0);
  });
  const pm = (m: string) =>
    orders
      .filter((o) => String(o?.paymentMethod || 'COD').toUpperCase() === m)
      .reduce((s, o) => s + Number(o?.total || 0), 0);
  const totalVat = orders.reduce((s, o) => s + Number(o?.vatAmount || 0), 0);
  const totalDiscounts = orders.reduce((s, o) => {
    const notes = String(o?.notes || '');
    const m = notes.match(/discount:(?:percent|fixed):([\d.]+)/);
    return s + (m ? Number(m[1]) : 0);
  }, 0);
  const totalTips = orders.reduce((s, o) => {
    const notes = String(o?.notes || '');
    const m = notes.match(/tip:(?:percent|fixed):([\d.]+)/);
    return s + (m ? Number(m[1]) : 0);
  }, 0);
  const totalReturns = orders
    .filter((o) => o?.status === 'RETURNED')
    .reduce((s, o) => s + Number(o?.total || 0), 0);

  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  orders.forEach((o) => {
    (Array.isArray(o?.items) ? o.items : []).forEach((it: any) => {
      const name = String(it?.name || it?.productName || '—');
      const qty = Number(it?.quantity || 0);
      const rev = Number(it?.price || 0) * qty;
      const cur = productMap.get(name) || { name, qty: 0, revenue: 0 };
      cur.qty += qty;
      cur.revenue += rev;
      productMap.set(name, cur);
    });
  });

  const cashIn = cashMovements.filter((m) => m.type === 'in').reduce((s, m) => s + m.amount, 0);
  const cashOut = cashMovements.filter((m) => m.type === 'out').reduce((s, m) => s + m.amount, 0);
  const openingAmount = Number(shift?.openingAmount || 0);
  const cashSales = pm('COD');
  const netCash = openingAmount + cashSales - totalReturns + cashIn - cashOut;

  return {
    totalSales,
    totalOrders,
    cashSales,
    cardSales: pm('CARD'),
    walletSales: pm('WALLET'),
    creditSales: pm('CREDIT'),
    totalVat,
    totalDiscounts,
    totalTips,
    totalReturns,
    netCash,
    openingAmount,
    cashIn,
    cashOut,
    hourlyBuckets: buckets,
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
  };
}

// ─── Drawer declaration ────────────────────────────────────────────────────

export interface DrawerDeclaration {
  id: string;
  ts: number;
  shiftId?: string;
  declaredCash: number;
  expectedCash: number;
  difference: number;
  cashierId?: string;
  note?: string;
}

export function loadDrawerDeclarations(shopId: string): DrawerDeclaration[] {
  if (!shopId) return [];
  try {
    const raw = localStorage.getItem(`pos_drawer_declarations_${shopId}`);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveDrawerDeclaration(shopId: string, decl: DrawerDeclaration): void {
  if (!shopId) return;
  try {
    const list = [decl, ...loadDrawerDeclarations(shopId)].slice(0, 50);
    localStorage.setItem(`pos_drawer_declarations_${shopId}`, JSON.stringify(list));
  } catch {}
}
