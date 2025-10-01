import { readFile } from 'node:fs/promises';
import { expect, expectSection, navigateToSection } from '../fixtures.mjs';
import { mockCatalog } from '../data/catalog.mjs';
import { measureContrast } from './visual-metrics.mjs';

// Reviewed literals from spec v0.2; never generated from application output.
export const facts = JSON.parse(await readFile(new URL('../../fixtures/blog-sharing.json', import.meta.url), 'utf8'));
export const article = key => facts.articles[key];
export const labels = key => facts.messages[article(key).lang];
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function installPlatform(page, options = {}) {
  await page.addInitScript(options => {
    const probe = window.__blogShareProbe = {
      clipboardCalls: [], nativeCalls: [], canShareCalls: [], clipboardReads: [], unhandled: [],
      pending: { clipboard: [], native: [] },
      modes: { clipboard: options.clipboard || 'resolve', native: options.native || 'resolve' }
    };
    window.addEventListener('unhandledrejection', e => probe.unhandled.push(String(e.reason?.name || e.reason)));
    function invoke(kind, payload, mode) {
      probe[kind === 'clipboard' ? 'clipboardCalls' : 'nativeCalls'].push({
        payload, active: navigator.userActivation.isActive
      });
      if (mode === 'throw') throw new DOMException('Injected API failure', 'NotAllowedError');
      if (mode === 'reject' || ['AbortError', 'NotAllowedError', 'DataError'].includes(mode)) {
        return Promise.reject(new DOMException('Injected API failure', mode === 'reject' ? 'NotAllowedError' : mode));
      }
      if (mode === 'defer') return new Promise((resolve, reject) => probe.pending[kind].push({ resolve, reject }));
      return Promise.resolve();
    }
    const clipboard = options.clipboard || 'resolve';
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value:
      clipboard === 'absent' ? undefined : clipboard === 'write-absent' ? {} : {
        writeText: value => invoke('clipboard', value, probe.modes.clipboard),
        read: () => { probe.clipboardReads.push('read'); throw new Error('Clipboard reads are forbidden'); },
        readText: () => { probe.clipboardReads.push('readText'); throw new Error('Clipboard reads are forbidden'); }
      }
    });
    const native = options.native || 'resolve';
    Object.defineProperty(navigator, 'share', { configurable: true, value: native === 'absent' ? undefined :
      data => invoke('native', { ...data }, probe.modes.native) });
    const canShare = options.canShare || 'true';
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare === 'absent' ? undefined : data => {
      probe.canShareCalls.push({ ...data });
      if (canShare === 'throw') throw new Error('Injected capability failure');
      if ((options.canShareRejectUrls || []).includes(data.url)) return false;
      return canShare !== 'false';
    } });
    if (options.secure === false) Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    if (options.userAgent) Object.defineProperty(navigator, 'userAgent', { configurable: true, value: options.userAgent });
  }, options);
}

export async function openBlog(page, options = {}) {
  await installPlatform(page, options.platform);
  const categories = options.categories || {
    systems: [article('A')], test: [article('B')], software: [article('U')]
  };
  await mockCatalog(page, Object.fromEntries(Object.entries(categories).map(([key, value]) => [`medium-${key}.json`, value])));
  await page.goto('/#blog');
  await expectSection(page, 'blog');
  await expect(page.locator('.preloader')).toHaveCount(0);
  await expect(page.locator('#blog-loading')).toBeHidden();
  const count = Object.values(categories).reduce((n, entries) => n + (Array.isArray(entries) ? entries.length : 0), 0);
  await expect(page.locator('#blog-grid .blog-article-card')).toHaveCount(count);
}

export function controls(page, keyOrArticle) {
  const data = typeof keyOrArticle === 'string' ? article(keyOrArticle) : keyOrArticle;
  const text = facts.messages[data.lang];
  const card = page.locator('#blog-grid').getByRole('article').filter({
    has: page.getByRole('heading', { name: data.title, exact: true })
  });
  const trigger = card.getByRole('button', { name: new RegExp(escaped(text.SHARE)) })
    .and(card.locator('.blog-share-trigger'));
  return { data, text, card, trigger, link: card.locator('.blog-article-link') };
}

