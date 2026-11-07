import { expect, test } from '@playwright/test';

test.describe('marketplace smoke', () => {
  test('version endpoint reports safe build metadata', async ({ request }) => {
    const response = await request.get('/api/version');
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toEqual({
      version: expect.any(String),
      commit: expect.any(String),
    });
  });

  test('homepage renders', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/./); // page has any title
    await expect(page.locator('body')).toBeVisible();
  });

  test('shops page renders', async ({ page }) => {
    await page.goto('/shops');
    await expect(page.locator('body')).toBeVisible();
  });

  test('no client-side crash on offers page', async ({ page }) => {
    page.on('pageerror', (err) => {
      throw new Error(`Uncaught page error: ${err.message}`);
    });
    await page.goto('/offers');
    await expect(page.locator('body')).toBeVisible();
  });
});
