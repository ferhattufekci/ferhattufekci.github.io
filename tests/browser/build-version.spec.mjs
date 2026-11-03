import { test as base, expect } from './fixtures.mjs';
import { packagePages } from '../../scripts/package-pages.mjs';
import { withProjectFixture } from '../../scripts/tests/helpers/project-fixture.js';
import { createPagesServer, listen, close } from '../../scripts/lib/pages-preview.mjs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const runUrl = 'https://github.com/ferhattufekci/ferhattufekci.github.io/actions/runs/41706031837';
const env = {
  CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_REPOSITORY: 'ferhattufekci/ferhattufekci.github.io', GITHUB_WORKFLOW: 'Portfolio CI/CD',
  GITHUB_RUN_ID: '41706031837', GITHUB_RUN_NUMBER: '132', GITHUB_RUN_ATTEMPT: '1'
};
// Exercise the real packager and real HTTP server, never insert the feature with page.evaluate().
const test = base.extend({
  siteOrigin: [async ({}, use) => {
    await withProjectFixture(async root => {
      const artifact = await packagePages(root, 'a'.repeat(40), env);
      const server = createPagesServer(artifact);
      try { await use(await listen(server)); }
      finally { await close(server); }
    });
  }, { scope: 'worker' }]
});
async function openMenu(page) {
  const toggle = page.locator('.menu-toggle');
  if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') !== 'true') {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
}
async function tabTo(page, link) {
  const reverse = await link.evaluate(el =>
    !!(document.activeElement.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING));
  for (let n = 0; n < 100; n++) {
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
    if (await link.evaluate(el => el === document.activeElement)) return;
  }
  throw new Error('Build link is unreachable through sequential keyboard navigation');
}
async function visibleGeometry(page) {
  const link = page.locator('a.build-info');
  await expect(link).toBeVisible();
  await expect(link).toBeInViewport({ ratio: 1 });
  const state = await link.evaluate(el => {
    const box = el.getBoundingClientRect();
    const drawer = el.closest('.header');
    const host = drawer || el.closest('footer');
    const owner = host.getBoundingClientRect();
    const text = document.createRange(); text.selectNodeContents(el);
    const others = drawer ? [...drawer.querySelectorAll('.site-nav,.social-links,.privacy-link')]
      : [...host.querySelectorAll('.trust-footer-item')];
    const intersects = r => box.left < r.right && box.right > r.left && box.top < r.bottom && box.bottom > r.top;
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return {
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      ownerOverflow: host.scrollWidth > host.clientWidth + 1,
      insideOwner: box.left >= owner.left - 1 && box.right <= owner.right + 1,
      clippedText: [...text.getClientRects()].some(r => r.left < box.left - 1 || r.right > box.right + 1),
      overlap: others.some(other => intersects(other.getBoundingClientRect())),
      unobscured: !!top && (el.contains(top) || top.contains(el))
    };
  });
  expect(state).toEqual({ horizontalOverflow: false, ownerOverflow: false, insideOwner: true,
    clippedText: false, overlap: false, unobscured: true });
}

test('R-BUILD-V01 | AC01/02/09/10/12 | One quiet artifact identity is shared across all five hash routes and themes', async ({ page }, info) => {
  for (const route of ['/#about-me', '/#resume', '/#blog', '/#projects', '/#contact']) {
    await page.goto(route);
    await expect(page.locator('.preloader')).toHaveCount(0);
    await openMenu(page);
    const link = page.locator('a.build-info');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText('Build 132.1');
    await expect(link).toHaveAttribute('href', runUrl);
    await expect(link).toHaveAccessibleName(/Build 132\.1.*Portfolio CI\/CD.*new tab/i);
    await expect(link).toHaveAttribute('target', '_blank');
    expect((await link.getAttribute('rel')).split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(await link.getAttribute('role')).toBeNull();
    await visibleGeometry(page);
  }
  await info.attach('build-shared-menu', { body: await page.screenshot(), contentType: 'image/png' });
});

test('R-BUILD-V02 | AC06/10 | Standalone pages and 404 expose one static build link with JavaScript disabled', async ({ browser, siteOrigin }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: info.project.use.viewport,
    colorScheme: info.project.use.colorScheme });
  await context.route('**/*', route => new URL(route.request().url()).origin === siteOrigin ? route.continue() : route.abort());
  const page = await context.newPage();
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  try {
    for (const path of ['/about/', '/contact/', '/privacy/', '/404.html']) {
      await page.goto(siteOrigin + path);
      const link = page.locator('a.build-info');
      await expect(link).toHaveCount(1);
      await expect(link).toHaveText('Build 132.1');
      await expect(link).toHaveAttribute('href', runUrl);
      // The 404 shares the portfolio drawer; with JS disabled it may remain closed on mobile.
      // Its real static href is still present; drawer interactivity is tested with JS in V01/V03.
      if (path !== '/404.html') {
        await link.scrollIntoViewIfNeeded();
        await visibleGeometry(page);
      }
    }
    expect(requests.some(url => /api\.github\.com|build-metadata\.json/.test(url))).toBe(false);
  } finally { await context.close(); }
});

