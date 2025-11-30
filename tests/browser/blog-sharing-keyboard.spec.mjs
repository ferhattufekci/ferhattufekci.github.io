import { test, expect } from './fixtures.mjs';
import { article, controls, openBlog, openPanel, openedPanel, calls, settle,
  tabTo, visibleFocus, copyAcrossCards, reopenPending, lateResult, fallbackFocus, cleanProbe, feedback, noDuplicateActions,
  setPlatformMode, nativeSettledQuiet, articleActionSnapshot, visibleArticleActionFocus,
  nativeProgressInline, shareProgressSnapshot, restoredShareIcon } from './helpers/blog-sharing.mjs';

// This is the focused engine matrix, not a copy of the entire Chromium suite.
// The default config also discovers it; keyboard config adds Firefox/WebKit.
test.afterEach(async ({ page }) => cleanProbe(page));

test('R-HOVER-04 | K05 | The native article link and Share are separate Tab stops with focus localized to their action labels', async ({ page }) => {
  await openBlog(page, { platform: { native: 'absent' } });
  await page.evaluate(() => document.fonts.ready);
  const a = controls(page, 'A');
  await a.link.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
  await a.card.evaluate(async el => {
    await Promise.all(el.getAnimations({ subtree: true }).filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished));
  });
  const before = await articleActionSnapshot(a);
  await tabTo(page, a.link); await visibleArticleActionFocus(a, before);
  await page.keyboard.press('Tab'); await visibleFocus(a.trigger);
  const shareFocused = await articleActionSnapshot(a);
  expect(shareFocused.labelDecoration).toBe('none');
  await page.keyboard.press('Shift+Tab'); await visibleArticleActionFocus(a, before);
  await expect(a.link).toHaveAttribute('href', article('A').url);
  await expect(a.link).toHaveAttribute('target', '_blank');
});

test('R-BLOG-SHARE-01/08 | K01 | Keyboard activation, visible focus, Tab exit and Escape preserve native disclosure semantics', async ({ page }) => {
  await openBlog(page, { platform: { native: 'absent' } });
  const a = controls(page, 'A');
  await tabTo(page, a.trigger); await visibleFocus(a.trigger);
  await a.trigger.press('Enter');
  const p = await openedPanel(page, a);
  await page.keyboard.press('Tab'); await visibleFocus(p.copy);
  await page.keyboard.press('Space'); await expect(p.status).toHaveText(p.text.COPY_SUCCESS);
  await page.keyboard.press('Tab');
  expect(await p.panel.evaluate(el => el.contains(document.activeElement))).toBe(false);
  await expect(a.trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Shift+Tab'); await expect(p.copy).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(a.trigger).toHaveAttribute('aria-expanded', 'false');
  await visibleFocus(a.trigger); await expect(p.panel).toBeHidden();
  expect(await calls(page, 'clipboard')).toEqual([{ payload: article('A').url, active: true }]);
});

for (const outcome of ['resolve', 'NotAllowedError']) {
  test(`R-BLOG-SHARE-03/07/12 | K02.copy.${outcome} | Cross-card writes are single-flight, never queued and require a new B activation`, async ({ page }) => {
    await copyAcrossCards(page, outcome);
  });
}

for (const moveFocus of [false, true]) {
  test(`R-BLOG-SHARE-04/08 | K02.fallback.${moveFocus ? 'moved-focus' : 'copy-focus'} | A late rejection does not move focus or selection and the manual URL is reachable by Tab`, async ({ page }) => {
    await fallbackFocus(page, 'defer', moveFocus);
  });
}

for (const outcome of ['AbortError', 'NotAllowedError']) {
  test(`R-BLOG-SHARE-05/06/07 | K03.${outcome} | Enter/Space share under activation, preserve the native lock and allow explicit recovery without clipboard side effects`, async ({ page }) => {
    await openBlog(page, { platform: { native: 'defer', canShare: 'absent' } });
    const a = feedback(page, 'A');
    const normalA = await shareProgressSnapshot(a), b = feedback(page, 'B'), normalB = await shareProgressSnapshot(b);
    await tabTo(page, a.trigger); await visibleFocus(a.trigger); await a.trigger.press('Enter');
    await nativeProgressInline(a);
    expect(await calls(page, 'native')).toEqual([{ payload: { title: article('A').title, url: article('A').url }, active: true }]);
    await noDuplicateActions(a);
    await a.trigger.press('Space'); await nativeProgressInline(a, 'NATIVE_BUSY');
    await tabTo(page, b.trigger); await b.trigger.press('Space'); await noDuplicateActions(b);
    await nativeProgressInline(b, 'NATIVE_BUSY');
    await restoredShareIcon(a, normalA);
    expect(await calls(page, 'native')).toHaveLength(1);
    await settle(page, 'native', outcome);
    await expect(b.status).toBeEmpty();
    await restoredShareIcon(b, normalB);
    expect(await calls(page, 'clipboard')).toEqual([]);
    expect(await calls(page, 'native')).toHaveLength(1);
    await b.trigger.press('Enter');
    expect((await calls(page, 'native'))[1]).toEqual({ payload: { title: article('B').title, url: article('B').url }, active: true });
    await settle(page, 'native', 'resolve', 1); await nativeSettledQuiet(b);
  });
}

test('R-BLOG-SHARE-05/06/08 | K03.recovery | Native failure offers only keyboard Copy and Share can explicitly retry', async ({ page }) => {
  await openBlog(page, { platform: { native: 'NotAllowedError' } });
  const a = feedback(page, 'A'); await tabTo(page, a.trigger); await a.trigger.press('Enter');
  await expect(a.status).toHaveText(a.text.NATIVE_ERROR); const p = await openedPanel(page, a);
  expect(await calls(page, 'clipboard')).toEqual([]);
  await page.keyboard.press('Tab'); await visibleFocus(p.copy); await p.copy.press('Space');
  await expect(p.status).toHaveText(p.text.COPY_SUCCESS);
  expect(await calls(page, 'clipboard')).toEqual([{ payload: article('A').url, active: true }]);
  await page.keyboard.press('Escape'); await visibleFocus(a.trigger);
  await setPlatformMode(page, 'native', 'resolve'); await a.trigger.press('Enter'); await noDuplicateActions(a);
  expect(await calls(page, 'native')).toHaveLength(2);
});

for (const kind of ['clipboard', 'native']) {
  for (const outcome of ['resolve', kind === 'clipboard' ? 'NotAllowedError' : 'AbortError']) {
    test(`R-BLOG-SHARE-12 | K04.reopen.${kind}.${outcome} | Same-node reopen invalidates old UI ownership without releasing the pending API lock`, async ({ page }) => {
      await reopenPending(page, kind, outcome);
    });
  }
}

for (const [kind, outcome, change] of [['clipboard', 'NotAllowedError', 'filter'], ['native', 'AbortError', 'route']]) {
  test(`R-BLOG-SHARE-12 | K04.${change}.${kind} | A removed card cannot write old results into the new card at its index`, async ({ page }) => {
    await lateResult(page, kind, outcome, change);
  });
}