export async function openedPanel(page, state) {
  await expect(state.trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(state.trigger).toHaveAttribute('aria-controls', /.+/);
  const id = await state.trigger.getAttribute('aria-controls');
  const panel = page.locator(`[id=${JSON.stringify(id)}]`);
  await expect(panel).toBeVisible();
  const status = state.card.getByRole('status');
  await expect(status).toHaveCount(1);
  await expect(panel.getByRole('button')).toHaveCount(1);
  return { ...state, panel, status, copy: panel.getByRole('button', { name: state.text.COPY, exact: true }),
    manual: panel.getByRole('textbox', { name: state.text.ARTICLE_URL, exact: true }) };
}

export function feedback(page, keyOrState) {
  const state = typeof keyOrState === 'string' ? controls(page, keyOrState) : keyOrState;
  return { ...state, status: state.card.getByRole('status', { includeHidden: true }),
    panel: state.card.locator('.blog-share-panel'),
    copy: state.card.getByRole('button', { name: state.text.COPY, exact: true }),
    manual: state.card.getByRole('textbox', { name: state.text.ARTICLE_URL, exact: true }) };
}

export async function startNative(page, keyOrArticle) {
  const state = feedback(page, typeof keyOrArticle === 'string' ? keyOrArticle : controls(page, keyOrArticle));
  await state.trigger.click();
  return state;
}

export async function noDuplicateActions(state) {
  await expect(state.copy).toBeHidden();
  for (const name of Object.values(facts.retiredNativeLabels))
    await expect(state.card.getByRole('button', { name, exact: true })).toHaveCount(0);
  expect(await state.trigger.getAttribute('aria-expanded')).toBeNull();
  expect(await state.trigger.getAttribute('aria-controls')).toBeNull();
}

export async function nativeSettledQuiet(state) {
  await expect(state.status).toBeEmpty();
  await expect(state.panel).toBeHidden();
  await expect(state.card.locator('.blog-share-feedback')).toHaveAttribute('data-state', 'idle');
  await expect(state.trigger).toHaveAttribute('aria-busy', 'false');
  await expect(state.manual).toBeHidden();
  await noDuplicateActions(state);
  for (const message of Object.values(facts.retiredNativeResultMessages))
    await expect(state.card).not.toContainText(message);
}

export async function nativeProgressInline(state, key = 'NATIVE_PENDING') {
  await expect(state.status).toHaveText(state.text[key]);
  await expect(state.card.getByRole('status')).toHaveCount(1);
  await expect(state.status).toHaveAttribute('aria-live', 'polite');
  await expect(state.trigger).toHaveAttribute('aria-busy', 'true');
  await noDuplicateActions(state);
  const live = await state.status.evaluate(el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    const exposed = node => {
      for (; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true' ||
          style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      }
      return true;
    };
    return { exposed: exposed(el), position: s.position, width: r.width, height: r.height,
      clipped: s.clip !== 'auto' || s.clipPath !== 'none' };
  });
  expect(live.exposed, 'Pending live region remains in the accessibility tree').toBe(true);
  expect(['absolute', 'fixed']).toContain(live.position);
  expect(live.clipped, 'Pending text is visually clipped, never display:none').toBe(true);
  expect(live.width).toBeGreaterThanOrEqual(1); expect(live.width).toBeLessThanOrEqual(1);
  expect(live.height).toBeGreaterThanOrEqual(1); expect(live.height).toBeLessThanOrEqual(1);
  expect(await state.panel.evaluate(el => el.getBoundingClientRect().height), 'No disclosure height while native is pending').toBeLessThanOrEqual(1);
}

export async function shareProgressSnapshot(state) {
  return state.trigger.evaluate(button => {
    const icon = button.querySelector('svg'), label = button.querySelector('span'), s = getComputedStyle(icon);
    const box = el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; };
    return { name: button.getAttribute('aria-label'), text: label.textContent, buttonBox: box(button),
      iconWidth: parseFloat(s.width), iconHeight: parseFloat(s.height), gap: getComputedStyle(button).gap,
      labelBox: box(label), paths: [...icon.querySelectorAll('path')].map(path => path.getAttribute('d')) };
  });
}

export async function unchangedShareControl(state, before) {
  const after = await shareProgressSnapshot(state);
  for (const key of ['name', 'text', 'buttonBox', 'iconWidth', 'iconHeight', 'gap', 'labelBox'])
    expect(after[key], key).toEqual(before[key]);
  expect(after.iconWidth).toBe(14); expect(after.iconHeight).toBe(14);
  await expect(state.trigger).toHaveAccessibleName(before.name);
  return after;
}

