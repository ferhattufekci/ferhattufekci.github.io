import { test, expect, expectSection } from './fixtures.mjs';

async function open(page, id) {
  await page.goto('/#' + id);
  await expectSection(page, id);
  await expect(page.locator('.preloader')).toHaveCount(0);
}

function separators(page) {
  return page.locator('.pt-page-current .page-controls-panel').evaluate(panel => {
    const heading = panel.querySelector('.section-title');
    const underline = getComputedStyle(heading, '::after');
    const title = heading.getBoundingClientRect();
    const lower = panel.getBoundingClientRect();
    return {
      upper: [title.left, title.right, title.bottom, underline.width, underline.height, underline.backgroundColor],
      lower: [lower.left, lower.right, lower.bottom, getComputedStyle(panel).borderBottomWidth, getComputedStyle(panel).borderBottomColor]
    };
  });
}

function bylineGapDifference(page) {
  return page.locator('.pt-page-current .page-controls-panel').evaluate(panel => {
    const heading = panel.querySelector('.section-title').getBoundingClientRect();
    const controls = [...panel.querySelector('.section-description').children]
      .map(control => control.getBoundingClientRect()).filter(box => box.height);
    const nav = panel.querySelector('.category-filter-bar');
    const end = nav ? nav.getBoundingClientRect().top
      : panel.getBoundingClientRect().bottom - parseFloat(getComputedStyle(panel).borderBottomWidth);
    const before = Math.min(...controls.map(box => box.top)) - heading.bottom;
    const after = end - Math.max(...controls.map(box => box.bottom));
    return Math.abs(before - after);
  });
}

test('Blog, Projects, Contact and Resume share divider edges and vertical spacing after reflow', async ({ page }) => {
  // A full date matches the live compact badge and keeps its width independent of the test date.
  await page.route('**/data/meta.json', route => route.fulfill({ json: { lastUpdated: '2020-01-01T00:00:00Z' } }));
  await open(page, 'blog');
  await expect(page.locator('#blog-updated')).not.toBeEmpty();
  await page.evaluate(() => document.fonts.ready);
  // ResizeObserver delivers the shared rows after layout, including on the first visit.
  await expect.poll(() => page.locator('.page-controls-panel').evaluateAll(panels =>
    new Set(panels.map(panel => panel.getBoundingClientRect().height)).size
  )).toBe(1);
  const filters = await page.locator('#blog-lang-toggle').boundingBox();
  const badge = await page.locator('#blog-updated').boundingBox();
  if (page.viewportSize().width === 320) {
    expect(badge.y + badge.height).toBeLessThanOrEqual(filters.y);
    const categories = await page.locator('#blog-filters').boundingBox();
    const gap = categories.y - (filters.y + filters.height);
    const rowGap = await page.locator('.pt-page-current .page-controls-panel').evaluate(el => parseFloat(getComputedStyle(el).rowGap));
    expect(Math.abs(gap - rowGap)).toBeLessThanOrEqual(1);
    expect(Math.abs((filters.x + filters.width) - (badge.x + badge.width))).toBeLessThanOrEqual(1);
  } else {
    expect(Math.abs((filters.y + filters.height / 2) - (badge.y + badge.height / 2))).toBeLessThanOrEqual(1);
    expect(filters.x + filters.width).toBeLessThanOrEqual(badge.x);
    await expect.poll(() => bylineGapDifference(page)).toBeLessThanOrEqual(1);
  }
  const blog = await separators(page);
  for (const id of ['projects', 'contact', 'resume']) {
    await open(page, id);
    await expect.poll(() => separators(page)).toEqual(blog);
    await expect.poll(() => bylineGapDifference(page)).toBeLessThanOrEqual(1);
  }
  await expect(page.getByRole('button', { name: 'About M-Shaped Computer Engineer', exact: true })).toBeVisible();
  await expect(page.locator('.expertise-term')).toContainText('M-Shaped Computer Engineer');
  const list = page.getByRole('list', { name: 'Areas of expertise' });
  await expect(list.getByRole('listitem')).toHaveText(['Business Analysis', 'Software Engineering', 'Test Engineering']);
  for (const item of await list.getByRole('listitem').all()) await expect(item).toBeInViewport({ ratio: 1 });
  const mark = page.locator('.expertise-term svg');
  if (await mark.isVisible()) {
    const centerX = box => box.x + box.width / 2;
    const hat = page.locator('.expertise-software .expertise-hat');
    expect(Math.abs(centerX(await mark.boundingBox()) - centerX(await hat.boundingBox()))).toBeLessThan(1);
  }
  const strip = page.locator('.resume-expertise');
  expect(await strip.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  const nav = page.getByRole('navigation', { name: 'Resume section navigation' });
  expect((await nav.boundingBox()).y).toBeGreaterThanOrEqual(await strip.evaluate(el => el.getBoundingClientRect().bottom));
});

for (const [id, label, description] of [
  ['resume', 'About M-Shaped Computer Engineer', /Depth in three fields/],
  ['blog', 'Medium sync information', /Medium synced/],
  ['projects', 'GitHub sync information', /GitHub synced/]
]) {
  test(id + ' tooltip visibly dismisses on the second activation and Escape', async ({ page }, info) => {
    await open(page, id);
    const section = page.locator('.pt-page-current');
    const trigger = section.getByRole('button', { name: label, exact: true });
    const tip = section.locator('[data-tooltip-host] [role="tooltip"]');
    const title = section.locator(id === 'resume' ? '.expertise-term' : '.sync-badge-time');
    await title.click();
    await expect(tip).toBeHidden();
    await expect(trigger).toHaveAccessibleDescription(description);
    const referenceIcon = page.locator('.resume-personality-info i');
    await expect(trigger.locator('.fa-info-circle')).toHaveCSS('color', await referenceIcon.evaluate(el => getComputedStyle(el).color));
    const bounds = await trigger.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(24);
    expect(bounds.height).toBeGreaterThanOrEqual(24);
    if (id === 'resume') expect(bounds.x).toBeGreaterThanOrEqual(await title.evaluate(el => el.getBoundingClientRect().right - 1));
    await expect(trigger).toBeInViewport({ ratio: 1 });
    if (info.project.use.hasTouch) {
      await trigger.tap();
      await expect(tip).toBeVisible();
      await trigger.tap();
      await expect(tip).toBeHidden();
      await trigger.tap();
      await page.touchscreen.tap(1, 1);
      await expect(tip).toBeHidden();
    } else {
      await trigger.hover();
      await expect(tip).toBeVisible();
      await tip.hover();
      await expect(tip).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(tip).toBeHidden();
    }
    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab');
    await trigger.focus();
    await expect(tip).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tip).toBeHidden();
    await expect(trigger).toBeFocused();
    for (const key of ['Enter', 'Space']) {
      await trigger.press(key);
      await expect(tip).toBeVisible();
      await trigger.press(key);
      await expect(tip).toBeHidden();
    }
  });
}
