import { test, expect, expectSection, navigateToSection } from './fixtures.mjs';
import { articles, mockCatalog, repo, starred } from './data/catalog.mjs';

const panel = (page, id) => page.getByRole('region', { name: `${id[0].toUpperCase() + id.slice(1)} content`, exact: true });
const controls = (page, id) => page.locator(`.panel-page[data-id="${id}"] .page-controls-panel`);
const longArticles = category => Array.from({ length: 24 }, (_, i) => ({ ...articles[category][i % 2], title: `${category} article ${i}`, url: `https://medium.com/@fixture/${category}-${i}` }));
const longCatalog = {
  'medium-systems.json': longArticles('systems'), 'medium-test.json': longArticles('test'), 'medium-software.json': longArticles('software'),
  'github-repos.json': Array.from({ length: 40 }, (_, i) => repo(`repository-${i}`, ['systems', 'test', 'software'][i % 3], i < 3)),
  'github-starred.json': starred(25)
};
async function open(page, id = 'resume', overrides = {}) {
  await mockCatalog(page, { ...longCatalog, ...overrides });
  await page.goto(`/#${id}`);
  await expectSection(page, id);
  await expect(page.locator('.preloader')).toHaveCount(0);
  if (id === 'blog') await expect(page.locator('#blog-grid .blog-article-card')).toHaveCount(72);
  if (id === 'projects') await expect(page.locator('#proj-pinned .proj-card, #proj-grid .proj-card')).toHaveCount(40);
}
async function wheel(page, area, touch, minimum = 100) {
  const box = await area.boundingBox();
  const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height * 0.8);
  if (touch) {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      const distance = Math.min(420, box.height * 0.6);
      for (let step = 1; step <= 12; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - distance * step / 12 }] });
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    finally { await session.detach(); }
  } else { await page.mouse.move(x, y); await page.mouse.wheel(0, 420); }
  await expect.poll(() => area.evaluate(el => el.scrollTop)).toBeGreaterThan(minimum);
}
async function singleOwner(page, id) {
  const result = await panel(page, id).evaluate(el => {
    const page = el.closest('.pt-page'), root = document.scrollingElement;
    return { own: getComputedStyle(el).overflowY, outer: getComputedStyle(page).overflowY,
      pageScroll: page.scrollTop, rootScroll: root.scrollTop,
      outerExtra: page.scrollHeight - page.clientHeight, rootExtra: root.scrollHeight - root.clientHeight };
  });
  expect(result.own).toBe('auto'); expect(result.outer).toBe('hidden');
  expect(result.pageScroll).toBe(0); expect(result.rootScroll).toBe(0);
  expect(result.outerExtra).toBeLessThanOrEqual(1); expect(result.rootExtra).toBeLessThanOrEqual(1);
}
async function reset(page, id) { await expect.poll(() => panel(page, id).evaluate(el => el.scrollTop)).toBe(0); }

test('R-PANEL-01 | Given long content, when wheel or touch scrolls each page, then its unique control panel stays fixed and its last content remains reachable', async ({ page }, info) => {
  await open(page);
  for (const id of ['resume', 'blog', 'projects']) {
    if (id !== 'resume') await navigateToSection(page, id);
    const area = panel(page, id), top = controls(page, id);
    const before = await top.boundingBox();
    const content = page.locator(id === 'resume' ? '#resume-summary' : id === 'blog' ? '#blog-grid' : '#proj-pinned-wrap');
    await expect(content).toBeVisible();
    const first = await content.boundingBox();
    await wheel(page, area, info.project.use.hasTouch);
    const after = await top.boundingBox(), moved = await content.boundingBox();
    expect(after).toEqual(before);
    expect(moved.y).toBeLessThan(first.y - 100);
    await singleOwner(page, id);
    await expect(top.locator('h2')).toBeInViewport({ ratio: 1 });
    await area.focus(); await area.press('End');
    await expect.poll(() => area.evaluate(el => Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop))).toBeLessThanOrEqual(2);
    expect(await top.boundingBox()).toEqual(before);
    if (id === 'resume') await expect(page.locator('.resume-bottom-cta a')).toBeInViewport({ ratio: 1 });
    if (id === 'projects') await expect(page.locator('#proj-starred-more-btn')).toBeInViewport({ ratio: 1 });
    await info.attach(`${id}-scrolled-controls`, { body: await page.screenshot(), contentType: 'image/png' });
  }
});