export async function restoredShareIcon(state, before) {
  await expect(state.trigger).toHaveAttribute('aria-busy', 'false');
  await expect.poll(async () => (await shareProgressSnapshot(state)).paths).toEqual(before.paths);
  await unchangedShareControl(state, before);
}

export async function openPanel(page, keyOrArticle) {
  const state = controls(page, keyOrArticle);
  await expect(state.trigger).toHaveCount(1);
  await expect(state.trigger).toBeVisible();
  await state.trigger.click();
  return openedPanel(page, state);
}

export async function calls(page, kind) {
  return page.evaluate(kind => window.__blogShareProbe[kind === 'clipboard' ? 'clipboardCalls' : 'nativeCalls'], kind);
}

export async function cleanProbe(page) {
  const state = await page.evaluate(() => window.__blogShareProbe ? {
    reads: window.__blogShareProbe.clipboardReads, unhandled: window.__blogShareProbe.unhandled
  } : { reads: [], unhandled: [] });
  expect(state.reads, 'No Clipboard API reads, including caught read attempts').toEqual([]);
  expect(state.unhandled, 'No unhandled browser API rejection').toEqual([]);
}

export async function setPlatformMode(page, kind, mode) {
  await page.evaluate(({ kind, mode }) => { window.__blogShareProbe.modes[kind] = mode; }, { kind, mode });
}

export async function settle(page, kind, outcome, index = 0) {
  await page.evaluate(({ kind, outcome, index }) => {
    const pending = window.__blogShareProbe.pending[kind][index];
    if (!pending) throw new Error(`No pending ${kind} operation ${index}`);
    if (outcome === 'resolve') pending.resolve();
    else pending.reject(new DOMException('Controlled outcome', outcome));
    // Promise reactions and a painted UI turn, not a time-based sleep. Do not
    // attach a catch to the API Promise: that could hide an application leak.
    return new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
  }, { kind, outcome, index });
  expect(await page.evaluate(() => window.__blogShareProbe.unhandled)).toEqual([]);
}

export async function tabTo(page, target, backwards = false) {
  for (let i = 0; i < 200; i++) {
    if (await target.evaluate(el => el === document.activeElement)) return;
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
  }
  throw new Error('Control is not reachable in the natural Tab sequence');
}

export async function visibleFocus(target) {
  await expect(target).toBeFocused();
  await expect(target).toBeInViewport({ ratio: 1 });
  const state = await target.evaluate(el => {
    const s = getComputedStyle(el), box = el.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + Math.min(10, box.height / 2));
    return { width: parseFloat(s.outlineWidth), style: s.outlineStyle,
      visible: el.matches(':focus-visible'), inert: !!el.closest('[inert]'), hit: !!hit && el.contains(hit) };
  });
  expect(state).toMatchObject({ style: 'solid', visible: true, inert: false, hit: true });
  expect(state.width).toBeGreaterThanOrEqual(2);
  expect((await target.evaluate(measureContrast)).outline).toBeGreaterThanOrEqual(3);
}

export async function articleActionSnapshot(state) {
  const snapshot = await state.card.evaluate(card => {
    const link = card.querySelector('.blog-article-link');
    const read = card.querySelector('.blog-article-read');
    const label = read.querySelector('.blog-article-read-label');
    const icon = read.querySelector('.blog-article-read-icon');
    const image = card.querySelector('.blog-article-image');
    const style = (node, pseudo) => getComputedStyle(node, pseudo);
    // Some engines retain a computed outline-width with outline-style:none.
    // Only a painted outline violates the localized-focus contract.
    const paintedOutline = (node, pseudo) => {
      const value = style(node, pseudo);
      if (['none', 'hidden'].includes(value.outlineStyle) || (pseudo && value.content === 'none')) return 0;
      return parseFloat(value.outlineWidth);
    };
    const box = node => {
      const value = node.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height };
    };
    return {
      linkFocused: link === document.activeElement,
      linkFocusVisible: link.matches(':focus-visible'),
      linkOutlineWidth: paintedOutline(link),
      pseudoOutlineWidth: paintedOutline(link, '::after'),
      readOutlineWidth: parseFloat(style(read).outlineWidth),
      readOutlineStyle: style(read).outlineStyle,
      labelDecoration: style(label).textDecorationLine,
      iconDecoration: style(icon).textDecorationLine,
      cardBorderColor: style(card).borderColor,
      cardBackground: style(card).backgroundColor,
      cardShadow: style(card).boxShadow,
      imageTransform: image ? style(image).transform : 'none',
      cardBox: box(card), readBox: box(read)
    };
  });
  const contrast = await state.card.locator('.blog-article-read').evaluate(measureContrast);
  return { ...snapshot, readRingContrast: contrast.outline };
}

