// إعدادات الحجز للتاجر — مخزّنة في layoutConfig.booking داخل عمود JSONB في جدول shops
// (نفس مكان layoutConfig.commerce — بيتحدث بـ PATCH /shops/me بدون أي migration).
//
// {
//   "booking": {
//     "queueEnabled": true,          // الحجز بالانتظار (كوتة) بدل المواعيد الثابتة
//     "queueNotifyMinutes": 30,      // تنبيه العميل قبل دوره بكم دقيقة
//     "avgServiceMinutes": 15,       // متوسط زمن الخدمة — لحساب الانتظار التقديري
//     "doctors": [{ "id": "dr_1", "name": "د. أحمد سمير", "specialty": "أسنان" }]
//   }
// }

export interface QueueDoctor {
  id: string;
  name: string;
  specialty?: string;
}

export interface ShopBookingConfig {
  queueEnabled?: boolean;
  /** تنبيه العميل قبل دوره بكم دقيقة — الافتراضي 30 */
  queueNotifyMinutes?: number;
  /** متوسط زمن الخدمة بالدقائق — الافتراضي 15 */
  avgServiceMinutes?: number;
  /** فريق العمل / الأطباء */
  doctors?: QueueDoctor[];
}

export const DEFAULT_QUEUE_NOTIFY_MINUTES = 30;
export const DEFAULT_AVG_SERVICE_MINUTES = 15;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** قراءة آمنة لإعدادات الحجز من بيانات المتجر — أي قيمة ناقصة أو غلط تتتجاهل. */
export function readShopBookingConfig(
  shop: { layoutConfig?: unknown } | null | undefined
): ShopBookingConfig {
  const booking = asRecord(asRecord(shop?.layoutConfig)?.booking);
  if (!booking) return {};

  const out: ShopBookingConfig = {
    queueEnabled: booking.queueEnabled === true,
    queueNotifyMinutes: asPositiveInt(
      booking.queueNotifyMinutes,
      DEFAULT_QUEUE_NOTIFY_MINUTES
    ),
    avgServiceMinutes: asPositiveInt(
      booking.avgServiceMinutes,
      DEFAULT_AVG_SERVICE_MINUTES
    ),
  };

  if (Array.isArray(booking.doctors)) {
    out.doctors = booking.doctors
      .map((raw: unknown, idx: number): QueueDoctor | null => {
        const doc = asRecord(raw);
        const name = asString(doc?.name);
        if (!name) return null;
        return {
          id: asString(doc?.id) || `dr_${idx + 1}`,
          name,
          specialty: asString(doc?.specialty),
        };
      })
      .filter((d): d is QueueDoctor => d !== null);
  }

  return out;
}

/** دمج إعدادات حجز جديدة داخل layoutConfig موجود — يحمي بقية المفاتيح. */
export function mergeBookingConfigIntoLayout(
  layoutConfig: unknown,
  booking: ShopBookingConfig
): Record<string, unknown> {
  const previous =
    layoutConfig && typeof layoutConfig === 'object' && !Array.isArray(layoutConfig)
      ? (layoutConfig as Record<string, unknown>)
      : {};
  const commerce =
    previous.commerce && typeof previous.commerce === 'object' && !Array.isArray(previous.commerce)
      ? (previous.commerce as Record<string, unknown>)
      : {};
  // queueEnabled له مصدر تاريخي في layoutConfig.commerce — نزامنه مع القيمة الجديدة
  // عشان كل الواجهات القريئة (المودالات، كروت المنتجات) تفضل شغالة بنفس القرار.
  return {
    ...previous,
    booking,
    commerce: { ...commerce, queueEnabled: booking.queueEnabled === true },
  };
}
