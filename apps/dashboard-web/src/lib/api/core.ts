/**
 * Unified API core for dashboard-web.
 *
 * One implementation replaces the two parallel refresh/401 code paths that
 * lived in lib/auth.tsx and lib/api/client.ts:
 *  - cookie-first auth (HttpOnly ray_access / ray_session) plus an optional
 *    one-way "bridge" Bearer handed over by /auth/callback;
 *  - structured 401 detection (error code first, message regex fallback);
 *  - a single module-level single-flight refresh shared by every caller;
 *  - one retry per request, then a single guarded session-expired event;
 *  - GET cache (30s TTL) + in-flight dedup keyed by path;
 *  - access-token expiry tracking so auth-scheduler can refresh proactively.
 *
 * Signatures match the old apiRequest/apiRequestWithMeta, so the 674
 * existing call sites keep working untouched.
 */
import { clearToken, readToken, writeUserJSON } from '../session-keys';

const API_BASE = '/api/v1';
const APP_SCOPE = 'dashboard';
const GET_TTL_MS = 30_000;

/** Endpoints that own auth themselves and must never trigger a refresh retry. */
const AUTH_PATHS = [
  '/auth/refresh',
  '/auth/login',
  '/auth/signup',
  '/auth/logout',
  '/auth/password',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/2fa',
];

/** Structured codes the Go backend returns on expired credentials
 *  (envelope: { success:false, error:<code>, message }). */
const EXPIRED_CODES = new Set([
  'invalid_token',
  'invalid_refresh_token',
  'session_expired',
  'session_error',
  'missing_refresh_token',
  'missing_auth',
  'unauthenticated',
  'token_expired',
  'http_401',
]);

/** Legacy fallback: message-text detection (pre structured-code backends). */
const EXPIRED_MSG_RE = /expired|invalid token|invalid_token/i;

export interface CoreResult<T> {
  data: T;
  meta: any;
  raw: any;
}

// ---------------------------------------------------------------------------
// Access-expiry tracking (feeds the proactive scheduler)
// ---------------------------------------------------------------------------
let accessExpiresAt = 0;
const expiryListeners = new Set<(expiresAt: number) => void>();

function normalizeExpiry(value: unknown): number {
  if (typeof value === 'number') return value > 1e12 ? value : value * 1000;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

let sessionExpiredDispatched = false;

/** Records auth success: re-arms the guarded expired flag and publishes the
 *  new access-token deadline to the scheduler. */
export function noteAuthSuccess(expiresAt?: unknown): void {
  sessionExpiredDispatched = false;
  const ms = normalizeExpiry(expiresAt);
  if (ms) {
    accessExpiresAt = ms;
    for (const cb of expiryListeners) {
      try {
        cb(ms);
      } catch {
        /* listener errors must never break auth */
      }
    }
  }
}

export function getAccessExpiresAt(): number {
  return accessExpiresAt;
}

/** Subscribe to access-expiry changes (used by auth-scheduler). */
export function onAccessExpiry(cb: (expiresAt: number) => void): () => void {
  expiryListeners.add(cb);
  return () => expiryListeners.delete(cb);
}

// ---------------------------------------------------------------------------
// Guarded session-expired event — at most one per dead session
// ---------------------------------------------------------------------------
export function dispatchSessionExpired(): void {
  if (sessionExpiredDispatched) return;
  sessionExpiredDispatched = true;
  accessExpiresAt = 0;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ray-session-expired'));
  }
}

/** Test helper: allows the next expiry to dispatch again. */
export function resetSessionExpiredGuard(): void {
  sessionExpiredDispatched = false;
}

function getCsrf(): string {
  if (typeof document === 'undefined') return '';
  return document.cookie.match(/ray_csrf=([^;]+)/)?.[1] || '';
}

function isAuthPath(path: string): boolean {
  return AUTH_PATHS.some((p) => path.startsWith(p));
}

// ---------------------------------------------------------------------------
// Single-flight silent refresh
// ---------------------------------------------------------------------------
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Silently exchanges the ray_session cookie for a fresh access token.
 * Concurrent callers share one in-flight promise, so ten parallel 401s
 * produce exactly one POST /auth/refresh. Returns the access token
 * (in-memory only — never persisted) or null.
 */
export async function refreshSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const csrf = getCsrf();
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Scope': APP_SCOPE,
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        body: '{}',
      });
      if (!res.ok) return null;
      const body = await res.json().catch(() => null);
      const accessToken: string | null =
        body?.data?.token?.accessToken || body?.token?.accessToken || null;
      if (!accessToken) return null;

      const expiresAt = body?.data?.token?.expiresAt || body?.token?.expiresAt;
      noteAuthSuccess(expiresAt);
      // Cookies are now the source of truth — retire the one-way bridge
      // token that /auth/callback may have planted in localStorage.
      clearToken();

      const user = body?.data?.user || body?.user;
      if (user && typeof window !== 'undefined') {
        writeUserJSON(JSON.stringify(user));
        window.dispatchEvent(new Event('ray-user-refreshed'));
      }
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ---------------------------------------------------------------------------
// 401 classification
// ---------------------------------------------------------------------------
/**
 * True when a failed response means "credentials expired/invalid, refresh
 * and retry" — prefers the structured error code, falls back to the legacy
 * message regex so behavior never regresses if the envelope changes.
 */
