import { test, expect, expectSection } from './fixtures.mjs';
import { articles, mockCatalog, repo, starred } from './data/catalog.mjs';

// Phones draw overlay scrollbars and ignore ::-webkit-scrollbar, so the light theme
// showed no scrollbar at all while desktop shows the 5px themed bar. On overlay-scrollbar
// touch devices js/touch-scrollbar.js draws the desktop design beside the scroll owner.
// The mobile projects run with touch and Chromium's hidden scrollbars (zero gutter),
// which is the overlay condition; the desktop project must keep the native bar only.
const PAGES = ['about-me', 'resume', 'projects', 'blog'];
const longArticles = category => Array.from({ length: 24 }, (_, i) => ({ ...articles[category][i % 2], title: `${category} article ${i}`, url: `https://medium.com/@fixture/${category}-${i}` }));
const longCatalog = {
  'medium-systems.json': longArticles('systems'), 'medium-test.json': longArticles('test'), 'medium-software.json': longArticles('software'),
  'github-repos.json': Array.from({ length: 40 }, (_, i) => repo(`repository-${i}`, ['systems', 'test', 'software'][i % 3], i < 3)),
  'github-starred.json': starred(25)
};

async function open(page, id) {
  await mockCatalog(page, longCatalog);
  await page.goto(`/#${id}`);
  await expectSection(page, id);
  await expect(page.locator('.preloader')).toHaveCount(0);
}

// The active scroll owner, its desktop scrollbar design and the drawn bar's geometry.
const measure = page => page.evaluate(() => {
  const current = document.querySelector('.pt-page-current');
  const owner = [current, ...current.querySelectorAll('*')].find(el =>
    /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1);
  const bar = document.querySelector('.touch-scrollbar');
  const thumb = bar && bar.querySelector('.touch-scrollbar-thumb');
  const box = el => el.getBoundingClientRect().toJSON();
  const css = getComputedStyle(document.documentElement);
  return {
    active: document.documentElement.classList.contains('has-touch-scrollbar'),
    visible: !!bar && !bar.hidden,
    owner: box(owner),
    scrollTop: owner.scrollTop,
    range: owner.scrollHeight - owner.clientHeight,
    bar: bar && box(bar),
    thumb: thumb && box(thumb),
    barTrack: bar && getComputedStyle(bar).backgroundColor,
    thumbColor: thumb && getComputedStyle(thumb).backgroundColor,
    thumbOutline: thumb && getComputedStyle(thumb).outline,
    tokens: { thumb: css.getPropertyValue('--color-scrollbar-thumb').trim(), surface: css.getPropertyValue('--color-surface').trim() }
  };
});

const hex = rgb => '#' + rgb.match(/\d+/g).slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');

test.describe('touch scrollbar', () => {
  test('R-SCROLLBAR-02 | overlay-scrollbar touch devices draw the desktop scrollbar on every page', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.use.isMobile, 'touch devices only');
    for (const id of PAGES) {
      await open(page, id);
      const rest = await measure(page);
      expect(rest.active, id).toBe(true);
      expect(rest.visible, id).toBe(true);
      // Same design as the desktop bar: 5px, themed thumb, slategrey outline, surface track.
      expect(rest.bar.width, id).toBe(5);
      expect(hex(rest.thumbColor), id).toBe(rest.tokens.thumb.toLowerCase());
      expect(hex(rest.barTrack), id).toBe(rest.tokens.surface.toLowerCase());
      expect(rest.thumbOutline, id).toBe('rgb(112, 128, 144) solid 1px');
      // Beside the scroll owner: its right edge, its visible height.
      expect(Math.abs(rest.bar.right - rest.owner.right), id).toBeLessThanOrEqual(1);
      expect(Math.abs(rest.bar.top - Math.max(rest.owner.top, 0)), id).toBeLessThanOrEqual(1);
      expect(rest.thumb.height, id).toBeLessThan(rest.bar.height);
      expect(Math.abs(rest.thumb.top - rest.bar.top), id).toBeLessThanOrEqual(1);

      // Scrolling to the end moves the thumb to the bottom of the track.
      await page.evaluate(() => {
        const current = document.querySelector('.pt-page-current');
        const owner = [current, ...current.querySelectorAll('*')].find(el =>
          /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1);
        owner.scrollTop = owner.scrollHeight;
      });
      await expect.poll(async () => {
        const end = await measure(page);
        return Math.round(end.bar.bottom - end.thumb.bottom);
      }, { message: id }).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`${id}.png`) });
    }
  });

  test('R-SCROLLBAR-03 | desktop keeps the native styled scrollbar and draws no second one', async ({ page }, testInfo) => {
    test.skip(testInfo.project.use.isMobile, 'fine pointers only');
    await open(page, 'about-me');
    const state = await measure(page);
    expect(state.active).toBe(false);
    expect(state.bar).toBeNull();
  });
});
