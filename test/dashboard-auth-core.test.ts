/**
 * Behavioral tests for the unified dashboard API core (Phase C of the
 * auth redesign): single-flight refresh, structured 401 detection,
 * retry-once without loops, guarded session-expired event, GET cache
 * dedup, and the proactive refresh scheduler.
 *
 * Runs under the root Jest config (testEnvironment: node) using relative
 * imports so no path-alias mapping is required.
 */
import {
  apiRequest,
  apiRequestWithMeta,
  clearApiCache,
  isAuthExpired,
  noteAuthSuccess,
  resetSessionExpiredGuard,
} from '../apps/dashboard-web/src/lib/api/core';
import {
  startAuthScheduler,
  stopAuthScheduler,
} from '../apps/dashboard-web/src/lib/auth-scheduler';

// ---------------------------------------------------------------------------
// Browser-ish globals (node testEnvironment)
// ---------------------------------------------------------------------------
const localStorageStub = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

let windowDispatch: jest.Mock;

beforeAll(() => {
  (globalThis as any).localStorage = localStorageStub;
  (globalThis as any).window = {
    dispatchEvent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    focus: jest.fn(),
  };
  (globalThis as any).document = {
    cookie: '',
    hidden: false,
    visibilityState: 'visible',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  windowDispatch = (globalThis as any).window.dispatchEvent;
});

const fetchMock = () => (globalThis as any).fetch as jest.Mock;

let refreshCalls = 0;

beforeEach(() => {
  refreshCalls = 0;
  clearApiCache();
  resetSessionExpiredGuard();
  windowDispatch.mockClear();
  (globalThis as any).fetch = jest.fn();
});

afterEach(() => {
  stopAuthScheduler();
  jest.useRealTimers();
});

function jsonRes(status: number, body: any): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
  } as unknown as Response;
}

function refreshBody(expiresInMs = 15 * 60 * 1000) {
  return {
    success: true,
    data: {
      token: {
        accessToken: 'fresh-access-token',
        expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      },
      user: { id: 'u1', email: 'a@b.c' },
    },
  };
}

const expiredEnvelope = {
  success: false,
  error: 'invalid_token',
  message: 'invalid token',
};

// ---------------------------------------------------------------------------
// Test cases from the plan (Phase C)
// ---------------------------------------------------------------------------

describe('case 3: ten concurrent 401s produce exactly one refresh', () => {
  it('single-flights /auth/refresh and retries every request once', async () => {
    fetchMock().mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('/auth/refresh')) {
        refreshCalls++;
        return jsonRes(200, refreshBody());
      }
      if (refreshCalls === 0) return jsonRes(401, expiredEnvelope);
      return jsonRes(200, { success: true, data: 'ok' });
    });

    const paths = Array.from({ length: 10 }, (_, i) => `/resource/${i}`);
    const results = await Promise.all(paths.map((p) => apiRequest(p)));

    expect(refreshCalls).toBe(1);
    expect(results).toEqual(paths.map(() => 'ok'));
    // 10 initial + 1 refresh + 10 retries — nothing more.
    expect(fetchMock().mock.calls.length).toBe(21);
  });
});

describe('cases 4+6: refresh failure → one safe logout, no loops', () => {
  it('throws with status 401 and dispatches ray-session-expired only once', async () => {
    fetchMock().mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('/auth/refresh')) {
        refreshCalls++;
        return jsonRes(401, {
          success: false,
          error: 'session_expired',
          message: 'انتهت صلاحية الجلسة',
        });
      }
      return jsonRes(401, expiredEnvelope);
    });

    await expect(apiRequest('/first')).rejects.toMatchObject({ status: 401 });
    await expect(apiRequest('/second')).rejects.toMatchObject({ status: 401 });

    // Each failed request tried the refresh once (they were sequential, so
    // single-flight has nothing to merge) — but the UI event fired once.
    expect(refreshCalls).toBe(2);
    expect(
      windowDispatch.mock.calls.filter((c: any[]) => c[0]?.type === 'ray-session-expired')
    ).toHaveLength(1);
    // Bounded traffic: 2 requests × (1 try + 1 refresh) = 4 — no looping.
    expect(fetchMock().mock.calls.length).toBe(4);
  });

  it('never treats a second 401 after a successful refresh as another refresh trigger', async () => {
    fetchMock().mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('/auth/refresh')) {
        refreshCalls++;
        return jsonRes(200, refreshBody());
      }
      // Endpoint keeps failing even with fresh credentials (e.g. locked
      // account) — must retry once and stop, not refresh forever.
      return jsonRes(401, expiredEnvelope);
    });

    await expect(apiRequest('/locked')).rejects.toMatchObject({ status: 401 });
    expect(refreshCalls).toBe(1);
    // initial + refresh + retry = 3 calls total.
    expect(fetchMock().mock.calls.length).toBe(3);
  });
});

