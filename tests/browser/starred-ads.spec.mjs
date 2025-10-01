import { readFile } from 'node:fs/promises';
import { test, expect, navigateToSection } from './fixtures.mjs';
import { adFixture, enterAdPage, geometry } from './helpers/adsense.mjs';
import { mockCatalog, starred } from './data/catalog.mjs';
const facts = JSON.parse(await readFile(new URL('../fixtures/starred-ad-policy.json', import.meta.url), 'utf8'));
const dynamic = { ...facts.policy, enabled: true, unit: facts.fixtureUnit };
const cards = page => page.locator('#proj-starred-grid .proj-card');
const placements = page => page.locator('#proj-starred-grid [data-ad-placement^="starred-ad-"]');
const more = page => page.locator('#proj-starred-more-btn');
const requestKeys = page => page.evaluate(() => window.__adFixture.calls.map(item => item.key).filter(key => key.startsWith('starred-ad-')));
async function open(page, count, options = {}) {
  await adFixture(page, { starredCount: count, dynamic, ...options });
  await enterAdPage(page, 'projects'); await expect(cards(page)).toHaveCount(Math.min(20, count));
}
async function expand(page, expected) {
  await more(page).click(); await expect(cards(page)).toHaveCount(expected);
}

test('SM-01/02/03/06/14 | Actual 20/40/60/80/100/140-card progression reserves at most two independent placements', async ({ page }) => {
  await open(page, 140, { dynamic: null });
  for (const [total, count] of [[20,0],[40,0],[60,1],[80,1],[100,2],[120,2],[140,2]]) {
    if (total > 20) await expand(page, total);
    await expect(placements(page)).toHaveCount(count);
    expect(await page.locator('section[data-id="projects"] .js-adsense').count()).toBeLessThanOrEqual(3);
    if (total < 140) await expect(page.locator('#proj-starred-remaining')).toHaveText(`(${140-total} more)`);
    const names = await cards(page).locator('.proj-name-text').allTextContents();
    expect(names.map(value => value.trim())).toEqual(Array.from({ length: total }, (_, i) => `star-${i + 1}`));
    expect(new Set(names).size).toBe(total);
  }
  await expect(more(page)).toBeHidden();
  expect(await placements(page).evaluateAll(nodes => nodes.map(node => node.getAttribute('data-ad-placement')))).toEqual(['starred-ad-1', 'starred-ad-2']);
  const configured = await placements(page).first().evaluate(el => {
    const ins = el.querySelector('ins') || el.querySelector('template').content.querySelector('ins');
    return { client: ins.dataset.adClient, slot: ins.dataset.adSlot,
      format: ins.dataset.adFormat, layoutKey: ins.dataset.adLayoutKey };
  });
  expect(configured).toEqual(facts.productionUnit);
});

for (const [total, count] of [[59,0],[99,1]]) {
  test(`SM-04/07 | Final partial catalog ${total} keeps quota and focuses the first new real card`, async ({ page }) => {
    await open(page, total);
    while (await cards(page).count() + 20 < total) await expand(page, await cards(page).count() + 20);
    const before = await cards(page).count();
    await more(page).focus(); await more(page).press('Enter');
    await expect(cards(page)).toHaveCount(total); await expect(more(page)).toBeHidden();
    await expect(placements(page)).toHaveCount(count);
    await expect(cards(page).nth(before).locator('a[href]').first()).toBeFocused();
  });
}

test('SM-05/07/13 | Rapid activation appends content immediately without waiting for provider results or stealing button focus', async ({ page }) => {
  await open(page, 140);
  await more(page).focus();
  for (const total of [40,60,80,100]) { await more(page).press('Enter'); await expect(cards(page)).toHaveCount(total); await expect(more(page)).toBeFocused(); }
  await expect(placements(page)).toHaveCount(2);
  const keys = await placements(page).evaluateAll(nodes => nodes.map(node => node.getAttribute('data-ad-placement')));
  expect(new Set(keys).size).toBe(2);
});

