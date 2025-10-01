import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.mjs';
import { openBlog, controls, openedPanel, tabTo, preservedFocus, setPlatformMode, settle, cleanProbe, feedback as shareFeedback,
  noDuplicateActions, nativeSettledQuiet, calls } from './helpers/blog-sharing.mjs';
import { nativeProgressInline, shareProgressSnapshot, unchangedShareControl, restoredShareIcon, visibleFocus } from './helpers/blog-sharing.mjs';
import { measureContrast } from './helpers/visual-metrics.mjs';

test.afterEach(async ({ page }) => cleanProbe(page));

test('R-PROGRESS-01/02/04/05 | Native progress replaces the trailing glyph without changing the label, target, focus or live region', async ({ page }) => {
  await openBlog(page, { platform: { native: 'defer' } });
  await page.evaluate(() => document.fonts.ready);
  let index = 0;
  for (const key of ['A', 'B']) {
    const p = shareFeedback(page, key), before = await shareProgressSnapshot(p), liveNode = await p.status.elementHandle();
    const initiallyExposed = await p.card.getByRole('status').count();
    for (const outcome of ['resolve', 'AbortError', 'DataError']) {
      await tabTo(page, p.trigger); await visibleFocus(p.trigger);
      const unchanged = await preservedFocus(page);
      await p.trigger.press('Enter');
      const progress = await unchangedShareControl(p, before);
      expect(progress.paths, 'Trailing glyph changes while native Promise is pending').not.toEqual(before.paths);
      expect(progress.paths).toHaveLength(1);
      expect(progress.paths[0]).toMatch(/[aAcC]/); // A visible curved progress glyph, not the three-node Share symbol.
      expect(initiallyExposed, 'The empty live region exists in the accessibility tree before the update').toBe(1);
      await nativeProgressInline(p);
      expect(await liveNode.evaluate(el => el === el.closest('article').querySelector('[role="status"]'))).toBe(true);
      await expect(p.trigger.locator('svg')).toHaveAttribute('aria-hidden', 'true');
      await expect(p.trigger.locator('svg')).toHaveAttribute('focusable', 'false');
      await unchanged();
      const settledFocus = await preservedFocus(page);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      expect(await p.trigger.locator('svg').evaluate(el => el.getAnimations({ subtree: true }).some(a => a.playState === 'running'))).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect(await p.trigger.locator('svg').evaluate(el => el.getAnimations({ subtree: true }).some(a => a.playState === 'running'))).toBe(false);
      await settle(page, 'native', outcome, index++);
      await restoredShareIcon(p, before); await settledFocus();
      if (outcome === 'resolve') await nativeSettledQuiet(p);
      else {
        await expect(p.status).toHaveText(p.text[outcome === 'AbortError' ? 'NATIVE_ABORT' : 'NATIVE_ERROR']);
        await expect(p.status).toBeVisible();
        if (outcome === 'AbortError') await noDuplicateActions(p);
        else await openedPanel(page, p);
      }
      expect(await calls(page, 'native')).toHaveLength(index);
      expect(await calls(page, 'clipboard')).toEqual([]);
    }
    await liveNode.dispose();
  }
});