export async function visibleArticleActionFocus(state, before) {
  await expect(state.link).toBeFocused();
  await expect(state.link).toBeInViewport({ ratio: 1 });
  const after = await articleActionSnapshot(state);
  expect(after.linkFocused).toBe(true);
  expect(after.linkFocusVisible).toBe(true);
  expect(after.linkOutlineWidth).toBe(0);
  expect(after.pseudoOutlineWidth).toBe(0);
  expect(after.readOutlineStyle).toBe('solid');
  expect(after.readOutlineWidth).toBeGreaterThanOrEqual(2);
  expect(after.readRingContrast).toBeGreaterThanOrEqual(3);
  expect(after.labelDecoration).toBe('underline');
  expect(after.iconDecoration).toBe('none');
  for (const property of ['cardBorderColor', 'cardBackground', 'cardShadow', 'imageTransform', 'cardBox', 'readBox'])
    expect(after[property], property).toEqual(before[property]);
}

async function selection(page) {
  return page.evaluate(() => {
    const el = document.activeElement, s = getSelection();
    return { text: s.toString(), anchor: s.anchorOffset, focus: s.focusOffset,
      start: 'selectionStart' in el ? el.selectionStart : null, end: 'selectionEnd' in el ? el.selectionEnd : null };
  });
}

export async function preservedFocus(page) {
  const focused = await page.evaluateHandle(() => document.activeElement);
  const selected = await selection(page);
  return async () => {
    expect(await focused.evaluate(el => el === document.activeElement)).toBe(true);
    expect(await selection(page)).toEqual(selected);
    await focused.dispose();
  };
}

export async function copyAcrossCards(page, outcome) {
  await openBlog(page, { platform: { clipboard: 'defer', native: 'absent' } });
  const a = await openPanel(page, 'A');
  await a.copy.click();
  expect(await calls(page, 'clipboard')).toEqual([{ payload: article('A').url, active: true }]);
  await expect(a.status).not.toHaveText(a.text.COPY_SUCCESS);
  await a.copy.click();
  await expect(a.status).toHaveText(a.text.COPY_BUSY);
  expect(await calls(page, 'clipboard')).toHaveLength(1);
  const b = await openPanel(page, 'B');
  await b.copy.click();
  await expect(b.status).toHaveText(b.text.COPY_BUSY);
  expect(await calls(page, 'clipboard')).toHaveLength(1);
  const unchanged = await preservedFocus(page);
  await settle(page, 'clipboard', outcome);
  await unchanged();
  await expect(b.status).not.toHaveText(b.text.COPY_BUSY);
  await expect(b.status).not.toContainText(a.text.COPY_SUCCESS);
  await expect(b.status).not.toContainText(a.text.COPY_MANUAL);
  await expect(b.status).not.toContainText(b.text.COPY_SUCCESS);
  await expect(b.status).not.toContainText(b.text.COPY_MANUAL);
  await expect(b.manual).toBeHidden();
  expect(await calls(page, 'clipboard')).toHaveLength(1); // No automatic queue.
  await b.copy.click();
  expect(await calls(page, 'clipboard')).toEqual([
    { payload: article('A').url, active: true }, { payload: article('B').url, active: true }
  ]);
  await expect(b.status).toHaveText(b.text.COPY_PENDING);
  await settle(page, 'clipboard', 'resolve', 1);
  await expect(b.status).toHaveText(b.text.COPY_SUCCESS);
}

