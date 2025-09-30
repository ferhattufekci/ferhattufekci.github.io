import { test, expect } from './fixtures.mjs';
import { openBlog, controls, openedPanel, tabTo, visibleFocus, cleanProbe, setPlatformMode } from './helpers/blog-sharing.mjs';

test.afterEach(async ({ page }) => cleanProbe(page));
test.use({ reducedMotion: 'no-preference' });

for (const key of ['A', 'B']) {
  test(`R-BLOG-SHARE-09 | ${key} | Read and Share use the same action typography, text hover and stable targets`, async ({ page }) => {
    await openBlog(page, { platform: { native: 'absent' } });
    const style = locator => locator.evaluate(el => {
      const s = getComputedStyle(el);
      return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'gap',
        'textDecorationLine', 'textDecorationThickness', 'textUnderlineOffset', 'backgroundColor', 'borderTopWidth', 'cursor']
        .map(key => [key, s[key]]));
    });
    const typography = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'gap'];
    await setPlatformMode(page, 'clipboard', 'resolve');
    const c = controls(page, key), read = c.card.locator('.blog-article-read');
    const reference = await style(read);
    await expect(read.locator('.blog-article-read-label')).toHaveText(c.text.READ);
    await c.trigger.click(); const panel = await openedPanel(page, c);
    const readBox = await read.boundingBox(), shareBox = await c.trigger.boundingBox();
    const panelBox = await panel.panel.boundingBox();
    expect(panelBox.x + panelBox.width).toBeCloseTo(shareBox.x + shareBox.width, 1);
    expect(await panel.panel.evaluate(el => getComputedStyle(el).borderTopWidth)).toBe('1px');
    expect(await panel.panel.evaluate(el => getComputedStyle(el).backgroundColor))
      .toBe(await c.trigger.evaluate(el => getComputedStyle(el).backgroundColor));
    expect(readBox.width).toBeGreaterThanOrEqual(44); expect(readBox.height).toBeGreaterThanOrEqual(44);
    expect(readBox.y + readBox.height / 2).toBeCloseTo(shareBox.y + shareBox.height / 2, 1);
    expect(readBox.x + readBox.width).toBeLessThan(shareBox.x);
    const hoverAvailable = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
    if (hoverAvailable) {
      const cardBefore = await c.card.boundingBox(), readBefore = await read.boundingBox(), shareBefore = await c.trigger.boundingBox();
      const linkParts = [c.card.locator('.blog-article-media'), c.card.locator('h3'), c.card.locator('.blog-article-excerpt'),
        read.locator('.blog-article-read-label'), read.locator('.blog-article-read-icon')];
      for (const part of linkParts) {
        await part.hover();
        expect((await style(read.locator('.blog-article-read-label'))).textDecorationLine).toBe('underline');
        expect((await style(read)).textDecorationLine).toBe('none');
        expect((await style(read.locator('.blog-article-read-icon'))).textDecorationLine).toBe('none');
        expect((await style(c.trigger.locator('span'))).textDecorationLine).toBe('none');
        expect(await c.card.boundingBox()).toEqual(cardBefore);
        expect(await read.boundingBox()).toEqual(readBefore);
        expect(await c.trigger.boundingBox()).toEqual(shareBefore);
      }
      const linkBox = await c.link.boundingBox();
      await c.link.hover({ position: { x: 5, y: linkBox.height - 5 } });
      expect(await c.link.evaluate(el => el.matches(':hover'))).toBe(true);
      expect((await style(read.locator('.blog-article-read-label'))).textDecorationLine).toBe('underline');
    }
    const readHover = await style(read.locator('.blog-article-read-label'));
    const iconPlacement = async (target, icon) => {
      const label = target.locator('span').first(), a = await label.boundingBox(), b = await icon.boundingBox();
      expect(b.x - a.x - a.width).toBeCloseTo(7, 1);
      expect(b.width).toBe(14); expect(b.height).toBe(14);
      expect(Math.abs(b.y + b.height / 2 - a.y - a.height / 2)).toBeLessThanOrEqual(0.5);
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
    };
    await iconPlacement(read, read.locator('.blog-article-read-icon'));
    for (const target of [c.trigger, panel.copy]) {
      await target.scrollIntoViewIfNeeded();
      const normal = await style(target), box = await target.boundingBox();
      expect(await target.evaluate(el => el.tagName)).toBe('BUTTON');
      for (const prop of typography) expect(normal[prop], prop).toBe(reference[prop]);
      if (target !== c.trigger) expect(normal.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(normal.borderTopWidth).toBe('0px');
      expect(normal.cursor).toBe('pointer');
      if (target !== c.trigger) {
        expect(box.x).toBeGreaterThan(panelBox.x);
        expect(box.x + box.width).toBeLessThan(panelBox.x + panelBox.width);
      }
      await iconPlacement(target, target.locator('svg'));
      expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      if (hoverAvailable) {
        for (const position of [{ x: box.width - 2, y: box.height - 2 }, { x: box.width - 7, y: box.height / 2 }, { x: 7, y: box.height / 2 }]) {
          const before = await target.boundingBox();
          await target.hover({ position });
          const label = await style(target.locator('span'));
          expect(label.textDecorationLine).toBe('underline');
          for (const prop of ['color', 'textDecorationThickness', 'textUnderlineOffset']) expect(label[prop], prop).toBe(readHover[prop]);
          expect((await style(read.locator('.blog-article-read-label'))).textDecorationLine).toBe('none');
          expect((await style(target.locator('svg'))).textDecorationLine).toBe('none');
          expect((await style(target)).textDecorationLine).toBe('none');
          expect(await target.boundingBox()).toEqual(before);
        }
      }
      await page.keyboard.press('Tab'); await tabTo(page, target); await visibleFocus(target);
      expect((await style(target.locator('span'))).textDecorationLine).toBe('underline');
      expect((await style(target.locator('svg'))).textDecorationLine).toBe('none');
    }
    await panel.copy.click(); await expect(panel.status).toHaveText(c.text.COPY_SUCCESS);
    if (hoverAvailable) {
      await panel.status.hover();
      expect((await style(read.locator('.blog-article-read-label'))).textDecorationLine).toBe('none');
      expect((await style(c.trigger.locator('span'))).textDecorationLine).toBe('none');
    }
    await setPlatformMode(page, 'clipboard', 'reject'); await panel.copy.click();
    await expect(panel.manual).toBeVisible();
    if (hoverAvailable) {
      await panel.manual.hover();
      expect((await style(read.locator('.blog-article-read-label'))).textDecorationLine).toBe('none');
      expect((await style(c.trigger.locator('span'))).textDecorationLine).toBe('none');
    }
    await c.trigger.press('Escape');
    await expect(c.trigger).toHaveAttribute('aria-expanded', 'false');
  });
}
