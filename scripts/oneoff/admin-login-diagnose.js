// One-off diagnostic: reproduce the admin login against the deployed dashboard
// and report console errors, auth network traffic, final URL and localStorage.
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.env.TARGET_URL || 'https://dashboard-web-three-kappa.vercel.app';
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

// The bundled Playwright build expects a browser revision that is not installed
// on this machine, so reuse whichever chromium is already in the cache.
function resolveChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = `${process.env.USERPROFILE}\\AppData\\Local\\ms-playwright`;
  for (const dir of ['chromium_headless_shell-1228', 'chromium-1228', 'chromium_headless_shell-1193', 'chromium-1193']) {
    for (const rel of [
      '\\chrome-headless-shell-win64\\chrome-headless-shell.exe',
      '\\chrome-win64\\chrome.exe',
      '\\chrome-win\\chrome.exe',
    ]) {
      const p = root + '\\' + dir + rel;
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

(async () => {
  const browser = await chromium.launch({ executablePath: resolveChrome() });
  const page = await browser.newPage();
  const notes = [];

  page.on('console', (m) => notes.push(`CONSOLE ${m.type()}: ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => notes.push(`PAGEERROR: ${e.message.slice(0, 300)}`));
  page.on('requestfailed', (r) =>
    notes.push(`REQFAIL: ${r.method()} ${r.url()} :: ${(r.failure() || {}).errorText}`)
  );
  page.on('response', async (r) => {
    const u = r.url();
    if (/\/auth\/(login|me|refresh)|\/shops\/me/.test(u)) {
      let body = '';
      try {
        body = (await r.text()).slice(0, 250);
      } catch {}
      notes.push(`RESP ${r.status()} ${r.request().method()} ${u} :: ${body}`);
    }
  });

  await page.goto(`${BASE}/admin/gate`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(4000);
  notes.push(`URL after load: ${page.url()}`);

  const emailInput = page.locator('form input[type="text"]').first();
  const passInput = page.locator('form input[type="password"]').first();
  // Dev servers compile the route on first hit, so wait patiently for hydration.
  await page.waitForLoadState('load').catch(() => {});
  await emailInput.waitFor({ state: 'visible', timeout: 90000 }).catch(() => {});
  if ((await emailInput.count()) === 0) {
    notes.push('NO FORM INPUTS FOUND — page body head: ' + (await page.evaluate(() => document.body.innerText.slice(0, 200))));
  } else {
    await emailInput.fill(EMAIL);
    await passInput.fill(PASSWORD);
    // Press Enter inside the form: the first <button> in the form is the
    // password visibility toggle, so clicking by index is unreliable.
    await passInput.press('Enter');
    await page.waitForTimeout(9000);
    notes.push(`URL after click: ${page.url()}`);
    notes.push(
      'localStorage: ' +
        JSON.stringify(
          await page.evaluate(() => {
            const out = {};
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              out[k] = String(localStorage.getItem(k)).slice(0, 120);
            }
            return out;
          })
        )
    );
    notes.push('body text: ' + (await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300))));
  }

  const cookies = (await page.context().cookies()).map((c) => `${c.name} (httpOnly=${c.httpOnly})`);
  notes.push('cookies: ' + JSON.stringify(cookies));
  await page.screenshot({ path: 'scripts/browser-test-out/admin-login-diagnose.png', fullPage: false });
  console.log(notes.join('\n'));
  await browser.close();
})().catch((e) => {
  console.error('DIAGNOSE FAILED:', e.message);
  process.exit(1);
});
