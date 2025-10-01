import { test, expect, expectSection } from './fixtures.mjs';

const pages = [['About', '/about/'], ['Contact', '/contact/'], ['Privacy', '/privacy/']];
const secondary = [...pages, ['Agent Guide', '/llms.txt'], ['Sitemap', '/sitemap.xml']];

test('R-TRUST-04 | Trust headers offer one accessible return action while footer links retain discovery and current-page context', async ({ page, siteOrigin }, testInfo) => {
  for (const [index, [label, path]] of pages.entries()) {
    expect((await page.goto(path)).status()).toBe(200);
    const header = page.getByRole('navigation', { name: 'Portfolio', exact: true });
    const back = header.getByRole('link', { name: 'Back to portfolio', exact: true });
    const theme = header.getByRole('button');
    await expect(header.getByRole('link')).toHaveCount(1);
    await expect(header.getByRole('button')).toHaveCount(1);
    await expect(back).toHaveAttribute('href', '/');
    await expect(back.locator('[aria-hidden="true"]')).toHaveText('←');
    const footer = page.locator('footer');
    await expect(footer.locator('[aria-current="page"]')).toHaveText(label);
    await expect(footer.getByRole('link')).toHaveCount(4);
    for (const [name, href] of secondary) {
      if (name === label) await expect(footer.getByRole('link', { name, exact: true })).toHaveCount(0);
      else await expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
    await expect(footer.getByRole('link', { name: 'Portfolio', exact: true })).toHaveCount(0);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(back).toBeFocused();
    expect(await back.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
    expect(await back.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.keyboard.press('Tab');
    await expect(theme).toBeFocused();
    expect(await theme.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
    // A real pointer interaction resets keyboard modality before testing touch release.
    await page.locator('h1').click();
    await page.mouse.move(0, 0);
    const normal = await theme.evaluate(el => getComputedStyle(el).backgroundColor);
    const initialTheme = await page.locator('html').getAttribute('data-theme');
    for (let i = 0; i < 2; i++) {
      if (testInfo.project.use.hasTouch) await theme.tap();
      else await theme.click();
    }
    await page.mouse.move(0, 0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', initialTheme);
    await expect.poll(() => theme.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(normal);
    expect(await theme.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
    expect(await theme.evaluate(el => getComputedStyle(el).transform)).toBe('none');
    const next = pages[(index + 1) % pages.length];
    await footer.getByRole('link', { name: next[0], exact: true }).click();
    await expect(page).toHaveURL(siteOrigin + next[1]);
    const returnLink = page.getByRole('navigation').getByRole('link', { name: 'Back to portfolio', exact: true });
    if (testInfo.project.use.hasTouch) await returnLink.tap();
    else await returnLink.click();
    await expect(page).toHaveURL(siteOrigin + '/');
    await expectSection(page, 'about-me');
  }
});

test('R-TRUST-05 | The return action and theme control remain aligned, touch-sized and inside the viewport', async ({ page }) => {
  for (const width of [1280, 375, 320]) {
    await page.setViewportSize({ width, height: 850 });
    for (const [, path] of pages) {
      await page.goto(path);
      const layout = await page.locator('.trust-document nav').evaluate(nav => {
        const bounds = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, height: r.height, width: r.width }; };
        return { nav: bounds(nav), back: bounds(nav.querySelector('a')), toggle: bounds(nav.querySelector('button')),
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      expect(Math.abs(layout.toggle.right - layout.nav.right)).toBeLessThanOrEqual(1);
      expect(layout.back.height).toBeGreaterThanOrEqual(44);
      expect(layout.toggle.height).toBeGreaterThanOrEqual(44);
      expect(layout.toggle.width).toBeGreaterThanOrEqual(44);
      expect(layout.back.top + layout.back.height / 2).toBeCloseTo(layout.toggle.top + layout.toggle.height / 2, 0);
      expect(layout.back.right).toBeLessThan(layout.toggle.left);
      expect(layout.overflow).toBe(false);
    }
  }
});
