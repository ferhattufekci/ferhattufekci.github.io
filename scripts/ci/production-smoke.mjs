import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = new URL(process.argv[2]);
const output = 'work/qa/production-smoke';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = {
  base: base.href,
  sourceSha: process.env.SOURCE_SHA,
  passed: false,
  contexts: [],
  errors: []
};
try {
  for (const width of [1440, 390])
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme,
        reducedMotion: 'reduce'
      });
      const loadedData = {};
      await context.addInitScript(() =>
        localStorage.setItem('calendlyPermanentlyClosed', 'true')
      );
      // Exercise actual same-origin production data and assets; vendor services are outside this smoke's scope.
      await context.route('**/*', (route) =>
        new URL(route.request().url()).origin === base.origin
          ? route.continue()
          : route.abort()
      );
      const page = await context.newPage();
      page.on('pageerror', (error) => report.errors.push(error.message));
      page.on('requestfailed', (request) => {
        if (new URL(request.url()).origin === base.origin)
          report.errors.push(
            `${request.url()}: ${request.failure()?.errorText}`
          );
      });
      page.on('response', (response) => {
        if (
          new URL(response.url()).origin === base.origin &&
          response.status() >= 400
        )
          report.errors.push(`${response.url()}: HTTP ${response.status()}`);
      });
      page.on('console', (message) => {
        if (
          message.type() === 'error' &&
          (!message.location().url ||
            message.location().url.startsWith(base.origin))
        )
          report.errors.push(message.text());
      });
      await context.tracing.start({ screenshots: true, snapshots: true });
      try {
        await page.goto(new URL('#resume', base).href);
        await expect(page.locator('.preloader')).toHaveCount(0);
        const nav = page.getByRole('navigation', {
          name: 'Resume section navigation'
        });
        await expect(nav.locator('[aria-current]')).toHaveText('All');
        await nav
          .getByRole('button', { name: 'Education', exact: true })
          .click();
        await expect(nav.locator('[aria-current]')).toHaveText('Education');
        for (const expanded of [false, true, false]) {
          await nav
            .getByRole('button', { name: 'Certifications', exact: true })
            .click();
          const details = page.locator('.resume-certificates-more');
          if ((await details.evaluate((el) => el.open)) !== expanded)
            await details.locator(':scope > summary').click();
          await nav
            .getByRole('button', { name: 'Certifications', exact: true })
            .click();
          await expect
            .poll(() =>
              page.evaluate(() => {
                const panel = document.getElementById('resume-content');
                return Math.abs(
                  document
                    .getElementById('resume-certifications')
                    .getBoundingClientRect().top -
                    panel.getBoundingClientRect().top -
                    parseFloat(getComputedStyle(panel).paddingTop)
                );
              })
            )
            .toBeLessThanOrEqual(2);
        }
        await nav
          .getByRole('button', { name: 'Download Full Resume', exact: true })
          .click();
        await expect(page.locator('#resume-download a')).toBeInViewport({
          ratio: 1
        });
        const pdf = await context.request.get(
          new URL(
            await page.locator('#resume-download a').getAttribute('href'),
            base
          ).href
        );
        assert.equal(pdf.status(), 200);
        assert.match(pdf.headers()['content-type'], /application\/pdf/);
        await nav.getByRole('button', { name: 'All', exact: true }).click();
        await expect
          .poll(() =>
            page.locator('#resume-content').evaluate((el) => el.scrollTop)
          )
          .toBe(0);
        for (const id of ['resume', 'blog', 'projects', 'contact']) {
          await page.goto(new URL(`#${id}`, base).href);
          await expect(
            page.locator(`.pt-page-current:not([inert])[data-id="${id}"]`)
          ).toBeVisible();
          if (id === 'blog' || id === 'projects') {
            await expect(
              page.locator(id === 'blog' ? '#blog-loading' : '#proj-loading')
            ).toBeHidden();
            const dataPath = id === 'blog' ? 'data/medium-all.json' : 'data/github-repos.json';
            const response = await context.request.get(new URL(dataPath, base).href);
            assert.equal(response.status(), 200, dataPath);
            const items = await response.json();
            assert.ok(Array.isArray(items) && items.length > 0, `Expected published data: ${dataPath}`);
            const cards = page.locator(id === 'blog'
              ? '#blog-grid .blog-article-card'
              : '#proj-pinned .proj-card, #proj-grid .proj-card');
            await expect(cards).toHaveCount(items.length);
            await expect(cards.first()).toBeVisible();
            loadedData[id] = { publishedItems: items.length, renderedCards: await cards.count() };
          }
          if (id === 'contact')
            await page.setViewportSize({ width, height: 480 });
          const controls = page.locator(
              `.pt-page[data-id="${id}"] .page-controls-panel`
            ),
            panel = page.locator(`#${id}-content`);
          const before = await controls.boundingBox();
          await panel.evaluate((el) => {
            el.scrollTop = Math.min(250, el.scrollHeight - el.clientHeight);
          });
          assert.deepEqual(await controls.boundingBox(), before);
          assert.equal(
            await page.evaluate(() => document.scrollingElement.scrollTop),
            0
          );
          if (id === 'blog' || id === 'projects') {
            const filter = page.locator(
              id === 'blog'
                ? '#blog-filters [data-group="category_system_engineering"]'
                : '#proj-filters [data-group="proj_systems"]'
            );
            await filter.click();
            await expect(filter).toHaveAttribute('aria-pressed', 'true');
            await expect
              .poll(() => panel.evaluate((el) => el.scrollTop))
              .toBe(0);
          }
          await page.screenshot({
            path: `${output}/${id}-${width}-${colorScheme}.png`
          });
        }
        assert.deepEqual(report.errors, []);
        report.contexts.push({ width, colorScheme, passed: true, data: loadedData });
        await context.tracing.stop();
      } catch (error) {
        await page
          .screenshot({ path: `${output}/failed-${width}-${colorScheme}.png` })
          .catch(() => {});
        await context.tracing
          .stop({ path: `${output}/failed-${width}-${colorScheme}-trace.zip` })
          .catch(() => {});
        throw error;
      } finally {
        await context.close();
      }
    }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
}
