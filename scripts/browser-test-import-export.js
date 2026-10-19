// Dashboard export/import UI test — products page
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'http://localhost:3000';
const OUT_DIR = 'C:/Users/Dream/ray-eg-1/scripts/browser-test-out';
const IMPORT_FILE = 'C:/Users/Dream/ray-eg-1/scripts/test-import-file.xlsx';
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
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1600, height: 950 },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  // لازم نفتح صفحة في نفس الدومين الأول عشان الـ fetch يشتغل
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 120000 });

  // تسجيل دخول حقيقي من نفس الأوريجن: يخزن التوكن + المستخدم + كوكيز التحديث
  const authed = await page.evaluate(async () => {
    const res = await fetch('/api/v1/auth/dev-merchant-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopCategory: 'RETAIL' }),
      credentials: 'include',
    });
    const j = await res.json();
    if (!j?.data?.token?.accessToken) return { ok: false, res: JSON.stringify(j).slice(0, 200) };
    localStorage.setItem('ray_token', j.data.token.accessToken);
    localStorage.setItem('token', j.data.token.accessToken);
    if (j.data.user) localStorage.setItem('ray_user', JSON.stringify(j.data.user));
    return { ok: true };
  });
  if (!authed.ok) {
    console.error('AUTH FAILED:', authed.res);
    await browser.close();
    process.exit(1);
  }
  console.log('auth ok (in-browser, same-origin)');

  const downloadAndSave = async (action, filename) => {
    const dlPromise = page.waitForEvent('download', { timeout: 60000 });
    await action();
    const dl = await dlPromise;
    const target = path.join(OUT_DIR, filename);
    await dl.saveAs(target);
    return target;
  };

  try {
    // ── 1) open products page
    await page.goto(`${TARGET_URL}/dashboard/inventory/products`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('text=المنتجات', { timeout: 120000 });
    // wait for the products table to finish loading (spinner gone, rows present)
    await page.waitForFunction(
      () => {
        const spinner = document.querySelector('.animate-spin');
        const rows = document.querySelectorAll('.grid.grid-cols-12').length;
        return !spinner || rows > 3;
      },
      { timeout: 120000 }
    );
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '01-products-page.png') });
    console.log('STEP 1 products page loaded, url:', page.url());

    // ── 2) export xlsx
    let saved = await downloadAndSave(
      async () => {
        await page.locator('button', { hasText: 'تصدير' }).first().click();
        await page.waitForSelector('text=Excel (.xlsx)', { timeout: 15000 });
        await page.screenshot({ path: path.join(OUT_DIR, '02-export-menu.png') });
        await page.locator('button', { hasText: 'Excel (.xlsx)' }).first().click();
      },
      'export-products.xlsx'
    );
    console.log('STEP 2 xlsx downloaded:', saved, fs.statSync(saved).size, 'bytes');

    // ── 3) export csv
    saved = await downloadAndSave(
      async () => {
        await page.locator('button', { hasText: 'تصدير' }).first().click();
        await page.waitForSelector('text=CSV (.csv)', { timeout: 15000 });
        await page.locator('button', { hasText: 'CSV (.csv)' }).first().click();
      },
      'export-products.csv'
    );
    console.log('STEP 3 csv downloaded:', saved, fs.statSync(saved).size, 'bytes');

    // ── 4) export json
    saved = await downloadAndSave(
      async () => {
        await page.locator('button', { hasText: 'تصدير' }).first().click();
        await page.waitForSelector('text=JSON (.json)', { timeout: 15000 });
        await page.locator('button', { hasText: 'JSON (.json)' }).first().click();
      },
      'export-products.json'
    );
    console.log('STEP 4 json downloaded:', saved, fs.statSync(saved).size, 'bytes');

    // ── 5) template download
    saved = await downloadAndSave(
      async () => {
        await page.locator('button', { hasText: 'قالب' }).first().click();
      },
      'template.xlsx'
    );
    console.log('STEP 5 template downloaded:', saved, fs.statSync(saved).size, 'bytes');

    // ── 6) import xlsx via file input
    await page.setInputFiles('input[type="file"]', IMPORT_FILE);
    await page.waitForSelector('text=استيراد المنتجات', { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, '03-import-preview.png') });

    const previewText = await page.locator('text=جاهزة للاستيراد').locator('..').innerText();
    console.log('STEP 6 preview modal shown, valid block:', previewText.replace(/\n/g, ' '));
    // invalid rows visible?
    const invalidVisible = await page.locator('text=صفوف سيتم تجاهلها').count();
    console.log('STEP 6b invalid section visible:', invalidVisible > 0);

    // ── 7) confirm import
    await page.locator('button', { hasText: /استيراد \d+ منتج/ }).first().click();
    await page.waitForSelector('text=انتهى الاستيراد', { timeout: 120000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT_DIR, '04-import-result.png') });
    const modalText = await page.locator('.bg-white.rounded-2xl', { hasText: 'انتهى الاستيراد' }).first().innerText();
    console.log('STEP 7 result modal:', modalText.replace(/\n+/g, ' | ').slice(0, 300));

    // close modal
    await page.locator('button', { hasText: 'تم' }).first().click();
    await page.waitForTimeout(1500);

    // ── 8) verify imported product appears via search
    await page.locator('input[placeholder*="دوّر باسم المنتج"]').fill('قميص قطن رجالي');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT_DIR, '05-search-imported.png') });
    const rowVisible = await page.locator('text=قميص قطن رجالي').count();
    console.log('STEP 8 imported product visible in table:', rowVisible > 0);

    console.log('BROWSER TEST DONE');
  } catch (err) {
    console.error('TEST FAILED:', err.message);
    await page.screenshot({ path: path.join(OUT_DIR, '99-failure.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
