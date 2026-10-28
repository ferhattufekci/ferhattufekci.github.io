import AxeBuilder from '@axe-core/playwright';
import { test, expect, expectSection } from './fixtures.mjs';
import { mockCatalog, starred } from './data/catalog.mjs';

// Reach controls by the user's sequential navigation, never by element.focus().
async function tabTo(page, target, reverse) {
  if (reverse === undefined) reverse = await target.evaluate(el =>
    !!(document.activeElement.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING));
  for (let n = 0; n < 200; n++) {
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
    if (await target.evaluate(el => el === document.activeElement)) return;
  }
  throw new Error(`Unreachable by ${reverse ? 'Shift+Tab' : 'Tab'}: ${target}`);
}
async function visibleFocus(target) {
  await expect(target).toBeFocused();
  await expect(target).toBeInViewport();
  await expect.poll(() => target.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)), {
    message: await target.evaluate(el => `Visible focus ring on ${el.outerHTML.slice(0, 200)}`)
  }).toBeGreaterThanOrEqual(2);
  const state = await target.evaluate(el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth - 1, r.left + r.width / 2));
    const y = Math.max(0, Math.min(innerHeight - 1, r.top + Math.min(r.height / 2, 12)));
    const top = document.elementFromPoint(x, y);
    return { visible: el.matches(':focus-visible'), outline: s.outlineStyle, width: parseFloat(s.outlineWidth),
      unobscured: !!top && (el.contains(top) || top.contains(el)), inert: !!el.closest('[inert]') };
  });
  expect(state).toMatchObject({ visible: true, outline: 'solid', unobscured: true, inert: false });
  expect(state.width).toBeGreaterThanOrEqual(2);
}
async function ready(page, path) {
  const response = await page.goto(path);
  if (!response) await page.reload(); // A fresh deep-link document, not an in-page hash change.
  await expect(page.locator('.preloader')).toHaveCount(0);
}

test('R-KEYBOARD-01 | Every page has a visible sequential focus order, working skip link and no hidden-page tab stops', async ({ page }, info) => {
  test.setTimeout(120000);
  await mockCatalog(page);
  const evidence = [];
  for (const path of ['/', '/#resume', '/#blog', '/#projects', '/#contact', '/about/', '/contact/', '/privacy/', '/404.html']) {
    await ready(page, path);
    const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
    await tabTo(page, skip);
    await visibleFocus(skip);
    if (path === '/#blog' || path === '/#projects') await expect(page.locator(path === '/#blog' ? '#blog-loading' : '#proj-loading')).toBeHidden();
    const expected = await page.evaluate(() => [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')]
      .filter(el => el.tabIndex >= 0 && !el.closest('[inert]') && el.getClientRects().length && getComputedStyle(el).visibility === 'visible')
      .map((el, index) => { el.dataset.keyboardAuditId = String(index); return String(index); }));
    const visited = new Set([await skip.getAttribute('data-keyboard-audit-id')]), order = [];
    // Traverse from the first document stop. Browser chrome focus after the last
    // stop is engine-specific; do not mistake that for a website keyboard trap.
    for (let n = 0; n < 200; n++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement === document.body)) break;
      const active = page.locator(':focus');
      const key = await active.evaluate(el => {
        if (!el.dataset.keyboardAuditId) el.dataset.keyboardAuditId = String(document.querySelectorAll('[data-keyboard-audit-id]').length);
        return el.dataset.keyboardAuditId;
      });
      if (visited.has(key)) break;
      visited.add(key);
      await visibleFocus(active);
      order.push(await active.evaluate(el => ({ tag: el.tagName, name: (el.getAttribute('aria-label') || el.textContent || el.title).trim().slice(0,80), href: el.getAttribute('href') })));
    }
    expect(visited.size).toBeGreaterThan(5);
    expect([...visited].sort(), `Complete Tab order for ${path}`).toEqual(expected.sort());
    expect(await page.locator('[tabindex]').evaluateAll(els => els.some(el => Number(el.getAttribute('tabindex')) > 0))).toBe(false);
    await tabTo(page, skip, true);
    await visibleFocus(skip);
    const before = page.url();
    await page.keyboard.press('Enter');
    if (path === '/404.html' || path.includes('#') || path === '/') expect(page.url()).toBe(before);
    expect(await page.evaluate(() => document.activeElement.closest('#main') !== null)).toBe(true);
    evidence.push({ path, order });
  }
  await info.attach('keyboard-page-orders', { body: Buffer.from(JSON.stringify(evidence, null, 2)), contentType: 'application/json' });
});