test('R-PANEL-02 | When a category or language actually changes, then only its content resets and focus and horizontal-only scroll retain their independent state', async ({ page }, info) => {
  await open(page, 'projects');
  await wheel(page, panel(page, 'projects'), info.project.use.hasTouch);
  const previous = await panel(page, 'projects').evaluate(el => el.scrollTop);
  await navigateToSection(page, 'blog');
  await wheel(page, panel(page, 'blog'), info.project.use.hasTouch);
  const before = await panel(page, 'blog').evaluate(el => el.scrollTop);
  await page.locator('#blog-filters').evaluate(el => { el.scrollLeft = el.scrollWidth; });
  expect(await panel(page, 'blog').evaluate(el => el.scrollTop)).toBe(before);
  const category = page.locator('#blog-filters [data-group="category_testing"]');
  await category.focus(); await category.press('Enter');
  await reset(page, 'blog'); await expect(category).toBeFocused();
  expect(await page.locator('#projects-content').evaluate(el => el.scrollTop)).toBe(previous);
  await wheel(page, panel(page, 'blog'), info.project.use.hasTouch);
  const current = await panel(page, 'blog').evaluate(el => el.scrollTop);
  await category.press('Enter');
  expect(await panel(page, 'blog').evaluate(el => el.scrollTop)).toBe(current);
  const english = page.locator('#blog-lang-toggle [data-lang-filter="en"]');
  await english.focus(); await english.press('Space');
  await reset(page, 'blog'); await expect(english).toBeFocused();
  await expect(page.locator('#blog-grid .blog-article-title')).toHaveCount(12);
  await navigateToSection(page, 'projects');
  await wheel(page, panel(page, 'projects'), info.project.use.hasTouch);
  const project = page.locator('#proj-filters [data-group="proj_test"]');
  await project.focus(); await project.press('Space');
  await reset(page, 'projects'); await expect(project).toBeFocused();
});

