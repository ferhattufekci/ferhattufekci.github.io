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

// Measured as computed styles of the ::-webkit-scrollbar pseudo-elements, not as layout
// width: the suite runs Chromium with --hide-scrollbars, where offsetWidth - clientWidth
// reports the reserved gutter (the panels use scrollbar-gutter: stable) rather than the bar
// a visitor sees. The computed style is what decides the rendered bar, flag or no flag.
async function scrollbarOf(page, id) {
  await mockCatalog(page, longCatalog);
  await page.goto(`/#${id}`);
  await expectSection(page, id);
  await expect(page.locator('.preloader')).toHaveCount(0);
  return page.evaluate(() => {
    const current = document.querySelector('.pt-page-current');
    const scrollers = [current, ...current.querySelectorAll('*')].filter(el =>
      /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1);
    return scrollers.map(el => {
      const part = name => getComputedStyle(el, `::-webkit-scrollbar${name}`);
      return {
        id: el.id,
        width: part('').width,
        thumb: part('-thumb').backgroundColor,
        radius: part('-thumb').borderRadius,
        outline: part('-thumb').outlineStyle,
        track: part('-track').backgroundColor
      };
    });
  });
}

for (const width of [1440, 495]) {
  for (const theme of ['light', 'dark']) {
    test(`R-SCROLLBAR-01 | every page draws the same scrollbar at ${width}px in the ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ width, height: 900 });
      const found = {};
      for (const id of PAGES) found[id] = await scrollbarOf(page, id);
      for (const id of PAGES) expect(found[id], `${id} should have exactly one scroll owner`).toHaveLength(1);
      const styles = Object.fromEntries(PAGES.map(id => [id, (({ id: _, ...style }) => style)(found[id][0])]));
      // The native bar (15px, with arrow buttons) shows up as width "auto": no rule styled it.
      for (const id of PAGES) expect(styles[id].width, `${id}: ${JSON.stringify(styles[id])}`).toBe('5px');
      for (const id of PAGES.slice(1)) expect(styles[id], `${id} differs from about-me`).toEqual(styles['about-me']);
    });
  }
}
