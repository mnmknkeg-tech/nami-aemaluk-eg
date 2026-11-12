/**
 * مفاتيح جلسة اللوحة — مفصولة تماماً عن الماركت.
 *
 * الحالة بعد إعادة تصميم المصادقة (كوكي HttpOnly هو الأساس):
 *  - readToken(): تُقرأ فقط (بلا كتابة) — تعمل كجسر مؤقت للمستخدمين الذين
 *    وصلوا عبر /auth/callback?token=... ؛ تُمسح تلقائياً عند نجاح أول
 *    refresh (كوكي صار هو مصدر الحقيقة) أو عند انتهاء الجلسة.
 *  - writeToken(): تُستدعى حصراً من جسري /auth/callback و admin/gate.
 *    مسار المصادقة العادي (login/refresh) لا يكتب توكنات بعد الآن.
 *  - معلومات المستخدم (USER_KEY) تبقى كـUX cache غير حساسة.
 */
export const TOKEN_KEY = 'ray_dashboard_token';
export const USER_KEY = 'ray_dashboard_user';

/** مفاتيح قديمة كانت مشتركة بين التطبيقين */
const LEGACY_TOKEN_KEYS = ['ray_token', 'token'] as const;
const LEGACY_USER_KEYS = ['ray_user'] as const;

// كاش بذاكرة الصفحة لقراءة الجسر (لا إعادة كتابة للمفاتيح القديمة).
let bridgeCache: string | null | undefined;

/** يقرأ توكن الجسر إن وُجد — قراءة فقط، بلا كتابة أو ترحيل. */
export function readToken(): string {
  if (typeof window === 'undefined') return '';
  if (bridgeCache !== undefined) return bridgeCache || '';
  const scoped = localStorage.getItem(TOKEN_KEY);
  if (scoped) {
    bridgeCache = scoped;
    return scoped;
  }
  for (const key of LEGACY_TOKEN_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      bridgeCache = legacy;
      return legacy;
    }
  }
  bridgeCache = null;
  return '';
}

/**
 * جسر الترحيل الوحيد المتبقي: يُستخدم من /auth/callback و admin/gate فقط.
 * مسار المصادقة العادي لا يستدعيها أبداً.
 */
export function writeToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  bridgeCache = token;
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
  bridgeCache = null;
}

/** يقرأ مستخدم اللوحة المخزّن (JSON نصي) — مع ترحيل من المفتاح القديم */
export function readUserJSON(): string | null {
  if (typeof window === 'undefined') return null;
  const scoped = localStorage.getItem(USER_KEY);
  if (scoped) return scoped;
  for (const key of LEGACY_USER_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      localStorage.setItem(USER_KEY, legacy);
      return legacy;
    }
  }
  return null;
}

export function writeUserJSON(json: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, json);
  for (const key of LEGACY_USER_KEYS) localStorage.removeItem(key);
}

export function clearUserJSON() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
  for (const key of LEGACY_USER_KEYS) localStorage.removeItem(key);
}

/**
 * كاش التاجر الموسوم بمالكه — الأساس ضد "بقايا" التاجر السابق عند تبديل
 * الحسابات في نفس المتصفح: القيمة تُخزَّن مع `_ownerUserId`، وعند القراءة
 * لا يُثق بأي كاش لا يطابق مستخدم الجلسة الحالي.
 */
const MERCHANT_CACHE_KEY = 'ray_merchant_shop_cache';

/** مفاتيح قديمة مشتركة بين التجار (أزرار/ثيم المنشئ/كاشير) — تُمسح عند تغيّر الهوية. */
const LEGACY_SHARED_CACHE_KEYS = [
  MERCHANT_CACHE_KEY,
  'ray_builder_last_active_site',
  'ray_builder_selected_template',
  'ray_builder_selected_preset',
  'ray_builder_site_local',
  'pos_current_cashier',
  'pos_cashier_id',
] as const;

/** يقرأ معرف مستخدم الجلسة الحالي من كاش الملف الشخصي (غير الحساس). */
export function readUserId(): string {
  const raw = readUserJSON();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as { id?: string };
    return typeof parsed?.id === 'string' ? parsed.id : '';
  } catch {
    return '';
  }
}

/** يقرأ كاش التاجر فقط إن كان موسومًا بالمستخدم الحالي — كاش تاجر آخر يُتجاهل نهائيًا. */
export function readMerchantCache<T = Record<string, unknown>>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MERCHANT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const owner = (parsed as Record<string, unknown>)._ownerUserId;
    if (typeof owner !== 'string' || !owner || owner !== readUserId()) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

/** يكتب كاش التاجر موسومًا بمعرف مالكه — لا يُكتب أبدًا بلا مالك. */
export function writeMerchantCache(value: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      MERCHANT_CACHE_KEY,
      JSON.stringify({ ...value, _ownerUserId: readUserId() })
    );
  } catch {}
}

/** يمسح كل مفاتيح الحالة المرتبطة بالتاجر — يُستدعى عند دخول/خروج/انتهاء جلسة. */
export function clearMerchantScopedCaches(): void {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_SHARED_CACHE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

/**
 * حدث تغيّر هوية اللوحة (دخول/خروج/انتهاء جلسة) — المستمعون يفرغون كاشهم
 * الخاص (React Query مثلاً يمسك بيانات التاجر السابق حتى gcTime).
 */
export const AUTH_IDENTITY_CHANGED_EVENT = 'ray-auth-identity-changed';

export function dispatchAuthIdentityChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_IDENTITY_CHANGED_EVENT));
}