test('R-BUILD-V03 | AC02/09 | Sequential keyboard focus reaches the build link, paints a local ring and opens the expected run', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('.preloader')).toHaveCount(0);
  const toggle = page.locator('.menu-toggle');
  if (await toggle.isVisible()) {
    await tabTo(page, toggle);
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
  const link = page.locator('a.build-info');
  await tabTo(page, link);
  await visibleGeometry(page);
  await expect(link).toBeFocused();
  expect(await link.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  expect(await link.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
  // Fulfil only the external destination; native anchor/popup navigation is real.
  await context.route(runUrl, route => route.fulfill({ contentType: 'text/html', body: '<h1>Fixture Actions run</h1>' }));
  const popupReady = context.waitForEvent('page');
  await page.keyboard.press('Enter');
  const popup = await popupReady;
  await expect(popup).toHaveURL(runUrl);
  await popup.close();
  if (await toggle.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  }
});

test('R-BUILD-V04 | AC09 | Short desktop and narrow drawer keep build, copyright and social controls separate', async ({ page }, info) => {
  for (const viewport of [{ width: 320, height: 480 }, { width: 390, height: 600 }, { width: 1440, height: 500 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('.preloader')).toHaveCount(0);
    await openMenu(page);
    const link = page.locator('a.build-info');
    await tabTo(page, link);
    await visibleGeometry(page);
  }
  await info.attach('build-short-window', { body: await page.screenshot(), contentType: 'image/png' });
});

test('R-BUILD-V05 | AC09 | Long run numbers survive 200% CSS zoom and narrow reflow without truncation', async ({ browser }, info) => {
  await withProjectFixture(async root => {
    const artifact = await packagePages(root, 'a'.repeat(40), { ...env, GITHUB_RUN_NUMBER: '12345678901234567890', GITHUB_RUN_ATTEMPT: '123' });
    const server = createPagesServer(artifact);
    const origin = await listen(server);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: info.project.use.colorScheme });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    try {
      await page.goto(origin);
      await expect(page.locator('.preloader')).toHaveCount(0);
      await page.locator('body').evaluate(el => { el.style.zoom = '2'; });
      await openMenu(page);
      const link = page.locator('a.build-info');
      await expect(link).toHaveText('Build 12345678901234567890.123');
      await tabTo(page, link);
      // Preserve the real pointer+keyboard combination seen on the Linux runner.
      // A translated full-width menu link must not expand the drawer's scroll area.
      const menuLink = page.locator('.site-main-menu a[href="#resume"]');
      const menuBox = await menuLink.boundingBox();
      await page.mouse.move(menuBox.x + 12, menuBox.y + menuBox.height / 2);
      await expect.poll(() => menuLink.evaluate(el => el.matches(':hover'))).toBe(true);
      await menuLink.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      await visibleGeometry(page);
      await page.locator('body').evaluate(el => { el.style.zoom = ''; });
      await page.setViewportSize({ width: 320, height: 480 });
      await openMenu(page);
      await tabTo(page, link);
      await visibleGeometry(page);
      await info.attach('build-long-number', { body: await page.screenshot(), contentType: 'image/png' });
    } finally { await context.close(); await close(server); }
  });
});

test('R-BUILD-V06 | AC03/11/12 | An already loaded old document keeps its artifact identity when a new artifact becomes available', async ({ page, context, siteOrigin }) => {
  await page.goto('/');
  await openMenu(page);
  await expect(page.locator('a.build-info')).toHaveText('Build 132.1');
  await withProjectFixture(async root => {
    const artifact = await packagePages(root, 'a'.repeat(40), { ...env, GITHUB_RUN_ATTEMPT: '2' });
    const nextHtml = await readFile(join(artifact, 'index.html'), 'utf8');
    await context.route(siteOrigin + '/', route => route.fulfill({ contentType: 'text/html', body: nextHtml }));
    const next = await context.newPage();
    try {
      await next.goto(siteOrigin);
      await openMenu(next);
      await expect(next.locator('a.build-info')).toHaveText('Build 132.2');
      await page.bringToFront();
      await expect(page.locator('a.build-info')).toHaveText('Build 132.1');
      await expect(page.locator('a.build-info')).toHaveAttribute('href', runUrl);
    } finally { await next.close(); }
  });
});
