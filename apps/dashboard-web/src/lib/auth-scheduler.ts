/**
 * Proactive refresh scheduler.
 *
 * Instead of discovering expiry through a failed request, one timer fires
 * (access-token expiry − 90s) and is re-armed after every refresh and on
 * visibility/focus return. No blind setInterval: a hidden tab neither burns
 * refreshes nor drifts, and coming back triggers an immediate check.
 */
import { getAccessExpiresAt, onAccessExpiry, refreshSession } from './api/core';

/** Refresh this long before the access token expires. */
const LEAD_MS = 90_000;

let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let unsubscribe: (() => void) | null = null;

function clearTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

function schedule(): void {
  clearTimer();
  const expiresAt = getAccessExpiresAt();
  if (!expiresAt) return; // unknown deadline — reactive 401 path still works
  const delay = Math.max(0, expiresAt - LEAD_MS - Date.now());
  timer = setTimeout(() => {
    timer = null;
    // refreshSession → noteAuthSuccess → onAccessExpiry → schedule() again.
    void refreshSession();
  }, delay);
}

function onVisibilityChange(): void {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  const expiresAt = getAccessExpiresAt();
  if (expiresAt && Date.now() >= expiresAt - LEAD_MS) {
    void refreshSession(); // slept past the window — renew right now
  } else {
    schedule();
  }
}

/** Starts the scheduler (idempotent). Call from AuthProvider mount. */
export function startAuthScheduler(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  unsubscribe = onAccessExpiry(schedule);
  schedule();
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', onVisibilityChange);
}

/** Stops the scheduler (logout / provider unmount). */
export function stopAuthScheduler(): void {
  if (!started) return;
  started = false;
  clearTimer();
  unsubscribe?.();
  unsubscribe = null;
  if (typeof window !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', onVisibilityChange);
  }
}