test('R-PANEL-03 | Given a focused content region, then PageDown, PageUp, Home and End scroll naturally while controls, focus and route history remain usable', async ({ page }) => {
  await open(page);
  const area = panel(page, 'resume'), bounds = await controls(page, 'resume').boundingBox();
  await page.keyboard.press('Tab'); await area.focus();
  expect(await area.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  await area.press('PageDown');
  await expect.poll(() => area.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
  const down = await area.evaluate(el => el.scrollTop);
  await area.press('PageUp'); await expect.poll(() => area.evaluate(el => el.scrollTop)).toBeLessThan(down);
  await area.press('End');
  await expect(page.locator('.resume-bottom-cta a')).toBeInViewport({ ratio: 1 });
  await area.press('Home'); await reset(page, 'resume');
  expect(await controls(page, 'resume').boundingBox()).toEqual(bounds);
  await navigateToSection(page, 'contact');
  await expect(page.locator('.panel-page.pt-page-current[data-id="contact"]')).toHaveCount(1);
  await page.goBack(); await expectSection(page, 'resume'); await reset(page, 'resume');
  await expect(page.locator('.panel-page:not([inert])')).toHaveCount(1);
  await expect(page.locator('.panel-page[inert] .page-controls-panel')).toHaveCount(3);
});

test('R-PANEL-04 | Given responsive resizing, short landscape and 200 percent desktop reflow, then controls remain below the global header with a usable content viewport', async ({ page }) => {
  test.setTimeout(60000);
  await open(page);
  const sizes = [[320, 700], [390, 844], [768, 900], [1440, 900], [844, 390], [320, 480]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const rowPositions = [];
    for (const id of ['resume', 'blog', 'projects']) {
      await navigateToSection(page, id);
      await expect(async () => {
        const geometry = await controls(page, id).evaluate(el => {
          const box = el.getBoundingClientRect(), panel = el.nextElementSibling.getBoundingClientRect();
          const header = document.querySelector('.mobile-header');
          const globalBottom = getComputedStyle(header).display === 'none' ? el.closest('.pt-page').getBoundingClientRect().top : header.getBoundingClientRect().bottom;
          return { top: box.top, bottom: box.bottom, contentTop: panel.top, contentHeight: panel.height, globalBottom, overflow: document.documentElement.scrollWidth - innerWidth };
        });
        expect(Math.abs(geometry.top - geometry.globalBottom)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.bottom - geometry.contentTop)).toBeLessThanOrEqual(1);
        expect(geometry.contentHeight).toBeGreaterThan(44);
        expect(geometry.overflow).toBeLessThanOrEqual(1);
      }).toPass();
      rowPositions.push((await controls(page, id).locator('.category-filter-bar').boundingBox()).y);
    }
    expect(Math.max(...rowPositions) - Math.min(...rowPositions)).toBeLessThanOrEqual(1);
  }
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Emulation.setDeviceMetricsOverride', { width: 720, height: 450, deviceScaleFactor: 2, mobile: false });
    await navigateToSection(page, 'resume');
    expect(await page.evaluate(() => ({ width: innerWidth, ratio: devicePixelRatio }))).toEqual({ width: 720, ratio: 2 });
    expect((await panel(page, 'resume').boundingBox()).height).toBeGreaterThan(44);
    await page.getByRole('button', { name: 'Download Full Resume', exact: true }).click();
    await expect(page.locator('.resume-bottom-cta a')).toBeInViewport({ ratio: 1 });
  } finally { await session.send('Emulation.clearDeviceMetricsOverride'); await session.detach(); }
});

test('R-PANEL-05 | Given empty or delayed results and rapid selections, then content states remain inside their own panel and the latest filter wins', async ({ page }) => {
  await open(page, 'resume', { 'medium-systems.json': [] });
  await navigateToSection(page, 'blog');
  const bounds = await controls(page, 'blog').boundingBox();
  await page.locator('#blog-filters [data-group="category_system_engineering"]').click();
  await expect(page.locator('#blog-empty')).toBeVisible();
  await expect(page.locator('#blog-empty')).toBeInViewport(); await reset(page, 'blog');
  expect(await controls(page, 'blog').boundingBox()).toEqual(bounds);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/data/medium-test.json', async route => { await gate; await route.fulfill({ json: longArticles('test') }); });
  await page.reload(); await expectSection(page, 'blog');
  await expect(page.locator('#blog-loading')).toBeVisible();
  await page.locator('#blog-filters [data-group="category_software-development"]').click();
  await page.locator('#blog-filters [data-group="category_testing"]').click();
  await page.locator('#blog-lang-toggle [data-lang-filter="tr"]').click();
  release();
  await expect(page.locator('#blog-grid .blog-article-title')).toHaveCount(12);
  await expect(page.locator('#blog-filters [aria-pressed="true"]')).toHaveAttribute('data-group', 'category_testing');
  await reset(page, 'blog');
  expect(await controls(page, 'blog').boundingBox()).toEqual(bounds);
});