test('SM-02/06 | Duplicate source identities never become extra cards or advertising opportunities', async ({ page }) => {
  await adFixture(page, { dynamic });
  const unique = starred(60);
  await mockCatalog(page, { 'github-starred.json': [...unique.slice(0,20), unique[0], ...unique.slice(20), unique[40]] });
  await enterAdPage(page, 'projects'); await expect(cards(page)).toHaveCount(20);
  await expand(page, 40); await expect(placements(page)).toHaveCount(0);
  await expand(page, 60); await expect(placements(page)).toHaveCount(1);
  await expect(more(page)).toBeHidden();
  expect(await cards(page).locator('.proj-name-text').allTextContents()).toEqual(unique.map(repo => repo.name));
});

test('SM-02/08/12 | A full-width insertion lies inside the new batch, away from the old button, and requests once near the real scroll viewport', async ({ page }, info) => {
  await open(page, 100); await expand(page, 40);
  const oldButtonBox = await more(page).boundingBox(); await expand(page, 60);
  const ad = placements(page).first();
  const location = await ad.evaluate(el => {
    const siblings = [...el.parentElement.children], index = siblings.indexOf(el);
    const cardCount = nodes => nodes.reduce((sum, node) => sum + (node.matches('.proj-card') ? 1 : node.querySelectorAll('.proj-card').length), 0);
    return { before: cardCount(siblings.slice(0,index)),
      after: cardCount(siblings.slice(index+1)),
      width: el.getBoundingClientRect().width, gridWidth: el.parentElement.getBoundingClientRect().width,
      root: !!el.closest('.page-content-panel') };
  });
  expect(location.before - 40).toBeGreaterThanOrEqual(6); expect(location.after).toBeGreaterThanOrEqual(6);
  expect(location.width).toBeCloseTo(location.gridWidth, 0); expect(location.root).toBe(true);
  const adBox = await ad.boundingBox();
  expect(adBox.y >= oldButtonBox.y + oldButtonBox.height || adBox.y + adBox.height <= oldButtonBox.y).toBe(true);
  await navigateToSection(page, 'blog');
  expect(await requestKeys(page)).toEqual([]);
  await navigateToSection(page, 'projects'); await ad.scrollIntoViewIfNeeded();
  await expect.poll(() => requestKeys(page)).toEqual(['starred-ad-1']);
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  expect(await requestKeys(page)).toEqual(['starred-ad-1']);
  await info.attach('placement-bounds', { body: JSON.stringify({ location, oldButtonBox, adBox }, null, 2), contentType: 'application/json' });
});

test('SM-09/10/11/14 | No-fill consumes its reserved quota; history, theme and categories preserve placement identity', async ({ page }) => {
  await open(page, 140); await expand(page, 40); await expand(page, 60);
  const ad = placements(page).first(), handle = await ad.elementHandle();
  await ad.scrollIntoViewIfNeeded(); await expect.poll(() => requestKeys(page)).toEqual(['starred-ad-1']);
  await page.evaluate(() => window.__adFixture.respond('starred-ad-1', 'unfilled', 600));
  await expect.poll(async () => (await geometry(ad)).height).toBe(0);
  await navigateToSection(page, 'blog'); await navigateToSection(page, 'projects');
  await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).first().click();
  await page.locator('#proj-filters').getByRole('button', { name: 'Software Engineering', exact: true }).click();
  await page.goBack(); await page.goForward();
  for (const total of [80,100,120,140]) await expand(page, total);
  await expect(placements(page)).toHaveCount(2);
  expect(await handle.evaluate(el => el === document.querySelector('[data-ad-placement="starred-ad-1"]'))).toBe(true);
  expect((await requestKeys(page)).filter(key => key === 'starred-ad-1')).toHaveLength(1);
  await handle.dispose();
});

test('SM-01/10/13/15 | With feed advertising disabled, all real cards remain available and no dynamic ad is enabled', async ({ page }) => {
  await open(page, 100, { dynamic: { ...facts.policy, enabled: false, unit: null }, script: 'blocked' });
  for (const total of [40,60,80,100]) await expand(page, total);
  await expect(placements(page)).toHaveCount(0); expect(await requestKeys(page)).toEqual([]);
  await expect(page.locator('#proj-grid .proj-card')).not.toHaveCount(0);
});

