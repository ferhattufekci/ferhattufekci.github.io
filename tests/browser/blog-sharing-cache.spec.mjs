import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { createPagesServer, listen, close } from '../../scripts/lib/pages-preview.mjs';
import { catalog } from './data/catalog.mjs';
import { article, controls, installPlatform, settle, feedback, nativeProgressInline, noDuplicateActions, nativeSettledQuiet, calls } from './helpers/blog-sharing.mjs';
import { expectSection } from './fixtures.mjs';

test('R-BLOG-SHARE-09/14 | Returning visitor with cached pre-sharing CSS gets current card styles and stable native progress', async ({ page }, info) => {
  // No Playwright routing: routing disables the HTTP cache under test.
  // A real cacheable response models the previous release's flex card, which
  // has no sharing selectors. The original full stylesheet reproducer is
  // retained in the local incident evidence; this is its minimal trigger.
  const staleCss = '.blog-article-card { display: flex; }';
  const data = catalog({ 'medium-systems.json': [article('A')], 'medium-test.json': [article('B')], 'medium-software.json': [] });
  const requests = [];
  const server = createPagesServer(process.env.PORTFOLIO_TEST_ROOT ? resolve(process.env.PORTFOLIO_TEST_ROOT) : undefined);
  const [serve] = server.listeners('request');
  server.removeAllListeners('request');
  server.on('request', (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    requests.push(url.pathname + url.search);
    // Keep vendor traffic outside this test without disabling browser caching.
    res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:");
    if (url.pathname === '/cache-warmup') {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      return res.end('<link rel="stylesheet" href="/css/blog-cards.css"><article class="blog-article-card">Previous visit</article>');
    }
    if (url.pathname === '/css/blog-cards.css' && !url.search) {
      res.writeHead(200, { 'Content-Type': 'text/css', 'Cache-Control': 'public, max-age=600' });
      return res.end(staleCss);
    }
    if (url.pathname.startsWith('/data/') && url.pathname.slice(6) in data) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(data[url.pathname.slice(6)]));
    }
    serve(req, res);
  });
  const origin = await listen(server);
  try {
    await page.addInitScript(() => localStorage.setItem('calendlyPermanentlyClosed', 'true'));
    await installPlatform(page, { native: 'defer' });
    await page.goto(origin + '/cache-warmup');
    await expect(page.locator('article')).toHaveCSS('display', 'flex');
    expect(requests.filter(url => url === '/css/blog-cards.css')).toHaveLength(1);
    await page.goto(origin + '/#blog');
    await expectSection(page, 'blog');
    await expect(page.locator('.preloader')).toHaveCount(0);
    await expect(page.locator('#blog-loading')).toBeHidden();
    await page.evaluate(() => document.fonts.ready);
    const c = controls(page, 'A'), p = feedback(page, c);
    await expect(c.card).toBeVisible();
    await expect(c.card, 'A fresh HTML document must not reuse the incompatible cached card layout').toHaveCSS('display', 'grid');
    expect(requests.filter(url => url === '/css/blog-cards.css'), 'The old unversioned response remains cached; it was not merely reloaded').toHaveLength(1);
    expect(requests.some(url => url.startsWith('/css/blog-cards.css?')), 'Current styles use a distinct resource URL').toBe(true);
    const geometry = () => c.card.evaluate(card => {
      const rect = el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, top: r.top - card.getBoundingClientRect().top }; };
      const trigger = card.querySelector('.blog-share-trigger'), icon = trigger.querySelector('svg');
      return { card: rect(card), trigger: rect(trigger), icon: rect(icon), read: rect(card.querySelector('.blog-article-read')),
        fill: getComputedStyle(icon).fill, stroke: getComputedStyle(icon).stroke };
    });
    const before = await geometry();
    expect(before.trigger.height).toBe(44);
    expect(before.trigger.width).toBeGreaterThanOrEqual(44);
    expect(before.trigger.width).toBeLessThan(before.card.width / 2);
    expect(before.icon.width).toBe(14); expect(before.icon.height).toBe(14);
    expect(before.fill).toBe('none'); expect(before.stroke).not.toBe('none');
    const source = await c.trigger.locator('svg path').getAttribute('d');
    await c.trigger.click();
    await nativeProgressInline(p);
    expect(await geometry(), 'Pending feedback never changes card or action geometry').toEqual(before);
    await settle(page, 'native', 'AbortError');
    await expect(p.status).toHaveText(c.text.NATIVE_ABORT);
    await noDuplicateActions(p);
    await expect(c.trigger.locator('svg path')).toHaveAttribute('d', source);
    const after = await geometry();
    expect(after.trigger).toEqual(before.trigger); expect(after.icon).toEqual(before.icon); expect(after.read).toEqual(before.read);
    const statusIcon = p.status.locator('svg');
    expect(await statusIcon.evaluate(el => ({ width: el.getBoundingClientRect().width, fill: getComputedStyle(el).fill }))).toEqual({ width: 16, fill: 'none' });
    await page.screenshot({ path: info.outputPath('returning-visitor-cancel.png') });
    const next = feedback(page, controls(page, 'B'));
    await next.trigger.click();
    await nativeProgressInline(next);
    expect(await calls(page, 'native'), 'Cancellation releases the lock for another card').toHaveLength(2);
    await settle(page, 'native', 'resolve', 1);
    await nativeSettledQuiet(next);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await info.attach('returning-visitor-layout', { body: JSON.stringify({ viewport: page.viewportSize(), before, after, requests }, null, 2), contentType: 'application/json' });
  } finally { await close(server); }
});