test('R-KEYBOARD-02 | Menu, theme and route history have predictable focus under both motion preferences and enlarged text', async ({ page }, info) => {
  test.setTimeout(90000);
  for (const reducedMotion of ['reduce', 'no-preference']) {
    await page.emulateMedia({ reducedMotion });
    await ready(page, '/');
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const mobile = await page.locator('.menu-toggle').isVisible();
    const theme = page.locator(mobile ? '.mobile-theme-toggle' : '.header .theme-toggle-btn');
    await tabTo(page, theme);
    await visibleFocus(theme);
    const oldTheme = await page.locator('html').getAttribute('data-theme');
    await page.keyboard.press('Space');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', oldTheme);
    await visibleFocus(theme);
    if (mobile) {
      const toggle = page.locator('.menu-toggle');
      await tabTo(page, toggle);
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('.site-main-menu a').first()).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(toggle).toBeFocused();
      await visibleFocus(toggle);
      await page.keyboard.press('Space');
    }
    const resume = page.locator('.site-main-menu a[href="#resume"]');
    await tabTo(page, resume);
    await visibleFocus(resume);
    await page.keyboard.press('Enter');
    await expectSection(page, 'resume');
    await expect(resume).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#resume .section-title')).toBeFocused();
    const jump = page.getByRole('button', { name: 'Summary', exact: true });
    await tabTo(page, jump);
    await page.keyboard.press('Space');
    const heading = page.locator('#resume-summary h3').first();
    await expect(heading).toBeFocused();
    await page.keyboard.press('Tab');
    await visibleFocus(page.locator(':focus'));
    const right = page.getByRole('button', { name: 'Next page', exact: true });
    await tabTo(page, right);
    await page.keyboard.press('Enter');
    await expectSection(page, 'blog');
    await visibleFocus(right);
    await page.goBack();
    await expectSection(page, 'resume');
    expect(await page.evaluate(() => !document.activeElement.closest('[inert]'))).toBe(true);
    await page.goForward();
    await expectSection(page, 'blog');
    await info.attach(`keyboard-navigation-${reducedMotion}`, { body: await page.screenshot(), contentType: 'image/png' });
  }
});

test('R-KEYBOARD-03 | Filters retain focus, disclosures keep native keyboard behavior and dismissing information retains its trigger', async ({ page }) => {
  await mockCatalog(page);
  await ready(page, '/#blog');
  const language = page.getByRole('button', { name: /English|EN/, exact: true });
  await tabTo(page, language);
  await page.keyboard.press('Space');
  await expect(language).toHaveAttribute('aria-pressed', 'true');
  await visibleFocus(language);
  const category = page.locator('[data-id="blog"] [data-group="category_testing"]');
  await tabTo(page, category);
  await page.keyboard.press('Enter');
  await expect(category).toHaveAttribute('aria-pressed', 'true');
  await visibleFocus(category);
  await ready(page, '/#resume');
  const info = page.getByRole('button', { name: 'Why is this shared?', exact: true });
  await tabTo(page, info);
  await page.keyboard.press('Enter');
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#personality-info-tip')).toHaveCSS('opacity', '0');
  await visibleFocus(info);
  await page.keyboard.press('Space');
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(info).toHaveAttribute('aria-expanded', 'false');
  await visibleFocus(info);
  const summary = page.locator('#resume details > summary').first();
  await tabTo(page, summary);
  await visibleFocus(summary);
  await page.keyboard.press('Enter');
  await expect(summary.locator('..')).toHaveAttribute('open', '');
  await page.keyboard.press('Space');
  await expect(summary.locator('..')).not.toHaveAttribute('open', '');
  await visibleFocus(summary);
  const pdf = page.locator('.resume-bottom-cta a');
  await tabTo(page, pdf);
  await visibleFocus(pdf);
  await expect(pdf).toHaveAttribute('href', 'FerhatTufekci_CV.pdf');
});

test('R-KEYBOARD-04 | Loading the final starred page moves focus out of its disappearing Show More control', async ({ page }) => {
  await mockCatalog(page, { 'github-starred.json': starred(21) });
  await ready(page, '/#projects');
  const more = page.locator('#proj-starred-more-btn');
  await tabTo(page, more);
  await visibleFocus(more);
  const before = await page.locator('#proj-starred-grid > *').count();
  await page.keyboard.press('Enter');
  await expect(more).toBeHidden();
  const next = page.locator('#proj-starred-grid > *').nth(before).locator('a').first();
  await expect(next).toBeFocused();
  await visibleFocus(next);
});

