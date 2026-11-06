import { test, expect, navigateToSection, expectSection } from './fixtures.mjs';
import { adFixture, slot, calls, requested, respond, geometry, enterAdPage, layoutShifts } from './helpers/adsense.mjs';
import { measureContrast } from './helpers/visual-metrics.mjs';
import { articles, mockCatalog, starred } from './data/catalog.mjs';

test('R-AD-EMPTY-01 | A provider-hidden empty iframe never becomes a filled creative or visible empty message', async ({ page }) => {
  await adFixture(page); await enterAdPage(page, 'blog'); await requested(page, 'blog');
  await respond(page, 'blog', null, 600);
  const wrapper = slot(page, 'blog'), frame = wrapper.locator('iframe');
  await frame.evaluate(el => {
    el.srcdoc = '<!doctype html><html><body>empty</body></html>';
    el.style.display = 'none';
  });
  await expect(frame).toBeHidden();
  await expect(wrapper).not.toHaveClass(/is-filled/);
  await expect(wrapper.getByText('Advertisements', { exact: true })).toBeHidden();
  await respond(page, 'blog', 'unfilled', 600);
  await expect.poll(async () => (await geometry(wrapper)).height).toBe(0);
  await expect(frame).toBeHidden();
  await expect(wrapper).not.toHaveClass(/is-filled/);
});

for (const section of ['projects', 'blog']) {
  test(`R-AD-SCROLL-01 | ${section}: fluid SDK ancestor auto sizing preserves the bounded panel, native scroll input and natural creative height`, async ({ page }, info) => {
    await adFixture(page, { synchronous: 'filled', starredCount: 61, fluidAncestorSizing: true });
    await mockCatalog(page, { 'github-starred.json': starred(61), ...Object.fromEntries(['systems', 'test', 'software'].map(category => [
      `medium-${category}.json`, Array.from({ length: 18 }, (_, index) => ({ ...articles[category][index % 2],
        title: `${category} scrolling article ${index}`, url: `https://medium.com/@fixture/scroll-${category}-${index}` }))
    ])) });
    await enterAdPage(page, section); await requested(page, section);
    const current = page.locator(`.pt-page[data-id="${section}"]`);
    const shell = current.locator(':scope > .section-inner');
    const panel = current.locator('.page-content-panel');
    const controls = current.locator('.page-controls-panel');
    const fixed = await controls.boundingBox();
    for (const state of ['filled', 'unfilled', 'unfill-optimized']) {
      await respond(page, section, state, 600);
      expect(await shell.evaluate(el => [el.style.height, el.style.getPropertyPriority('height')])).toEqual(['auto', 'important']);
      const sizes = await panel.evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight,
        shellHeight: el.parentElement.clientHeight, pageHeight: el.closest('.pt-page').clientHeight }));
      expect(sizes.shellHeight).toBeLessThanOrEqual(sizes.pageHeight + 1);
      expect(sizes.content).toBeGreaterThan(sizes.height + 100);
      await panel.press('Home');
      const box = await panel.boundingBox(), x = Math.round(box.x + box.width * .6), y = Math.round(box.y + box.height * .8);
      if (info.project.use.browserName === 'chromium' && info.project.use.hasTouch) {
        const input = await page.context().newCDPSession(page);
        try {
          await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
          for (let step = 1; step <= 10; step++) {
            await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - Math.min(350, box.height * .6) * step / 10 }] });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } finally { await input.detach(); }
      } else if (info.project.use.browserName === 'webkit' && info.project.use.hasTouch) {
        // Playwright does not support mouse.wheel in mobile WebKit. Exercise
        // native keyboard paging there; Chromium touch above covers gestures.
        await panel.press('PageDown');
      } else {
        await page.mouse.move(x, y); await page.mouse.wheel(0, 420);
      }
      await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
      expect(await controls.boundingBox()).toEqual(fixed);
      expect(await current.evaluate(el => [el.scrollTop, document.scrollingElement.scrollTop])).toEqual([0, 0]);
      await panel.press('End');
      await expect.poll(() => panel.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThanOrEqual(1);
      if (state !== 'unfilled') await expect(slot(page, section).locator('iframe')).toHaveCSS('height', '600px');
    }
  });
}

