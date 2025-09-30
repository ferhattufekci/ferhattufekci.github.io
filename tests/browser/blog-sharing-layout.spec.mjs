import { test, expect } from './fixtures.mjs';
import { article, openBlog, controls, openedPanel, setPlatformMode, settle, cleanProbe, feedback, noDuplicateActions,
  nativeSettledQuiet, nativeProgressInline } from './helpers/blog-sharing.mjs';

test.afterEach(async ({ page }) => cleanProbe(page));

for (const width of [null, 768]) for (const language of ['tr', 'en']) for (const mode of ['fallback', 'native']) {
  test(`R-BLOG-SHARE-09 | Layout.${mode}.${language}.${width || 'profile'} | Card content and equal rows stay stable through native/fallback feedback, including the final card`, async ({ page }, info) => {
    if (width) await page.setViewportSize({ width, height: 900 });
    const base = article(language === 'tr' ? 'A' : 'B');
    // Unequal neighbours are essential: a lone card cannot expose grid stretch.
    const entries = Array.from({ length: 6 }, (_, i) => ({ ...base,
      title: `${i} ` + (i === 1 || i === 4 ? base.title.repeat(6) : i === 5 ? base.title.repeat(2) : base.title),
      excerpt: i === 1 || i === 4 ? base.excerpt.repeat(10) : base.excerpt,
      url: `https://medium.com/@fixture/layout-${language}-${i}?encoded=a%2Bb&query=ö&long=${'x'.repeat(400)}#part`,
      date: `2025-01-${String(20 - i).padStart(2, '0')}T00:00:00Z`
    }));
    await openBlog(page, { platform: { native: mode === 'fallback' ? 'absent' : 'defer' }, categories: { systems: entries, test: [], software: [] } });
    await page.evaluate(() => document.fonts.ready);
    const records = [];
    let pendingIndex = 0;
    for (const entry of [entries[0], entries[5]]) {
      const c = controls(page, entry);
      await c.trigger.scrollIntoViewIfNeeded();
      const geometry = () => c.card.evaluate(card => {
        const top = card.getBoundingClientRect().top;
        return Object.fromEntries(['.blog-article-media', '.blog-article-title', '.blog-article-excerpt', '.blog-article-read', '.blog-article-link', '.blog-share-trigger']
          .map(selector => { const r = card.querySelector(selector).getBoundingClientRect(); return [selector, { top: r.top - top, height: r.height }]; }));
      });
      const before = await geometry();
      const alignedRow = async state => {
        const row = await c.card.evaluate(card => {
          const top = card.getBoundingClientRect().top;
          return [...card.parentElement.querySelectorAll('.blog-article-card')]
            .filter(el => Math.abs(el.getBoundingClientRect().top - top) < 1)
            .map(el => {
              const r = el.getBoundingClientRect(), read = el.querySelector('.blog-article-read').getBoundingClientRect(), share = el.querySelector('.blog-share-trigger').getBoundingClientRect(), media = el.querySelector('.blog-article-media').getBoundingClientRect();
              return { height: r.height, bottom: r.bottom, read: read.top, share: share.top, width: r.width, coverHeight: media.height };
            });
        });
        records.push({ title: entry.title, state, row });
        for (const prop of ['height', 'bottom', 'read', 'share', 'width', 'coverHeight']) {
          const values = row.map(item => item[prop]);
          expect(Math.max(...values) - Math.min(...values), `${state}: same-row ${prop} spread`).toBeLessThanOrEqual(0.1);
        }
        return row;
      };
      const closedRow = await alignedRow('closed');
      const stable = async state => {
        const actual = await geometry(); records.push({ title: entry.title, state, actual });
        for (const selector of Object.keys(before)) {
          expect(actual[selector].top, `${state}: ${selector} top relative to card`).toBeCloseTo(before[selector].top, 1);
          expect(actual[selector].height, `${state}: ${selector} height`).toBeCloseTo(before[selector].height, 1);
        }
        const row = await alignedRow(state);
        if (['native-pending', 'native-busy', 'native-settled'].includes(state))
          for (let index = 0; index < row.length; index++)
            expect(Math.abs(row[index].height - closedRow[index].height), `${state}: no card grows for native progress`).toBeLessThanOrEqual(0.1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      };
      await c.trigger.click();
      let p;
      if (mode === 'native') {
        p = feedback(page, c); await noDuplicateActions(p);
        await nativeProgressInline(p); await stable('native-pending');
        await c.trigger.click(); await nativeProgressInline(p, 'NATIVE_BUSY'); await stable('native-busy');
        await settle(page, 'native', 'resolve', pendingIndex++);
        await nativeSettledQuiet(p); await stable('native-settled');
        await setPlatformMode(page, 'native', 'NotAllowedError'); await c.trigger.click();
        await expect(p.status).toHaveText(c.text.NATIVE_ERROR); await stable('native-error');
        p = await openedPanel(page, c);
        // Restore the deferred boundary for the next card's native activation.
        await setPlatformMode(page, 'native', 'defer');
      } else {
        p = await openedPanel(page, c); await stable('fallback-open');
        await p.copy.click(); await expect(p.status).toHaveText(c.text.COPY_SUCCESS); await stable('copy-success');
        await setPlatformMode(page, 'clipboard', 'defer'); await p.copy.click();
        await expect(p.status).toHaveText(c.text.COPY_PENDING); await stable('copy-pending');
        await settle(page, 'clipboard', 'resolve', pendingIndex++);
      }
      const below = await p.panel.evaluate(el => el.getBoundingClientRect().top >= el.previousElementSibling.getBoundingClientRect().bottom);
      expect(below, 'Fallback stays below the independent Share action').toBe(true);
      await setPlatformMode(page, 'clipboard', 'reject'); await p.copy.click();
      await expect(p.status).toHaveText(c.text.COPY_MANUAL); await stable('manual-error');
      await expect(p.manual).toHaveValue(entry.url);
      await p.copy.press('Escape'); await expect(p.panel).toBeHidden(); await stable('closed');
      await setPlatformMode(page, 'clipboard', 'resolve');
    }
    const columns = await page.locator('#blog-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    await info.attach('card-relative-layout', { body: JSON.stringify({ viewport: page.viewportSize(), columns, records }, null, 2), contentType: 'application/json' });
  });
}
