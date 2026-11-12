/**
 * End-to-end smoke test for the Business and Dashboard apps against the
 * production Railway backend and the production Vercel deployments.
 *
 * What it proves, in the order a real merchant hits it:
 *   1. the Business app can sign up through the Railway API
 *   2. a duplicate phone is a 409, not a 500
 *   3. the shop can be created, and the merchant's token carries its shopId
 *   4. an image can be uploaded to R2 through the presign flow
 *   5. the public URL really serves the image back
 *   6. a product can be created and shows up in the public listing
 *   7. the Dashboard can log in through its Vercel rewrite and read the shop
 *   8. the Dashboard can upload an image through the same presign flow
 *   9. the Business bundle talks to Railway, never to the legacy API host
 *
 * Usage:
 *   node scripts/e2e-merchant.mjs
 */
import { Buffer } from 'node:buffer';

const API =
  String(process.env.BACKEND_URL || '')
    .trim()
    .replace(/\/+$/, '') || 'https://nami-aemaluk-eg-production.up.railway.app';
const BUSINESS =
  String(process.env.BUSINESS_URL || '')
    .trim()
    .replace(/\/+$/, '') || 'https://nami-aemaluk-eg.vercel.app';
const DASHBOARD =
  String(process.env.DASHBOARD_URL || '')
    .trim()
    .replace(/\/+$/, '') || 'https://nami-aemaluk-eg-dashboard-web.vercel.app';

const stamp = Date.now();
const EMAIL = `e2e.merchant.${stamp}@rayeg.test`;
const PASSWORD = 'Test@12345';
const SHOP_NAME = `متجر الاختبار ${stamp}`;
// The users table has a unique index on phone, so every run needs a fresh one.
const PHONE = `+201${String(stamp).slice(-8)}`;

// Signup is rate limited to 5 attempts/hour on production, so a run can be
// pointed at an already-registered merchant instead of creating a new one.
const REUSE_EMAIL = String(process.env.E2E_EMAIL || '').trim();
const REUSE_PASSWORD = String(process.env.E2E_PASSWORD || '').trim() || PASSWORD;
const REUSE = REUSE_EMAIL.length > 0;

// Every request needs a deadline: a silent backend must not hang the suite.
const TIMEOUT_MS = Number(process.env.E2E_TIMEOUT_MS || 20000);

const report = [];
let failures = 0;

