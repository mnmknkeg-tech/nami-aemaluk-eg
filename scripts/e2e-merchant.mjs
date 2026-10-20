/**
 * End-to-end smoke test against the production Railway backend.
 *
 * Covers the merchant journey that the Business and Dashboard apps perform:
 *   signup → shop → media upload (presign → R2 PUT → complete) → product.
 *
 * Usage:
 *   BACKEND_URL=https://nami-aemaluk-eg-production.up.railway.app node scripts/e2e-merchant.mjs
 */
import { Buffer } from 'node:buffer';

const API =
  String(process.env.BACKEND_URL || '')
    .trim()
    .replace(/\/+$/, '') || 'https://nami-aemaluk-eg-production.up.railway.app';

const stamp = Date.now();
const EMAIL = `e2e.merchant.${stamp}@rayeg.test`;
const PASSWORD = 'Test@12345';
const SHOP_NAME = `متجر الاختبار ${stamp}`;

const report = [];
let failures = 0;

const log = (ok, label, detail) => {
  if (!ok) failures += 1;
  report.push({ ok, label, detail });
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

async function req(path, { method = 'GET', token, body, headers = {} } = {}) {
  const init = { method, headers: { accept: 'application/json', ...headers } };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON body */
  }
  return { ok: res.ok, status: res.status, json, text };
}

// A tiny valid 1x1 PNG used to exercise the real upload path.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function main() {
  console.log(`→ Backend: ${API}`);

  // 1) Signup as a merchant.
  const signup = await req('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'X-App-Scope': 'business' },
    body: {
      email: EMAIL,
      password: PASSWORD,
      name: SHOP_NAME,
      phone: '+201001234567',
      role: 'MERCHANT',
    },
  });
  const token = signup.json?.data?.token?.accessToken;
  log(signup.ok && !!token, 'POST /auth/signup (MERCHANT)', `status=${signup.status}`);
  if (!token) {
    console.error('✗ no access token:', JSON.stringify(signup.json || signup.text).slice(0, 500));
    process.exit(1);
  }

  // 2) Login with the same credentials — proves the account is persisted.
  const login = await req('/api/v1/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });
  const loginToken = login.json?.data?.token?.accessToken;
  log(login.ok && !!loginToken, 'POST /auth/login', `status=${login.status}`);

  // 3) Create (or fetch) the shop.
  let shop = null;
  const me = await req('/api/v1/shops/me', { token });
  if (me.ok && me.json?.data?.id) {
    shop = me.json.data;
    log(true, 'GET /shops/me', `existing shop ${shop.slug}`);
  } else {
    const created = await req('/api/v1/shops', {
      method: 'POST',
      token,
      body: {
        name: SHOP_NAME,
        category: 'RETAIL',
        phone: '+201001234567',
        email: EMAIL,
        governorate: 'القاهرة',
        city: 'القاهرة',
        description: 'متجر اختبار شامل — E2E',
        addressDetailed: 'عنوان تجريبي — القاهرة',
      },
    });
    shop = created.json?.data;
    log(
      created.ok && !!shop?.id,
      'POST /shops',
      `status=${created.status}${shop?.slug ? ` slug=${shop.slug}` : ''}`
    );
    if (!shop?.id) {
      console.error(
        '✗ shop creation failed:',
        JSON.stringify(created.json || created.text).slice(0, 500)
      );
      process.exit(1);
    }
  }

  const shopId = shop.id;

  // 4) Media upload through the presign flow (the dashboard/direct-to-R2 path).
  const presign = await req('/api/v1/media/presign', {
    method: 'POST',
    token,
    body: {
      shopId,
      filename: `e2e-${stamp}.png`,
      contentType: 'image/png',
      purpose: 'product_image',
      fileSize: PNG_1PX.length,
    },
  });
  const presignData = presign.json?.data || presign.json;
  const uploadUrl = presignData?.url;
  const key = presignData?.key;
  const publicUrl = presignData?.publicUrl;
  log(
    presign.ok && !!uploadUrl,
    'POST /media/presign',
    `status=${presign.status} key=${key || '-'}`
  );
  if (!uploadUrl) {
    console.error('✗ presign failed:', JSON.stringify(presign.json || presign.text).slice(0, 500));
  } else {
    // 5) PUT the bytes straight to R2.
    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: PNG_1PX,
    });
    log(put.ok, 'PUT to R2 (presigned URL)', `status=${put.status}`);

    // 6) Finalize so the backend records the media row.
    const complete = await req('/api/v1/media/complete', {
      method: 'POST',
      token,
      body: {
        shopId,
        key,
        mimeType: 'image/png',
        purpose: 'product_image',
        fileSize: PNG_1PX.length,
        width: 1,
        height: 1,
      },
    });
    log(complete.ok, 'POST /media/complete', `status=${complete.status}`);
  }

  // 7) The public URL must actually serve the image back from R2.
  if (publicUrl) {
    const served = await fetch(publicUrl, { method: 'GET' });
    const bytes = Buffer.from(await served.arrayBuffer());
    log(
      served.ok && bytes.length > 0,
      'GET public R2 URL',
      `status=${served.status} bytes=${bytes.length}`
    );
  }

  // 8) Create a product that points at the uploaded image.
  const product = await req('/api/v1/products', {
    method: 'POST',
    token,
    body: {
      name: `منتج اختبار ${stamp}`,
      price: 199.99,
      stock: 25,
      shopId,
      category: 'أزياء وملابس',
      description: 'منتج لاختبار رفع الصور والتخزين',
      imageUrl: publicUrl || null,
      trackStock: true,
    },
  });
  const productId = product.json?.data?.id;
  log(
    product.ok && !!productId,
    'POST /products',
    `status=${product.status} id=${productId || '-'}`
  );

  // 9) The product must be visible through the public listing.
  if (productId) {
    const list = await req(`/api/v1/products?shopId=${encodeURIComponent(shopId)}`);
    const items = list.json?.data?.items || list.json?.data || list.json?.items || [];
    const found = Array.isArray(items) && items.some((p) => p.id === productId);
    log(found, 'GET /products (public listing contains product)', `status=${list.status}`);
  }

  console.log(
    `\n${failures === 0 ? '✅ ALL PASS' : `❌ ${failures} FAILURE(S)`} — ${report.length} checks`
  );
  console.log(
    JSON.stringify(
      { api: API, email: EMAIL, shopId, productId, publicUrl, failures, report },
      null,
      2
    )
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('✗ E2E crashed:', e?.message || e);
  process.exit(1);
});
