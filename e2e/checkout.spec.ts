import { expect, test } from '@playwright/test';

test('guest orders from a published merchant site through the public checkout contract', async ({
  page,
  request,
}) => {
  await page.goto('/site/checkout-restaurant');
  await expect(page.locator('.published-site-renderer')).toBeVisible();

  await page.goto('/site/checkout-restaurant/product/phase12-test-product');
  await page.getByRole('button', { name: 'إضافة إلى السلة' }).click();
  await expect(page.getByRole('button', { name: 'تمت الإضافة للسلة' })).toBeVisible();

  await page.goto('/site/checkout-restaurant/checkout');
  await page.getByPlaceholder('الاسم').fill('عميل اختبار');
  await page.getByPlaceholder('01xxxxxxxxx').fill('201000000001');
  await page.getByPlaceholder('القاهرة، الإسكندرية...').fill('القاهرة');
  await page.getByPlaceholder('الشارع، رقم المبنى، الشقة...').fill('عنوان اختبار معزول');
  await expect(page.getByText('منتج اختبار الطلب')).toBeVisible();

  const orderRequestPromise = page.waitForRequest(
    (candidate) =>
      candidate.method() === 'POST' && new URL(candidate.url()).pathname === '/api/v1/orders/public'
  );
  await page
    .getByRole('button', { name: /^تأكيد الطلب/ })
    .first()
    .click();
  const orderRequest = await orderRequestPromise;
  const payload = orderRequest.postDataJSON();
  const idempotencyKey = orderRequest.headers()['x-idempotency-key'];

  expect(payload).toMatchObject({
    shopId: 'shop-checkout-restaurant',
    items: [{ productId: 'phase12-test-product', quantity: 1 }],
    // المدخل 201000000001 بيتطبّع في الفورم لصيغة 01 المحلية (toEgyptianPhoneDigits)
    customer: { name: 'عميل اختبار', phone: '01000000001' },
    source: 'website',
  });
  expect(payload.total).toBeUndefined();
  expect(idempotencyKey).toBeTruthy();
  await expect(page.getByText('تم إنشاء طلبك بنجاح!')).toBeVisible();

  const storedOrders = await request.get('http://127.0.0.1:4179/__test/orders');
  expect(storedOrders.ok()).toBeTruthy();
  expect((await storedOrders.json()).data).toContainEqual({ payload, idempotencyKey });
});
