import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';
import { inventory } from '../../scripts/lib/public-files.mjs';
import { test, expect, isolateThirdParties } from './fixtures.mjs';
import { article, facts, controls, openBlog, openPanel, openedPanel,
  calls, settle, setPlatformMode, tabTo, visibleFocus, preservedFocus,
  copyAcrossCards, reopenPending, lateResult, fallbackFocus, cleanProbe, feedback, startNative, noDuplicateActions,
  nativeSettledQuiet, nativeProgressInline, shareProgressSnapshot, restoredShareIcon } from './helpers/blog-sharing.mjs';

const quote = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
test.afterEach(async ({ page }) => cleanProbe(page));

// Use real Chromium's headless mode for native new-tab gestures. Headless Shell
// on Windows loses middle-click navigation at card text, including pristine main.
// https://playwright.dev/docs/browsers#chromium-new-headless-mode
test.use({ channel: 'chromium' });
test('R-BLOG-SHARE-01 | B01 | Given article cards, when Share is used, then reading remains a separate native link', async ({ page, context }) => {
  await openBlog(page, { platform: { native: 'absent' } });
  const a = controls(page, 'A');
  for (const key of ['B', 'U']) {
    const other = controls(page, key);
    await expect(other.trigger).toHaveAccessibleName(new RegExp(quote(other.text.SHARE)));
    await expect(other.trigger).toHaveAccessibleName(new RegExp(quote(other.data.title)));
    expect(await other.trigger.evaluate(el => el.closest('a') === null && el.tagName === 'BUTTON')).toBe(true);
    await expect(other.link.locator('button, a')).toHaveCount(0);
  }
  await expect(a.trigger).toHaveAccessibleName(new RegExp(quote(a.text.SHARE)));
  await expect(a.trigger).toHaveAccessibleName(new RegExp(quote(article('A').title)));
  expect(await a.trigger.evaluate(el => el.closest('a') === null && el.tagName === 'BUTTON')).toBe(true);
  await expect(a.link).toHaveCount(1);
  await expect(a.link.locator('button, a')).toHaveCount(0);
  await expect(a.link).toHaveAttribute('href', article('A').url);
  await expect(a.link).toHaveAttribute('target', '_blank');
  await expect(a.link).toHaveAttribute('rel', /noopener/);
  await expect(a.link).toHaveAttribute('rel', /noreferrer/);
  const url = page.url(), history = await page.evaluate(() => window.history.length);
  const pages = context.pages().length;
  await a.trigger.click();
  const panel = await openedPanel(page, a);
  await expect(panel.copy).toBeVisible();
  await a.trigger.click();
  await expect(a.trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(panel.panel).toBeHidden();
  expect(page.url()).toBe(url);
  expect(await page.evaluate(() => window.history.length)).toBe(history);
  expect(context.pages()).toHaveLength(pages);
  // Fulfil the real navigation locally; no request is sent to Medium.
  await context.route('https://medium.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Test article</title>' }));
  for (const input of [{}, { button: 'middle' }, { modifiers: ['ControlOrMeta'] }]) {
    const popupPromise = context.waitForEvent('page');
    await a.link.getByRole('heading', { name: article('A').title, exact: true }).click(input);
    const popup = await popupPromise;
    await expect(popup).toHaveURL(article('A').url);
    await popup.close();
  }
});

test('R-BLOG-SHARE-01/05 | B01.native | First Share activation goes directly to the system with no duplicate Copy/native choice', async ({ page, context }) => {
  await openBlog(page, { platform: { native: 'defer' } });
  const a = controls(page, 'A'), url = page.url(), history = await page.evaluate(() => window.history.length), pages = context.pages().length;
  await a.trigger.click();
  expect(await calls(page, 'native')).toEqual([{ payload: { title: a.data.title, url: a.data.url }, active: true }]);
  await noDuplicateActions(feedback(page, a));
  await nativeProgressInline(feedback(page, a));
  expect(page.url()).toBe(url); expect(await page.evaluate(() => window.history.length)).toBe(history);
  expect(context.pages()).toHaveLength(pages); expect(await calls(page, 'clipboard')).toEqual([]);
  await settle(page, 'native', 'resolve');
});

