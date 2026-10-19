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