test('R-PROGRESS-02/03/06 | Native pending and repeated activation keep every card height unchanged without an automatic queue', async ({ page }) => {
  await openBlog(page, { platform: { native: 'defer' } });
  await page.evaluate(() => document.fonts.ready);
  const a = shareFeedback(page, 'A'), b = shareFeedback(page, 'B');
  const heights = () => page.locator('#blog-grid .blog-article-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().height));
  const before = await heights();
  await a.trigger.click();
  expect(await heights(), 'Pending adds no disclosure height to the grid').toEqual(before);
  await nativeProgressInline(a);
  await a.trigger.click(); await nativeProgressInline(a, 'NATIVE_BUSY');
  expect(await heights(), 'Busy adds no disclosure height').toEqual(before);
  await b.trigger.click(); await nativeProgressInline(b, 'NATIVE_BUSY');
  expect(await heights(), 'Another card reports busy without growing').toEqual(before);
  expect(await calls(page, 'native')).toHaveLength(1);
  expect(await calls(page, 'clipboard')).toEqual([]);
  await settle(page, 'native', 'resolve');
  await nativeSettledQuiet(b);
  expect(await calls(page, 'native')).toHaveLength(1);
  expect(await heights()).toEqual(before);
  await b.trigger.click(); expect(await calls(page, 'native')).toHaveLength(2);
  await settle(page, 'native', 'resolve', 1); await nativeSettledQuiet(b);
});

test('R-NATIVE-RESULT-01/02/03 | Native resolve removes pending UI without claiming delivery and only explicit retry starts again', async ({ page }) => {
  await openBlog(page, { platform: { native: 'defer' } });
  const c = controls(page, 'A'), p = shareFeedback(page, c);
  await c.trigger.click();
  await nativeProgressInline(p);
  expect(await calls(page, 'native')).toHaveLength(1);
  expect(await calls(page, 'clipboard')).toEqual([]);
  const unchanged = await preservedFocus(page);
  await settle(page, 'native', 'resolve');
  await unchanged();
  await nativeSettledQuiet(p);
  expect(await calls(page, 'clipboard')).toEqual([]);
  await c.trigger.press('Enter');
  expect(await calls(page, 'native')).toHaveLength(2);
  await settle(page, 'native', 'resolve', 1);
  await nativeSettledQuiet(p);
});

test('R-BLOG-SHARE-09 | Feedback states have distinct decorative icons, readable surfaces, reduced motion and stable focus', async ({ page }) => {
  await openBlog(page);
  let pendingIndex = 0;
  for (const key of ['A', 'B']) {
    const c = controls(page, key), p = shareFeedback(page, c);
    const feedback = c.card.locator('.blog-share-feedback');
    expect(await feedback.evaluate(el => el.getBoundingClientRect().height)).toBe(0);
    expect(await feedback.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    await setPlatformMode(page, 'native', 'defer'); await tabTo(page, c.trigger); await c.trigger.press('Enter');
    await nativeProgressInline(p);
    const inlineIcon = c.trigger.locator('svg');
    expect((await inlineIcon.evaluate(measureContrast)).stroke).toBeGreaterThanOrEqual(3);
    for (const [state, kind, mode, message] of [
      ['info', 'native', 'AbortError', 'NATIVE_ABORT'], ['error', 'native', 'NotAllowedError', 'NATIVE_ERROR'],
      ['success', 'clipboard', 'resolve', 'COPY_SUCCESS'],
      ['error', 'clipboard', 'reject', 'COPY_MANUAL']
    ]) {
      const target = kind === 'clipboard' ? p.copy : c.trigger;
      if (state !== 'info') { await setPlatformMode(page, kind, mode); await tabTo(page, target); }
      const unchanged = await preservedFocus(page);
      if (state === 'info') await settle(page, 'native', 'AbortError', pendingIndex++);
      else await target.press('Enter');
      await expect(p.status).toHaveText(c.text[message]); await expect(p.status).toBeVisible(); await unchanged();
      if (state === 'info') await noDuplicateActions(p);
      if (message === 'NATIVE_ERROR') await openedPanel(page, c);
      await expect(p.status).toHaveAttribute('data-state', state);
      await expect(p.status).toHaveAttribute('aria-live', 'polite');
      const icon = p.status.locator('svg'); await expect(icon).toHaveAttribute('aria-hidden', 'true');
      await expect(icon).toHaveAttribute('focusable', 'false');
      const metrics = await p.status.evaluate(el => {
        const s = getComputedStyle(el), icon = el.querySelector('svg'), box = icon.getBoundingClientRect();
        return { width: box.width, height: box.height, fontSize: parseFloat(s.fontSize), weight: s.fontWeight,
          animation: getComputedStyle(icon).animationName };
      });
      expect(metrics).toMatchObject({ width: 16, height: 16, weight: '400', animation: 'none' });
      expect(metrics.fontSize).toBeGreaterThanOrEqual(12); expect(metrics.fontSize).toBeLessThanOrEqual(13);
      expect((await p.status.evaluate(measureContrast)).text).toBeGreaterThanOrEqual(4.5);
      expect((await icon.evaluate(measureContrast)).stroke).toBeGreaterThanOrEqual(3);
      const audit = await new AxeBuilder({ page }).include('#blog-grid')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(audit.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await expect(p.manual).toHaveAttribute('readonly', '');
    await expect(p.manual).toHaveValue(c.data.url);
    await p.copy.press('Escape'); await expect(p.panel).toBeHidden();
  }
});
