import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, expectSection, navigateToSection } from './fixtures.mjs';

const original = JSON.parse(await readFile(new URL('../fixtures/resume-content.json', import.meta.url), 'utf8'));
const coursework = page => page.locator('#resume-education details');
async function openResume(page) {
  await page.goto('/#resume');
  await expectSection(page, 'resume');
  await expect(page.locator('.preloader')).toHaveCount(0);
}
async function activate(page, summary, touch) {
  if (touch) await summary.tap();
  else await summary.click();
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const overflow = await page.locator('#resume .resume-tag:visible').evaluateAll(nodes => nodes.filter(node => {
    const box = node.getBoundingClientRect(), parent = node.parentElement.getBoundingClientRect();
    return box.right > parent.right + 1 || box.left < parent.left - 1 || node.scrollWidth > node.clientWidth + 1;
  }).map(node => node.textContent));
  expect(overflow).toEqual([]);
  const misaligned = await page.locator('#resume summary').evaluateAll(nodes => nodes.filter(node => {
    const text = node.querySelector('.resume-disclosure-state').getBoundingClientRect();
    const arrow = node.querySelector('.resume-disclosure-chevron').getBoundingClientRect();
    return Math.abs((text.top + text.bottom - arrow.top - arrow.bottom) / 2) > 2;
  }).map(node => node.innerText));
  expect(misaligned, 'Disclosure chevrons stay aligned with their action label').toEqual([]);
}

test('R-DISCLOSURE-03 | Given every disclosure, then one correctly counted action has a unique contextual accessible name and native keyboard state', async ({ page }) => {
  await openResume(page);
  const names = [];
  for (const panel of await page.locator('#resume details.resume-disclosure').all()) {
    const summary = panel.locator(':scope > summary');
    const facts = await panel.evaluate(el => {
      const plain = el.classList.contains('resume-summary-more');
      const extraOnly = el.classList.contains('resume-contributions') || el.closest('#resume-certifications');
      const total = el.querySelectorAll(el.closest('#resume-certifications') ? '.timeline-item' : 'li').length;
      const shown = el.querySelectorAll('.resume-disclosure-preview .resume-tag').length;
      return { plain, additional: extraOnly ? total : total - shown, context: el.querySelector('.resume-disclosure-context').textContent.trim() };
    });
    const action = facts.plain ? 'Show More' : `Show More (+${facts.additional})`;
    await expect(summary.locator('.resume-when-closed')).toHaveText(action);
    await expect(summary.locator('.resume-when-open')).toBeHidden();
    await expect(summary.locator('.resume-disclosure-count')).toHaveCount(facts.plain ? 0 : 1);
    await expect(summary.locator('button, a, [aria-expanded]')).toHaveCount(0);
    await summary.scrollIntoViewIfNeeded();
    const size = await summary.boundingBox();
    expect(size.height).toBeGreaterThanOrEqual(44); expect(size.width).toBeGreaterThanOrEqual(44);
    const closed = await summary.ariaSnapshot();
    expect(closed).toContain(action); expect(closed).toContain(facts.context); expect(closed).not.toContain('Show Less');
    names.push(closed);
    await summary.focus();
    await page.keyboard.press('Space');
    await expect(panel).toHaveAttribute('open', '');
    await expect(summary).toBeFocused();
    await expect(summary.locator('.resume-when-closed')).toBeHidden();
    await expect(summary.locator('.resume-when-open')).toHaveText('Show Less');
    const opened = await summary.ariaSnapshot();
    expect(opened).toContain('Show Less'); expect(opened).toContain(facts.context); expect(opened).not.toContain('Show More');
    await page.keyboard.press('Enter');
    await expect(panel).not.toHaveAttribute('open');
    await expect(summary).toBeFocused();
    // Native scroll positions round to CSS pixels while summary height can be
    // fractional. Verify the entire trigger with the same 1px geometric tolerance
    // used by the responsive layout checks, instead of an exact area ratio.
    const geometry = await summary.evaluate(el => {
      const box = el.getBoundingClientRect(), viewport = el.closest('.page-content-panel').getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, viewportTop: Math.max(0, viewport.top), viewportBottom: Math.min(innerHeight, viewport.bottom) };
    });
    expect(geometry.top).toBeGreaterThanOrEqual(geometry.viewportTop - 1);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  }
  expect(new Set(names).size).toBe(names.length);
  await expect(page.locator('#resume details[open]')).toHaveCount(0);
});