for (const key of ['A', 'B', 'U']) for (const path of ['native', 'copy']) {
  test(`R-BLOG-SHARE-02 | B02.${path}.${key} | The selected original literal URL reaches only the explicit platform path`, async ({ page }) => {
    await openBlog(page, { platform: path === 'copy' ? { native: 'absent' } : {} });
    if (path === 'copy') {
      const c = await openPanel(page, key); await c.copy.click();
      await expect(c.status).toHaveText(c.text.COPY_SUCCESS);
      expect(await calls(page, 'clipboard')).toEqual([{ payload: article(key).url, active: true }]);
      expect(await calls(page, 'native')).toEqual([]);
    } else {
      const c = await startNative(page, key);
      await nativeSettledQuiet(c);
      expect(await calls(page, 'native')).toEqual([{ payload: { title: article(key).title, url: article(key).url }, active: true }]);
      expect(await calls(page, 'clipboard')).toEqual([]);
    }
  });
}

test('R-BLOG-SHARE-03 | B03 | Given a pending copy, then repeats cannot report success or start another write and failure can recover', async ({ page }) => {
  await openBlog(page, { platform: { clipboard: 'defer', native: 'absent' } });
  const a = await openPanel(page, 'A');
  await a.copy.click();
  await expect(a.status).toHaveText(a.text.COPY_PENDING);
  await a.copy.press('Enter');
  await expect(a.status).toHaveText(a.text.COPY_BUSY);
  expect(await calls(page, 'clipboard')).toHaveLength(1);
  await settle(page, 'clipboard', 'NotAllowedError');
  await expect(a.status).toHaveText(a.text.COPY_MANUAL);
  await a.copy.press('Space');
  expect(await calls(page, 'clipboard')).toHaveLength(2);
  await expect(a.status).not.toHaveText(a.text.COPY_SUCCESS);
  const unchanged = await preservedFocus(page);
  await settle(page, 'clipboard', 'resolve', 1);
  await unchanged();
  await expect(a.status).toHaveText(a.text.COPY_SUCCESS);
});

for (const mode of ['absent', 'write-absent', 'reject', 'throw']) {
  test(`R-BLOG-SHARE-04 | B04.${mode} | Given unavailable clipboard, then a labelled manual URL appears without changing focus or selection`, async ({ page }) => {
    await fallbackFocus(page, mode, false);
  });
}

for (const [name, platform, available] of [
  ['no-share', { native: 'absent' }, false], ['canShare-false', { canShare: 'false' }, false],
  ['canShare-throws', { canShare: 'throw' }, false], ['insecure', { secure: false }, false],
  ['canShare-absent', { canShare: 'absent' }, true],
  ['unrecognised-UA', { userAgent: 'Unrecognised browser acceptance fixture' }, true]
]) {
  test(`R-BLOG-SHARE-05 | B05.${name} | Capabilities choose direct native or a single Copy fallback without UA guessing`, async ({ page }) => {
    await openBlog(page, { platform });
    if (available) {
      const b = await startNative(page, 'B'); await noDuplicateActions(b);
      expect(await calls(page, 'native')).toEqual([{ payload: { title: article('B').title, url: article('B').url }, active: true }]);
      expect(await calls(page, 'clipboard')).toEqual([]);
    } else {
      const b = await openPanel(page, 'B'); await expect(b.copy).toBeVisible();
      expect(await calls(page, 'native')).toEqual([]);
      await b.copy.click(); await expect(b.status).toHaveText(b.text.COPY_SUCCESS);
    }
  });
}

for (const outcome of ['AbortError', 'NotAllowedError', 'DataError']) {
  test(`R-BLOG-SHARE-06 | B06.${outcome} | Given a rejected native share, then feedback is honest, clipboard untouched and explicit retry works`, async ({ page }) => {
    await openBlog(page, { platform: { native: 'defer' } });
    const b = await startNative(page, 'B');
    await nativeProgressInline(b);
    const unchanged = await preservedFocus(page);
    await settle(page, 'native', outcome);
    await unchanged();
    await expect(b.status).toHaveText(b.text[outcome === 'AbortError' ? 'NATIVE_ABORT' : 'NATIVE_ERROR']);
    if (outcome === 'AbortError') {
      await noDuplicateActions(b);
      await expect(b.card.locator('.blog-share-feedback')).toHaveAttribute('data-state', 'info');
    } else await openedPanel(page, b);
    expect(await calls(page, 'clipboard')).toEqual([]);
    await b.trigger.click(); await noDuplicateActions(b);
    expect(await calls(page, 'native')).toHaveLength(2);
    await settle(page, 'native', 'resolve', 1);
    await nativeSettledQuiet(b);
  });
}

