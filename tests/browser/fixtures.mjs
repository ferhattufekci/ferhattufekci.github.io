import { test as base, expect } from '@playwright/test';
import { createPagesServer, listen, close } from '../../scripts/lib/pages-preview.mjs';

export async function isolateThirdParties(context, origin, { calendlyClosed = true } = {}) {
  await context.addInitScript(closed => {
    try {
      if (closed) localStorage.setItem('calendlyPermanentlyClosed', 'true');
      else localStorage.removeItem('calendlyPermanentlyClosed');
    }
    catch { /* Initialization also runs in opaque frames before navigation. */ }
  }, calendlyClosed);
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue()
    : route.abort());
}

export const test = base.extend({
  calendlyClosed: [true, { option: true }],
  siteOrigin: [async ({}, use) => {
    const server = createPagesServer();
    try { await use(await listen(server)); }
    finally { await close(server); }
  }, { scope: 'worker' }],
  baseURL: async ({ siteOrigin }, use) => use(siteOrigin),
  isolatedContext: [async ({ context, siteOrigin, calendlyClosed }, use) => {
    await isolateThirdParties(context, siteOrigin, { calendlyClosed });
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
  // Animations temporarily mark both outgoing and incoming sections as current.
  // Read count and identity atomically, and allow a document navigation to finish.
  await expect(async () => {
    const state = await page.evaluate(() => ({
      current: [...document.querySelectorAll('.pt-page-current')].map(node => node.getAttribute('data-id')),
      activeMenu: [...document.querySelectorAll('.site-main-menu li.active a')].map(link => new URL(link.href).hash)
    }));
    expect(state).toEqual({ current: [id], activeMenu: id === 'not-found' ? [] : [`#${id}`] });
  }).toPass({ timeout: 7000 });
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
  const link = page.locator(`.site-main-menu a:is([href="#${id}"], [href="/#${id}"])`);
  await expect(link).toBeInViewport({ ratio: 1 });
  await link.click();
  await expectSection(page, id);
  if (mobile) await expect(toggle).toHaveAttribute('aria-expanded', 'false');
}
