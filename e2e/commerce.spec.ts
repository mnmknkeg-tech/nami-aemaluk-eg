import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';

/**
 * Trader-Controls: كل تاجر بيقرر شكل بياعته (سلة / حجز 24 ساعة / موعد / تواصل)
 * وبيقدر يخفي السعر — والقرار ده لازم يتطبّق في الماركت كله.
 *
 * الاختبار بيدوّر على متجر التطوير (dev-merchant@ray.local)، بيحط إعداد commerce
 * على الصفحة، وبيرجّع الإعداد زي ما كان بعد التشغيل.
 */
const API = process.env.GO_BACKEND_URL ?? 'http://localhost:4000/api/v1';
const PRODUCT_NAME = 'SmokeTest';

type Commerce = {
  ordering: 'cart' | 'booking24h' | 'appointment' | 'contact';
  pricing: 'priced' | 'hidden';
  bookingWindowHours?: number;
  queueEnabled?: boolean;
};

function findJwt(node: unknown, depth = 0): string | undefined {
  if (depth > 6 || node == null) return undefined;
  if (typeof node === 'string') {
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(node) ? node : undefined;
  }
  if (Array.isArray(node)) {
    for (const value of node) {
      const hit = findJwt(value, depth + 1);
      if (hit) return hit;
    }
    return undefined;
  }
  if (typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) {
      const hit = findJwt(value, depth + 1);
      if (hit) return hit;
    }
  }
  return undefined;
}

let api: APIRequestContext;
let token: string;
let originalCommerce: Commerce | undefined;

async function readShop() {
  const res = await api.get('shops/me', { headers: { Authorization: `Bearer ${token}` } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).data;
}

async function setCommerce(commerce: Commerce) {
  const shop = await readShop();
  const res = await api.patch('shops/me', {
    headers: { Authorization: `Bearer ${token}` },
    data: { layoutConfig: { ...(shop.layoutConfig ?? {}), commerce } },
  });
  expect(res.ok()).toBeTruthy();
}

/** يفتح الرئيسية وينتظر جلب فهرس المتاجر (قرار التاجر بيوصل من عند الـ client). */
async function gotoHome(page: import('@playwright/test').Page) {
  const shopsLoaded = page.waitForResponse(
    (r) => r.url().includes('/shops?take=') && r.status() === 200
  );
  await page.goto('/');
  await shopsLoaded;
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

function cardFor(page: import('@playwright/test').Page) {
  return page.locator('.card-contain', { hasText: PRODUCT_NAME }).first();
}

test.beforeAll(async () => {
  // trailing slash is required: without it `auth/...` replaces the `/api/v1` segment
  api = await pwRequest.newContext({ baseURL: API.endsWith('/') ? API : `${API}/` });
  // relative paths: `/auth/...` would wipe the /api/v1 prefix from baseURL
  const login = await api.post('auth/dev-merchant-login', { data: {} });
  const loginBody = await login.text();
  console.log('[commerce e2e] login status =', login.status(), 'body =', loginBody.slice(0, 400));
  expect(login.ok(), `login failed: ${login.status()} ${loginBody.slice(0, 200)}`).toBeTruthy();
  token = findJwt(JSON.parse(loginBody))!;
  expect(token).toBeTruthy();
  originalCommerce = (await readShop()).layoutConfig?.commerce;
});

test.afterAll(async () => {
  if (originalCommerce) await setCommerce(originalCommerce);
  await api.dispose();
});

test('24h booking + hidden price: card shows "price on request" and a booking button', async ({
  page,
}) => {
  await setCommerce({ ordering: 'booking24h', pricing: 'hidden', bookingWindowHours: 24 });
  await gotoHome(page);

  const card = cardFor(page);
  await expect(card.getByText('السعر عند الطلب')).toBeVisible({ timeout: 15_000 });
  await expect(card.getByText('رد خلال 24 ساعة')).toBeVisible();
  await expect(card.getByRole('button', { name: 'احجز 24 ساعة' })).toBeVisible();
  await expect(card.getByRole('button', { name: /للسلة/ })).toHaveCount(0);
  await expect(card.getByText('أضف للسلة')).toHaveCount(0);
});

test('cart mode: card shows the price and the add-to-cart button again', async ({ page }) => {
  await setCommerce({ ordering: 'cart', pricing: 'priced' });
  await gotoHome(page);

  const card = cardFor(page);
  await expect(card.getByText('السعر عند الطلب')).toHaveCount(0);
  await expect(card.getByRole('button', { name: /للسلة/ })).toBeVisible({ timeout: 15_000 });
});

test('appointment mode: card offers booking an appointment', async ({ page }) => {
  await setCommerce({ ordering: 'appointment', pricing: 'priced' });
  await gotoHome(page);

  const card = cardFor(page);
  await expect(card.getByRole('button', { name: 'احجز موعد' })).toBeVisible({ timeout: 15_000 });
  await expect(card.getByRole('button', { name: /للسلة/ })).toHaveCount(0);
});

test('contact mode: card keeps the price but adds no cart or booking button', async ({ page }) => {
  await setCommerce({ ordering: 'contact', pricing: 'priced' });
  await gotoHome(page);

  const card = cardFor(page);
  await expect(card.getByRole('button', { name: /للسلة/ })).toHaveCount(0);
  await expect(card.getByRole('button', { name: /احجز/ })).toHaveCount(0);
  await expect(card.getByText('السعر عند الطلب')).toHaveCount(0);
});

test('product page honours the merchant decision (no leaked price, no cart pill)', async ({
  page,
}) => {
  await setCommerce({ ordering: 'booking24h', pricing: 'hidden', bookingWindowHours: 24 });

  // نجيب رابط المنتج من الرئيسية بدل الاعتماد على معرف ثابت
  await gotoHome(page);
  const href = await cardFor(page).locator('a[href^="/product/"]').first().getAttribute('href');
  expect(href).toBeTruthy();

  await page.goto(href!);
  await expect(page.getByText('السعر عند الطلب').first()).toBeVisible({ timeout: 15_000 });
  // `.first()` لأن منتجات ذات صلة (نفس المتجر) بتقول كمان "رد خلال 24 ساعة"
  await expect(page.getByText('رد خلال 24 ساعة').first()).toBeVisible();
  // مفيش سلة في أي مكان في الصفحة (زيارات المنتجات المقترحة كمان)
  await expect(page.getByRole('button', { name: /للسلة/ })).toHaveCount(0);
  // زرار الحجز بتاع المنتج نفسه (مش بتاع الاقتراحات) موجود
  await expect(
    page.getByTestId('product-actions').getByRole('button', { name: 'احجز 24 ساعة' })
  ).toBeVisible();
});