for (const state of ['filled', 'unfill-optimized']) {
  test(`SM-11 | A late ${state} dynamic response stays visible and keeps the same placement`, async ({ page }) => {
    await page.clock.install(); await open(page, 100); await expand(page, 40); await expand(page, 60);
    const ad = placements(page).first(); await ad.scrollIntoViewIfNeeded();
    await expect.poll(() => requestKeys(page)).toEqual(['starred-ad-1']);
    await page.clock.fastForward(30000);
    await page.evaluate(state => window.__adFixture.respond('starred-ad-1', state, 600), state);
    await expect(ad.locator('iframe')).toBeVisible();
    await expect(ad.locator('iframe')).toHaveCSS('height', '600px');
    expect((await ad.locator('iframe').boundingBox()).height).toBeCloseTo(600, 3);
    expect(await requestKeys(page)).toEqual(['starred-ad-1']);
  });
}

test('SM-08 | A dynamic unit below 250px waits for sufficient width without narrowing the repository cards', async ({ page }) => {
  await open(page, 100, { widthBlocked: true }); await expand(page, 40); await expand(page, 60);
  const ad = placements(page).first();
  await ad.evaluate(el => { el.style.setProperty('width', '249px', 'important'); document.getElementById('fixture-zero-width').remove(); });
  await ad.scrollIntoViewIfNeeded();
  expect(await requestKeys(page)).toEqual([]);
  await ad.evaluate(el => { el.style.removeProperty('width'); });
  await expect.poll(() => requestKeys(page)).toEqual(['starred-ad-1']);
});

for (const width of [320,390,768,1440,1785]) {
test(`SM-12 | Dynamic placement and label reflow at ${width}px without clipping provider content`, async ({ page }, info) => {
  await open(page, 100);
  const metrics = [];
    // Request at a valid In-feed width, then resize the same provider node.
    // At 320px the padded content area is below the separate 250px request gate.
    await page.setViewportSize({ width: 1440, height: 930 });
    await page.reload();
    await enterAdPage(page, 'projects'); await expand(page, 40); await expand(page, 60);
    const ad = placements(page).first(); await ad.scrollIntoViewIfNeeded();
    await expect.poll(() => requestKeys(page)).toEqual(['starred-ad-1']);
    await page.evaluate(() => window.__adFixture.respond('starred-ad-1', 'filled', 300));
    await page.setViewportSize({ width, height: 930 });
    await expect(ad.locator('iframe')).toHaveCSS('height', '300px');
    expect((await ad.locator('iframe').boundingBox()).height).toBeCloseTo(300, 3);
    const label = ad.getByText('Advertisements', { exact: true }); await expect(label).toBeVisible();
    await label.evaluate(el => { el.style.fontSize = '26px'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    metrics.push({ width, ad: await geometry(ad), label: await label.boundingBox() });
  await info.attach('dynamic-responsive-geometry', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
});
}

test('SM-10/12 | A late no-fill above the reader preserves the real repository anchor', async ({ page }, info) => {
  await open(page, 100); await expand(page, 40); await expand(page, 60);
  const ad = placements(page).first(); await ad.scrollIntoViewIfNeeded();
  await expect.poll(() => requestKeys(page)).toEqual(['starred-ad-1']);
  await page.evaluate(() => window.__adFixture.respond('starred-ad-1', null, 600));
  // Keep enough real content below the reading anchor to permit the same
  // viewport offset after collapse; otherwise scrollTop is clamped at the end.
  await expand(page, 80);
  const anchor = cards(page).nth(55); await anchor.scrollIntoViewIfNeeded();
  const top = () => anchor.evaluate(el => el.getBoundingClientRect().top - el.closest('.page-content-panel').getBoundingClientRect().top);
  const before = await top();
  await page.evaluate(() => window.__adFixture.respond('starred-ad-1', 'unfilled'));
  await expect.poll(async () => (await geometry(ad)).height).toBe(0);
  await expect.poll(async () => Math.abs(await top() - before)).toBeLessThanOrEqual(1);
  await info.attach('dynamic-reading-anchor', { body: JSON.stringify({ before, after: await top() }), contentType: 'application/json' });
});
