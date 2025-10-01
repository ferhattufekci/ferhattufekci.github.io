import AxeBuilder from '@axe-core/playwright';
import { test, expect, expectSection, navigateToSection } from './fixtures.mjs';
import { mockCatalog } from './data/catalog.mjs';

const labels = ['All', 'Summary', 'Top Skills', 'Languages', 'Personality Assessment', 'Education', 'Experience', 'Engineering Contributions', 'Certifications', 'Download Full Resume'];
const targets = ['all', 'resume-summary', 'resume-top-skills', 'resume-languages', 'resume-personality', 'resume-education', 'resume-experience', 'resume-contributions', 'resume-certifications', 'resume-download'];
const nav = page => page.getByRole('navigation', { name: 'Resume section navigation' });
const button = (page, label) => nav(page).getByRole('button', { name: label, exact: true });
async function open(page) {
  await mockCatalog(page);
  await page.goto('/#resume');
  await expectSection(page, 'resume');
  await expect(page.locator('.preloader')).toHaveCount(0);
}
async function selected(page, label) {
  await expect(nav(page).locator('[aria-current]')).toHaveCount(1);
  await expect(button(page, label)).toHaveAttribute('aria-current', 'location');
  await expect(page).toHaveURL(/\/#resume$/);
}
async function atTarget(page, id) {
  await expect(async () => {
    const geometry = await page.evaluate(id => {
      const page = document.getElementById('resume-content'), box = page.getBoundingClientRect();
      const target = document.getElementById(id), targetBox = target.getBoundingClientRect();
      const top = Math.max(0, Math.min(page.scrollHeight - page.clientHeight, page.scrollTop + targetBox.top - box.top - parseFloat(getComputedStyle(page).paddingTop)));
      const header = document.querySelector('.mobile-header');
      const headerBottom = getComputedStyle(header).display === 'none' ? 0 : header.getBoundingClientRect().bottom;
      return { actual: page.scrollTop, expected: top, top: targetBox.top, bottom: Math.min(targetBox.bottom, targetBox.top + 24), viewportTop: Math.max(box.top, headerBottom), viewportBottom: Math.min(box.bottom, innerHeight) };
    }, id);
    expect(Math.abs(geometry.actual - geometry.expected)).toBeLessThanOrEqual(2);
    expect(geometry.top).toBeGreaterThanOrEqual(geometry.viewportTop - 1);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  }).toPass();
}
async function atStart(page) {
  await selected(page, 'All');
  await expect.poll(() => page.locator('#resume-content').evaluate(el => el.scrollTop)).toBe(0);
  await expect.poll(() => nav(page).locator('ul').evaluate(el => el.scrollLeft)).toBe(0);
  await expect(page.locator('#resume h2')).toBeInViewport();
}

test('R-RESUME-NAV-01 | Given a direct visit or reload, then All is the only initial selection and all ten destinations retain their full content without a visible helper label', async ({ page }) => {
  await page.addInitScript(() => {
    window.initialResumeSelection = [...document.querySelectorAll('.resume-navigation [aria-current]')].map(el => el.textContent);
    document.addEventListener('DOMContentLoaded', () => {
      window.initialResumeSelection = [...document.querySelectorAll('.resume-navigation [aria-current]')].map(el => el.textContent);
    }, { once: true });
  });
  await open(page);
  for (let visit = 0; visit < 2; visit++) {
    await expect(nav(page).getByRole('button')).toHaveText(labels);
    await expect(page.getByText('Jump to Section', { exact: true })).toHaveCount(0);
    await expect(nav(page).locator('[aria-pressed], [role="tab"], .pt-trigger, [data-group]')).toHaveCount(0);
    await expect(button(page, 'All')).toHaveAccessibleDescription('Return to the beginning of the full resume.');
    expect(await page.evaluate(() => initialResumeSelection)).toEqual(['All']);
    await atStart(page);
    await expect(page.locator('#resume details[open]')).toHaveCount(0);
    await button(page, 'Experience').click();
    await atTarget(page, 'resume-experience');
    await page.reload();
    await expectSection(page, 'resume');
  }
});

test('R-RESUME-NAV-02 | When every destination is activated, then its geometry is correct, URL/history stay stable and no sections or disclosures are filtered', async ({ page, context }, info) => {
  await open(page);
  const history = await page.evaluate(() => window.history.length);
  let popups = 0, downloads = 0;
  page.on('popup', () => popups++);
  page.on('download', () => downloads++);
  await page.locator('.resume-summary-more > summary').click();
  const disclosures = await page.locator('#resume details').evaluateAll(nodes => nodes.map(el => el.open));
  for (let i = 1; i < labels.length; i++) {
    await test.step(labels[i], async () => {
      const control = button(page, labels[i]);
      if (info.project.use.hasTouch) await control.tap(); else await control.click();
      await selected(page, labels[i]);
      await atTarget(page, targets[i]);
      await expect(page.locator('#resume h3')).toHaveCount(8);
      expect(await page.locator('#resume h3').evaluateAll(nodes => nodes.every(el => getComputedStyle(el).display !== 'none' && el.getClientRects().length))).toBe(true);
      expect(await page.locator('#resume details').evaluateAll(nodes => nodes.map(el => el.open))).toEqual(disclosures);
    });
  }
  expect(await page.evaluate(() => window.history.length)).toBe(history);
  expect(popups).toBe(0); expect(downloads).toBe(0); expect(context.pages()).toHaveLength(1);
  await page.locator('#resume-content').evaluate(el => { el.scrollTop -= 100; });
  await selected(page, 'Download Full Resume');
  await button(page, 'All').click();
  await atStart(page);
  await page.locator('#resume-content').evaluate(el => { el.scrollTop = 500; });
  await button(page, 'All').click();
  await atStart(page);
  await button(page, 'Summary').click();
  await atTarget(page, 'resume-summary');
  expect(await page.locator('#resume-content').evaluate(el => el.scrollTop)).toBe(0);
  await selected(page, 'Summary');
});

test('R-RESUME-NAV-03 | Given keyboard navigation, then focused items reveal horizontally without moving vertically and Enter/Space focus the actual target', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Tab');
  await button(page, 'All').focus();
  const top = await page.locator('#resume-content').evaluate(el => el.scrollTop);
  for (const label of labels) {
    await expect(button(page, label)).toBeFocused();
    await expect(button(page, label)).toBeInViewport({ ratio: 1 });
    expect(await button(page, label).evaluate(el => el.matches(':focus-visible') && parseFloat(getComputedStyle(el).outlineWidth) >= 2)).toBe(true);
    expect(await page.locator('#resume-content').evaluate(el => el.scrollTop)).toBe(top);
    if (label !== labels.at(-1)) await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Shift+Tab');
  await expect(button(page, 'Certifications')).toBeFocused();
  await page.keyboard.press('Space');
  await atTarget(page, 'resume-certifications');
  await expect(page.locator('#resume-certifications h3')).toBeFocused();
  await button(page, 'All').focus();
  await page.keyboard.press('Enter');
  await atStart(page);
  await expect(page.locator('#resume h2')).toBeFocused();
});

test('R-RESUME-NAV-04 | Given reactivation, history and repeated initialization, then only Resume resets and existing Blog/Projects selections survive', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => ResumeNavigation.init(document, window) === ResumeNavigation.init(document, window))).toBe(true);
  await page.evaluate(() => { window.resumeController = ResumeNavigation.init(document, window); });
  await page.addScriptTag({ url: '/js/resume-navigation.js' });
  expect(await page.evaluate(() => ResumeNavigation.init(document, window) === window.resumeController)).toBe(true);
  await page.locator('.resume-summary-more > summary').click();
  await button(page, 'Experience').click();
  for (const section of ['blog', 'projects']) {
    await navigateToSection(page, section);
    const filter = page.locator(section === 'blog' ? '#blog-filters [data-group="category_testing"]' : '#proj-filters [data-group="proj_test"]');
    await filter.click();
    await navigateToSection(page, 'resume');
    await atStart(page);
    await expect(page.locator('.resume-summary-more')).toHaveAttribute('open', '');
    await page.goBack();
    await expectSection(page, section);
    await expect(filter).toHaveAttribute('aria-pressed', 'true');
    await page.goForward();
    await expectSection(page, 'resume');
    await atStart(page);
  }
  await button(page, 'Education').click();
  await atTarget(page, 'resume-education');
});

