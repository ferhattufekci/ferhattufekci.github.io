import { test, expect, expectSection, navigateToSection } from './fixtures.mjs';

const sections = ['resume', 'blog', 'projects'];

test('R-SCROLLBAR-01 | Desktop panel scrollbar is separate from arrows and each section remains scrollable', async ({ page }, info) => {
  test.skip(info.project.use.isMobile, 'desktop viewport only');
  await page.goto('/#resume');
  await expectSection(page, 'resume');

  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of sections) {
      if (id !== 'resume' || width !== 1024) await navigateToSection(page, id);
      const metrics = await page.evaluate(() => {
        const panel = document.querySelector('.panel-page.pt-page-current .page-content-panel');
        const section = panel.closest('.pt-page');
        const arrow = document.querySelector('.lmpixels-arrows-nav');
        const panelBounds = panel.getBoundingClientRect();
        const arrowBounds = arrow.getBoundingClientRect();
        const scrollbarSpace = panel.offsetWidth - panel.clientWidth;
        return {
          gap: panelBounds.right - scrollbarSpace - arrowBounds.right,
          arrowsVisible: arrowBounds.left >= 0 && arrowBounds.right <= innerWidth + 1
            && arrowBounds.top >= 0 && arrowBounds.bottom <= innerHeight + 1,
          panelOverflow: getComputedStyle(panel).overflowY,
          sectionOverflow: getComputedStyle(section).overflowY,
          scrollbarStyle: getComputedStyle(panel).scrollbarWidth,
          documentOverflow: document.documentElement.scrollWidth - innerWidth
        };
      });
      expect(metrics.gap, `${id} at ${width}px`).toBeGreaterThanOrEqual(10);
      expect(metrics.arrowsVisible).toBe(true);
      expect(metrics.panelOverflow).toBe('auto');
      expect(metrics.sectionOverflow).toBe('hidden');
      expect(metrics.scrollbarStyle).toBe('thin');
      expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
      if (id === 'resume') {
        const area = page.locator('#resume-content');
        await area.evaluate(el => { el.scrollTop = el.scrollHeight; });
        await expect.poll(() => area.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
        await expect(page.locator('.lmpixels-arrow-right')).toBeInViewport({ ratio: 1 });
      }
    }
  }
  await page.locator('.lmpixels-arrow-right').click();
  await expectSection(page, 'contact');
  expect(await page.locator('.lmpixels-arrows-nav').evaluate(el => getComputedStyle(el).right)).toBe('15px');
  await navigateToSection(page, 'about-me');
  expect(await page.locator('.lmpixels-arrows-nav').evaluate(el => getComputedStyle(el).right)).toBe('15px');
});

test('R-SCROLLBAR-02 | Mobile retains its existing scrollbar and arrow inset', async ({ page }, info) => {
  test.skip(!info.project.use.isMobile, 'mobile viewport only');
  await page.goto('/#resume');
  await expectSection(page, 'resume');
  for (const id of sections) {
    if (id !== 'resume') await navigateToSection(page, id);
    const layout = await page.evaluate(() => {
      const panel = document.querySelector('.panel-page.pt-page-current .page-content-panel');
      const arrows = document.querySelector('.lmpixels-arrows-nav');
      return {
        scrollbarWidth: getComputedStyle(panel).scrollbarWidth,
        right: getComputedStyle(arrows).right
      };
    });
    expect(layout.scrollbarWidth).toBe('auto');
    expect(layout.right).toBe('15px');
  }
});
