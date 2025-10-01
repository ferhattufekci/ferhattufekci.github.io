import { test, expect, expectSection, isolateThirdParties } from './fixtures.mjs';

test('R-ARROW-04 | Hybrid touch cancellation clears active feedback and a subsequent real mouse restores hover', async ({ browser, siteOrigin }, info) => {
  const context = await browser.newContext({ isMobile: false, hasTouch: false, colorScheme: info.project.use.colorScheme, reducedMotion: 'reduce' });
  try {
    await isolateThirdParties(context, siteOrigin);
    const page = await context.newPage();
    await page.goto(`${siteOrigin}/#about-me`);
    await expect(page.locator('.preloader')).toHaveCount(0);
    expect(await page.evaluate(() => matchMedia('(any-hover:hover) and (any-pointer:fine)').matches)).toBe(true);
    const session = await context.newCDPSession(page);
    try {
      for (const direction of ['left','right']) {
        const arrow = page.locator(`.lmpixels-arrow-${direction}`), box = await arrow.boundingBox();
        const normal = await arrow.evaluate(el => getComputedStyle(el).color);
        await arrow.evaluate(el => {
          window.arrowPointers = [];
          for (const type of ['pointerdown', 'pointercancel', 'click']) el.addEventListener(type, event =>
            window.arrowPointers.push({ type: event.type, pointerType: event.pointerType, trusted: event.isTrusted }), { once: true });
        });
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width/2, y: box.y + box.height/2 }] });
        await expect(arrow).toHaveJSProperty('tagName', 'BUTTON');
        await expect(page.locator('.lmpixels-arrows-nav')).toHaveAttribute('data-pointer-type', 'touch');
        await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        expect(await page.evaluate(() => window.arrowPointers)).toEqual([
          { type: 'pointerdown', pointerType: 'touch', trusted: true },
          { type: 'pointercancel', pointerType: 'touch', trusted: true }
        ]);
        await expect.poll(() => arrow.evaluate(el => el.matches(':active'))).toBe(false);
        await expect.poll(() => arrow.evaluate(el => getComputedStyle(el).color)).toBe(normal);
        await expectSection(page, 'about-me');
        await arrow.hover();
        await expect(page.locator('.lmpixels-arrows-nav')).toHaveAttribute('data-pointer-type', 'mouse');
        await expect.poll(() => arrow.evaluate(el => getComputedStyle(el).color)).not.toBe(normal);
        await page.mouse.move(0, 0);
        await expect.poll(() => arrow.evaluate(el => getComputedStyle(el).color)).toBe(normal);
      }
    } finally { await session.detach(); }
  } finally { await context.close(); }
});
