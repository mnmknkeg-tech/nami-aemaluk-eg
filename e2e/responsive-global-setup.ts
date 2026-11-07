import { createServer } from 'node:http';
import { loadFullWebsiteTemplate } from '../apps/dashboard-web/src/components/website-builder/data/registry';

const websiteBySlug = new Map([
  ['responsive-restaurant', loadFullWebsiteTemplate('site_restaurant_cafe').website],
  ['responsive-clinic', loadFullWebsiteTemplate('site_clinic_hospital').website],
  ['responsive-fashion', loadFullWebsiteTemplate('site_opal_fashion').website],
  ['checkout-restaurant', loadFullWebsiteTemplate('site_restaurant_cafe').website],
]);
const testOrders: Array<{ payload: unknown; idempotencyKey: string | null }> = [];
const checkoutProduct = {
  id: 'phase12-test-product',
  name: 'منتج اختبار الطلب',
  price: 125,
  stock: 5,
  isActive: true,
  is_active: true,
  isAvailable: true,
  shopId: 'shop-checkout-restaurant',
};

function respond(response: import('node:http').ServerResponse, data: unknown) {
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ data }));
}

export default async function globalSetup() {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');

    if (url.pathname === '/health') {
      respond(response, { ok: true });
      return;
    }

    if (url.pathname === '/__test/orders' && request.method === 'GET') {
      respond(response, testOrders);
      return;
    }

    if (url.pathname === '/api/v1/orders/public' && request.method === 'POST') {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
      request.on('end', () => {
        let payload: unknown;
        try {
          payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          response.writeHead(400).end();
          return;
        }
        const idempotencyKey = request.headers['x-idempotency-key'];
        const normalizedKey = Array.isArray(idempotencyKey)
          ? idempotencyKey[0]
          : idempotencyKey || null;
        testOrders.push({ payload, idempotencyKey: normalizedKey });
        respond(response, { id: 'phase12-test-order', shopName: 'متجر اختبار الطلب' });
      });
      return;
    }

    const match = url.pathname.match(
      /^\/api\/v1\/shops\/(responsive-restaurant|responsive-clinic|responsive-fashion|checkout-restaurant)\/website$/
    );
    if (match) {
      const slug = match[1];
      const website = websiteBySlug.get(slug);
      if (!website) {
        response.writeHead(404).end();
        return;
      }
      respond(response, {
        published: true,
        publishedAt: '2026-01-01T00:00:00Z',
        shop: {
          id: `shop-${slug}`,
          name: website.name,
          slug,
          phone: '201000000000',
          logoUrl: '',
        },
        config: { website },
      });
      return;
    }

    if (
      url.pathname === '/api/v1/products' &&
      url.searchParams.get('shopId') === 'shop-checkout-restaurant'
    ) {
      respond(response, [checkoutProduct]);
      return;
    }

    if (
      url.pathname.startsWith('/api/v1/products') ||
      url.pathname.startsWith('/api/v1/public/shops/')
    ) {
      respond(response, []);
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'not found' }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(4179, '127.0.0.1', resolve);
  });

  return async () =>
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
}