for (const section of ['projects', 'blog']) {
  test(`R-AD-03 | AC-01/02/03 | ${section}: an iframe plus unfilled leaves no ad shell or own spacing`, async ({ page }, info) => {
    await adFixture(page); await enterAdPage(page, section); await requested(page, section);
    const wrapper = slot(page, section);
    await respond(page, section, null);
    await expect(wrapper.locator('iframe')).toHaveCount(1);
    await wrapper.scrollIntoViewIfNeeded();
    const before = await geometry(wrapper);
    await page.screenshot({ path: info.outputPath('before-no-fill.png') });
    await respond(page, section, 'unfilled');
    await expect.poll(async () => (await geometry(wrapper)).height).toBe(0);
    await expect(wrapper).not.toHaveClass(/is-filled/);
    const after = await geometry(wrapper);
    expect(after.marginTop).toBe('0px'); expect(after.marginBottom).toBe('0px');
    expect(after.paddingTop).toBe('0px'); expect(after.paddingBottom).toBe('0px');
    await expect(wrapper.getByText('Advertisements', { exact: true })).toBeHidden();
    await info.attach('no-fill-geometry', { body: JSON.stringify({ before, after, layoutShifts: await layoutShifts(page) }, null, 2), contentType: 'application/json' });
    await page.screenshot({ path: info.outputPath('after-no-fill.png') });
  });

  for (const state of ['filled', 'unfill-optimized', 'unknown']) {
    test(`AC-01/04/09/10 | ${section}: synchronous ${state} preserves provider content without guessing no-fill`, async ({ page }) => {
      await page.clock.install();
      await adFixture(page, { synchronous: state }); await enterAdPage(page, section); await requested(page, section);
      const wrapper = slot(page, section), frame = wrapper.locator('iframe');
      await expect(frame).toHaveCount(1);
      await page.clock.fastForward(30000);
      await expect(frame).toBeVisible();
      await expect(frame).toHaveCSS('height', '600px');
      expect((await frame.boundingBox()).height).toBeCloseTo(600, 3);
      await expect(wrapper).not.toHaveClass(/is-collapsed/);
      if (state === 'filled') {
        await expect(wrapper).toHaveClass(/is-filled/);
        await expect(page.getByRole('complementary', { name: 'Advertisements', exact: true })).toHaveCount(1);
        const label = wrapper.getByText('Advertisements', { exact: true });
        await expect(label).toBeVisible(); expect((await label.evaluate(measureContrast)).text).toBeGreaterThanOrEqual(4.5);
      } else await expect(wrapper).not.toHaveClass(/is-filled/);
      expect(await calls(page)).toEqual([section]);
    });
  }
}

test('R-AD-01 | AC-05/06 | Width and ancestor eligibility settle before one request, even after repeated lifecycle/resize events', async ({ page }) => {
  await page.clock.install(); await adFixture(page, { widthBlocked: true }); await enterAdPage(page, 'projects');
  const current = page.locator('section[data-id="projects"]');
  for (let index = 0; index < 3; index++) await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    document.dispatchEvent(new CustomEvent('portfolio:page-settled', { detail: { page: document.querySelector('.pt-page-current') } }));
  });
  await page.clock.fastForward(2000); expect(await calls(page)).toEqual([]);
  await current.evaluate(el => { el.inert = true; document.getElementById('fixture-zero-width').remove(); });
  await page.clock.fastForward(2000); expect(await calls(page)).toEqual([]);
  await current.evaluate(el => { el.inert = false; document.dispatchEvent(new CustomEvent('portfolio:page-settled', { detail: { page: el } })); });
  await requested(page, 'projects'); expect(await calls(page)).toEqual(['projects']);
});

