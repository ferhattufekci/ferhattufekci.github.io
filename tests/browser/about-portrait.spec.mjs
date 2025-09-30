import { test, expect, expectSection } from './fixtures.mjs';

test('R-ABOUT-02 | About Me keeps the face in frame on wide desktops and phones', async ({ page, isMobile }) => {
  // A 1920 × 960 window at 50% zoom has this CSS viewport.
  if (!isMobile) await page.setViewportSize({ width: 3840, height: 1920 });
  await page.goto('/#about-me');
  await expectSection(page, 'about-me');

  const visible = await page.locator('#about-me .fill-block').evaluate(portrait => {
    const { width, height } = portrait.getBoundingClientRect();
    // The source is square. With cover, its scaled side is the longer box edge.
    const side = Math.max(width, height);
    const anchor = parseFloat(getComputedStyle(portrait).backgroundPositionY) / 100;
    const top = (side - height) * anchor / side;
    return { top, bottom: top + height / side };
  });

  if (isMobile) {
    const portrait = await page.locator('#about-me .fill-block').boundingBox();
    const biography = await page.locator('#about-me .hp-text-block').boundingBox();
    expect(portrait.y + portrait.height).toBeLessThanOrEqual(biography.y + 1);
    const overflow = await page.locator('#about-me').evaluate(section => section.scrollWidth - section.clientWidth);
    expect(overflow).toBe(0);
  }

  // Hair and chin are at approximately 12% and 56% of the source height.
  expect(visible.top).toBeLessThan(0.12);
  expect(visible.bottom).toBeGreaterThan(0.56);
});