test('R-RESUME-NAV-05 | Given either motion preference and changing content height, then the last rapid request wins and lifecycle completion preserves it', async ({ page }) => {
  await open(page);
  for (const reducedMotion of ['reduce', 'no-preference']) {
    await page.emulateMedia({ reducedMotion });
    await button(page, 'Experience').click();
    await atTarget(page, 'resume-experience');
    await button(page, 'All').click();
    await atStart(page);
    await page.locator('.resume-summary-more > summary').click();
    await page.locator('#resume-education details > summary').first().click();
    await button(page, 'Experience').click();
    await atTarget(page, 'resume-experience');
    await nav(page).evaluate(el => {
      for (const target of ['resume-download', 'all', 'resume-education', 'resume-experience']) el.querySelector(`[data-resume-target="${target}"]`).click();
    });
    await selected(page, 'Experience');
    await atTarget(page, 'resume-experience');
    await navigateToSection(page, 'blog');
    await page.evaluate(() => {
      document.addEventListener('portfolio:page-activate', event => {
        if (event.detail.page.id === 'resume') document.querySelector('[data-resume-target="resume-education"]').click();
      }, { once: true });
      location.hash = '#resume';
    });
    await expectSection(page, 'resume');
    await selected(page, 'Education');
    await atTarget(page, 'resume-education');
  }
  // Also request a destination during the very first activation after reload.
  await page.addInitScript(() => {
    document.addEventListener('portfolio:page-activate', event => {
      if (event.detail.page.id === 'resume') requestAnimationFrame(() => document.querySelector('[data-resume-target="resume-education"]').click());
    }, { once: true });
  });
  await page.reload();
  await expectSection(page, 'resume');
  await selected(page, 'Education');
  await atTarget(page, 'resume-education');
});