export async function reopenPending(page, kind, outcome) {
  await openBlog(page, { platform: kind === 'clipboard' ? { clipboard: 'defer', native: 'absent' } : { native: 'defer' } });
  const first = kind === 'clipboard' ? await openPanel(page, 'A') : await startNative(page, 'A');
  const node = await first.card.elementHandle();
  if (kind === 'clipboard') {
    await first.copy.click(); await first.trigger.click();
  } else {
    expect(await calls(page, 'native')).toHaveLength(1);
    // Outside activation closes local feedback without replacing this card.
    await page.locator('.theme-toggle-btn:visible').first().click();
  }
  const fresh = kind === 'clipboard' ? await openPanel(page, 'A') : await startNative(page, 'A');
  expect(await node.evaluate(el => el === document.querySelector('#blog-grid .blog-article-card'))).toBe(true);
  for (const key of ['COPY_SUCCESS', 'COPY_MANUAL', 'NATIVE_ABORT', 'NATIVE_ERROR']) {
    await expect(fresh.status).not.toContainText(fresh.text[key]);
  }
  for (const message of Object.values(facts.retiredNativeResultMessages))
    await expect(fresh.card).not.toContainText(message);
  await expect(fresh.manual).toBeHidden();
  if (kind === 'clipboard') await fresh.copy.click();
  await expect(fresh.status).toHaveText(fresh.text[kind === 'clipboard' ? 'COPY_BUSY' : 'NATIVE_BUSY']);
  if (kind === 'native') await nativeProgressInline(fresh, 'NATIVE_BUSY');
  expect(await calls(page, kind)).toHaveLength(1);
  const unchanged = await preservedFocus(page);
  await settle(page, kind, outcome);
  await unchanged();
  await expect(fresh.status).toBeEmpty();
  await expect(fresh.manual).toBeHidden();
  expect(await calls(page, kind)).toHaveLength(1);
  await (kind === 'clipboard' ? fresh.copy : fresh.trigger).click();
  expect(await calls(page, kind)).toHaveLength(2);
  await settle(page, kind, 'resolve', 1);
  if (kind === 'clipboard') await expect(fresh.status).toHaveText(fresh.text.COPY_SUCCESS);
  else await nativeSettledQuiet(fresh);
  await node.dispose();
}

export async function lateResult(page, kind, outcome, change) {
  await openBlog(page, { platform: kind === 'clipboard' ? { clipboard: 'defer', native: 'absent' } : { native: 'defer' } });
  const a = kind === 'clipboard' ? await openPanel(page, 'A') : await startNative(page, 'A');
  if (kind === 'clipboard') await a.copy.click();
  if (change === 'filter') {
    await page.locator('#blog-filters [data-group="category_testing"]').click();
  } else {
    await navigateToSection(page, 'projects');
    await navigateToSection(page, 'blog');
    await page.locator('#blog-filters [data-group="category_testing"]').click();
  }
  await expect(controls(page, 'A').card).toHaveCount(0);
  await expect(page.locator('#blog-grid .blog-article-title')).toHaveText([article('B').title]);
  const b = kind === 'clipboard' ? await openPanel(page, 'B') : await startNative(page, 'B');
  if (kind === 'clipboard') await b.copy.click();
  await expect(b.status).toHaveText(b.text[kind === 'clipboard' ? 'COPY_BUSY' : 'NATIVE_BUSY']);
  if (kind === 'native') await nativeProgressInline(b, 'NATIVE_BUSY');
  expect(await calls(page, kind)).toHaveLength(1);
  const unchanged = await preservedFocus(page);
  await settle(page, kind, outcome);
  await unchanged();
  await expect(b.status).toBeEmpty();
  await expect(b.manual).toBeHidden();
  expect(await calls(page, kind)).toHaveLength(1);
  await (kind === 'clipboard' ? b.copy : b.trigger).click();
  const recorded = await calls(page, kind);
  expect(recorded).toHaveLength(2);
  expect(recorded[1].payload).toEqual(kind === 'clipboard' ? article('B').url : { title: article('B').title, url: article('B').url });
  await settle(page, kind, 'resolve', 1);
}

export async function fallbackFocus(page, mode, moveFocus) {
  await openBlog(page, { platform: { clipboard: mode, native: 'absent' } });
  const a = await openPanel(page, 'A');
  await tabTo(page, a.copy);
  const before = await preservedFocus(page);
  await a.copy.press('Enter');
  if (mode === 'defer') {
    await before();
    if (moveFocus) await page.keyboard.press('Shift+Tab'); // Trigger, without activation.
    const unchanged = await preservedFocus(page);
    await settle(page, 'clipboard', 'NotAllowedError');
    await unchanged();
  } else await before();
  await expect(a.status).toHaveText(a.text.COPY_MANUAL);
  await expect(a.manual).toBeVisible();
  await expect(a.manual).toHaveValue(article('A').url);
  expect(await a.manual.evaluate(el => el.readOnly)).toBe(true);
  await tabTo(page, a.manual);
  await page.keyboard.press('ControlOrMeta+A');
  const selected = await a.manual.evaluate(el => el.value.slice(el.selectionStart, el.selectionEnd));
  expect(selected).toBe(article('A').url);
  await page.keyboard.press('Tab');
  await expect(a.trigger).toHaveAttribute('aria-expanded', 'true');
}
