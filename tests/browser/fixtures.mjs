import { test as base, expect } from '@playwright/test';
import { createPagesServer, listen, close } from '../../scripts/lib/pages-preview.mjs';

export async function isolateThirdParties(context, origin) {
  await context.addInitScript(() => {
    try { localStorage.setItem('calendlyPermanentlyClosed', 'true'); }
    catch { /* Initialization also runs in opaque frames before navigation. */ }
  });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue()
    : route.abort());
}

export const test = base.extend({
  siteOrigin: [async ({}, use) => {
    const server = createPagesServer();
    try { await use(await listen(server)); }
    finally { await close(server); }
  }, { scope: 'worker' }],
  baseURL: async ({ siteOrigin }, use) => use(siteOrigin),
  isolatedContext: [async ({ context, siteOrigin }, use) => {
    await isolateThirdParties(context, siteOrigin);
    await use();
  }, { auto: true }],
  runtimeErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await use();
    expect(errors, 'No uncaught application error should occur').toEqual([]);
  }, { auto: true }]
});
export { expect };

export async function expectSection(page, id) {
  await expect(page.locator('.pt-page-current')).toHaveCount(1);
  await expect(page.locator('.pt-page-current')).toHaveAttribute('data-id', id);
}

export async function navigateToSection(page, id) {
  const toggle = page.locator('.menu-toggle');
  const mobile = await toggle.isVisible();
  if (mobile) {
    // DOM visibility can remain true while the drawer slides off screen.
    // Its explicit expanded state is the stable contract for opening it.
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
  const link = page.locator(`.site-main-menu a[href="#${id}"]`);
  await expect(link).toBeInViewport({ ratio: 1 });
  await link.click();
  await expectSection(page, id);
  if (mobile) await expect(toggle).toHaveAttribute('aria-expanded', 'false');
}