const log = (ok, label, detail) => {
  if (!ok) failures += 1;
  report.push({ ok, label, detail });
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

/** fetch() with a hard deadline, so a stalled request fails instead of hanging. */
async function timedFetch(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function req(path, { method = 'GET', token, body, headers = {}, multipart, base } = {}) {
  const origin = base || API;
  const init = { method, headers: { accept: 'application/json', ...headers } };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (multipart) {
    // Let fetch set the multipart boundary itself.
    init.body = body;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await timedFetch(`${origin}${path}`, init);
  } catch (err) {
    return { ok: false, status: 0, json: null, text: String(err) };
  }
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
  console.log(`→ Business: ${BUSINESS}`);
  console.log(`→ Dashboard: ${DASHBOARD}`);

  // 1) Signup as a merchant. The endpoint is rate limited, so a burst of
  //    earlier runs can still be cooling down — wait it out instead of
  //    failing the whole run. When E2E_EMAIL is set, skip signup entirely and
  //    reuse the already-registered merchant.
  let signup = null;
  let token = null;
  if (REUSE) {
    console.log(`→ Reusing merchant ${REUSE_EMAIL}`);
  } else {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
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
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
    token = signup.json?.data?.token?.accessToken;
    log(signup.ok && !!token, 'POST /auth/signup (MERCHANT)', `status=${signup.status}`);
    if (!token) {
      console.error('✗ no access token:', JSON.stringify(signup.json || signup.text).slice(0, 500));
      console.error(
        '  (production allows 5 signups/hour — re-run with E2E_EMAIL=... to reuse a merchant)'
      );
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
  }

  // 2) Login with the same credentials — proves the account is persisted.
  const accountEmail = REUSE ? REUSE_EMAIL : EMAIL;
  const accountPassword = REUSE ? REUSE_PASSWORD : PASSWORD;
  const login = await req('/api/v1/auth/login', {
    method: 'POST',
    body: { email: accountEmail, password: accountPassword },
  });
  const loginToken = login.json?.data?.token?.accessToken;
  log(login.ok && !!loginToken, 'POST /auth/login', `status=${login.status}`);
  if (!loginToken) {
    console.error('✗ login failed:', JSON.stringify(login.json || login.text).slice(0, 500));
    process.exit(1);
  }
  if (!token) token = loginToken;

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
        email: accountEmail,
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
    body: { email: accountEmail, password: accountPassword },
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
    const put = await timedFetch(uploadUrl, {
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
    const served = await timedFetch(publicUrl, { method: 'GET' });
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
    const served = await timedFetch(directUrl, { method: 'GET' });
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

  // 10) The Dashboard logs in through its Vercel rewrite with cookies.
  const dashLogin = await timedFetch(`${DASHBOARD}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: accountEmail, password: accountPassword }),
  });
  const dashCookies = dashLogin.headers.getSetCookie?.() || [];
  const jar = dashCookies.map((c) => c.split(';')[0]).join('; ');
  const csrf = (dashCookies.find((c) => c.startsWith('ray_csrf=')) || '')
    .split(';')[0]
    .split('=')
    .slice(1)
    .join('=');
  log(
    dashLogin.ok && jar.includes('ray_session'),
    'Dashboard login (cookie session via Vercel rewrite)',
    `status=${dashLogin.status}`
  );

  const dashShop = await req('/api/v1/shops/me', {
    method: 'GET',
    headers: { Cookie: jar },
    base: DASHBOARD,
  });
  log(
    dashShop.ok && dashShop.json?.data?.id === shopId,
    'Dashboard reads the shop through the rewrite',
    `status=${dashShop.status}`
  );

  // 11) The Dashboard uploads an image through the presign flow, which is
  //     the only shape its Vercel rewrite can carry.
  const dashPresign = await req('/api/v1/media/presign', {
    method: 'POST',
    headers: {
      Cookie: jar,
      'X-CSRF-Token': csrf,
      'Content-Type': 'application/json',
    },
    body: {
      shopId,
      filename: `dash-${stamp}.png`,
      contentType: 'image/png',
      purpose: 'product_image',
      fileSize: PNG_1PX.length,
    },
    base: DASHBOARD,
  });
  const dashPresignData = dashPresign.json?.data || dashPresign.json;
  let dashImageUrl = null;
  if (dashPresign.ok && dashPresignData?.url) {
    const put = await timedFetch(dashPresignData.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: PNG_1PX,
    });
    const complete = await req('/api/v1/media/complete', {
      method: 'POST',
      headers: {
        Cookie: jar,
        'X-CSRF-Token': csrf,
        'Content-Type': 'application/json',
      },
      body: {
        shopId,
        key: dashPresignData.key,
        mimeType: 'image/png',
        purpose: 'product_image',
        fileSize: PNG_1PX.length,
      },
      base: DASHBOARD,
    });
    dashImageUrl = complete.json?.data?.originalUrl || complete.json?.data?.url || null;
    log(
      put.ok && complete.ok,
      'Dashboard uploads an image to R2 (presign → PUT → complete)',
      `put=${put.status} complete=${complete.status}`
    );
  } else {
    log(
      false,
      'Dashboard uploads an image to R2 (presign → PUT → complete)',
      `presign=${dashPresign.status}`
    );
  }

  // 12) The Dashboard creates a product with the same payload shape its
  //     add-product pages send (imageUrl pointing at the R2 object), using
  //     only the cookie session and the CSRF header.
  const dashProduct = await req('/api/v1/products', {
    method: 'POST',
    headers: {
      Cookie: jar,
      'X-CSRF-Token': csrf,
      'Content-Type': 'application/json',
    },
    body: {
      name: `منتج داشبورد ${stamp}`,
      description: 'منتج أنشأه اختبار الداشبورد',
      price: 149.5,
      stock: 10,
      category: 'أزياء وملابس',
      imageUrl: dashImageUrl,
      isActive: true,
      shopId,
      trackStock: true,
      images: dashImageUrl ? [dashImageUrl] : [],
    },
    base: DASHBOARD,
  });
  const dashProductId = dashProduct.json?.data?.id || dashProduct.json?.data?.product?.id;
  log(
    dashProduct.ok && !!dashProductId,
    'Dashboard creates a product (cookie session + CSRF)',
    `status=${dashProduct.status} id=${dashProductId || '-'}`
  );

  // 13) That product must reach the public listing too, with its image.
  if (dashProductId) {
    const dashList = await req(`/api/v1/products?shopId=${encodeURIComponent(shopId)}`);
    const dashItems =
      dashList.json?.data?.items || dashList.json?.data || dashList.json?.items || [];
    const dashFound = Array.isArray(dashItems) && dashItems.some((p) => p.id === dashProductId);
    log(dashFound, 'Dashboard product shows up in the public listing', `status=${dashList.status}`);
  }

  // 12) Neither frontend may talk to the legacy API host any more.
  for (const [label, origin, path] of [
    ['Business', BUSINESS, '/login'],
    ['Dashboard', DASHBOARD, '/dashboard/inventory/add-product/retail'],
  ]) {
    const page = await timedFetch(`${origin}${path}`);
    const html = await page.text();
    const srcs = [...new Set([...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]))];
    let sawLegacy = false;
    let sawRailway = false;
    for (const s of srcs) {
      const body = await (await timedFetch(s.startsWith('http') ? s : `${origin}${s}`)).text();
      if (/api2\.mnmknk\.com/i.test(body)) sawLegacy = true;
      if (/railway\.app/i.test(body)) sawRailway = true;
    }
    log(
      !sawLegacy,
      `${label} bundle never calls api2.mnmknk.com`,
      `chunks=${srcs.length} railway=${sawRailway}`
    );
  }

  console.log(
    `\n${failures === 0 ? '✅ ALL PASS' : `❌ ${failures} FAILURE(S)`} — ${report.length} checks`
  );
  console.log(
    JSON.stringify(
      {
        api: API,
        business: BUSINESS,
        dashboard: DASHBOARD,
        email: accountEmail,
        shopId,
        productId,
        publicUrl,
        failures,
        report,
      },
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
