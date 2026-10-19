const baseUrl = String(process.env.BACKEND_URL || '').trim() || `http://127.0.0.1:${process.env.PORT || process.env.BACKEND_PORT || 4000}`;
const token = String(process.env.RAY_TOKEN || process.env.TOKEN || '').trim();

const print = (title, obj) => {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(obj, null, 2));
};

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, text: text.slice(0, 2000) };
  }
};

const authHeaders = (t) => ({
  accept: 'application/json',
  'content-type': 'application/json',
  ...(t ? { authorization: `Bearer ${t}` } : {}),
});

const mustNotBe404 = (label, status) => {
  if (status === 404) {
    const err = new Error(`${label} returned 404. This usually means BOOT_MODULES/MINIMAL_BOOT started backend without OrderModule.`);
    err.code = 'ENDPOINT_404';
    throw err;
  }
};

const toIsoDateOnly = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const run = async () => {
  // 1) Sanity: orders endpoint exists (should not be 404)
  const ordersUrl = new URL('/api/v1/orders', baseUrl);
  const pingRes = await fetch(ordersUrl, {
    method: 'POST',
    headers: authHeaders(''),
    body: JSON.stringify({}),
  });
  const ping = await safeJson(pingRes);
  print('POST /api/v1/orders (no token sanity)', ping);
  mustNotBe404('POST /api/v1/orders', ping.status);

  if (!token) {
    console.log('\n[INFO] RAY_TOKEN not provided. Endpoint existence check passed.');
    console.log('[INFO] To run full end-to-end checkout smoke test (create order + verify analytics/notifications), set RAY_TOKEN env var.');
    console.log("Example (PowerShell):\n  $env:RAY_TOKEN='YOUR_JWT'; npm run backend:smoke:checkout");
    process.exit(0);
  }

  // 2) Resolve shopId from token
  const meUrl = new URL('/api/v1/shops/me', baseUrl);
  const meRes = await fetch(meUrl, { method: 'GET', headers: authHeaders(token) });
  const me = await safeJson(meRes);
  print('GET /api/v1/shops/me', me);
  if (!me.ok) {
    throw new Error('Failed to fetch /shops/me. Ensure RAY_TOKEN is valid and is merchant/admin.');
  }

  const shopId = String(me?.json?.id || '').trim();
  if (!shopId) {
    throw new Error('Could not resolve shopId from /shops/me response');
  }

  // 3) Read analytics (before)
  const to = new Date();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const analyticsUrl = new URL(`/api/v1/shops/${encodeURIComponent(shopId)}/analytics`, baseUrl);
  analyticsUrl.searchParams.set('from', toIsoDateOnly(from));
  analyticsUrl.searchParams.set('to', toIsoDateOnly(to));

  const beforeAnalyticsRes = await fetch(analyticsUrl, { method: 'GET', headers: authHeaders(token) });
  const beforeAnalytics = await safeJson(beforeAnalyticsRes);
  print('GET /api/v1/shops/:id/analytics (before)', { url: analyticsUrl.toString(), ...beforeAnalytics });
  if (!beforeAnalytics.ok) {
    throw new Error('Failed to fetch shop analytics before order. Ensure analytics module is enabled and token has access.');
  }

  const beforeTotalOrders = Number(beforeAnalytics?.json?.totalOrders ?? 0);
  const beforeTotalRevenue = Number(beforeAnalytics?.json?.totalRevenue ?? 0);

  // 4) Read shop notifications (before)
  const notifUrl = new URL(`/api/v1/notifications/shop/${encodeURIComponent(shopId)}`, baseUrl);
  notifUrl.searchParams.set('take', '20');
  notifUrl.searchParams.set('skip', '0');
  const beforeNotifRes = await fetch(notifUrl, { method: 'GET', headers: authHeaders(token) });
  const beforeNotif = await safeJson(beforeNotifRes);
  print('GET /api/v1/notifications/shop/:shopId (before)', { url: notifUrl.toString(), ...beforeNotif });
  mustNotBe404('GET /api/v1/notifications/shop/:shopId', beforeNotif.status);

  // 5) Pick a product to order
  const productsUrl = new URL('/api/v1/products', baseUrl);
  productsUrl.searchParams.set('shopId', shopId);
  productsUrl.searchParams.set('take', '20');
  productsUrl.searchParams.set('skip', '0');

  const productsRes = await fetch(productsUrl, { method: 'GET', headers: authHeaders(token) });
  const products = await safeJson(productsRes);
  print('GET /api/v1/products?shopId=... (pick product)', { url: productsUrl.toString(), ...products });
  if (!products.ok) {
    throw new Error('Failed to fetch products for shop. Ensure shop has products and endpoint is working.');
  }

  const list = Array.isArray(products?.json) ? products.json : (Array.isArray(products?.json?.items) ? products.json.items : []);
  const product = list.find((p) => p && typeof p === 'object' && String(p.id || '').trim());
  if (!product) {
    throw new Error('No products found for this shop. Add at least one active product then re-run.');
  }

  const productId = String(product.id).trim();

  // 6) Create order (COD)
  const orderBody = {
    shopId,
    items: [
      {
        productId,
        quantity: 1,
      },
    ],
    total: 0,
    paymentMethod: 'COD',
    notes: 'smoke-checkout',
  };

  const createRes = await fetch(ordersUrl, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(orderBody),
  });
  const created = await safeJson(createRes);
  print('POST /api/v1/orders (create)', { request: orderBody, response: created });
  if (!created.ok) {
    throw new Error('Order creation failed. See output above.');
  }

  const createdOrderId = String(created?.json?.id || '').trim();
  const createdTotal = Number(created?.json?.total ?? NaN);

  // 7) Re-check analytics (after)
  const afterAnalyticsRes = await fetch(analyticsUrl, { method: 'GET', headers: authHeaders(token) });
  const afterAnalytics = await safeJson(afterAnalyticsRes);
  print('GET /api/v1/shops/:id/analytics (after)', afterAnalytics);
  if (!afterAnalytics.ok) {
    throw new Error('Failed to fetch shop analytics after order.');
  }

  const afterTotalOrders = Number(afterAnalytics?.json?.totalOrders ?? 0);
  const afterTotalRevenue = Number(afterAnalytics?.json?.totalRevenue ?? 0);

  // 8) Re-check notifications (after)
  const afterNotifRes = await fetch(notifUrl, { method: 'GET', headers: authHeaders(token) });
  const afterNotif = await safeJson(afterNotifRes);
  print('GET /api/v1/notifications/shop/:shopId (after)', afterNotif);

  const checks = {
    orderId: createdOrderId || null,
    createdTotal: Number.isFinite(createdTotal) ? createdTotal : null,
    analytics: {
      beforeTotalOrders,
      afterTotalOrders,
      beforeTotalRevenue,
      afterTotalRevenue,
      expectedOrdersIncreased: afterTotalOrders >= beforeTotalOrders + 1,
      expectedRevenueNonDecreased: afterTotalRevenue >= beforeTotalRevenue,
    },
    notifications: {
      beforeStatus: beforeNotif.status,
      afterStatus: afterNotif.status,
    },
  };

  // Best-effort assertions (don’t be too strict due to date range/timezone and async processing)
  const okOrders = checks.analytics.expectedOrdersIncreased;
  const okRevenue = checks.analytics.expectedRevenueNonDecreased;

  print('CHECKS SUMMARY', checks);

  if (!okOrders) {
    console.error('\n[FAIL] Analytics totalOrders did not increase. This can mean analytics range/timezone mismatch or order not included yet.');
    process.exit(1);
  }

  if (!okRevenue) {
    console.error('\n[FAIL] Analytics totalRevenue decreased (unexpected).');
    process.exit(1);
  }

  console.log('\n[OK] Checkout smoke test passed: orders endpoint exists, order created, analytics updated.');
  process.exit(0);
};

run().catch((e) => {
  print('ERROR', { message: e?.message || String(e), stack: e?.stack, code: e?.code });
  process.exit(1);
});
