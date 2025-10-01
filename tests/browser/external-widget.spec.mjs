import { test, expect, expectSection, navigateToSection } from './fixtures.mjs';

// Default suites hide the optional badge. These failure partitions must exercise
// a first-time visitor without that saved preference, while keeping all external IO blocked.
test.use({ calendlyClosed: false });

test('R-EXTERNAL-01 | Given an unavailable scheduler script, then a first-time visitor can navigate without uncaught errors', async ({ page }) => {
  await page.goto('/#contact');
  await expectSection(page, 'contact');
  await expect(page.locator('.preloader')).toHaveCount(0);
  await expect(page.locator('.calendly-badge-widget')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Set Up A Job Interview (opens in a new tab)', exact: true })).toHaveAttribute('href', 'https://calendly.com/ferhattufekci/60min');
  await navigateToSection(page, 'resume');
});

test('R-EXTERNAL-01 | Given blocked storage and an available scheduler, then badge close and theme controls remain usable', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Synthetic storage denial', 'SecurityError'); } });
    window.fixtureCalendlyCalls = 0;
    window.Calendly = { initBadgeWidget() {
      window.fixtureCalendlyCalls++;
      const widget = document.createElement('div');
      widget.className = 'calendly-badge-widget';
      // The isolated vendor stylesheet normally supplies this positioning.
      widget.style.position = 'fixed';
      widget.innerHTML = '<div class="calendly-badge-content">Synthetic scheduler badge</div>';
      // Calendly's badge API mounts on body; parentElement is an inline-widget option.
      document.body.prepend(widget);
    } };
  });
  await page.goto('/#resume');
  await expectSection(page, 'resume');
  await expect(page.locator('.calendly-close-btn')).toBeVisible();
  expect(await page.evaluate(() => window.fixtureCalendlyCalls)).toBe(1);
  await page.locator('.calendly-close-btn').click();
  await expect(page.locator('.calendly-badge-widget')).toBeHidden();
  const initial = testInfo.project.use.colorScheme;
  await expect(page.locator('html')).toHaveAttribute('data-theme', initial);
  await page.locator('.theme-toggle-btn:visible').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', initial === 'light' ? 'dark' : 'light');
});
