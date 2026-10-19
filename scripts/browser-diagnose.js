// Diagnose stuck loading on dashboard
const { chromium } = require('playwright');
const fs = require('fs');

const TARGET_URL = 'http://localhost:3000';
const API = 'http://localhost:4000/api/v1';

async function getToken() {
  const res = await fetch(`${API}/auth/dev-merchant-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopCategory: 'RETAIL' }),
  });
  const j = await res.json();
  return j.data.token.accessToken;
}

(async () => {
  const token = await getToken();
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 950 } });
  await context.addInitScript(([t]) => {
    localStorage.setItem('ray_token', t);
    localStorage.setItem('token', t);
  }, [token]);

  const page = await context.newPage();
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) console.log('[console]', m.type(), m.text().slice(0, 300));
  });
  page.on('requestfailed', (r) => console.log('[reqfail]', r.url().slice(0, 120), r.failure()?.errorText));
  page.on('response', (r) => {
    if (r.status() >= 400) console.log('[http]', r.status(), r.url().slice(0, 120));
  });

  await page.goto(`${TARGET_URL}/dashboard/inventory/products`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  console.log('url after goto:', page.url());
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000);
    const html = await page.content();
    const hasSpinner = html.includes('animate-spin');
    const hasTitle = html.includes('المنتجات');
    console.log(`t+${(i + 1) * 5}s url=${page.url()} spinner=${hasSpinner} title=${hasTitle}`);
    if (hasTitle) break;
  }
  await page.screenshot({ path: 'C:/Users/Dream/ray-eg-1/scripts/browser-test-out/00-diagnose.png' });
  await browser.close();
})();
