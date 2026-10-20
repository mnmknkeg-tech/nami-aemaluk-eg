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
// The users table has a unique index on phone, so every run needs a fresh one.
const PHONE = `+201${String(stamp).slice(-8)}`;

const report = [];
let failures = 0;

const log = (ok, label, detail) => {
  if (!ok) failures += 1;
  report.push({ ok, label, detail });
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

async function req(path, { method = 'GET', token, body, headers = {}, multipart } = {}) {
  const init = { method, headers: { accept: 'application/json', ...headers } };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (multipart) {
    // Let fetch set the multipart boundary itself.
    init.body = body;
  } else if (body !== undefined) {
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

/** Decodes the payload of a JWT without verifying it — for assertions only. */
function decodeJwt(token) {
  try {
    const part = String(token).split('.')[1];
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// A tiny valid 1x1 PNG used to exercise the real upload path.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function main() {
  console.log(`→ Backend: ${API}`);

  // 1) Signup as a merchant. The endpoint is rate limited, so a burst of
  //    earlier runs can still be cooling down — wait it out instead of
  //    failing the whole run.
  let signup = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    signup = await req('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'X-App-Scope': 'business' },
      body: {
        email: EMAIL,
        password: PASSWORD,
        name: SHOP_NAME,
        phone: PHONE,
        role: 'MERCHANT',
      },
    });
    if (signup.status !== 429) break;
    const wait = attempt * 15;
    console.log(`… signup rate limited, waiting ${wait}s (attempt ${attempt})`);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  const token = signup.json?.data?.token?.accessToken;
  log(signup.ok && !!token, 'POST /auth/signup (MERCHANT)', `status=${signup.status}`);
  if (!token) {
    console.error('✗ no access token:', JSON.stringify(signup.json || signup.text).slice(0, 500));
    process.exit(1);
  }

  // 2) The same phone must be rejected with a 409, not a 500.
  const dupe = await req('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'X-App-Scope': 'business' },
    body: {
      email: `e2e.dupe.${stamp}@rayeg.test`,
      password: PASSWORD,
      name: SHOP_NAME,
      phone: PHONE,
      role: 'MERCHANT',
    },
  });
  log(
    dupe.status === 409,
    'POST /auth/signup (duplicate phone → 409)',
    `status=${dupe.status} code=${dupe.json?.error || '-'}`
  );

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

  // 4) The access token was minted during signup, before the shop existed, so
  // it carries no shopId claim. Log in again to pick up the linked shop —
  // this is exactly what the Business app does by handing off to the
  // dashboard login page.
  const relogin = await req('/api/v1/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });
  const shopToken = relogin.json?.data?.token?.accessToken || token;
  const shopClaim = decodeJwt(shopToken)?.shopId || decodeJwt(shopToken)?.shop_id;
  log(
    relogin.ok && !!shopClaim,
    'POST /auth/login (token carries shopId)',
    `status=${relogin.status} shopId=${shopClaim || '-'}`
  );

  // 4) Media upload through the presign flow (the dashboard/direct-to-R2 path).
  const presign = await req('/api/v1/media/presign', {
    method: 'POST',
    token: shopToken,
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
      token: shopToken,
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

  // 8) The dashboard uploads through POST /media/upload (multipart), not the
  //    presign flow - that route was missing and every dashboard image
  //    upload 404'd. Exercise it here.
  const form = new FormData();
  form.append('file', new Blob([PNG_1PX], { type: 'image/png' }), `e2e-upload-${stamp}.png`);
  form.append('purpose', 'product_image');
  const direct = await req(
    `/api/v1/media/upload?shopId=${encodeURIComponent(shopId)}&purpose=product_image`,
    { method: 'POST', token: shopToken, body: form, multipart: true }
  );
  const directUrl = direct.json?.url || direct.json?.data?.originalUrl || direct.json?.data?.url;
  log(
    direct.ok && !!directUrl,
    'POST /media/upload (multipart)',
    `status=${direct.status} url=${directUrl ? 'yes' : 'no'}`
  );
  if (directUrl) {
    const served = await fetch(directUrl, { method: 'GET' });
    const bytes = Buffer.from(await served.arrayBuffer());
    log(
      served.ok && bytes.length > 0,
      'GET public URL of /media/upload',
      `status=${served.status} bytes=${bytes.length}`
    );
  }

  // 9) Create a product that points at the uploaded image.
  const product = await req('/api/v1/products', {
    method: 'POST',
    token: shopToken,
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
