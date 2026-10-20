import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { test, expect, expectSection, isolateThirdParties, navigateToSection } from './fixtures.mjs';

test('R-404-02 | Given an unknown section, when opened, then an accessible recovery view appears', async ({ page }, testInfo) => {
  await test.step('Given an unknown fragment', async () => {
    const response = await page.goto('/#resumes');
    expect(response.status()).toBe(200);
  });
  await test.step('When the application resolves the fragment', async () => {
    await expectSection(page, 'not-found');
    await expect(page.locator('.preloader')).toHaveCount(0);
  });
  await test.step('Then the heading receives focus and keyboard navigation can recover', async () => {
    await expect(page.getByRole('heading', { name: '404 — Page Not Found', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await testInfo.attach('hash-404', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Back to Home', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expectSection(page, 'about-me');
  });
});

test('R-NAV-02 | Given malformed or unknown routes, when changed, then no blank section appears', async ({ page }) => {
  await page.goto('/#resume');
  await expectSection(page, 'resume');
  for (const hash of ['#res', '#resumes', '#resume/nope', '#%E0%A4%A', '#%22%5D', '#constructor']) {
    await test.step(`When fragment becomes ${hash}`, async () => {
      await page.evaluate(value => { location.hash = value; }, hash);
      await expectSection(page, 'not-found');
    });
  }
  await page.getByRole('link', { name: 'View Resume', exact: true }).click();
  await expectSection(page, 'resume');
});

test('R-NAV-04 | Given route history, when back and forward are used, then the correct view returns', async ({ page }) => {
  await page.goto('/#resume');
  await expectSection(page, 'resume');
  await page.evaluate(() => { location.hash = '#resumes'; });
  await expectSection(page, 'not-found');
  await page.goBack();
  await expectSection(page, 'resume');
  await page.goForward();
  await expectSection(page, 'not-found');
});

test('R-NAV-01 | Given existing navigation, when each menu item is selected, then its section opens', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.preloader')).toHaveCount(0);
  for (const id of ['about-me', 'resume', 'blog', 'projects', 'contact']) {
    await navigateToSection(page, id);
  }
  await page.evaluate(() => { location.hash = ''; });
  await expectSection(page, 'about-me');
});

test('R-NAV-05 | Given animation in progress, when an invalid route interrupts it, then recovery still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expectSection(page, 'about-me');
  await expect(page.locator('.preloader')).toHaveCount(0);
  await page.evaluate(() => {
    document.querySelector('.site-main-menu a[href="#resume"]').click();
    location.hash = '#resumes';
  });
  await expectSection(page, 'not-found');
  await page.getByRole('link', { name: 'View Resume', exact: true }).click();
  await expectSection(page, 'resume');
});

test('R-NAV-07 | Given repeated initialization, when navigating, then one controller and recovery view remain', async ({ page }) => {
  await page.goto('/#resume');
  await expectSection(page, 'resume');
  await page.evaluate(() => {
    PageTransitions.init({ menu: 'ul.site-main-menu' });
    PageTransitions.init({ menu: 'ul.site-main-menu' });
    location.hash = '#resumes';
  });
  await expect(page.locator('#page-ajax-loaded')).toHaveCount(1);
  await expect(page.locator('#route-not-found')).toHaveCount(1);
  await expectSection(page, 'not-found');
  await page.getByRole('link', { name: 'View Resume', exact: true }).click();
  await expectSection(page, 'resume');
});

test('R-404-01 | Given a missing path, when HTML or Markdown is requested, then the true status stays 404', async ({ page, request }, testInfo) => {
  const token = randomUUID();
  const paths = [`/__bdd-missing-${token}`, `/__bdd-missing-${token}/deep/path`];
  for (const path of paths) for (const accept of ['text/html', 'text/markdown']) {
    const response = await request.get(path, { headers: { Accept: accept } });
    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('text/html');
    expect(await response.text()).toContain('/llms.txt');
  }
  expect((await page.goto(paths[1])).status()).toBe(404);
  await expect(page.getByRole('heading', { name: '404 — Page Not Found', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await testInfo.attach('path-404', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await page.getByRole('link', { name: 'View Resume', exact: true }).click();
  await expectSection(page, 'resume');
});

test('R-THEME-04 | Given a theme preference, when toggled and reloaded, then the choice persists', async ({ page }, testInfo) => {
  await page.goto('/404.html');
  const initial = testInfo.project.use.colorScheme;
  await expect(page.locator('html')).toHaveAttribute('data-theme', initial);
  await page.getByRole('button', { name: /Switch to/ }).click();
  const next = initial === 'dark' ? 'light' : 'dark';
  await expect(page.locator('html')).toHaveAttribute('data-theme', next);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', next);
});

test('R-THEME-02 | Given corrupt stored preferences, when loading, then OS preference remains usable', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('ft-theme', 'invalid'); }
    catch { /* The target page can use storage after navigation. */ }
  });
  await page.goto('/404.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.use.colorScheme);
});

test('R-CONTENT-03 | Given JavaScript disabled, when browsing, then profile and trust content remain readable', async ({ browser, siteOrigin }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport, colorScheme: testInfo.project.use.colorScheme });
  await isolateThirdParties(context, siteOrigin);
  try {
    const page = await context.newPage();
    await page.goto(siteOrigin);
    await expect(page.getByRole('heading', { name: 'Resume', exact: true })).toBeVisible();
    await expect(page.locator('#h-m')).toBeVisible();
    for (const path of ['/about/', '/contact/', '/privacy/']) {
      expect((await page.goto(siteOrigin + path)).status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
    }
  } finally { await context.close(); }
});

test('R-A11Y-01 | Error and trust views introduce no WCAG violations beyond the unchanged shell and Resume CTA', async ({ page }, testInfo) => {
  const tags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
  await page.goto('/#about-me');
  await expectSection(page, 'about-me');
  await expect(page.locator('.preloader')).toHaveCount(0);
  const reference = page.locator('#resumeLink');
  await reference.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const palette = element => {
    const style = getComputedStyle(element);
    return [style.color, style.backgroundColor, style.fontSize, style.fontWeight];
  };
  const referencePalette = await reference.evaluate(palette);
  // The hero uses layered imagery, which makes axe's contrast result inconclusive.
  // Audit an unchanged clone on the same theme surface as the error card instead.
  await reference.evaluate(element => {
    const surface = document.createElement('div');
    surface.id = 'cta-a11y-surface';
    surface.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:20px;background:var(--color-surface);z-index:9999';
    const clone = element.cloneNode(true);
    clone.id = 'cta-a11y-baseline';
    surface.appendChild(clone);
    document.body.appendChild(surface);
  });
  expect(await page.locator('#cta-a11y-baseline').evaluate(palette)).toEqual(referencePalette);
  const baseline = await new AxeBuilder({ page }).withTags(tags)
    .include('#site_header').include('.mobile-header').include('#cta-a11y-baseline').analyze();
  const knownTargets = new Set(baseline.violations.flatMap(issue => issue.nodes.map(node => issue.id + JSON.stringify(node.target))));
  const referenceContrastIssue = baseline.violations.some(issue => issue.id === 'color-contrast' && issue.nodes.some(node => node.target.some(selector => selector.startsWith('#cta-a11y-baseline'))));
  await page.locator('#cta-a11y-surface').evaluate(element => element.remove());
  const inherited = [];
  for (const path of ['/#resumes', '/404.html', '/about/', '/contact/', '/privacy/']) {
    await test.step(`Audit ${path}`, async () => {
      await page.goto(path);
      if (path.includes('#')) {
        await expectSection(page, 'not-found');
        await expect(page.locator('.preloader')).toHaveCount(0);
      }
      await page.mouse.move(0, 0);
      let audit = new AxeBuilder({ page }).withTags(tags);
      if (path.includes('#')) audit = audit.include('#route-not-found');
      const { violations } = await audit.analyze();
      const unexpected = [];
      for (const issue of violations) for (const node of issue.nodes) {
        const target = page.locator(node.target[0]);
        const isCta = await target.evaluate(element => element.matches('.error-actions .resume-cta'));
        if (isCta && issue.id === 'color-contrast' && referenceContrastIssue) {
          // Product constraint: preserve the existing CTA palette. Verify the inherited
          // issue against that actual reference, rather than disabling contrast checks.
          expect(await target.evaluate(palette)).toEqual(referencePalette);
          inherited.push({ path, id: issue.id, target: node.target, baseline: '#resumeLink' });
        } else if (knownTargets.has(issue.id + JSON.stringify(node.target))) {
          inherited.push({ path, id: issue.id, target: node.target, baseline: 'unchanged portfolio shell' });
        } else unexpected.push({ id: issue.id, target: node.target });
      }
      expect(unexpected).toEqual([]);
    });
  }
  await testInfo.attach('inherited-accessibility-findings', {
    body: Buffer.from(JSON.stringify({ baseline: baseline.violations, inherited }, null, 2)), contentType: 'application/json'
  });
});