test('R-KEYBOARD-05 | All site routes expose valid keyboard semantics and accessible names', async ({ page }, info) => {
  test.setTimeout(120000);
  await mockCatalog(page);
  const reports = [];
  for (const route of ['/', '/#resume', '/#blog', '/#projects', '/#contact', '/about/', '/contact/', '/privacy/', '/404.html']) {
    await ready(page, route);
    const result = await new AxeBuilder({ page }).withRules([
      'accesskeys', 'aria-allowed-attr', 'aria-hidden-focus', 'aria-valid-attr-value', 'button-name',
      'bypass', 'duplicate-id-aria', 'link-name', 'nested-interactive', 'scrollable-region-focusable', 'tabindex'
    ]).analyze();
    reports.push({ route, violations: result.violations, incomplete: result.incomplete });
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  }
  await info.attach('keyboard-axe-results', { body: Buffer.from(JSON.stringify(reports, null, 2)), contentType: 'application/json' });
});

test('R-KEYBOARD-06 | Contact links have one text-sized focus box covering every word and decorative external icon', async ({ page }, info) => {
  await ready(page, '/#contact');
  for (const link of await page.locator('[data-id="contact"] .contact-card-title a').all()) {
    await tabTo(page, link);
    await visibleFocus(link);
    const geometry = await link.evaluate(el => {
      const box = el.getBoundingClientRect(), range = document.createRange();
      range.selectNodeContents(el);
      return { fragments: el.getClientRects().length, width: box.width, height: box.height,
        containsText: [...range.getClientRects()].every(r => r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1) };
    });
    expect(geometry).toMatchObject({ fragments: 1, containsText: true });
    expect(geometry.width).toBeGreaterThan(70);
    expect(geometry.height).toBeGreaterThan(14);
    await info.attach(`contact-focus-${await link.getAttribute('href')}`, { body: await page.screenshot(), contentType: 'image/png' });
  }
});

test('R-KEYBOARD-07 | At 200% CSS zoom navigation, filters and Contact links remain reachable with unobscured focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ['/#blog', '/#contact']) {
    await ready(page, route);
    await page.locator('body').evaluate(el => { el.style.zoom = '2'; });
    expect(await page.locator('body').evaluate(el => getComputedStyle(el).zoom)).toBe('2');
    const controls = route.includes('blog') ? page.locator('[data-id="blog"] button') : page.locator('[data-id="contact"] .contact-card-title a');
    for (const control of await controls.all()) {
      await tabTo(page, control);
      await visibleFocus(control);
    }
  }
});

test('R-KEYBOARD-08 | Direct and menu entries start at each page control strip and content ends at the previous/next arrows', async ({ page }) => {
  test.setTimeout(90000);
  await mockCatalog(page, { 'github-meta.json': { lastUpdated: '2026-10-28T00:00:00Z' } });
  for (const entry of ['direct', 'menu']) for (const id of ['resume', 'blog', 'projects', 'contact']) {
    if (entry === 'direct') await ready(page, `/#${id}`);
    else {
      await ready(page, '/');
      if (await page.locator('.menu-toggle').isVisible()) await page.locator('.menu-toggle').click();
      await page.locator(`.site-main-menu a[href="#${id}"]`).click();
      await expectSection(page, id);
    }
    const section = page.locator(`.pt-page[data-id="${id}"]`);
    await expect(section.locator('.section-title')).toBeFocused();
    const strip = id === 'resume' ? section.locator('[data-resume-target]').all() :
      id === 'blog' ? section.locator('.blog-lang-toggle button').all() :
      id === 'projects' ? section.locator('#proj-updated, [data-group="proj_all"]').all() : [];
    for (const target of await strip) {
      await page.keyboard.press('Tab');
      await visibleFocus(target);
    }
    if (id === 'projects') await expect(section.locator('.proj-card').first()).toBeVisible();
    const last = section.locator(':is(a[href],button,summary,[tabindex="0"]):visible').last();
    await tabTo(page, last);
    await page.keyboard.press('Tab');
    const left = page.getByRole('button', { name: 'Previous page', exact: true });
    const right = page.getByRole('button', { name: 'Next page', exact: true });
    await visibleFocus(left);
    await page.keyboard.press('Shift+Tab');
    await visibleFocus(last);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await visibleFocus(right);
  }
});