test('R-BLOG-SHARE-06 | B06.throw | Given a synchronous native exception, then the user can retry after the platform recovers', async ({ page }) => {
  await openBlog(page, { platform: { native: 'throw' } });
  const normal = await shareProgressSnapshot(feedback(page, 'A'));
  const a = await startNative(page, 'A');
  await expect(a.status).toHaveText(a.text.NATIVE_ERROR);
  await restoredShareIcon(a, normal);
  expect(await calls(page, 'clipboard')).toEqual([]);
  await setPlatformMode(page, 'native', 'resolve');
  await a.trigger.press('Enter');
  await nativeSettledQuiet(a);
  expect(await calls(page, 'native')).toHaveLength(2);
});

for (const outcome of ['resolve', 'NotAllowedError']) {
  test(`R-BLOG-SHARE-03/07/12 | B07.a.${outcome} | A pending → B Copy → A settles → only a new B activation writes B`, async ({ page }) => {
    await copyAcrossCards(page, outcome);
  });
}

test('R-BLOG-SHARE-07 | B07.native | A pending native share blocks a second call and never queues another card', async ({ page }) => {
  await openBlog(page, { platform: { native: 'defer' } });
  await startNative(page, 'A');
  const b = await startNative(page, 'B'); await noDuplicateActions(b);
  await nativeProgressInline(b, 'NATIVE_BUSY');
  expect(await calls(page, 'native')).toHaveLength(1);
  await settle(page, 'native', 'resolve');
  expect(await calls(page, 'native')).toHaveLength(1);
  await expect(b.status).toBeEmpty(); expect(await calls(page, 'clipboard')).toEqual([]);
  await b.trigger.click();
  expect((await calls(page, 'native'))[1].payload).toEqual({ title: article('B').title, url: article('B').url });
  await settle(page, 'native', 'resolve', 1);
});

test('R-BLOG-SHARE-07 | B07.independent | Native pending and another payload’s Copy fallback use independent locks and feedback', async ({ page }) => {
  await openBlog(page, { platform: { native: 'defer', canShareRejectUrls: [article('B').url] } });
  await startNative(page, 'A'); const b = await openPanel(page, 'B'); await b.copy.click();
  await expect(b.status).toHaveText(b.text.COPY_SUCCESS);
  expect(await calls(page, 'clipboard')).toEqual([{ payload: article('B').url, active: true }]);
  await settle(page, 'native', 'resolve'); await expect(b.status).toHaveText(b.text.COPY_SUCCESS);
  expect(await calls(page, 'native')).toHaveLength(1);
});