test('AC-06/07 | The global SDK queue targets only the active page; revisits, filters, themes and history preserve filled nodes', async ({ page }) => {
  await adFixture(page, { synchronous: 'filled' }); await enterAdPage(page, 'blog'); await requested(page, 'blog');
  expect(await calls(page)).toEqual(['blog']);
  const first = await slot(page, 'blog').locator('ins').elementHandle();
  await navigateToSection(page, 'projects'); await requested(page, 'projects');
  expect(await calls(page)).toEqual(['blog', 'projects']);
  await navigateToSection(page, 'blog');
  await page.locator('#blog-lang-toggle button').filter({ hasText: 'TR' }).click();
  await page.getByRole('button', { name: /Switch to (dark|light) mode/ }).first().click();
  await page.goBack(); await expectSection(page, 'projects');
  await page.goForward(); await expectSection(page, 'blog');
  expect(await calls(page)).toEqual(['blog', 'projects']);
  expect(await first.evaluate(node => node === document.querySelector('.ad-slot-blog ins'))).toBe(true);
  await first.dispose();
});

for (const motion of ['reduce', 'no-preference']) {
  test(`AC-06 | ${motion}: a transition from About Me requests only the settled eligible page`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await adFixture(page, { synchronous: 'filled' }); await page.goto('/#about-me');
    await expectSection(page, 'about-me'); await expect(page.locator('.preloader')).toHaveCount(0);
    expect(await calls(page)).toEqual([]);
    await navigateToSection(page, 'blog'); await requested(page, 'blog');
    expect(await calls(page)).toEqual(['blog']);
  });
}

test('AC-09/10 | Provider optimization after no-fill preserves the same unit without requesting it again', async ({ page }) => {
  await adFixture(page, { synchronous: 'unfilled' }); await enterAdPage(page, 'projects'); await requested(page, 'projects');
  const wrapper = slot(page, 'projects'), original = await wrapper.locator('ins').elementHandle();
  await expect.poll(async () => (await geometry(wrapper)).height).toBe(0);
  await respond(page, 'projects', 'unfill-optimized', 600);
  await expect(wrapper.locator('iframe')).toBeVisible();
  expect(await original.evaluate(node => node === document.querySelector('.ad-slot-projects ins'))).toBe(true);
  expect(await calls(page)).toEqual(['projects']); await original.dispose();
});

test('R-AD-03 | AC-08/14 | A blocked SDK leaves no empty shell while catalog, filters and navigation remain usable', async ({ page }) => {
  await adFixture(page, { script: 'blocked' }); await enterAdPage(page, 'projects');
  expect(await calls(page)).toEqual([]);
  const wrapper = slot(page, 'projects');
  await expect.poll(async () => (await geometry(wrapper)).height).toBe(0);
  expect((await geometry(wrapper)).marginTop).toBe('0px');
  await navigateToSection(page, 'blog');
  await expect(page.locator('.blog-share-trigger').first()).toBeVisible();
  await page.locator('#blog-lang-toggle button').filter({ hasText: 'TR' }).click();
  await expect(page.locator('.blog-article-card')).not.toHaveCount(0);
});

test('AC-09 | An SDK arriving after the old ten-second boot deadline still serves the eligible page', async ({ page }) => {
  await page.clock.install(); const sdk = await adFixture(page, { script: 'late', synchronous: 'filled' });
  await page.goto('/#blog', { waitUntil: 'domcontentloaded' });
  await page.clock.fastForward(15000); expect(await calls(page)).toEqual([]);
  sdk.release(); await page.waitForLoadState('load'); await expectSection(page, 'blog');
  await requested(page, 'blog'); await expect(slot(page, 'blog')).toHaveClass(/is-filled/);
  expect(await calls(page)).toEqual(['blog']);
});

