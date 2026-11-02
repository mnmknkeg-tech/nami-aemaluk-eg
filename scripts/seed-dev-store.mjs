#!/usr/bin/env node
/**
 * Seed a dedicated developer test store on a running backend.
 *
 * Idempotent — safe to run repeatedly: logs in if the account already exists,
 * reuses the existing shop, and only tops products up to the sample set.
 *
 * Usage:
 *   DEV_STORE_PASSWORD='...' node scripts/seed-dev-store.mjs
 *
 * Env:
 *   DEV_STORE_API       API base          (default: https://api.mnmknk.com)
 *   DEV_STORE_EMAIL     account email     (default: dev-store@ray-eg.test)
 *   DEV_STORE_PASSWORD  account password  (REQUIRED — never committed)
 *   DEV_STORE_NAME      account name      (default: المطور التجريبي)
 *   DEV_STORE_SHOP      shop name         (default: متجر المطور التجريبي)
 */

const API = (process.env.DEV_STORE_API || 'https://api.mnmknk.com').replace(/\/+$/, '');
const EMAIL = (process.env.DEV_STORE_EMAIL || 'dev-store@ray-eg.test').trim();
const PASSWORD = process.env.DEV_STORE_PASSWORD;
const NAME = process.env.DEV_STORE_NAME || 'المطور التجريبي';
const SHOP_NAME = process.env.DEV_STORE_SHOP || 'متجر المطور التجريبي';

if (!PASSWORD) {
  console.error('✗ DEV_STORE_PASSWORD is required (nothing is hardcoded — the repo is public).');
  console.error("  Example: DEV_STORE_PASSWORD='My#Password' node scripts/seed-dev-store.mjs");
  process.exit(1);
}

// CSRF support: the backend double-submits a token via the ray_csrf cookie and
// the X-CSRF-Token header. Node's fetch keeps no cookie jar, so track the token
// here and send it back as both cookie and header on unsafe methods. The token
// rotates after every successful mutation — each response refreshes it.
let csrfToken = '';

async function api(path, { method = 'GET', token, body } = {}) {
  const unsafe = method !== 'GET' && method !== 'HEAD';
  const res = await fetch(`${API}/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { Cookie: `ray_csrf=${csrfToken}` } : {}),
      ...(unsafe && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const rotated = res.headers.get('x-csrf-token');
  if (rotated) csrfToken = rotated;
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, json };
}

// Fiber routes registered under Group("/shops").Post("/") may or may not accept
// the trailing-slash-less variant depending on deployment — try both spellings.
async function apiWithSlashFallback(path, opts) {
  const withSlash = await api(path.endsWith('/') ? path : `${path}/`, opts);
  if (withSlash.ok || (withSlash.status !== 404 && withSlash.status !== 405)) return withSlash;
  return api(path.replace(/\/+$/, ''), opts);
}

async function main() {
  console.log(`→ Backend: ${API}`);

  // 1) auth: login, signup as fallback
  let token = null;
  let login = await api('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });
  if (login.ok) {
    token = login.json?.data?.token?.accessToken;
    console.log('✓ Logged in — account already exists');
  } else {
    console.log(`… account missing (${login.status}) — signing up as MERCHANT`);
    const signup = await api('/auth/signup', {
      method: 'POST',
      body: { email: EMAIL, password: PASSWORD, name: NAME, role: 'MERCHANT' },
    });
    if (!signup.ok) {
      console.error('✗ Signup failed:', signup.status, JSON.stringify(signup.json));
      process.exit(1);
    }
    token = signup.json?.data?.token?.accessToken;
    console.log('✓ Account created');
  }
  if (!token) {
    console.error('✗ No access token in auth response:', JSON.stringify(login.json || {}));
    process.exit(1);
  }

  // 2) shop: reuse or create
  let shop = null;
  const me = await api('/shops/me', { token });
  if (me.ok && me.json?.data?.id) {
    shop = me.json.data;
    console.log(`✓ Shop already exists: ${shop.name} (${shop.slug})`);
  } else {
    const created = await apiWithSlashFallback('/shops', {
      method: 'POST',
      token,
      body: {
        name: SHOP_NAME,
        category: 'RETAIL',
        phone: '+201000000000',
        governorate: 'القاهرة',
        city: 'القاهرة',
        description: 'متجر تجريبي مخصص للمطور — تجربة الميزات المرفوعة قبل النشر للعملاء.',
        addressDetailed: 'عنوان تجريبي — القاهرة',
      },
    });
    if (!created.ok) {
      console.error('✗ Shop creation failed:', created.status, JSON.stringify(created.json));
      process.exit(1);
    }
    shop = created.json.data;
    console.log(`✓ Shop created: ${shop.name} (slug: ${shop.slug}, id: ${shop.id})`);

    // Shop creation links users.shop_id on the backend — the token minted at
    // signup predates the link, so re-login to get one carrying the shop id.
    const refreshed = await api('/auth/login', {
      method: 'POST',
      body: { email: EMAIL, password: PASSWORD },
    });
    if (refreshed.ok && refreshed.json?.data?.token?.accessToken) {
      token = refreshed.json.data.token.accessToken;
      console.log('✓ Token refreshed with shop context');
    }
  }

  // 3) products: top up to the sample set
  const samples = [
    {
      name: 'منتج تجريبي — تيشيرت قطن',
      price: 250,
      stock: 20,
      category: 'FASHION',
      description: 'منتج تجريبي لاختبار الطلبات والمخزون.',
    },
    {
      name: 'منتج تجريبي — سماعات بلوتوث',
      price: 850,
      stock: 10,
      category: 'ELECTRONICS',
      description: 'منتج تجريبي لاختبار صفحة المنتج.',
    },
    {
      name: 'خدمة تجريبية — صيانة منزلية',
      price: 150,
      stock: 100,
      category: 'SERVICE',
      description: 'خدمة تجريبية لاختبار حجوزات الخدمات.',
    },
  ];
  const list = await api(`/products/manage/by-shop/${shop.id}?limit=50`, { token });
  const existing = list.ok && Array.isArray(list.json?.data) ? list.json.data : [];
  console.log(`… products currently in shop: ${existing.length}`);
  let added = 0;
  for (const sample of samples) {
    const exists = existing.some((p) => p.name === sample.name);
    if (exists) continue;
    const created = await apiWithSlashFallback('/products', {
      method: 'POST',
      token,
      body: { ...sample, shopId: shop.id },
    });
    if (created.ok) added++;
    else
      console.warn(
        `⚠ product "${sample.name}" failed:`,
        created.status,
        JSON.stringify(created.json)
      );
  }
  console.log(added ? `✓ Added ${added} sample product(s)` : '✓ Sample products already present');

  // 4) summary
  console.log('\n──────────────────────────────────────────────');
  console.log('  Developer store ready — keep these private:');
  console.log(`  Email    : ${EMAIL}`);
  console.log(`  Password : (the value you passed in DEV_STORE_PASSWORD)`);
  console.log(`  Shop     : ${shop.name}  (slug: ${shop.slug})`);
  console.log('──────────────────────────────────────────────');
}

main().catch((e) => {
  console.error('✗ Unexpected error:', e?.message || e);
  process.exit(1);
});
