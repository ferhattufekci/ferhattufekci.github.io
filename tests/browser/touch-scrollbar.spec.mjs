import { test, expect, expectSection } from './fixtures.mjs';
import { articles, mockCatalog, repo, starred } from './data/catalog.mjs';

// On touch devices js/touch-scrollbar.js draws the desktop design beside the scroll owner,
// and CSS hides the native indicator from the first paint. Not every phone ignores
// ::-webkit-scrollbar: an iPhone (LinkedIn in-app browser, Build 306.1) drew the styled 5px
// bar as a space-taking scrollbar, so the old probe saw a gutter, no bar was drawn, and
// About Me reflowed when that gutter went away. The mobile projects here run with
// Chromium's hidden scrollbars; playwright.webkit.config.mjs runs this file in WebKit's
// touch profile, which renders the styled bar with a gutter like that iPhone did.
// The desktop project must keep the native bar only.
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
    // Longhands in a fixed order: engines serialise the outline shorthand differently.
    thumbOutline: thumb && (style => `${style.outlineColor} ${style.outlineStyle} ${style.outlineWidth}`)(getComputedStyle(thumb)),
    tokens: { thumb: css.getPropertyValue('--color-scrollbar-thumb').trim(), surface: css.getPropertyValue('--color-surface').trim() }
  };
});

const hex = rgb => '#' + rgb.match(/\d+/g).slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');
// WCAG 2.x relative luminance contrast between two #rrggbb colours.
const contrast = (a, b) => {
  const luminance = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

test.describe('touch scrollbar', () => {
  // One test per project, never skipped: the CI coverage gate rejects skipped tests.
  test('R-SCROLLBAR-02/03 | overlay-scrollbar touch devices draw the desktop scrollbar on every page; fine pointers keep the native one only', async ({ page }, testInfo) => {
    if (!testInfo.project.use.isMobile) {
      await open(page, 'about-me');
      const state = await measure(page);
      expect(state.active).toBe(false);
      expect(state.bar).toBeNull();
      return;
    }
    for (const id of PAGES) {
      await open(page, id);
      const rest = await measure(page);
      expect(rest.active, id).toBe(true);
      expect(rest.visible, id).toBe(true);
      // Same design as the desktop bar: 5px, themed thumb, slategrey outline, surface track.
      expect(rest.bar.width, id).toBe(5);
      expect(hex(rest.thumbColor), id).toBe(rest.tokens.thumb.toLowerCase());
      // One colour standard: the thumb is the desktop token in both themes (owner decision
      // 2026-11-11). The light thumb (#dedede on #ffffff) is only 1.35:1, so the bar is
      // noticeable through its outline: non-text contrast (WCAG 1.4.11) of the outline
      // against the track, in both themes.
      expect(contrast(hex(rest.thumbOutline), hex(rest.barTrack)), id).toBeGreaterThanOrEqual(3);
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

  test('R-SCROLLBAR-04 | Given a touch device, then the native scrollbar takes no width from the first paint, so About Me text and photo never reflow', async ({ page }, testInfo) => {
    // Width of the About Me page and its first paragraph at DOMContentLoaded (before the
    // scripts at the end of body have run) and again once the page has settled.
    await page.addInitScript(() => {
      const snap = () => {
        const page = document.querySelector('#about-me'), text = page && page.querySelector('.hp-text-block p');
        return page && text ? { client: page.clientWidth, offset: page.offsetWidth, text: text.getBoundingClientRect().width } : null;
      };
      document.addEventListener('DOMContentLoaded', () => { window.__firstLayout = snap(); }, { capture: true, once: true });
      window.__layout = snap;
    });
    await open(page, 'about-me');
    await page.waitForTimeout(1500);
    const [first, settled] = await page.evaluate(() => [window.__firstLayout, window.__layout()]);
    expect(first, 'measured before the page scripts ran').not.toBeNull();
    expect(settled, 'the text keeps its width once the page has settled').toEqual(first);
    if (testInfo.project.use.isMobile) expect(settled.client, 'no native scrollbar gutter on a touch device').toBe(settled.offset);
  });

  test('R-SCROLLBAR-05 | Given page motion is enabled, when a page slides in on first load or on a page switch, then the drawn bar is never shown away from the settled scroll owner', async ({ page }, testInfo) => {
    // The other tests run with reduced motion, which skips the slide; this one needs it.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Record the bar in every frame from the first script on, together with whether a page is animating.
    await page.addInitScript(() => {
      window.__frames = [];
      const tick = () => {
        const bar = document.querySelector('.touch-scrollbar');
        const moving = [...document.querySelectorAll('.pt-page-current')].some(el => el.getAnimations().some(a => a.playState === 'running'));
        const box = bar && !bar.hidden ? bar.getBoundingClientRect() : null;
        window.__frames.push({ moving, visible: !!box, left: box && box.left, right: box && box.right });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await mockCatalog(page, longCatalog);
    await page.goto('/#about-me');
    await expectSection(page, 'about-me');
    await expect(page.locator('.preloader')).toHaveCount(0);
    for (const id of ['resume', 'blog', 'about-me']) {
      await page.evaluate(target => { location.hash = target; }, id);
      await expectSection(page, id);
      // Let the slide finish and the bar return before the next switch.
      await expect.poll(() => page.evaluate(() => window.__frames.at(-1).moving)).toBe(false);
      if (testInfo.project.use.isMobile) await expect.poll(() => page.evaluate(() => window.__frames.at(-1).visible), { message: id }).toBe(true);
    }
    const frames = await page.evaluate(() => window.__frames);
    const width = page.viewportSize().width;
    expect(frames.filter(frame => frame.moving).length, 'the pages did slide, so the check is not vacuous').toBeGreaterThan(5);
    if (!testInfo.project.use.isMobile) {
      expect(frames.some(frame => frame.visible), 'fine pointers never get the drawn bar').toBe(false);
      return;
    }
    // Whenever the bar is visible it sits at the right edge of the viewport, where every
    // settled scroll owner ends; it is never somewhere across the screen.
    const stray = frames.filter(frame => frame.visible && Math.abs(frame.right - width) > 1);
    expect(stray.slice(0, 5), `${stray.length} frames showed the bar away from the right edge`).toEqual([]);
    // Once a slide is under way no bar is drawn (the first moving frame may still hold the settled bar).
    const duringMotion = frames.filter((frame, index) => frame.moving && frames[index - 1]?.moving && frame.visible);
    expect(duringMotion.length, 'bar frames drawn while a page was sliding').toBe(0);
  });

});