for (const section of ['projects', 'blog']) {
  test(`R-AD-01 | AC-05/13 | ${section}: the request waits for the page's own content, then spends exactly one request below it`, async ({ page }) => {
    await adFixture(page, { synchronous: 'filled' });
    let release; const held = new Promise(resolve => { release = resolve; });
    // Registered after the fixture's catalog routes, so it runs first and defers to them once released.
    await page.route('**/data/*.json', async route => { await held; await route.fallback(); });
    await page.goto('/#' + section, { waitUntil: 'load' });
    await expectSection(page, section);
    const loading = page.locator(section === 'blog' ? '#blog-loading' : '#proj-loading');
    await expect(loading).toBeVisible();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // SDK is ready and the unit is otherwise eligible (current, settled, visible, wide enough): only content is pending.
    expect(await calls(page)).toEqual([]);
    await expect(slot(page, section).locator('ins.adsbygoogle')).toHaveCount(0);
    release();
    await requested(page, section);
    await expect(loading).toBeHidden();
    const cards = page.locator(section === 'blog' ? '.blog-article-card' : '#proj-grid .proj-card');
    await expect(cards).not.toHaveCount(0);
    const [cardBox, adBox] = await Promise.all([cards.last().boundingBox(), slot(page, section).boundingBox()]);
    expect(adBox.y).toBeGreaterThanOrEqual(cardBox.y + cardBox.height - 1);
    expect(await calls(page)).toEqual([section]);
  });
}

test('AC-11 | Removing a waiting unit releases its observers and never triggers a later request', async ({ page }) => {
  await page.clock.install(); await adFixture(page, { widthBlocked: true }); await enterAdPage(page, 'projects');
  await slot(page, 'projects').evaluate(el => { window.__removedAd = el; el.remove(); });
  await page.evaluate(() => { document.getElementById('fixture-zero-width').remove(); window.dispatchEvent(new Event('resize')); });
  await page.clock.fastForward(60000);
  expect(await calls(page)).toEqual([]);
  expect(await page.evaluate(() => window.__adFixture.resources.filter(item => item.active && (item.target === window.__removedAd || window.__removedAd.contains(item.target))).length)).toBe(0);
});

test('AC-11 | An SDK exception after starting a unit is not retried or converted into a second request', async ({ page }) => {
  await page.clock.install(); await adFixture(page, { widthBlocked: true }); await enterAdPage(page, 'projects');
  await page.evaluate(() => { window.__adFixture.mode = 'throw-after'; document.getElementById('fixture-zero-width').remove(); window.dispatchEvent(new Event('resize')); });
  await requested(page, 'projects'); await page.clock.fastForward(30000);
  expect(await calls(page)).toEqual(['projects']);
  await respond(page, 'projects', 'filled'); await expect(slot(page, 'projects')).toHaveClass(/is-filled/);
});

test('AC-11 | An SDK exception without a processing marker is not blindly retried', async ({ page }) => {
  await page.clock.install(); await adFixture(page, { widthBlocked: true }); await enterAdPage(page, 'projects');
  await page.evaluate(() => { window.__adFixture.mode = 'throw-before'; document.getElementById('fixture-zero-width').remove(); window.dispatchEvent(new Event('resize')); });
  await requested(page, 'projects'); await page.clock.fastForward(30000);
  expect(await calls(page)).toEqual(['projects']);
});

test('AC-05/07/11 | Reattaching the same rejected unit never spends a second request after cleanup', async ({ page }) => {
  await adFixture(page, { widthBlocked: true }); await enterAdPage(page, 'projects');
  await page.evaluate(() => { window.__adFixture.mode = 'throw-before'; document.getElementById('fixture-zero-width').remove(); });
  await requested(page, 'projects'); await expect(slot(page, 'projects')).toHaveClass(/is-collapsed/);
  await slot(page, 'projects').evaluate(el => { window.__removedAd = el; window.__adParent = el.parentElement; window.__adNext = el.nextSibling; el.remove(); });
  await expect.poll(() => page.evaluate(() => window.__adFixture.resources.filter(item => item.active && (item.target === window.__removedAd || item.target === window.__adFixture.calls[0].node || window.__removedAd.contains(item.target))).length)).toBe(0);
  await page.evaluate(() => window.__adParent.insertBefore(window.__removedAd, window.__adNext));
  await expect(slot(page, 'projects')).toHaveAttribute('data-ad-state', 'unavailable');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await calls(page)).toEqual(['projects']);
});

