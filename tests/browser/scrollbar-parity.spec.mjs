import { test, expect, expectSection } from './fixtures.mjs';
import { articles, mockCatalog, repo, starred } from './data/catalog.mjs';

// The vertical scrollbar must look and measure the same on every page. About Me scrolls
// the whole .pt-page while Resume, Projects and Blog scroll an inner panel, so the two
// kinds are styled by different selectors. Production once rendered About Me with the
// native 15px scrollbar (with arrow buttons) below 991px, because no ::-webkit-scrollbar
// rule applied to .pt-page there, while the other pages kept the slim 5px bar.
const PAGES = ['about-me', 'resume', 'projects', 'blog'];
// Long lists so that Projects and Blog overflow their panels like the real catalog does.
const longArticles = category => Array.from({ length: 24 }, (_, i) => ({ ...articles[category][i % 2], title: `${category} article ${i}`, url: `https://medium.com/@fixture/${category}-${i}` }));
const longCatalog = {
  'medium-systems.json': longArticles('systems'), 'medium-test.json': longArticles('test'), 'medium-software.json': longArticles('software'),
  'github-repos.json': Array.from({ length: 40 }, (_, i) => repo(`repository-${i}`, ['systems', 'test', 'software'][i % 3], i < 3)),
  'github-starred.json': starred(25)
};

async function scrollbarOf(page, id) {
  await mockCatalog(page, longCatalog);
  await page.goto(`/#${id}`);
  await expectSection(page, id);
  await expect(page.locator('.preloader')).toHaveCount(0);
  return page.evaluate(() => {
    const current = document.querySelector('.pt-page-current');
    const scrollers = [current, ...current.querySelectorAll('*')].filter(el =>
      /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1);
    return scrollers.map(el => ({ id: el.id, thickness: el.offsetWidth - el.clientWidth }));
  });
}

for (const width of [1440, 495]) {
  test(`R-SCROLLBAR-01 | every page uses the same scrollbar thickness at ${width}px`, async ({ page, browserName }, info) => {
    test.skip(info.project.use.isMobile, 'Touch emulation uses overlay scrollbars that take no layout width.');
    await page.setViewportSize({ width: width, height: 900 });
    const found = {};
    for (const id of PAGES) found[id] = await scrollbarOf(page, id);

    for (const id of PAGES) expect(found[id], `${id} should have exactly one scroll owner`).toHaveLength(1);
    const thickness = PAGES.map(id => found[id][0].thickness);
    expect(new Set(thickness).size, `thickness per page: ${JSON.stringify(Object.fromEntries(PAGES.map((id, i) => [id, thickness[i]])))}`).toBe(1);
    // Chromium draws the slim custom bar; the native bar with arrow buttons is 15px.
    if (browserName === 'chromium') expect(thickness[0]).toBe(5);
  });
}
