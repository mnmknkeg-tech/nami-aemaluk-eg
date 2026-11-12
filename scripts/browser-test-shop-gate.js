// CreateShopGate UI test with /shops/me interception:
// first call returns null (production behavior for shop-less accounts),
// after POST /shops succeeds the interception stops and the real backend answers.
const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3000';
const API = 'http://localhost:4000/api/v1';
const OUT = 'C:/Users/Dream/ray-eg-1/scripts/browser-test-out';

async function signup() {
  const email = `gate-${Date.now()}@test.local`;
  const res = await fetch(`${API}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test123456!', name: 'تاجر البوابة', role: 'MERCHANT' }),
  });
  const j = await res.json();
  return { email, token: j.data.token.accessToken, user: j.data.user };
}

(async () => {
  const { email, token, user } = await signup();
  console.log('signup ok:', email);

  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const context = await browser.newContext({ viewport: { width: 1600, height: 950 } });
  await context.addInitScript(([t, u]) => {
    localStorage.setItem('ray_dashboard_token', t);
    localStorage.setItem('ray_dashboard_user', JSON.stringify(u));
  }, [token, JSON.stringify(user)]);

  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 200));
  });

  // intercept shops/me: until the shop is created → answer null (no shop yet)
  let shopCreated = false;
  await page.route('**/api/v1/shops/me', async (route) => {
    console.log('  [shops/me intercepted] created=', shopCreated);
    if (shopCreated) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: null }),
    });
  });
  // log every /shops POST response
  page.on('response', (res) => {
    if (res.url().includes('/api/v1/shops') && res.request().method() === 'POST') {
      console.log('  [POST /shops] status=', res.status());
      if (res.status() === 201) shopCreated = true;
    }
  });

  try {
    await page.goto(`${TARGET_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('text=أنشئ متجرك للبدء', { timeout: 60000 });
    await page.screenshot({ path: OUT + '/gate-01-shown.png' });
    console.log('STEP 1 gate screen shown for shop-less account');

    await page.locator('input[placeholder="مثال: متجر النور"]').fill('متجر البوابة التجريبي');
    await page.locator('button', { hasText: 'ملابس' }).first().click();
    await page.locator('input[placeholder="01xxxxxxxxx"]').fill('01012345678');
    await page.screenshot({ path: OUT + '/gate-02-filled.png' });
    // قفل لافتة الكوكيز السفلية لو ظاهرة (بتغطي زر الإنشاء)
    await page.evaluate(() => {
      document.querySelectorAll('div[class*="z-[9999]"], div[class*="fixed"]').forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' && el.getBoundingClientRect().top > window.innerHeight * 0.6) {
          el.remove();
        }
      });
    });
    // كليك مباشر بالـ JS — الضغط الطبيعي بيتاكل من أي طبقة فوق الزر
    const clickInfo = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        b.textContent.includes('إنشاء المتجر')
      );
      if (!btn) throw new Error('create button not found');
      const nameInput = document.querySelector('input[placeholder="مثال: متجر النور"]');
      const phoneInput = document.querySelector('input[placeholder="01xxxxxxxxx"]');
      btn.click();
      return {
        disabled: btn.disabled,
        nameValue: nameInput ? nameInput.value : null,
        phoneValue: phoneInput ? phoneInput.value : null,
      };
    });
    console.log('STEP 2 form submitted', JSON.stringify(clickInfo));

    // بعد النجاح: reload → shops/me حقيقي → الداشبورد يفتح
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: OUT + '/gate-03-after.png' });

    const body = await page.evaluate(() => document.body.innerText.slice(0, 800));
    const gateGone = !body.includes('أنشئ متجرك للبدء');
    console.log('STEP 3 gate gone after creation:', gateGone);
    console.log('page text head:', body.replace(/\n+/g, ' | ').slice(0, 200));

    if (gateGone) {
      console.log('GATE TEST PASSED');
    } else {
      console.log('GATE TEST FAILED');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('TEST FAILED:', err.message);
    await page.screenshot({ path: OUT + '/gate-99-fail.png' }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