test('AC-06/07/11 | A rejected unit cannot block another page; late provider acceptance restores its original node', async ({ page }) => {
  await adFixture(page, { widthBlocked: true }); await enterAdPage(page, 'projects');
  await page.evaluate(() => { window.__adFixture.mode = 'throw-before'; document.getElementById('fixture-zero-width').remove(); });
  await requested(page, 'projects'); await expect(slot(page, 'projects')).toHaveClass(/is-collapsed/);
  await page.evaluate(() => { window.__adFixture.mode = 'normal'; });
  await navigateToSection(page, 'blog'); await requested(page, 'blog');
  expect(await calls(page)).toEqual(['projects', 'blog']);
  await page.evaluate(() => window.__adFixture.calls[0].node.setAttribute('data-adsbygoogle-status', 'done'));
  await respond(page, 'projects', 'filled');
  await navigateToSection(page, 'projects');
  await expect(slot(page, 'projects').locator('iframe')).toBeVisible();
  expect(await slot(page, 'projects').locator('ins').evaluate(el => el === window.__adFixture.calls[0].node)).toBe(true);
  expect(await calls(page)).toEqual(['projects', 'blog']);
});

test('AC-02/12 | A no-fill response above the reader preserves the Starred reading anchor in the content panel', async ({ page }, info) => {
  await adFixture(page); await enterAdPage(page, 'projects'); await requested(page, 'projects');
  await respond(page, 'projects', null, 600);
  const anchor = page.locator('#proj-starred-grid .proj-card').first();
  await anchor.scrollIntoViewIfNeeded();
  const top = () => anchor.evaluate(el => el.getBoundingClientRect().top - el.closest('.page-content-panel').getBoundingClientRect().top);
  const before = await top();
  await respond(page, 'projects', 'unfilled');
  await expect.poll(async () => (await geometry(slot(page, 'projects'))).height).toBe(0);
  await expect.poll(async () => Math.abs(await top() - before)).toBeLessThanOrEqual(1);
  await info.attach('reading-anchor', { body: JSON.stringify({ before, after: await top() }), contentType: 'application/json' });
});

test('AC-04/12 | Filled, no-fill and 200% text sizing preserve content at all specified widths', async ({ page }, info) => {
  await adFixture(page); await enterAdPage(page, 'projects'); await requested(page, 'projects');
  const metrics = [];
  for (const width of [320, 390, 768, 1440, 1785]) {
    await page.setViewportSize({ width, height: 930 });
    await enterAdPage(page, 'projects'); await requested(page, 'projects');
    await respond(page, 'projects', 'filled', 300);
    const frame = slot(page, 'projects').locator('iframe');
    await expect(frame).toBeVisible(); expect((await frame.boundingBox()).height).toBe(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await respond(page, 'projects', 'unfilled');
    await expect.poll(async () => (await geometry(slot(page, 'projects'))).height).toBe(0);
    metrics.push({ width, collapsed: await geometry(slot(page, 'projects')) });
  }
  await page.setViewportSize({ width: 320, height: 930 });
  await enterAdPage(page, 'projects'); await requested(page, 'projects');
  // A text-resize probe, not a claim of real browser/OS zoom verification.
  await page.addStyleTag({ content: '.js-adsense .ad-label { font-size:26px !important }' });
  await respond(page, 'projects', 'filled', 300);
  await expect(slot(page, 'projects').getByText('Advertisements', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await info.attach('responsive-ad-geometry', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
});
