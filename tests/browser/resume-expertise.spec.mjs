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
      upper: [title.left, title.left + parseFloat(underline.width), underline.height, underline.backgroundColor],
      lower: [lower.left, lower.right, getComputedStyle(panel).borderBottomWidth, getComputedStyle(panel).borderBottomColor]
    };
  });
}

test('Resume matches both Blog separator widths and keeps all expertise labels visible', async ({ page }) => {
  await open(page, 'blog');
  const blog = await separators(page);
  await open(page, 'resume');
  expect(await separators(page)).toEqual(blog);
  const list = page.getByRole('list', { name: 'Areas of expertise' });
  await expect(list.getByRole('listitem')).toHaveText(['Business Analysis', 'Software Engineering', 'Test Engineering']);
  for (const item of await list.getByRole('listitem').all()) await expect(item).toBeInViewport({ ratio: 1 });
  const strip = page.locator('.resume-expertise');
  expect(await strip.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  const nav = page.getByRole('navigation', { name: 'Resume section navigation' });
  expect((await nav.boundingBox()).y).toBeGreaterThanOrEqual(await strip.evaluate(el => el.getBoundingClientRect().bottom));
});

for (const [id, selector] of [['resume', '.expertise-term'], ['blog', '#blog-updated'], ['projects', '#proj-updated']]) {
  test(id + ' tooltip visibly dismisses on the second activation and Escape', async ({ page }, info) => {
    await open(page, id);
    const trigger = page.locator(selector);
    await expect(trigger).toHaveRole('button');
    const tip = id === 'resume' ? page.locator('#expertise-definition') : trigger.locator('.sync-badge-tip');
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