test('R-BLOG-SHARE-08 | B08 | Given an open disclosure, then Tab exit keeps it open and Escape or outside activation closes it with the prescribed focus', async ({ page }) => {
  await openBlog(page, { platform: { native: 'absent' } });
  const a = controls(page, 'A');
  await tabTo(page, a.trigger);
  await visibleFocus(a.trigger);
  await a.trigger.press('Space');
  const p = await openedPanel(page, a);
  await page.keyboard.press('Tab');
  await expect(p.copy).toBeFocused(); await visibleFocus(p.copy);
  await page.keyboard.press('Tab');
  expect(await p.panel.evaluate(el => el.contains(document.activeElement))).toBe(false);
  await expect(a.trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Shift+Tab');
  await expect(p.copy).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(a.trigger).toHaveAttribute('aria-expanded', 'false');
  await visibleFocus(a.trigger);
  await a.trigger.press('Enter');
  const outside = page.locator('#blog-filters [data-group="category_all"]');
  await tabTo(page, outside, true);
  await expect(a.trigger).toHaveAttribute('aria-expanded', 'true');
  await outside.press('Space');
  await expect(a.trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(outside).toBeFocused();
  await expect(p.panel).toBeHidden();
});

for (const width of [null, 768]) {
  test(`R-BLOG-SHARE-09 | B09.${width || 'profile'} | Given long TR content and the final card, then closed/open/manual actions fit the viewport and introduce no accessibility findings`, async ({ page }, info) => {
    if (width) await page.setViewportSize({ width, height: 900 });
    const long = { ...article('A'), title: 'Uzun Türkçe başlık ve güvenilir paylaşım '.repeat(10).trim(),
      url: 'https://medium.com/@fixture/long?value=' + 'x'.repeat(400) + '#özet', date: '2020-01-01T00:00:00Z' };
    await openBlog(page, { platform: { clipboard: 'reject', native: 'absent' }, categories: { systems: [article('A'), long], test: [article('B')], software: [article('U')] } });
    const c = controls(page, long);
    await c.trigger.scrollIntoViewIfNeeded();
    const size = await c.trigger.boundingBox();
    expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44);
    const p = await openPanel(page, long);
    await p.copy.click();
    await expect(p.manual).toHaveValue(long.url);
    for (const target of [p.copy, p.manual]) {
      await target.scrollIntoViewIfNeeded();
      await page.keyboard.press('Tab');
      await tabTo(page, target, true);
      await visibleFocus(target);
      await expect(target).toBeInViewport({ ratio: 1 });
      const box = await target.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const boxes = await p.panel.locator('button, input, textarea').evaluateAll(elements => elements.filter(el => el.checkVisibility()).map(el => {
      const box = el.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    }));
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const overlap = Math.min(boxes[i].right, boxes[j].right) > Math.max(boxes[i].left, boxes[j].left) &&
        Math.min(boxes[i].bottom, boxes[j].bottom) > Math.max(boxes[i].top, boxes[j].top);
      expect(overlap, 'New interaction targets must not overlap').toBe(false);
    }
    const layout = await page.evaluate(() => {
      const panel = document.getElementById('blog-content');
      const outer = panel.closest('.pt-page');
      return { overflow: document.documentElement.scrollWidth - innerWidth,
        owner: getComputedStyle(panel).overflowY, outer: getComputedStyle(outer).overflowY,
        rootScroll: document.scrollingElement.scrollTop };
    });
    expect(layout.overflow).toBeLessThanOrEqual(1);
    expect(layout).toMatchObject({ owner: 'auto', outer: 'hidden', rootScroll: 0 });
    const id = await p.panel.getAttribute('id');
    const audit = await new AxeBuilder({ page }).include(`[id=${JSON.stringify(id)}]`).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(audit.violations).toEqual([]);
    await info.attach('blog-sharing-open-manual', { body: await page.screenshot(), contentType: 'image/png' });
    await c.trigger.click();
    await expect(p.panel).toBeHidden();
  });
}

test('R-BLOG-SHARE-10 | B10.scroll | Given long content, then opening and closing Share retains route/history and does not reset the content panel', async ({ page }) => {
  const many = Array.from({ length: 18 }, (_, i) => ({ ...article('A'), title: `Article ${i}`, date: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    url: `https://medium.com/@fixture/scroll-${i}`, excerpt: 'Long readable content. '.repeat(15) }));
  await openBlog(page, { platform: { native: 'absent' }, categories: { systems: many, test: [], software: [] } });
  const target = controls(page, many[8]);
  await target.trigger.scrollIntoViewIfNeeded();
  const content = page.locator('#blog-content'), heading = page.locator('.pt-page[data-id="blog"] .page-controls-panel');
  const before = await heading.boundingBox(), url = page.url(), history = await page.evaluate(() => window.history.length);
  expect(await content.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
  const p = await openPanel(page, many[8]);
  expect(await content.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
  expect(await heading.boundingBox()).toEqual(before);
  await target.trigger.click();
  await expect(p.panel).toBeHidden();
  expect(await content.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
  expect(page.url()).toBe(url); expect(await page.evaluate(() => window.history.length)).toBe(history);
});

for (const state of ['empty', 'partial-error']) {
  test(`R-BLOG-SHARE-10 | B10.${state} | Given unavailable catalog entries, then Share exists only on available cards and does not replace existing empty/error behavior`, async ({ page }) => {
    await openBlog(page, { platform: { native: 'absent' }, categories: state === 'empty' ? { systems: [], test: [], software: [] } :
      { systems: [article('A')], test: 'malformed-json', software: [] } });
    if (state === 'empty') {
      await expect(page.locator('#blog-empty')).toBeVisible();
      await expect(page.locator('#blog-grid .blog-share-trigger')).toHaveCount(0);
    } else {
      const a = await openPanel(page, 'A'); await a.copy.click();
      await expect(a.status).toHaveText(a.text.COPY_SUCCESS);
      await page.locator('#blog-filters [data-group="category_testing"]').click();
      await expect(page.locator('#blog-empty')).toBeVisible();
      await page.locator('#blog-filters [data-group="category_all"]').click();
      await expect(controls(page, 'A').card).toHaveCount(1);
      await expect(controls(page, 'A').trigger).toHaveAttribute('aria-expanded', 'false');
    }
  });
}

for (const key of ['A', 'B']) {
  test(`R-BLOG-SHARE-11 | B11.${key} | Given a resolved card language, then copy/manual and native feedback use its exact approved labels`, async ({ page }) => {
    await openBlog(page, { platform: { clipboard: 'reject', native: 'AbortError' } });
    const c = await startNative(page, key);
    await expect(c.status).toHaveText(c.text.NATIVE_ABORT); await noDuplicateActions(c);
    await setPlatformMode(page, 'native', 'NotAllowedError'); await c.trigger.click();
    await openedPanel(page, c);
    await c.copy.click();
    await expect(c.status).toHaveText(c.text.COPY_MANUAL);
    await expect(c.manual).toHaveValue(c.data.url);
    expect(await calls(page, 'clipboard')).toHaveLength(1);
  });
}

test('R-BLOG-SHARE-11 | B11.invalid | Given hostile text and invalid URLs, then markup never executes and invalid cards cannot share', async ({ page }) => {
  const hostile = { ...article('A'), title: facts.hostileTitle };
  const invalid = facts.invalidUrls.map((url, i) => ({ ...article('B'), title: `Invalid URL ${i}`, url }));
  const dialogs = []; page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  await openBlog(page, { categories: { systems: [hostile], test: invalid, software: [] } });
  await expect(controls(page, hostile).card.getByRole('heading')).toHaveText(facts.hostileTitle);
  await expect(controls(page, hostile).card.locator('img[src="x"]')).toHaveCount(0);
  for (const data of invalid) await expect(controls(page, data).trigger).toHaveCount(0);
  expect(await calls(page, 'clipboard')).toEqual([]); expect(await calls(page, 'native')).toEqual([]);
  const p = await startNative(page, hostile);
  await expect(p.card.locator('img[src="x"], script')).toHaveCount(0);
  await nativeSettledQuiet(p);
  expect((await calls(page, 'native'))[0].payload).toEqual({ title: facts.hostileTitle, url: article('A').url });
  await setPlatformMode(page, 'native', 'NotAllowedError'); await p.trigger.click();
  const fallback = await openedPanel(page, p); await fallback.copy.click();
  await expect(fallback.status).toHaveText(fallback.text.COPY_SUCCESS);
  expect(dialogs).toEqual([]);
});

for (const kind of ['clipboard', 'native']) {
  for (const outcome of ['resolve', kind === 'clipboard' ? 'NotAllowedError' : 'AbortError']) {
    test(`R-BLOG-SHARE-12 | B12.b.${kind}.${outcome} | Same DOM and URL reopen as a new interaction session`, async ({ page }) => {
      await reopenPending(page, kind, outcome);
    });
    for (const change of ['filter', 'route']) {
      test(`R-BLOG-SHARE-12 | B12.a.${change}.${kind}.${outcome} | Old async results cannot affect the new card occupying its index`, async ({ page }) => {
        await lateResult(page, kind, outcome, change);
      });
    }
  }
}

for (const prior of ['resolve', 'reject']) {
  test(`R-BLOG-SHARE-12 | B12.clean.${prior} | Given a previous completed result, then reopening starts without stale messages or manual fallback`, async ({ page }) => {
    await openBlog(page, { platform: { clipboard: prior, native: 'absent' } });
    const first = await openPanel(page, 'A');
    await first.copy.click();
    await expect(first.status).toHaveText(first.text[prior === 'resolve' ? 'COPY_SUCCESS' : 'COPY_MANUAL']);
    await first.trigger.click();
    const fresh = await openPanel(page, 'A');
    await expect(fresh.status).toBeEmpty(); await expect(fresh.manual).toBeHidden();
  });
}

for (const kind of ['clipboard', 'native']) test(`R-BLOG-SHARE-12 | B12.listeners.${kind} | Repeated renders retain exactly one API invocation per explicit action`, async ({ page }) => {
  await openBlog(page, { platform: kind === 'clipboard' ? { native: 'absent' } : {} });
  for (let n = 0; n < 4; n++) {
    await page.locator('#blog-filters [data-group="category_system_engineering"]').click();
    await page.locator('#blog-filters [data-group="category_testing"]').click();
  }
  const b = kind === 'clipboard' ? await openPanel(page, 'B') : await startNative(page, 'B');
  if (kind === 'clipboard') await b.copy.click();
  if (kind === 'clipboard') await expect(b.status).toHaveText(b.text.COPY_SUCCESS);
  else await nativeSettledQuiet(b);
  expect(await calls(page, kind)).toEqual([{ payload: kind === 'clipboard' ? article('B').url : { title: article('B').title, url: article('B').url }, active: true }]);
});

test('R-BLOG-SHARE-13 | B13 | Given JavaScript disabled, then existing static article links remain usable and no dead Share action is shown', async ({ browser, siteOrigin }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: info.project.use.viewport, colorScheme: info.project.use.colorScheme });
  await isolateThirdParties(context, siteOrigin);
  try {
    const page = await context.newPage(); await page.goto(siteOrigin + '/#blog');
    const blog = page.locator('.pt-page[data-id="blog"]');
    const links = blog.locator('noscript li a[href]');
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
      const destination = new URL(await link.getAttribute('href'));
      expect(destination.protocol).toBe('https:');
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link).toHaveAttribute('rel', /noreferrer/);
    }
    await expect(blog.getByRole('button', { name: /Paylaş|Share/ })).toHaveCount(0);
  } finally { await context.close(); }
});

