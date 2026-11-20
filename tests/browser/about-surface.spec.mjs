import { test, expect, expectSection } from './fixtures.mjs';

test('R-ABOUT-01 | About Me fills the viewport with the Contact surface and scrolls to its last row on phones', async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 3840, height: 1920 });
  await page.goto('/#about-me');
  await expectSection(page, 'about-me');

  const layout = await page.locator('#about-me').evaluate(section => {
    const details = section.querySelector('.custom-page-content');
    const contact = document.querySelector('[data-id="contact"] > .section-inner');
    section.scrollTop = section.scrollHeight;
    return {
      endGap: section.getBoundingClientRect().bottom - details.getBoundingClientRect().bottom,
      scrollRange: section.scrollHeight - section.clientHeight,
      color: getComputedStyle(details).backgroundColor,
      contactColor: getComputedStyle(contact).backgroundColor
    };
  });

  expect(Math.abs(layout.endGap)).toBeLessThanOrEqual(1);
  expect(layout.color).toBe(layout.contactColor);
  if (isMobile) expect(layout.scrollRange).toBeGreaterThan(0);
  else expect(layout.scrollRange).toBe(0);
});
