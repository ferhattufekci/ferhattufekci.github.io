import { randomUUID } from 'node:crypto';
import { test, expect, expectSection, navigateToSection, isolateThirdParties } from './fixtures.mjs';

async function shellSnapshot(page) {
  return page.evaluate(() => {
    const card = document.querySelector('.error-card');
    const copyright = document.querySelector('.copyrights');
    return {
      title: document.getElementById('route-error-title').textContent,
      message: card.querySelector('p:not(.error-code)').textContent,
      menu: [...document.querySelectorAll('.site-main-menu a')].map(link => [link.textContent.trim(), new URL(link.href).hash]),
      photos: [...document.querySelectorAll('#site_header img, .mobile-header img')].map(img => img.src),
      actions: [...card.querySelectorAll('.error-actions a')].map(link => {
        const style = getComputedStyle(link);
        return { label: link.textContent, section: new URL(link.href).hash || '#about-me', background: style.backgroundColor, color: style.color, border: style.border, radius: style.borderRadius };
      }),
      copyright: copyright.textContent.trim(),
      themeButtons: document.querySelectorAll('.theme-toggle-btn').length,
      mainLandmarks: document.querySelectorAll('main, [role="main"]').length
    };
  });
}

test('R-SHELL-04 | Missing fragments and root/nested paths present the same shell, content and recovery semantics', async ({ page }, testInfo) => {
  await page.goto('/#resume234234');
  await expectSection(page, 'not-found');
  await expect(page.locator('.preloader')).toHaveCount(0);
  const reference = await shellSnapshot(page);
  const token = randomUUID();
  for (const path of [`/__shell-${token}`, `/__shell-${token}/a/b/c`]) {
    const response = await page.goto(path);
    expect(response.status()).toBe(404);
    await expect(page.locator('.error-card')).toBeVisible();
    expect(await shellSnapshot(page)).toEqual(reference);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.mobile-header')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    // The extracted shell has working theme and drawer controls without SPA routing.
    const theme = page.locator(testInfo.project.use.isMobile ? '.mobile-theme-toggle' : '.header .theme-toggle-btn');
    const initial = await page.locator('html').getAttribute('data-theme');
    await theme.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', initial === 'light' ? 'dark' : 'light');
    await theme.click();
    await navigateToSection(page, 'resume');
    await expect(page).toHaveURL(/\/#resume$/);
    await expectSection(page, 'resume');
  }
});

test('R-SHELL-05 | A path-based 404 remains readable and recoverable with JavaScript disabled', async ({ browser, siteOrigin }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: testInfo.project.use.colorScheme, viewport: testInfo.project.use.viewport });
  await isolateThirdParties(context, siteOrigin);
  try {
    const page = await context.newPage();
    expect((await page.goto(siteOrigin + '/__no-js-' + randomUUID() + '/nested')).status()).toBe(404);
    await expect(page.getByRole('heading', { name: '404 — Page Not Found', exact: true })).toBeVisible();
    await expect(page.locator('.error-card')).toBeVisible();
    const surfaces = await page.evaluate(() => ['.error-card', '#site_header', '.mobile-header'].map(selector =>
      getComputedStyle(document.querySelector(selector)).backgroundColor));
    expect(surfaces[1]).toBe(surfaces[0]);
    expect(surfaces[2]).toBe(surfaces[0]);
    await page.getByRole('link', { name: 'Back to Home', exact: true }).click();
    await expect(page).toHaveURL(siteOrigin + '/');
  } finally { await context.close(); }
});
