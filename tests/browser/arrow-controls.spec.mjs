import { test, expect, expectSection, isolateThirdParties } from './fixtures.mjs';

async function arrowStyle(arrow) {
  return arrow.evaluate(async el => {
    getComputedStyle(el).color;
    await Promise.allSettled(el.getAnimations().map(animation => animation.finished));
    const s = getComputedStyle(el);
    return { color: s.color, background: s.backgroundColor, border: s.borderColor,
      shadow: s.boxShadow, outline: s.outlineStyle, outlineWidth: s.outlineWidth,
      hover: el.matches(':hover'), active: el.matches(':active'), focusVisible: el.matches(':focus-visible') };
  });
}
async function palette(page) {
  return page.locator('.lmpixels-arrow-right').evaluate(el => {
    const probe = document.createElement('span');
    el.appendChild(probe);
    const colors = {};
    for (const [key, token] of Object.entries({ normal: '--color-text-primary', accent: '--color-accent', surface: '--color-surface-alt' })) {
      probe.style.color = `var(${token})`;
      colors[key] = getComputedStyle(probe).color;
    }
    probe.remove();
    return colors;
  });
}
async function touch(page, arrow, hasTouch) {
  if (hasTouch) return arrow.tap();
  // Chromium can dispatch genuine touch input while retaining a fine/hovering
  // primary mouse: this exercises mixed input rather than a mouse click.
  const box = await arrow.boundingBox(), session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await session.detach(); }
}

test('R-ARROW-01 | Touch releases both arrows without sticky color through cycles, theme changes and both motion modes', async ({ page }, info) => {
  test.setTimeout(90000);
  const evidence = [];
  for (const reducedMotion of ['reduce', 'no-preference']) {
    await page.emulateMedia({ reducedMotion, colorScheme: info.project.use.colorScheme });
    await page.goto('/#about-me');
    await expectSection(page, 'about-me');
    await expect(page.locator('.preloader')).toHaveCount(0);
    const sequence = [
      ['right','resume'], ['right','blog'], ['right','projects'], ['right','contact'], ['right','about-me'],
      ['left','contact'], ['left','projects'], ['left','blog'], ['left','resume'], ['left','about-me'],
      ['right','resume'], ['left','about-me']
    ];
    for (const [direction, section] of sequence) {
      const arrow = page.locator(`.lmpixels-arrow-${direction}`);
      await touch(page, arrow, info.project.use.hasTouch);
      await expectSection(page, section);
      await expect(page).toHaveURL(new RegExp(`#${section}$`));
      const colors = await palette(page);
      await expect.poll(async () => (await arrowStyle(arrow)).color).toBe(colors.normal);
      const state = await arrowStyle(arrow);
      expect(state.color).toBe(colors.normal);
      expect(state.background).toBe(colors.surface);
      expect(state.active).toBe(false);
      expect(state.focusVisible).toBe(false);
      evidence.push({ reducedMotion, direction, section, state });
    }
    // A media-driven theme change does not move the pointer or clear its hover.
    const nextTheme = info.project.use.colorScheme === 'dark' ? 'light' : 'dark';
    await page.emulateMedia({ colorScheme: nextTheme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', nextTheme);
    const colors = await palette(page);
    expect((await arrowStyle(page.locator('.lmpixels-arrow-left'))).color).toBe(colors.normal);
    await info.attach(`arrows-touch-${reducedMotion}`, { body: await page.screenshot(), contentType: 'image/png' });
  }
  await info.attach('arrow-touch-states', { body: Buffer.from(JSON.stringify(evidence)), contentType: 'application/json' });
});

test('R-ARROW-02 | A real mouse hover ends on leave and keyboard focus and native Enter/Space activation remain visible', async ({ browser, siteOrigin }, info) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false, colorScheme: info.project.use.colorScheme, reducedMotion: 'reduce' });
  try {
    await isolateThirdParties(context, siteOrigin);
    const page = await context.newPage();
    await page.goto(`${siteOrigin}/#about-me`);
    await expect(page.locator('.preloader')).toHaveCount(0);
    const left = page.getByRole('button', { name: 'Previous page', exact: true });
    const right = page.getByRole('button', { name: 'Next page', exact: true });
    for (const arrow of [left, right]) {
      await expect(arrow).toHaveAttribute('type', 'button');
      const colors = await palette(page);
      await arrow.hover();
      expect((await arrowStyle(arrow)).color).toBe(colors.accent);
      await page.mouse.move(0, 0);
      expect((await arrowStyle(arrow)).color).toBe(colors.normal);
    }
    await left.focus();
    await page.keyboard.press('Tab');
    await expect(right).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(left).toBeFocused();
    const focus = await arrowStyle(left);
    expect(focus.focusVisible).toBe(true);
    expect(focus.outline).toBe('solid');
    expect(parseFloat(focus.outlineWidth)).toBeGreaterThanOrEqual(2);
    await page.keyboard.press('Enter');
    await expectSection(page, 'contact');
    await page.keyboard.press('Tab');
    await expect(right).toBeFocused();
    await page.keyboard.press('Space');
    await expectSection(page, 'about-me');
    await expect(right).toBeFocused();
    expect((await arrowStyle(right)).focusVisible).toBe(true);
  } finally { await context.close(); }
});

test('R-ARROW-03 | Press feedback is transient and releasing a canceled mouse press does not navigate', async ({ browser, siteOrigin }, info) => {
  const context = await browser.newContext({ isMobile: false, hasTouch: false, colorScheme: info.project.use.colorScheme, reducedMotion: 'reduce' });
  try {
    await isolateThirdParties(context, siteOrigin);
    const page = await context.newPage();
    await page.goto(`${siteOrigin}/#about-me`);
    await expect(page.locator('.preloader')).toHaveCount(0);
    for (const direction of ['left','right']) {
      const arrow = page.locator(`.lmpixels-arrow-${direction}`), colors = await palette(page);
      await arrow.hover();
      await page.mouse.down();
      const pressed = await arrowStyle(arrow);
      expect(pressed.active).toBe(true);
      expect(pressed.color).toBe(colors.accent);
      expect(pressed.border).toBe(colors.accent);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      const released = await arrowStyle(arrow);
      expect(released.active).toBe(false);
      expect(released.color).toBe(colors.normal);
      await expectSection(page, 'about-me');
    }
  } finally { await context.close(); }
});
