import { test, expect, expectSection, navigateToSection } from './fixtures.mjs';

// The Resume personality tooltip's script stays inline in index.html (T-4 A1 deferred until the
// CSP approach, D-7, is settled). These tests pin that: the page asks for no separate tooltip
// file, and the JavaScript behaviour still works while that file's URL is blocked. Blocking it
// is controlled fault injection for the test, not an observed production failure.
const TIP_FILE = /\/js\/resume-info-tip\.js(?:\?|$)/;

async function openResume(page) {
  await page.goto('/#resume');
  await expectSection(page, 'resume');
  await expect(page.locator('.preloader')).toHaveCount(0);
}
async function blockTipFile(page) {
  const requested = [];
  // A page route takes precedence over the fixture's context route.
  await page.route(TIP_FILE, route => { requested.push(route.request().url()); return route.abort(); });
  return requested;
}
const activate = (target, touch) => (touch ? target.tap() : target.click());
const button = page => page.getByRole('button', { name: 'Why is this shared?', exact: true });
const tip = page => page.locator('#personality-info-tip');
const outside = page => page.locator('#resume .section-title');

test('R-TIP-01 | Given the Resume page, then no separate tooltip script is referenced or requested', async ({ page }) => {
  const requests = [];
  page.on('request', request => { if (TIP_FILE.test(request.url())) requests.push(request.url()); });
  await openResume(page);
  await expect(page.locator('script[src*="resume-info-tip"]')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('R-TIP-02 | Given the tooltip file URL is blocked, when the info button is activated twice, then the tooltip opens with aria-expanded true and closes again', async ({ page }, testInfo) => {
  await blockTipFile(page);
  await openResume(page);
  const touch = testInfo.project.use.hasTouch;
  await expect(button(page)).toHaveAttribute('aria-expanded', 'false');
  await activate(button(page), touch);
  await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(tip(page)).toHaveClass(/\bis-open\b/);
  await activate(button(page), touch);
  await expect(button(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(tip(page)).not.toHaveClass(/\bis-open\b/);
});

test('R-TIP-03 | Given the tooltip file URL is blocked and the tooltip open, then a click inside keeps it open, a click outside closes it, and Escape closes it', async ({ page }, testInfo) => {
  await blockTipFile(page);
  await openResume(page);
  const touch = testInfo.project.use.hasTouch;
  await activate(button(page), touch);
  await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
  await activate(tip(page), touch);
  await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
  await activate(outside(page), touch);
  await expect(button(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(tip(page)).not.toHaveClass(/\bis-open\b/);
  await activate(button(page), touch);
  await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(button(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(tip(page)).toHaveCSS('opacity', '0');
});

test('R-TIP-04 | Given the tooltip file URL is blocked, when closed by a click, then hover stays suppressed until the pointer leaves or the button loses focus', async ({ page }, testInfo) => {
  await blockTipFile(page);
  await openResume(page);
  const touch = testInfo.project.use.hasTouch;
  await activate(button(page), touch);
  await activate(button(page), touch);
  await expect(button(page)).toHaveClass(/\bsuppress-hover-tip\b/);
  if (!touch) {
    await outside(page).hover();
    await expect(button(page)).not.toHaveClass(/\bsuppress-hover-tip\b/);
    await button(page).click();
    await button(page).click();
    await expect(button(page)).toHaveClass(/\bsuppress-hover-tip\b/);
  }
  await button(page).evaluate(node => node.blur());
  await expect(button(page)).not.toHaveClass(/\bsuppress-hover-tip\b/);
});

test('R-TIP-05 | Given the tooltip file URL is blocked, when the visitor leaves Resume and returns, then one activation still opens the tooltip once', async ({ page }, testInfo) => {
  const requested = await blockTipFile(page);
  await openResume(page);
  await navigateToSection(page, 'blog');
  await expectSection(page, 'blog');
  await navigateToSection(page, 'resume');
  await expectSection(page, 'resume');
  const touch = testInfo.project.use.hasTouch;
  await activate(button(page), touch);
  await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(tip(page)).toHaveClass(/\bis-open\b/);
  expect(requested, 'the page needs no tooltip file').toEqual([]);
});