test('R-PANEL-06 | Given print layout, then every page releases its screen height and overflow constraints without changing disclosure state or Markdown content', async ({ page }) => {
  await open(page);
  for (const id of ['resume', 'blog', 'projects']) {
    await navigateToSection(page, id);
    const before = await page.locator('#resume details').evaluateAll(nodes => nodes.map(el => el.open));
    await page.emulateMedia({ media: 'print' });
    const geometry = await panel(page, id).evaluate(el => ({ overflow: getComputedStyle(el).overflowY, height: el.clientHeight, full: el.scrollHeight, documentHeight: document.documentElement.scrollHeight, end: el.getBoundingClientRect().bottom }));
    expect(geometry.overflow).toBe('visible');
    expect(geometry.height).toBeGreaterThanOrEqual(geometry.full - 1);
    expect(geometry.end).toBeLessThanOrEqual(geometry.documentHeight + 1);
    expect(await page.locator('#resume details').evaluateAll(nodes => nodes.map(el => el.open))).toEqual(before);
    await page.emulateMedia({ media: 'screen' });
    await singleOwner(page, id);
  }
});

test('R-PANEL-07 | Contact shares the fixed heading and named scroll region, preserves links and supports paging, route reset and print', async ({ page }, info) => {
  await open(page, 'contact');
  const area = panel(page, 'contact'), header = controls(page, 'contact');
  await expect(header.getByRole('heading', { name: 'Contact', exact: true })).toHaveCount(1);
  await expect(area.getByRole('link')).toHaveCount(4);
  const sizes = info.project.use.isMobile
    ? [[info.project.use.viewport.width, 480]]
    : [[1440, 320], [768, 480], [390, 480], [320, 480]];
  let scrollingCases = 0;
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await area.evaluate(el => { el.scrollTop = 0; });
    const before = await header.boundingBox();
    const contentBefore = await area.locator('.row').boundingBox();
    const max = await area.evaluate(el => el.scrollHeight - el.clientHeight);
    if (max > 1) {
      scrollingCases++;
      await wheel(page, area, info.project.use.hasTouch, 0);
      expect((await area.locator('.row').boundingBox()).y).toBeLessThan(contentBefore.y);
    }
    expect(await header.boundingBox()).toEqual(before);
    await singleOwner(page, 'contact');
    const placement = await header.evaluate(el => {
      const box = el.getBoundingClientRect(), content = el.nextElementSibling.getBoundingClientRect();
      const global = document.querySelector('.mobile-header');
      const globalBottom = getComputedStyle(global).display === 'none' ? el.closest('.pt-page').getBoundingClientRect().top : global.getBoundingClientRect().bottom;
      return { top: box.top, bottom: box.bottom, contentTop: content.top, contentHeight: content.height, globalBottom, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(Math.abs(placement.top - placement.globalBottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(placement.bottom - placement.contentTop)).toBeLessThanOrEqual(1);
    expect(placement.contentHeight).toBeGreaterThan(44);
    expect(placement.overflow).toBeLessThanOrEqual(1);
    await area.focus(); await area.press('End');
    await expect.poll(() => area.evaluate(el => Math.abs(el.scrollTop - (el.scrollHeight - el.clientHeight)))).toBeLessThanOrEqual(2);
    await expect(area.getByRole('link', { name: 'All My Links (opens in a new tab)', exact: true })).toBeInViewport({ ratio: 1 });
    await area.press('Home'); await reset(page, 'contact');
  }
  expect(scrollingCases).toBeGreaterThan(0);
  await area.getByRole('link', { name: 'All My Links (opens in a new tab)', exact: true }).focus();
  await expect(area.getByRole('link', { name: 'All My Links (opens in a new tab)', exact: true })).toBeInViewport({ ratio: 1 });
  await navigateToSection(page, 'resume');
  await navigateToSection(page, 'contact'); await reset(page, 'contact');
  await page.goBack(); await expectSection(page, 'resume');
  await page.goForward(); await expectSection(page, 'contact'); await reset(page, 'contact');
  await expect(page.locator('.panel-page:not([inert])')).toHaveCount(1);
  await page.emulateMedia({ media: 'print' });
  expect(await area.evaluate(el => getComputedStyle(el).overflowY)).toBe('visible');
  expect(await area.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
});
