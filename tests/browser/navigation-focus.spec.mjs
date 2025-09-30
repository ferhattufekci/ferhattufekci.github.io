import { test, expect } from './fixtures.mjs';
import { mockCatalog } from './data/catalog.mjs';

test.use({ reducedMotion: 'no-preference' });

async function beginGatedNavigation(page, entry = 'menu') {
  await mockCatalog(page);
  await page.goto('/#projects');
  await expect(page.locator('.preloader')).toHaveCount(0);
  await expect(page.locator('[data-id="projects"] .section-title')).toBeFocused();
  await page.evaluate(() => {
    const wait = window.PortfolioMotionCompletion.wait;
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    window.releaseNavigationCompletion = () => release();
    window.PortfolioMotionCompletion.wait = (...args) => {
      const motion = wait(...args);
      // Keep the real CSS watcher. Select only the ordering of its completion
      // callback relative to the visitor's newer keyboard interaction.
      return args[1] === 'animation'
        ? { ...motion, finished: motion.finished.then(() => gate) }
        : motion;
    };
  });
  if (entry === 'arrow') {
    await page.getByRole('button', { name: 'Previous page', exact: true }).press('Enter');
  } else {
    const toggle = page.locator('.menu-toggle');
    if (await toggle.isVisible()) await toggle.click();
    await page.locator('.site-main-menu a[href="#blog"]').click();
  }
  await expect(page.locator('[data-id="blog"]')).not.toHaveAttribute('inert', '');
}

async function completeNavigation(page) {
  await page.evaluate(() => new Promise(resolve => {
    document.addEventListener('portfolio:page-settled', resolve, { once: true });
    window.releaseNavigationCompletion();
  }));
}

// Literal ids in the titles: the RTM and its independent scan read titles as written,
// so an id built from a loop variable was invisible to traceability.
async function keyboardChoiceSurvives(page, entry) {
  await beginGatedNavigation(page, entry);
  const all = page.locator('#blog-lang-toggle [data-lang-filter="all"]');
  await page.locator('#blog-lang-toggle [data-lang-filter="en"]').click();
  await all.focus();
  await page.keyboard.down('Space');
  await completeNavigation(page);
  await page.keyboard.up('Space');
  await expect.poll(() => all.evaluate(button => ({
    focused: document.activeElement === button,
    selected: button.getAttribute('aria-pressed')
  }))).toEqual({ focused: true, selected: 'true' });
  await expect(page.locator('#blog-lang-toggle [aria-pressed="true"]')).toHaveCount(1);
}

test('R-FOCUS-09 | FOCUS-AC1/3 | A newer incoming-page keyboard choice survives menu navigation completion', ({ page }) => keyboardChoiceSurvives(page, 'menu'));
test('R-FOCUS-11 | FOCUS-AC1/3 | A newer incoming-page keyboard choice survives arrow navigation completion', ({ page }) => keyboardChoiceSurvives(page, 'arrow'));

test('R-FOCUS-10 | FOCUS-AC2 | Untouched menu navigation still establishes heading focus and the first Tab stop', async ({ page }) => {
  await beginGatedNavigation(page);
  await completeNavigation(page);
  await expect(page.locator('[data-id="blog"] .section-title')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#blog-lang-toggle [data-lang-filter="all"]')).toBeFocused();
});
