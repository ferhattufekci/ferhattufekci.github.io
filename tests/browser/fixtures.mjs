import { test as base, expect } from '@playwright/test';
import { createPagesServer, listen, close } from '../../scripts/lib/pages-preview.mjs';

export async function isolateThirdParties(context, origin) {
  await context.addInitScript(() => localStorage.setItem('calendlyPermanentlyClosed', 'true'));
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
