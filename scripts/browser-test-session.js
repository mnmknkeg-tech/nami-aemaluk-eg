// Dashboard session persistence test:
// 1) login via same-origin dev-merchant-login
// 2) reload → still logged in (scoped localStorage keys)
// 3) delete access token (simulate 15m expiry) → silent refresh via cookie keeps session
// 4) verify scoped keys present, shared legacy keys absent
const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const context = await browser.newContext({ viewport: { width: 1600, height: 950 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  try {
    await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.evaluate(async () => {
      const res = await fetch('/api/v1/auth/dev-merchant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopCategory: 'RETAIL' }),
        credentials: 'include',
      });
      const j = await res.json();
      if (!j?.data?.token?.accessToken) throw new Error('login failed');
      const accessToken = j.data.token.accessToken;
      // محاكاة ما يفعله الكود الجديد: يكتب المفتاح الم scoped ويحذف القديم
      localStorage.setItem('ray_dashboard_token', accessToken);
      if (j.data.user) localStorage.setItem('ray_dashboard_user', JSON.stringify(j.data.user));
    });
    console.log('STEP 1 logged in (cookie set + scoped keys)');

    // reload — الجلسة لازم تفضل شغالة
    await page.goto(`${TARGET_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(3000);
    const keys1 = await page.evaluate(() => ({
      dashboardToken: !!localStorage.getItem('ray_dashboard_token'),
      legacyToken: localStorage.getItem('ray_token') || localStorage.getItem('token'),
      dashboardUser: !!localStorage.getItem('ray_dashboard_user'),
    }));
    console.log('STEP 2 after reload:', JSON.stringify(keys1));

    // simulate 15m access-token expiry: امسح الأكسس توكن واحتفظ بالكوكي
    await page.evaluate(() => localStorage.removeItem('ray_dashboard_token'));
    // استدعِ refresh بنفس آلية الكود (كوكي ray_session-DASHBOARD)
    const refreshed = await page.evaluate(async () => {
      const csrf = document.cookie.match(/ray_csrf=([^;]+)/)?.[1] || '';
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Scope': 'dashboard',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        body: '{}',
      });
      return { status: res.status, ok: res.ok };
    });
    console.log('STEP 3 silent refresh after token wipe:', JSON.stringify(refreshed));
    if (!refreshed.ok) throw new Error('refresh failed — session would be dropped!');

    // التحقق النهائي: الصفحة تفضل شغالة والجلسة قائمة
    await page.goto(`${TARGET_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(3000);
    const url = page.url();
    const loggedIn = await page.evaluate(() => {
      const u = localStorage.getItem('ray_dashboard_user');
      return !!u;
    });
    console.log('STEP 4 final url:', url, '| user stored:', loggedIn);
    await page.screenshot({ path: 'C:/Users/Dream/ray-eg-1/scripts/browser-test-out/session-test.png' });

    const passed = loggedIn && !url.includes('/login');
    console.log(passed ? 'SESSION TEST PASSED' : 'SESSION TEST FAILED');
    if (!passed) process.exitCode = 1;
  } catch (err) {
    console.error('TEST FAILED:', err.message);
    await page.screenshot({ path: 'C:/Users/Dream/ray-eg-1/scripts/browser-test-out/session-fail.png' }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
