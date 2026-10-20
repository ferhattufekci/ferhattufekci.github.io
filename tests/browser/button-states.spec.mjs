import { test, expect, expectSection } from './fixtures.mjs';

async function styles(locator) {
  return locator.evaluate(async el => {
    getComputedStyle(el).backgroundColor;
    await Promise.all(el.getAnimations().map(animation => animation.finished));
    const s = getComputedStyle(el);
    return { background: s.backgroundColor, border: s.borderColor, color: s.color,
      outline: s.outlineStyle, outlineWidth: s.outlineWidth, transform: s.transform };
  });
}

test('R-BUTTON-01 | Error actions leave hover, retain keyboard focus and use theme colors when pressed', async ({ page }, testInfo) => {
  for (const path of ['/#resumes', '/404.html']) {
    await page.goto(path);
    if (path.includes('#')) {
      await expectSection(page, 'not-found');
      await expect(page.locator('.preloader')).toHaveCount(0);
    }
    const home = page.locator('.error-actions a').nth(0);
    const resume = page.locator('.error-actions a').nth(1);
    await page.mouse.move(0, 0);
    const homeNormal = await styles(home);
    const resumeNormal = await styles(resume);
    for (const [first, second, normal] of [[home, resume, homeNormal], [resume, home, resumeNormal]]) {
      await first.hover();
      await expect.poll(async () => (await styles(first)).background).not.toBe(normal.background);
      await second.hover();
      await expect.poll(async () => (await styles(first)).background).toBe(normal.background);
      expect(await first.evaluate(el => el.matches(':hover'))).toBe(false);
    }
    // Start from a known focus position, then use real keyboard navigation.
    await home.focus();
    await page.keyboard.press('Tab');
    await expect(resume).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(home).toBeFocused();
    await resume.hover();
    expect(await home.evaluate(el => el.matches(':focus-visible'))).toBe(true);
    expect((await styles(home)).outline).toBe('solid');
    expect(parseFloat((await styles(home)).outlineWidth)).toBeGreaterThanOrEqual(2);

    for (const [link, normal] of [[resume, resumeNormal], [home, homeNormal]]) {
      await page.locator('.error-card > p').nth(1).click();
      await link.hover();
      const hovered = await styles(link);
      await page.mouse.down();
      expect(await link.evaluate(el => el.matches(':active'))).toBe(true);
      await expect.poll(async () => (await styles(link)).background).toBe(hovered.background);
      await expect.poll(async () => (await styles(link)).border).toBe(hovered.border);
      expect((await styles(link)).transform).not.toBe('none');
      // Release outside the link to inspect focus without following the link.
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await expect(link).toBeFocused();
      expect(await link.evaluate(el => el.matches(':focus-visible'))).toBe(false);
      await expect.poll(async () => (await styles(link)).background).toBe(normal.background);
    }
    await page.keyboard.press('Tab');
    await expect(resume).toBeFocused();
    expect((await styles(resume)).outline).toBe('solid');
    await testInfo.attach(`buttons-${path.includes('#') ? 'hash' : 'path'}`, {
      body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png'
    });
    await page.keyboard.press('Enter');
    await expectSection(page, 'resume');
  }
});

test('R-BUTTON-02 | Error titles and links use the portfolio wording and preserve recovery semantics', async ({ page }) => {
  for (const path of ['/#resumes', '/404.html']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: '404 — Page Not Found', exact: true })).toBeVisible();
    const home = page.getByRole('link', { name: 'Back to Home', exact: true });
    await expect(home).toHaveAttribute('href', path.includes('#') ? '#about-me' : '/');
    await expect(page.getByRole('link', { name: 'View Resume', exact: true })).toHaveAttribute('href', path.includes('#') ? '#resume' : '/#resume');
    await expect(page.locator('.error-help').getByRole('link', { name: 'Agent Guide', exact: true })).toHaveAttribute('href', '/llms.txt');
    await home.focus();
    await page.keyboard.press('Enter');
    await expectSection(page, 'about-me');
  }
});

test('R-BUTTON-03 | Hamburger mouse focus returns to normal while keyboard focus remains visible', async ({ page }, testInfo) => {
  await page.goto('/#resumes');
  await expectSection(page, 'not-found');
  await expect(page.locator('.preloader')).toHaveCount(0);
  const menu = page.locator('.menu-toggle');
  if (testInfo.project.use.viewport.width >= 1000) {
    await expect(menu).toBeHidden();
    return;
  }
  await page.mouse.move(0, 0);
  const normal = await styles(menu);
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.move(0, 0);
  await expect(menu).toBeFocused();
  expect(await menu.evaluate(el => el.matches(':focus-visible'))).toBe(false);
  await expect.poll(async () => (await styles(menu)).background).toBe(normal.background);
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(menu).toBeFocused();
  expect(await menu.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  expect((await styles(menu)).outline).toBe('solid');
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});