describe('case 5: structured 401 detection (code first, regex fallback)', () => {
  it('classifies by the backend error code', () => {
    expect(isAuthExpired(401, { error: 'invalid_token' }, '/x')).toBe(true);
    expect(isAuthExpired(401, { error: 'session_expired' }, '/x')).toBe(true);
    expect(isAuthExpired(401, { code: 'missing_auth' }, '/x')).toBe(true);
  });

  it('falls back to the message regex when no code is present', () => {
    expect(isAuthExpired(401, { message: 'Access Token expired' }, '/x')).toBe(true);
    expect(isAuthExpired(401, {}, '/x')).toBe(false);
  });

  it('does not refresh for unrelated 401 codes or non-401 statuses', () => {
    expect(isAuthExpired(401, { error: 'shop_not_approved', message: 'nope' }, '/x')).toBe(false);
    expect(isAuthExpired(500, { error: 'invalid_token' }, '/x')).toBe(false);
    // Auth endpoints own their failures — never chain a refresh off them.
    expect(isAuthExpired(401, { error: 'invalid_token' }, '/auth/login')).toBe(false);
    expect(isAuthExpired(401, { error: 'invalid_token' }, '/auth/refresh')).toBe(false);
  });

  it('does not call /auth/refresh for an unrelated 401', async () => {
    fetchMock().mockImplementation(async () =>
      jsonRes(401, { success: false, error: 'shop_not_approved', message: 'nope' })
    );

    await expect(apiRequest('/gated')).rejects.toMatchObject({ status: 401 });
    expect(refreshCalls).toBe(0);
    expect(fetchMock().mock.calls.length).toBe(1);
  });
});

describe('GET cache + in-flight dedup (request reduction)', () => {
  it('serves repeat GETs from cache within the TTL and refetches after a mutation', async () => {
    fetchMock().mockImplementation(async () => jsonRes(200, { success: true, data: { v: 1 } }));

    await apiRequest('/cached');
    await apiRequest('/cached');
    expect(fetchMock().mock.calls.length).toBe(1);

    await apiRequest('/cached', { method: 'POST', body: '{}' });
    expect(fetchMock().mock.calls.length).toBe(2);

    await apiRequest('/cached');
    expect(fetchMock().mock.calls.length).toBe(3);
  });

  it('merges identical concurrent GETs into one network call', async () => {
    let resolveFetch: (r: Response) => void = () => {};
    fetchMock().mockImplementation(
      () => new Promise<Response>((resolve) => (resolveFetch = resolve))
    );

    const pending = Promise.all([apiRequest('/slow'), apiRequest('/slow'), apiRequest('/slow')]);
    // Let the three calls register their in-flight promise.
    await Promise.resolve();
    resolveFetch(jsonRes(200, { success: true, data: 'shared' }));

    const results = await pending;
    expect(results).toEqual(['shared', 'shared', 'shared']);
    expect(fetchMock().mock.calls.length).toBe(1);
  });

  it('apiRequestWithMeta keeps meta alongside the unwrapped data', async () => {
    fetchMock().mockImplementation(async () =>
      jsonRes(200, { success: true, data: [{ id: 1 }], meta: { total: 7, page: 1 } })
    );

    const result = await apiRequestWithMeta('/rows');
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.meta).toEqual({ total: 7, page: 1 });
    expect(result.raw).toHaveProperty('success', true);
  });
});

describe('case 2: proactive refresh scheduler', () => {
  it('fires one refresh at (expiry − 90s) and re-arms from the response', async () => {
    jest.useFakeTimers();
    fetchMock().mockImplementation(async (url: string) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCalls++;
        return jsonRes(200, refreshBody());
      }
      return jsonRes(200, { success: true, data: null });
    });

    // Deadline 95s away → the scheduler must fire after 5s (95 − 90 lead).
    noteAuthSuccess(Date.now() + 95_000);
    startAuthScheduler();

    await jest.advanceTimersByTimeAsync(4_999);
    expect(refreshCalls).toBe(0);

    await jest.advanceTimersByTimeAsync(1);
    expect(refreshCalls).toBe(1);

    // Re-armed for the new 15-minute deadline: no immediate second fire.
    await jest.advanceTimersByTimeAsync(60_000);
    expect(refreshCalls).toBe(1);
  });

  it('stays idle when no deadline was ever published', async () => {
    jest.useFakeTimers();
    startAuthScheduler();
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    expect(refreshCalls).toBe(0);
  });
});