export function isAuthExpired(status: number, body: any, path: string): boolean {
  if (status !== 401) return false;
  if (isAuthPath(path)) return false;

  const code =
    (typeof body?.error === 'string' && body.error) ||
    (typeof body?.code === 'string' && body.code) ||
    '';
  if (code && EXPIRED_CODES.has(code)) return true;

  const message = String(body?.message || body?.error || '');
  return EXPIRED_MSG_RE.test(message);
}

// ---------------------------------------------------------------------------
// Request body
// ---------------------------------------------------------------------------
function buildHeaders(options: RequestInit): Headers {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = new Headers(options.headers);
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('X-App-Scope')) {
    headers.set('X-App-Scope', APP_SCOPE);
  }
  const csrf = getCsrf();
  const method = (options.method || 'GET').toUpperCase();
  if (csrf && method !== 'GET' && method !== 'HEAD' && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', csrf);
  }
  // Bridge Bearer: only while a callback-handwritten token exists. Normal
  // cookie sessions send no Authorization header at all.
  const bridge = readToken();
  if (bridge && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${bridge}`);
  }
  return headers;
}

async function performRequest(
  path: string,
  options: RequestInit
): Promise<{ res: Response; body: any }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options),
    credentials: 'include',
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  return { res, body };
}

function throwApiError(status: number, body: any): never {
  const message = String(body?.message || body?.error || 'Request failed');
  const err = new Error(message) as Error & { status?: number };
  err.status = status;
  throw err;
}

/**
 * Core request: fetch → (on auth-expired 401) single-flight refresh →
 * retry exactly once → guarded session-expired + throw. Never loops.
 */
async function execute(
  path: string,
  options: RequestInit,
  _retried: boolean
): Promise<{ res: Response; body: any }> {
  let result = await performRequest(path, options);

  if (isAuthExpired(result.res.status, result.body, path) && !_retried) {
    const fresh = await refreshSession();
    if (fresh) {
      result = await performRequest(path, options);
      // Refresh "succeeded" but the retried request still says the
      // credentials are dead — treat as terminal, do not refresh again.
    } else {
      dispatchSessionExpired();
      const err = new Error('انتهت الجلسة، من فضلك سجل الدخول من جديد') as Error & {
        status?: number;
      };
      err.status = 401;
      throw err;
    }
  }

  if (!result.res.ok) {
    throwApiError(result.res.status, result.body);
  }
  return result;
}

// ---------------------------------------------------------------------------
// GET cache + in-flight dedup
// ---------------------------------------------------------------------------
const getCache = new Map<string, { at: number; raw: any }>();
const inflightGets = new Map<string, Promise<any>>();

export function clearApiCache(): void {
  getCache.clear();
}

function cachedGet(path: string, options: RequestInit): Promise<any> {
  if (options.cache === 'no-store') {
    return execute(path, options, false);
  }
  const hit = getCache.get(path);
  if (hit && Date.now() - hit.at < GET_TTL_MS) {
    return Promise.resolve(hit.raw);
  }
  const pending = inflightGets.get(path);
  if (pending) return pending;

  const exec = execute(path, options, false)
    .then((result) => {
      getCache.set(path, { at: Date.now(), raw: result.body });
      return result.body;
    })
    .finally(() => {
      inflightGets.delete(path);
    });
  inflightGets.set(path, exec);
  return exec;
}

function unwrap(body: any): any {
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

// ---------------------------------------------------------------------------
// Public API — signatures identical to the legacy implementations
// ---------------------------------------------------------------------------

/** Returns the payload (same unwrapping the old apiRequest did). */
export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();

  if (method !== 'GET') {
    getCache.clear();
    const { body } = await execute(path, options, false);
    return unwrap(body) as T;
  }

  const body = await cachedGet(path, options);
  return unwrap(body) as T;
}

/** Same as apiRequest but keeps meta/paging information for table views. */
export async function apiRequestWithMeta<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<CoreResult<T>> {
  const method = (options.method || 'GET').toUpperCase();

  let body: any;
  if (method !== 'GET') {
    getCache.clear();
    ({ body } = await execute(path, options, false));
  } else {
    body = await cachedGet(path, options);
  }

  if (body && typeof body === 'object' && 'data' in body) {
    return { data: body.data as T, meta: body.meta || null, raw: body };
  }
  return { data: body as T, meta: null, raw: body };
}