test('R-RESUME-NAV-06 | Given responsive themes, then navigation shares Blog styling, has no page overflow, exposes its last item and passes new accessibility checks', async ({ page }, info) => {
  await open(page);
  const styles = node => {
    const s = getComputedStyle(node);
    return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'color', 'backgroundColor', 'padding', 'borderRadius', 'textDecorationLine', 'boxShadow'].map(key => [key, s[key]]));
  };
  const resumeStyles = await button(page, 'All').evaluate(styles);
  await navigateToSection(page, 'blog');
  expect(await page.locator('#blog-filters [aria-pressed="true"]').evaluate(styles)).toEqual(resumeStyles);
  await navigateToSection(page, 'resume');
  const widths = info.project.use.isMobile ? [info.project.use.viewport.width] : [768, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = nav(page).locator('.category-filter-scroll');
    if (width <= 768) await expect(overflow).toHaveClass(/has-overflow/);
    else {
      const overflows = await nav(page).locator('ul').evaluate(el => el.scrollWidth > el.clientWidth + 2);
      expect(await overflow.evaluate(el => el.classList.contains('has-overflow'))).toBe(overflows);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelector('#resume').scrollWidth <= document.querySelector('#resume').clientWidth + 1)).toBe(true);
    await button(page, 'Download Full Resume').focus();
    await expect(button(page, 'Download Full Resume')).toBeInViewport({ ratio: 1 });
    await button(page, 'Download Full Resume').press('Enter');
    await atTarget(page, 'resume-download');
    await button(page, 'All').click();
    await atStart(page);
    if (width <= 768) await expect(overflow).not.toHaveClass(/at-end/);
    await info.attach(`resume-navigation-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
  }
  const results = await new AxeBuilder({ page }).include('.resume-navigation').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('R-RESUME-NAV-07 | Given short final content, when Certifications is chosen with disclosures closed or open, then its heading starts at the panel top at every viewport height', async ({ page }, info) => {
  await open(page);
  const sizes = info.project.use.isMobile
    ? [{ width: info.project.use.viewport.width, height: 844 }, { width: info.project.use.viewport.width, height: 1100 }]
    : [{ width: 1440, height: 900 }, { width: 1785, height: 934 }, { width: 1440, height: 1400 }, { width: 768, height: 900 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const expanded of [false, true, false]) {
      await button(page, 'Certifications').click();
      const details = page.locator('.resume-certificates-more');
      if (await details.evaluate(el => el.open) !== expanded) await details.locator(':scope > summary').click();
      await button(page, 'Certifications').focus();
      await button(page, 'Certifications').press('Enter');
      await selected(page, 'Certifications');
      await expect(page.locator('#resume-certifications h3')).toBeFocused();
      await expect.poll(() => page.evaluate(() => {
        const area = document.getElementById('resume-content');
        return Math.abs(document.getElementById('resume-certifications').getBoundingClientRect().top - area.getBoundingClientRect().top - parseFloat(getComputedStyle(area).paddingTop));
      })).toBeLessThanOrEqual(2);
      await expect(page.locator('#resume-certifications .timeline-item:visible')).toHaveCount(expanded ? 14 : 6);
      await button(page, 'Download Full Resume').click();
      await expect(page.locator('#resume-download a')).toBeInViewport({ ratio: 1 });
    }
  }
});