test('R-RESUME-15 | Given Resume metadata, then the whole desktop assessment aligns with coursework while smaller layouts retain their flow', async ({ page }, testInfo) => {
  await openResume(page);
  const widths = testInfo.project.use.isMobile ? [320, 390, 768] : [1024, 1199, 1200, 1280, 1440, 1920];
  for (const width of widths) {
    await test.step(`Layout at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const card = document.querySelector('.resume-personality-card');
        const component = card.closest('.resume-skill-block');
        const languages = component.previousElementSibling;
        const box = node => {
          const r = node.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        };
        return { card: box(card), heading: box(component.querySelector('.resume-section-header')),
          languages: box(languages), languageHeading: box(languages.querySelector('.resume-section-header')),
          meta: box(document.querySelector('#resume-meta')), coursework: box(document.querySelector('#resume-education details')) };
      });
      expect(Math.abs(geometry.languages.left - geometry.meta.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.heading.left - geometry.card.left)).toBeLessThanOrEqual(1);
      expect(geometry.heading.bottom).toBeLessThanOrEqual(geometry.card.top);
      if (width >= 768) expect(Math.abs(geometry.heading.top - geometry.languageHeading.top)).toBeLessThanOrEqual(1);
      else expect(geometry.heading.top).toBeGreaterThan(geometry.languages.bottom);
      if (width >= 1200) expect(Math.abs(geometry.card.right - geometry.coursework.right), 'Assessment and coursework share their right edge').toBeLessThanOrEqual(1);
      await noOverflow(page);
    });
  }
  const report = page.getByRole('link', { name: /ENTJ-A, The Commander/ });
  await expect(report).toHaveAttribute('href', 'https://www.16personalities.com/profiles/entj-a/m/god3hwbn3');
  await expect(report).toHaveAttribute('target', '_blank');
  await expect(report).toHaveAttribute('rel', 'noopener noreferrer');
  const info = page.getByRole('button', { name: 'Why is this shared?' });
  await activate(page, info, testInfo.project.use.hasTouch);
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#personality-info-tip')).toHaveCSS('opacity', '1');
  await page.keyboard.press('Escape');
  await expect(info).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#personality-info-tip')).toHaveCSS('opacity', '0');
});

test('R-RESUME-12 | Given the full summary, when expanded, then academic background precedes Since 2011 with matching typography', async ({ page }, testInfo) => {
  await openResume(page);
  const summary = page.locator('.resume-summary-text');
  const academic = summary.getByText(original.summary[2], { exact: true });
  await expect(academic).toHaveCount(1);
  await expect(academic).toBeHidden();
  await activate(page, summary.locator('summary'), testInfo.project.use.hasTouch);
  await expect(academic).toBeVisible();
  await expect(summary.locator('p:visible')).toHaveText(original.summary);
  const since = summary.getByText(original.summary[3], { exact: true });
  expect(await academic.evaluate(el => el.nextElementSibling.textContent.replace(/\s+/g, ' ').trim())).toBe(original.summary[3]);
  const typography = locator => locator.evaluate(el => {
    const s = getComputedStyle(el);
    return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'color', 'marginBottom'].map(key => [key, s[key]]));
  });
  expect(await typography(academic)).toEqual(await typography(since));
  expect(await academic.evaluate(el => getComputedStyle(el).marginTop)).toBe('8px');
  expect(await since.evaluate(el => getComputedStyle(el).marginTop)).toBe('0px');
  expect(await academic.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await academic.scrollIntoViewIfNeeded();
  await testInfo.attach('academic-summary', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
});

test('R-RESUME-06 | Given Resume, then its nine chunks keep their reading order and only long evidence is collapsed', async ({ page }) => {
  await openResume(page);
  const titles = page.locator('#resume h3');
  await expect(titles).toHaveText(['Summary', 'Top Skills', 'Languages', 'Personality Assessment', 'Education', 'Experience', 'Engineering Contributions', 'Certifications']);
  const boxes = await titles.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect()));
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].top - 1);
    if (Math.abs(boxes[i].top - boxes[i - 1].top) < 1) expect(boxes[i].left).toBeGreaterThan(boxes[i - 1].left);
  }
  await expect(page.locator('#resume details[open]')).toHaveCount(0);
  await expect(page.locator('#resume .resume-disclosure-count')).toHaveCount(12);
  for (const header of await page.locator('#resume .resume-disclosure-header, #resume .resume-item-tech-label').all()) {
    await expect(header).not.toContainText(/\b\d+\s+(?:topics?|tools?)\b/i);
  }
  await expect(page.locator('.resume-summary-text > p')).toHaveText(original.summary.slice(0, 2));
  await expect(page.locator('#resume-meta .resume-tag:visible')).toHaveCount(8);
  await expect(page.getByRole('link', { name: /ENTJ-A, The Commander/ })).toBeVisible();
  await expect(page.locator('#resume-experience .item-company:visible')).toHaveText(original.experience.map(role => role.company));
  // Measured on the original span chips; changing to semantic li must not inherit global li typography.
  expect(await page.locator('#resume-experience .resume-item-tags .resume-tag').first().evaluate(el => {
    const s = getComputedStyle(el);
    return [s.fontFamily, s.fontSize, s.fontWeight, s.fontStyle, s.lineHeight, s.letterSpacing];
  })).toEqual(['Poppins, Helvetica, sans-serif', '10px', '400', 'normal', '25.9px', 'normal']);
  await expect(page.locator('#resume-contributions .timeline-item:visible')).toHaveCount(2);
  await expect(page.locator('#resume-certifications .timeline-item:visible')).toHaveCount(6);
  const pdf = page.locator('#resume .resume-bottom-cta a');
  await expect(pdf).toBeVisible();
  await expect(pdf).toHaveAttribute('href', 'FerhatTufekci_CV.pdf');
  const response = await page.request.get(await pdf.getAttribute('href'));
  expect(response.status()).toBe(200);
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

test('R-RESUME-07 | Given independent coursework panels, when tapped or keyboard toggled, then each reveals one complete uncategorized list', async ({ page }, testInfo) => {
  await openResume(page);
  const panels = coursework(page);
  await expect(panels).toHaveCount(3);
  for (let index = 0; index < 3; index++) {
    const panel = panels.nth(index), summary = panel.locator('summary');
    await expect(summary.locator('.resume-disclosure-title')).toHaveText('Relevant Coursework & Tools');
    await expect(summary.locator('.resume-disclosure-preview')).toBeVisible();
    await expect(summary.locator('.resume-disclosure-preview .resume-tag')).toHaveText(original.coursework[index].slice(0, 4));
    await expect(summary.locator('.resume-when-closed')).toHaveText(`Show More (+${original.coursework[index].length - 4})`);
    await expect(summary.locator('.resume-preview-more')).toHaveCount(0);
    expect((await summary.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await activate(page, summary, testInfo.project.use.hasTouch);
    await expect(panel).toHaveAttribute('open', '');
    await expect(summary.locator('.resume-disclosure-preview')).toBeHidden();
    await expect(panel.locator('ul')).toHaveCount(1);
    await expect(panel.locator('li')).toHaveText(original.coursework[index]);
    await expect(panel.locator('li:visible')).toHaveCount(original.coursework[index].length);
  }
  await expect(panels.locator(':scope[open]')).toHaveCount(3);
  await noOverflow(page);
  await testInfo.attach('education-expanded', { body: await page.locator('#resume-education').screenshot(), contentType: 'image/png' });
  const first = panels.first().locator('summary');
  await page.keyboard.press('Tab');
  await first.focus();
  expect(await first.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  expect(await first.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('Space');
  await expect(panels.first()).not.toHaveAttribute('open');
  await expect(panels.nth(1)).toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(panels.first()).toHaveAttribute('open', '');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(first).toBeFocused();
});

test('R-RESUME-08 | Given five roles, when evidence and tools expand separately, then all original content stays ordered and other roles keep their state', async ({ page }, testInfo) => {
  await openResume(page);
  const roles = page.locator('#resume-experience .timeline-item');
  await expect(roles).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    const role = roles.nth(index), before = original.experience[index];
    await expect(role.locator('.resume-item-points li:visible')).toHaveText(before.bullets.slice(0, 3));
    if (before.bullets.length > 3) {
      await activate(page, role.locator('.resume-contributions > summary'), testInfo.project.use.hasTouch);
      await expect(role.locator('.resume-item-points li:visible')).toHaveText(before.bullets);
      await expect(role.locator('.resume-tools')).not.toHaveAttribute('open');
    }
    if (before.tools.length > 10) {
      await expect(role.locator('.resume-disclosure-preview .resume-tag:visible')).toHaveCount(8);
      await activate(page, role.locator('.resume-tools > summary'), testInfo.project.use.hasTouch);
    }
    await expect(role.locator('.resume-item-tags > li:visible')).toHaveText(before.tools);
  }
  await expect(page.locator('#resume-experience .resume-contributions[open]')).toHaveCount(4);
  await expect(page.locator('#resume-experience .resume-tools[open]')).toHaveCount(4);
  await noOverflow(page);
  await testInfo.attach('experience-expanded', { body: await roles.nth(1).screenshot(), contentType: 'image/png' });
  await roles.first().locator('.resume-contributions > summary').click();
  await expect(roles.first().locator('.resume-tools')).toHaveAttribute('open', '');
  await expect(roles.nth(1).locator('.resume-contributions')).toHaveAttribute('open', '');
  for (const selector of ['.resume-tools > summary', '.resume-contributions > summary']) {
    const summary = roles.nth(1).locator(selector);
    await page.keyboard.press('Tab');
    await summary.focus();
    await page.keyboard.press('Space');
    await expect(summary.locator('..')).not.toHaveAttribute('open');
    await page.keyboard.press('Enter');
    await expect(summary.locator('..')).toHaveAttribute('open', '');
  }
});

test('R-RESUME-14 | Given the short TÜBİTAK tool list, then its heading shares the other tool headings typography without adding a disclosure', async ({ page }, testInfo) => {
  await openResume(page);
  const role = page.locator('#resume-experience .timeline-item').filter({ has: page.getByRole('heading', { name: 'TÜBİTAK 4006 Project Manager', exact: true }) });
  const heading = role.getByRole('heading', { name: 'Technologies & Tools', exact: true });
  const typography = node => {
    const style = getComputedStyle(node);
    return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'color'].map(key => [key, style[key]]));
  };
  const references = page.locator('#resume-experience .resume-tools .resume-disclosure-title');
  await expect(references).toHaveCount(4);
  for (const reference of await references.all()) {
    expect(await heading.evaluate(typography)).toEqual(await reference.evaluate(typography));
  }
  await expect(role.locator('details')).toHaveCount(0);
  await expect(role.locator('.resume-item-tags > li:visible')).toHaveText(original.experience[4].tools);
  await noOverflow(page);
  await heading.scrollIntoViewIfNeeded();
  await testInfo.attach('tubitak-tools-heading', { body: await role.screenshot(), contentType: 'image/png' });
});

test('R-RESUME-09 | Given summary and certificates, when using keyboard and route history, then full content and existing PDF remain reachable', async ({ page }) => {
  await openResume(page);
  for (const selector of ['.resume-summary-text details', '#resume-certifications details']) {
    const panel = page.locator(selector), summary = panel.locator('summary');
    await page.keyboard.press('Tab');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toHaveAttribute('open', '');
  }
  await expect(page.locator('.resume-summary-text p:visible')).toHaveText(original.summary);
  await expect(page.locator('#resume-certifications .timeline-item:visible')).toHaveCount(14);
  await expect(page.locator('#resume .resume-bottom-cta a')).toBeVisible();
  await navigateToSection(page, 'contact');
  await page.goBack();
  await expectSection(page, 'resume');
  await expect(page.locator('#resume-certifications details')).toHaveAttribute('open', '');
  await page.reload();
  await expectSection(page, 'resume');
  await expect(page.locator('#resume details[open]')).toHaveCount(0);
});

test('R-RESUME-13 | Given the PDF action, when activated, then a real PDF navigation is requested and Resume remains open', async ({ page, context, siteOrigin }) => {
  await openResume(page);
  const link = page.getByRole('link', { name: 'Download full resume PDF (opens in a new tab)', exact: true });
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  const popupCreated = page.waitForEvent('popup');
  const navigation = context.waitForEvent('request', request =>
    request.isNavigationRequest() && request.url() === siteOrigin + '/FerhatTufekci_CV.pdf');
  await link.click();
  const popup = await popupCreated;
  expect(popup).not.toBe(page);
  const request = await navigation;
  const response = await request.response();
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/pdf');
  // Chromium hands this response to its PDF viewer, so CDP cannot reliably read
  // its body. Byte signature and identity are covered by HTTP/unit tests.
  await expectSection(page, 'resume');
  await expect(page).toHaveURL(siteOrigin + '/#resume');
});

test('R-RESUME-10 | Given either theme, then disclosures wrap at supported widths and retain semantic content without JavaScript', async ({ page, browser, siteOrigin }, testInfo) => {
  await openResume(page);
  const widths = testInfo.project.name.startsWith('desktop') ? [768, 1280, 1440] : [testInfo.project.use.viewport.width];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const panel of await page.locator('#resume details').all()) {
      if (await panel.getAttribute('open') === null) await panel.locator(':scope > summary').click();
    }
    await noOverflow(page);
    await expect(page.locator('#resume')).toBeVisible();
  }
  // Inspect only new disclosure UI; inherited portfolio contrast findings are tracked separately.
  const result = await new AxeBuilder({ page }).include('.resume-disclosure').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: testInfo.project.use.colorScheme, viewport: testInfo.project.use.viewport });
  try {
    const raw = await context.newPage();
    await raw.route('**/*', route => new URL(route.request().url()).origin === siteOrigin ? route.continue() : route.abort());
    await raw.goto(siteOrigin + '/#resume');
    const panel = raw.locator('#resume-education details').first();
    await panel.locator('summary').click();
    await expect(panel.locator('li:visible')).toHaveCount(original.coursework[0].length);
    await expect(raw.locator('#resume .resume-bottom-cta a')).toBeVisible();
  } finally { await context.close(); }
});
