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
  let sharedAppearance;
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
    const appearance = [homeNormal, resumeNormal].map(({ background, border, color }) => ({ background, border, color }));
    if (sharedAppearance) expect(appearance, 'Hash and standalone 404 actions share the same palette').toEqual(sharedAppearance);
    else sharedAppearance = appearance;
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

const ctaProperties = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
  'color', 'backgroundColor', 'borderColor', 'borderWidth', 'borderStyle', 'borderRadius',
  'padding', 'height', 'alignItems', 'boxShadow', 'transition', 'transform', 'outline', 'outlineOffset'];

async function ctaStates(page, link) {
  const result = {};
  async function capture(name) {
    result[name] = await link.evaluate(async (el, properties) => {
      getComputedStyle(el).color;
      await Promise.all(el.getAnimations().map(animation => animation.finished));
      const style = getComputedStyle(el);
      return Object.fromEntries(properties.map(property => [property, style[property]]));
    }, ctaProperties);
  }
  await page.mouse.move(0, 0);
  await capture('normal');
  const normalWidth = await link.evaluate(el => el.getBoundingClientRect().width);
  await link.hover();
  await capture('hover');
  expect(await link.evaluate(el => el.getBoundingClientRect().width)).toBe(normalWidth);
  expect(result.hover.height).toBe(result.normal.height);
  expect(result.hover.borderWidth).toBe(result.normal.borderWidth);
  await page.mouse.move(0, 0);
  await page.keyboard.press('Tab');
  await link.focus();
  expect(await link.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  await capture('focus');
  await page.mouse.click(0, 0);
  await link.hover();
  await page.mouse.down();
  await capture('active');
  await page.mouse.move(0, 0);
  await page.mouse.up();
  return result;
}

test('R-BUTTON-04 | Both 404 actions match the existing About Me Resume CTA in every interaction state', async ({ page }, testInfo) => {
  await page.goto('/#about-me');
  await expectSection(page, 'about-me');
  await expect(page.locator('.preloader')).toHaveCount(0);
  const reference = await ctaStates(page, page.locator('#resumeLink'));
  const measurements = { reference };
  for (const path of ['/#blog123', '/404.html']) {
    for (const name of ['Back to Home', 'View Resume']) {
      // A fresh document removes prior pointer/keyboard focus from the next sample.
      await page.goto(path);
      if (path.includes('#')) {
        await expectSection(page, 'not-found');
        await expect(page.locator('.preloader')).toHaveCount(0);
      }
      const link = page.getByRole('link', { name, exact: true });
      const measured = await ctaStates(page, link);
      measurements[`${path}: ${name}`] = measured;
      expect(measured).toEqual(reference);
      const layout = await page.locator('.error-actions').evaluate(el => {
        const container = el.getBoundingClientRect();
        const [a, b] = [...el.querySelectorAll('a')].map(link => link.getBoundingClientRect());
        return { contained: [a, b].every(box => box.left >= container.left - 1 && box.right <= container.right + 1),
          separated: a.right <= b.left || a.bottom <= b.top, equalHeights: a.height === b.height };
      });
      expect(layout).toEqual({ contained: true, separated: true, equalHeights: true });
    }
    await testInfo.attach(`cta-${path.includes('#') ? 'hash' : 'standalone'}`, {
      body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png'
    });
  }
  await testInfo.attach('computed-cta-states', { body: Buffer.from(JSON.stringify(measurements, null, 2)), contentType: 'application/json' });
});

async function normalIconBackground(page) {
  return page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-social-bg');
    return probe.style.backgroundColor;
  });
}

test('R-ICON-01 | Pointer release clears icon controls while keyboard focus stays visible', async ({ page }, testInfo) => {
  await page.goto('/#blog123');
  await expectSection(page, 'not-found');
  await expect(page.locator('.preloader')).toHaveCount(0);
  const mobile = Boolean(testInfo.project.use.isMobile);
  const theme = page.locator(mobile ? '.mobile-theme-toggle' : '.header .theme-toggle-btn');
  const activate = locator => mobile ? locator.tap() : locator.click();
  for (let repeat = 0; repeat < 2; repeat++) {
    const before = await page.locator('html').getAttribute('data-theme');
    // Start a separate pointer interaction after the preceding keyboard check.
    if (!mobile) await page.mouse.click(0, 0);
    await activate(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', before === 'light' ? 'dark' : 'light');
    if (!mobile) await page.mouse.move(0, 0);
    async function verifyControl(control) {
      await expect.poll(async () => (await styles(control)).background).toBe(await normalIconBackground(page));
      expect((await styles(control)).outline).toBe('none');
      expect((await styles(control)).transform).toBe('none');
      await control.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(control).toBeFocused();
      expect(await control.evaluate(el => el.matches(':focus-visible'))).toBe(true);
      expect((await styles(control)).outline).toBe('solid');
      expect(parseFloat((await styles(control)).outlineWidth)).toBeGreaterThanOrEqual(2);
    }
    await verifyControl(theme);
    if (mobile) {
      const menu = page.locator('.menu-toggle');
      await activate(menu);
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await verifyControl(menu);
    }
    if (mobile) {
      await page.keyboard.press('Escape');
      await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    }
  }
});

test('R-ICON-02 | Closing the drawer restores keyboard focus without stealing pointer focus', async ({ page }, testInfo) => {
  await page.goto('/#blog123');
  await expectSection(page, 'not-found');
  await expect(page.locator('.preloader')).toHaveCount(0);
  const menu = page.locator('.menu-toggle');
  if (!testInfo.project.use.isMobile) { await expect(menu).toBeHidden(); return; }
  await menu.tap();
  const theme = page.locator('.mobile-theme-toggle');
  await theme.tap();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(theme).toBeFocused();
  await menu.tap();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  expect(await menu.evaluate(el => el.matches(':focus-visible'))).toBe(true);
});

test('R-ICON-03 | Hover motion respects the input device and reduced-motion preference', async ({ page }, testInfo) => {
  await page.goto('/#about-me');
  await expectSection(page, 'about-me');
  await expect(page.locator('.preloader')).toHaveCount(0);
  const mobile = Boolean(testInfo.project.use.isMobile);
  const theme = page.locator(mobile ? '.mobile-theme-toggle' : '.header .theme-toggle-btn');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (mobile) {
    await theme.tap();
    expect((await styles(theme)).transform).toBe('none');
  } else {
    await theme.hover();
    expect((await styles(theme)).transform).not.toBe('none');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await styles(theme)).transform).toBe('none');
  }
  await page.goto('/#resume');
  await expectSection(page, 'resume');
  const info = page.locator('.resume-personality-info');
  await page.keyboard.press('Tab');
  await info.focus();
  expect(await info.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  expect((await styles(info)).outline).toBe('solid');
});

test('R-ICON-04 | Trust-page theme controls remain aligned and keyboard accessible', async ({ page }) => {
  for (const path of ['/about/', '/contact/', '/privacy/']) {
    await page.goto(path);
    const theme = page.locator('.theme-toggle-btn');
    const alignment = await theme.evaluate(el => {
      const button = el.getBoundingClientRect(), nav = el.closest('nav').getBoundingClientRect();
      return { right: button.right, navRight: nav.right, width: button.width, height: button.height };
    });
    expect(Math.abs(alignment.right - alignment.navRight)).toBeLessThanOrEqual(1);
    expect(alignment.width).toBe(alignment.height);
    await page.keyboard.press('Tab');
    await theme.focus();
    expect((await styles(theme)).outline).toBe('solid');
  }
});