test('R-BLOG-SHARE-14 | B14 | Given initial catalog loading and sharing, then no per-article query or new third-party request is sent', async ({ page }) => {
  const requests = []; page.on('request', request => requests.push(request.url()));
  await openBlog(page, { platform: { canShareRejectUrls: [article('B').url] } });
  const origin = new URL(page.url()).origin;
  for (const request of requests.filter(url => new URL(url).origin !== origin)) expect(facts.existingExternalResources).toContain(request);
  for (const key of ['A', 'B', 'U']) expect(requests).not.toContain(article(key).url);
  for (const category of ['systems', 'test', 'software']) expect(requests.filter(url => new URL(url).pathname === `/data/medium-${category}.json`)).toHaveLength(1);
  const before = [...requests];
  const a = await startNative(page, 'A'); await nativeSettledQuiet(a);
  const b = await openPanel(page, 'B'); await b.copy.click();
  await expect(b.status).toHaveText(b.text.COPY_SUCCESS);
  // R-14 forbids per-article/API/third-party queries, not a legitimate static
  // first-party asset loaded once on demand. Do not prescribe eager loading.
  const publicPaths = await inventory(process.env.PORTFOLIO_TEST_ROOT ? resolve(process.env.PORTFOLIO_TEST_ROOT) : undefined);
  const extra = requests.slice(before.length).map(url => new URL(url));
  for (const resource of extra) {
    expect(resource.origin).toBe(origin);
    expect(resource.search).toBe('');
    expect(resource.pathname).toMatch(/^\/(?:js|css|fonts|images)\//);
    expect(publicPaths).toContain(resource.pathname.slice(1));
  }
  expect(new Set(extra.map(url => url.href)).size, 'A static sharing asset must not be fetched once per card').toBe(extra.length);
});
