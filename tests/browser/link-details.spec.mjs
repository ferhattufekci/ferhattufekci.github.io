import { test, expect, expectSection } from './fixtures.mjs';

const fontProperties = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight'];
// Captured in Chromium before this change, in all six viewport/theme projects.
const contactFontBefore = {
  fontFamily: 'Poppins, Helvetica, sans-serif', fontSize: '14px', fontWeight: '600',
  fontStyle: 'normal', letterSpacing: 'normal', lineHeight: '24px'
};
const referenceFontBefore = { ...contactFontBefore, fontSize: '11px', lineHeight: '25.9px' };
async function font(locator) {
  return locator.evaluate((el, keys) => {
    const style = getComputedStyle(el);
    return Object.fromEntries(keys.map(key => [key, style[key]]));
  }, fontProperties);
}
async function openContact(page) {
  await page.goto('/#contact');
  await expectSection(page, 'contact');
  await expect(page.locator('.preloader')).toHaveCount(0);
}
async function openDrawerIfMobile(page) {
  const toggle = page.locator('.menu-toggle');
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
}
async function verifyIcon(page, link) {
  const icon = link.locator('svg');
  await expect(icon).toHaveCount(1);
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expect(icon).toHaveAttribute('focusable', 'false');
  expect(await icon.getAttribute('tabindex')).toBeNull();
  const paths = locator => locator.locator('path').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
  expect(await paths(icon)).toEqual(await paths(page.locator('.resume-personality-link-hint svg')));
  expect(await icon.evaluate(el => getComputedStyle(el).fill)).toBe(await icon.evaluate(el => getComputedStyle(el.parentElement).color));
  const bounds = await icon.evaluate(el => {
    const box = el.getBoundingClientRect(), container = el.closest('a').getBoundingClientRect();
    const word = document.createRange();
    word.selectNodeContents(el.previousSibling);
    const text = word.getBoundingClientRect();
    return { left: box.left, right: box.right, width: box.width, outerLeft: container.left, outerRight: container.right,
      gap: box.left - text.right, centerDifference: Math.abs((box.top + box.bottom - text.top - text.bottom) / 2) };
  });
  expect(bounds.width).toBeGreaterThan(0);
  expect(bounds.left).toBeGreaterThanOrEqual(bounds.outerLeft - 1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.outerRight + 1);
  expect(bounds.gap).toBeCloseTo(3, 0);
  expect(bounds.centerDifference).toBeLessThanOrEqual(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function keyboardFocus(page, link) {
  await link.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  expect(await link.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
}

test('R-LINK-01 | Privacy inherits copyright typography, keeps theme color and supports icon/keyboard navigation', async ({ page }, testInfo) => {
  await openContact(page);
  await openDrawerIfMobile(page);
  const copyright = page.locator('.header .copyrights');
  const privacy = copyright.getByRole('link', { name: 'Privacy', exact: true });
  expect(await font(privacy)).toEqual(await font(copyright));
  expect((await copyright.textContent()).replace(/\s+/g, ' ').trim()).toBe('©2010 All Rights Reserved. Privacy');
  expect(await privacy.evaluate(el => getComputedStyle(el).color)).toBe(
    await page.locator('.resume-personality-link-hint').evaluate(el => getComputedStyle(el).color)
  );
  await expect(privacy).toHaveAttribute('href', '/privacy/');
  expect(await privacy.getAttribute('target')).toBeNull();
  await verifyIcon(page, privacy);
  const normalColor = await privacy.evaluate(el => getComputedStyle(el).color);
  await privacy.hover();
  await expect.poll(() => privacy.evaluate(el => getComputedStyle(el).color)).not.toBe(normalColor);
  await copyright.click({ position: { x: 2, y: 2 } });
  await page.mouse.move(0, 0);
  await expect.poll(() => privacy.evaluate(el => getComputedStyle(el).color)).toBe(normalColor);
  await keyboardFocus(page, privacy);
  await testInfo.attach('privacy-typography', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/privacy\/$/);
  await openContact(page);
  await openDrawerIfMobile(page);
  await page.locator('.copyrights a svg').click();
  await expect(page).toHaveURL(/\/privacy\/$/);
});

test('R-LINK-02 | Contact icons preserve text fonts and new-tab destinations without changing the reference link', async ({ page, context }, testInfo) => {
  const destinations = [
    ['Set Up A Job Interview', 'https://calendly.com/ferhattufekci/60min'],
    ['All My Links', 'https://linktr.ee/ferhattufekci']
  ];
  for (const [name, url] of destinations) {
    // Fulfill the navigation locally: no third-party page or appointment is opened.
    await context.route(url, route => route.fulfill({ contentType: 'text/html', body: '<title>Navigation verified</title>' }));
    await openContact(page);
    const link = page.getByRole('link', { name: `${name} (opens in a new tab)`, exact: true });
    await expect(link).toHaveAttribute('href', url);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(await font(link.locator('.contact-info-link > span'))).toEqual(contactFontBefore);
    expect(await font(page.locator('.resume-personality-link-hint'))).toEqual(referenceFontBefore);
    expect(await page.locator('.resume-personality-link-hint svg').evaluate(el => {
      const s = getComputedStyle(el); return [s.width, s.height, s.opacity];
    })).toEqual(['16px', '16px', '0.85']);
    await verifyIcon(page, link);
    await link.hover();
    expect(await font(link.locator('.contact-info-link > span'))).toEqual(contactFontBefore);
    await keyboardFocus(page, link);
    await testInfo.attach(`contact-${name.startsWith('Set') ? 'interview' : 'links'}`, {
      body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png'
    });
    for (const activate of [
      () => page.keyboard.press('Enter'),
      () => link.locator('svg').click()
    ]) {
      const popupPromise = page.waitForEvent('popup');
      await activate();
      const popup = await popupPromise;
      await expect(popup).toHaveURL(url);
      await expect(popup).toHaveTitle('Navigation verified');
      await popup.close();
      await expectSection(page, 'contact');
    }
  }
});

test('R-LINK-03 | The Illinois certificate follows STG and retains the existing typography, layout and new-tab behavior', async ({ page, context }, testInfo) => {
  const url = 'https://www.coursera.org/account/accomplishments/verify/F2T8N49M4JQ7';
  await context.route(url, route => route.fulfill({ contentType: 'text/html', body: '<title>Certificate destination verified</title>' }));
  await page.goto('/#resume');
  await expectSection(page, 'resume');
  const section = page.locator('.resume-section').filter({ has: page.getByRole('heading', { name: 'Certifications', exact: true }) });
  // Later credentials are progressively disclosed; their existing link behavior stays the same.
  await section.locator('summary').click();
  const previous = section.locator('.timeline-item').filter({ hasText: 'STG Mühendislik' });
  const course = section.locator('.timeline-item').filter({ hasText: 'University of Illinois Urbana-Champaign' });
  const link = course.getByRole('link', { name: 'Object-Oriented Data Structures in C++', exact: true });
  await expect(course).toHaveCount(1);
  expect(await previous.evaluate(el => el.nextElementSibling.querySelector('.item-period').textContent)).toBe('University of Illinois Urbana-Champaign');
  await expect(link).toHaveAttribute('href', url);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await link.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  for (const selector of ['.item-period', '.item-title', '.resume-cert-title-link']) {
    const computed = locator => locator.evaluate(el => {
      const s = getComputedStyle(el);
      return [s.fontFamily, s.fontSize, s.fontWeight, s.fontStyle, s.lineHeight, s.letterSpacing, s.color, s.margin, s.padding];
    });
    expect(await computed(course.locator(selector))).toEqual(await computed(previous.locator(selector)));
  }
  for (const selector of ['.left-part', '.right-part']) {
    const bounds = el => { const r = el.getBoundingClientRect(); return { x: r.x, width: r.width }; };
    expect(await course.locator(selector).evaluate(bounds)).toEqual(await previous.locator(selector).evaluate(bounds));
  }
  const underline = locator => locator.evaluate(async el => {
    getComputedStyle(el).textDecorationColor;
    await Promise.allSettled(el.getAnimations().map(animation => animation.finished));
    const s = getComputedStyle(el); return [s.textDecorationLine, s.textDecorationColor, s.textUnderlineOffset];
  });
  await previous.locator('a').hover();
  const hover = await underline(previous.locator('a'));
  await link.hover();
  expect(await underline(link)).toEqual(hover);
  await page.keyboard.press('Tab');
  await link.focus();
  expect(await link.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  expect((await underline(link))[0]).toContain('underline');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await testInfo.attach('certifications', { body: await section.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  for (const activate of [() => page.keyboard.press('Enter'), () => link.click()]) {
    const popupPromise = page.waitForEvent('popup');
    await activate();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(url);
    await expect(popup).toHaveTitle('Certificate destination verified');
    await popup.close();
    await expectSection(page, 'resume');
  }
});
