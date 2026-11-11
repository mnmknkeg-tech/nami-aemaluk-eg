import { expect, test } from '@playwright/test';

const viewportCases = [
  { name: 'mobile', width: 390, height: 844, columns: 1 },
  { name: 'tablet', width: 768, height: 1024, columns: 2 },
  { name: 'desktop', width: 1024, height: 900, columns: 3 },
  { name: 'wide-desktop', width: 1440, height: 1000, columns: 3 },
] as const;

async function stubRemoteImages(page: import('@playwright/test').Page) {
  await page.route('**/*', (route) => {
    const request = route.request();
    if (
      request.resourceType() === 'image' &&
      new URL(request.url()).origin !== 'http://localhost:5174'
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#f97316"/></svg>',
      });
    }
    return route.continue();
  });
}

test.describe('published Arabic restaurant template responsiveness', () => {
  for (const viewport of viewportCases) {
    test(`${viewport.name} layout at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await stubRemoteImages(page);
      await page.goto('/site/responsive-restaurant');
      await page.evaluate(() => document.fonts.ready);

      const site = page.locator('.published-site-renderer');
      await expect(site).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('#rest_hero_title')).toBeVisible();
      await expect(page.locator('#btn_hero_explore_menu')).toBeVisible();
      await expect(page.locator('#rest_hero_image_box img')).toBeVisible();

      const layout = await page.evaluate(() => {
        const grid = document.getElementById('rest_hero_container');
        const products = document.querySelector<HTMLElement>('[data-section="products"]');
        const image = document.querySelector<HTMLImageElement>('#rest_hero_image_box img');
        const title = document.getElementById('rest_hero_title');
        const siteRoot = document.querySelector<HTMLElement>('.published-site-renderer');
        const titleRect = title?.getBoundingClientRect();
        const orderButton = document.querySelector<HTMLElement>('#rest_btn_order_now');
        const orderRect = orderButton?.getBoundingClientRect();
        const headerActionsOverlap = Boolean(
          orderRect &&
          Array.from(
            document.querySelectorAll<HTMLElement>(
              '#rest_header [title="سلة التسوق"], #rest_header [title="تسجيل الدخول / حسابي"], #rest_header [title="تواصل عبر واتساب"], #rest_header [title="اتصال هاتفي"]'
            )
          ).some((action) => {
            const rect = action.getBoundingClientRect();
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              orderRect.left < rect.right &&
              orderRect.right > rect.left &&
              orderRect.top < rect.bottom &&
              orderRect.bottom > rect.top
            );
          })
        );
        const loadedFontFamilies = Array.from(document.fonts)
          .filter((font) => font.status === 'loaded')
          .map((font) => font.family.toLowerCase());
        return {
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          rootWidth: siteRoot?.getBoundingClientRect().width || 0,
          rootScrollWidth: siteRoot?.scrollWidth || 0,
          heroColumns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
          productColumns: products
            ? getComputedStyle(products.querySelector('div.grid')!).gridTemplateColumns.split(' ')
                .length
            : 0,
          imageLoaded: Boolean(image?.complete && image.naturalWidth > 0),
          imageWidth: image?.getBoundingClientRect().width || 0,
          imageHeight: image?.getBoundingClientRect().height || 0,
          imageRatio:
            (image?.getBoundingClientRect().width || 0) /
            (image?.getBoundingClientRect().height || 1),
          titleFits: Boolean(
            title &&
            titleRect &&
            titleRect.left >= -1 &&
            titleRect.right <= window.innerWidth + 1 &&
            title.scrollWidth <= title.clientWidth + 1
          ),
          rootDirection: siteRoot ? getComputedStyle(siteRoot).direction : '',
          headerActionsOverlap,
          brandText: document.getElementById('rest_logo')?.textContent || '',
          headingFont: title ? getComputedStyle(title).fontFamily : '',
          arabicFontsLoaded:
            loadedFontFamilies.includes('cairo') && loadedFontFamilies.includes('tajawal'),
          fontStylesheetLoaded: Array.from(document.styleSheets).some((sheet) =>
            sheet.href?.endsWith('/fonts/fonts.css')
          ),
        };
      });

      expect(layout.viewportWidth).toBe(viewport.width);
      expect(layout.documentWidth).toBeLessThanOrEqual(viewport.width);
      expect(layout.rootWidth).toBeLessThanOrEqual(viewport.width + 1);
      expect(layout.rootScrollWidth).toBeLessThanOrEqual(viewport.width);
      expect(layout.headerActionsOverlap).toBeFalsy();
      expect(layout.heroColumns).toBe(viewport.width === 390 ? 1 : 2);
      expect(layout.productColumns).toBe(viewport.columns);
      expect(layout.imageLoaded).toBeTruthy();
      expect(layout.imageWidth).toBeGreaterThan(0);
      expect(layout.imageHeight).toBeGreaterThan(0);
      expect(layout.imageRatio).toBeGreaterThan(1.3);
      expect(layout.imageRatio).toBeLessThan(1.4);
      expect(layout.titleFits).toBeTruthy();
      expect(layout.rootDirection).toBe('rtl');
      expect(layout.brandText).toContain('La Villa');
      expect(layout.headingFont).toContain('Tajawal');
      expect(layout.arabicFontsLoaded).toBeTruthy();

      await page.locator('#rest_table_booking').scrollIntoViewIfNeeded();
      await expect(page.locator('#rest_table_booking h2')).toBeVisible();
      if (viewport.width === 390) {
        await page.locator('#rest_table_booking').screenshot({
          path: testInfo.outputPath('responsive-mobile-booking.png'),
        });
      }
      await page.locator('#rest_reviews').scrollIntoViewIfNeeded();
      await expect(page.locator('#rest_reviews h2')).toBeVisible();
      if (viewport.width === 390) {
        await page.locator('#rest_reviews').screenshot({
          path: testInfo.outputPath('responsive-mobile-reviews.png'),
        });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      );

      await page.screenshot({
        path: testInfo.outputPath(`responsive-${viewport.name}.png`),
      });

      if (viewport.width <= 768) {
        const menuButton = page.getByTitle('القائمة الرئيسية');
        await expect(menuButton).toBeVisible();
        await menuButton.click();
        await expect(page.getByText('صفحات الموقع')).toBeVisible();
        await expect(page.getByRole('button', { name: /تواصل معنا/ })).toBeVisible();
      } else {
        await expect(page.getByTitle('القائمة الرئيسية')).toHaveCount(0);
      }
      console.log(`${viewport.name} responsive metrics`, layout);
    });
  }
});

for (const template of [
  { slug: 'responsive-clinic', name: 'clinic' },
  { slug: 'responsive-fashion', name: 'fashion' },
]) {
  for (const viewport of viewportCases) {
    test(`${template.name} template remains within ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await stubRemoteImages(page);
      await page.goto(`/site/${template.slug}`);
      await expect(page.locator('.published-site-renderer')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

      const dimensions = await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>('.published-site-renderer');
        return {
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          root: root?.getBoundingClientRect().width || 0,
          rootScroll: root?.scrollWidth || 0,
          direction: root ? getComputedStyle(root).direction : '',
          headingsWithinViewport: Array.from(document.querySelectorAll('h1, h2, h3')).every(
            (heading) => {
              const rect = heading.getBoundingClientRect();
              return rect.width === 0 || (rect.left >= -1 && rect.right <= window.innerWidth + 1);
            }
          ),
        };
      });

      expect(dimensions.viewport).toBe(viewport.width);
      expect(dimensions.document).toBeLessThanOrEqual(viewport.width);
      expect(dimensions.root).toBeLessThanOrEqual(viewport.width + 1);
      expect(dimensions.rootScroll).toBeLessThanOrEqual(viewport.width);
      expect(dimensions.direction).toBe('rtl');
      expect(dimensions.headingsWithinViewport).toBeTruthy();
    });
  }
}

test.describe('published background parity', () => {
  // Regression guard for the "background shows in the editor but disappears
  // after publishing" class of bugs: a section background authored in the
  // builder template must reach the live DOM with its exact authored value.
  test('hero keeps its authored background color after publishing', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/site/responsive-restaurant');
    const hero = page.locator('#rest_hero');
    await expect(hero).toBeVisible();
    // Authored desktop style in sampleActivities/restaurant.ts: #fffbeb.
    await expect(hero).toHaveCSS('background-color', 'rgb(255, 251, 235)');
    await expect(hero).toHaveCSS('border-bottom-color', 'rgb(254, 243, 199)');
  });
});
