import test from 'node:test';
import assert from 'node:assert/strict';
import { browser, load } from './helpers/browser-dom.js';

// Controllable timers: tick(ms) runs whatever is due.
function clock() {
  let now = 0, id = 0;
  const timers = new Map();
  const add = (fn, ms, repeat) => { timers.set(++id, { fn, at: now + ms, ms, repeat }); return id; };
  return {
    setTimeout: (fn, ms) => add(fn, ms, false), setInterval: (fn, ms) => add(fn, ms, true),
    clearTimeout: key => timers.delete(key), clearInterval: key => timers.delete(key),
    tick(ms) {
      now += ms;
      for (const [key, t] of [...timers]) if (t.at <= now) { t.fn(); if (t.repeat) t.at += t.ms; else timers.delete(key); }
    },
    get pending() { return timers.size; }
  };
}

function tabTitle({ hidden = false, language = 'en-GB' } = {}) {
  const dom = browser('');
  const { document, window } = dom;
  document.title = 'Ferhat Tüfekçi';
  let isHidden = hidden;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => isHidden });
  const timers = clock();
  load('tab-title.js', { document, navigator: { language }, ...timers });
  const visibility = value => { isHidden = value; document.dispatchEvent(new window.Event('visibilitychange')); };
  return { document, timers, visibility };
}

test('R-UNIT-TITLE-01: Given the tab is hidden, then the title cycles through the away frames; when shown again, the original title returns', () => {
  const { document, timers, visibility } = tabTitle();
  visibility(true);
  assert.equal(document.title, '😶  Stepped away?');
  timers.tick(900); assert.equal(document.title, '😔  Come back...');
  timers.tick(900); assert.equal(document.title, '👋  I’m here.');
  timers.tick(900); assert.equal(document.title, '😶  Stepped away?', 'the frames repeat');
  visibility(false);
  assert.equal(document.title, 'Ferhat Tüfekçi');
  assert.equal(timers.pending, 0, 'the interval is cleared');
});

test('R-UNIT-TITLE-02: Given a Turkish browser, then the Turkish frames are used; an unsupported language falls back to English', () => {
  const turkish = tabTitle({ language: 'tr-TR' });
  turkish.visibility(true);
  assert.equal(turkish.document.title, '😶  Bir yere mi gittin?');
  const german = tabTitle({ language: 'de-DE' });
  german.visibility(true);
  assert.equal(german.document.title, '😶  Stepped away?');
});

test('R-UNIT-TITLE-03: Given the page loads already hidden, then the animation starts at once and repeated hides do not stack timers', () => {
  const { document, timers, visibility } = tabTitle({ hidden: true });
  assert.equal(document.title, '😶  Stepped away?');
  visibility(true); visibility(true);
  assert.equal(timers.pending, 1);
});

function notFound(withPage = false) {
  const dom = browser(`<main id="pages">${withPage ? '<section id="route-not-found"><h1 id="route-error-title">x</h1></section>' : ''}</main>`);
  const { document, window } = dom;
  let rendered = 0;
  const root = { PortfolioErrorCard: { renderView: inline => { rendered++; assert.equal(inline, false); return '<section id="route-not-found"><h1 id="route-error-title">Page not found</h1></section>'; } } };
  load('not-found-view.js', { document, window: root, CustomEvent: window.CustomEvent });
  return { ...dom, view: root.PortfolioNotFoundView, rendered: () => rendered };
}

test('R-UNIT-NOTFOUND-01: Given no recovery view, then ensure renders it once; an existing view is reused', () => {
  const { document, view, rendered } = notFound();
  const container = document.getElementById('pages');
  const first = view.ensure(container);
  assert.equal(first.id, 'route-not-found');
  assert.equal(view.ensure(container), first);
  assert.equal(rendered(), 1);
  assert.equal(notFound(true).view.ensure(document.body).ownerDocument !== null, true);
});

test('R-UNIT-NOTFOUND-02: Given the recovery view, when activated, then it becomes current at the top, announces activation and focuses its title', () => {
  const { document, view } = notFound(true);
  const page = document.getElementById('route-not-found');
  page.scrollTop = 500;
  const events = [];
  document.addEventListener('portfolio:page-activate', event => events.push(event.detail.page));
  const title = document.getElementById('route-error-title');
  let focusOptions = null;
  title.focus = options => { focusOptions = options; };
  view.activate(page);
  assert.equal(page.classList.contains('pt-page-current'), true);
  assert.equal(page.scrollTop, 0);
  assert.deepEqual(events, [page]);
  assert.equal(focusOptions.preventScroll, true);
});

function preloader(markup = '<div class="preloader" aria-busy="true"></div>', readyState = 'loading') {
  const dom = browser(markup);
  const { document, window, win } = dom;
  Object.defineProperty(document, 'readyState', { configurable: true, get: () => readyState });
  const timers = clock();
  load('preloader.js', { document, window: Object.assign(win, timers) });
  return { document, window, win, timers };
}

test('R-UNIT-PRELOADER-01: Given the page loads, then the preloader is marked loaded and removed after its fade', () => {
  const { document, window, win, timers } = preloader();
  win.dispatchEvent(new window.Event('load'));
  const node = document.querySelector('.preloader');
  assert.equal(node.getAttribute('aria-busy'), 'false');
  assert.equal(node.classList.contains('is-loaded'), true);
  timers.tick(800);
  assert.equal(document.querySelector('.preloader'), null);
});

test('R-UNIT-PRELOADER-02: Given load never fires, then the 12 s fail-safe still removes it; a document already complete finishes at once', () => {
  const stuck = preloader();
  stuck.timers.tick(12000); stuck.timers.tick(800);
  assert.equal(stuck.document.querySelector('.preloader'), null);
  const done = preloader(undefined, 'complete');
  assert.equal(done.document.querySelector('.preloader').classList.contains('is-loaded'), true);
});

test('R-UNIT-PRELOADER-03: Given load and pageshow both fire, then finishing happens once; without a preloader nothing runs', () => {
  const { document, window, win, timers } = preloader();
  win.dispatchEvent(new window.Event('load')); win.dispatchEvent(new window.Event('pageshow'));
  assert.equal(timers.pending, 1, 'only one removal is scheduled');
  timers.tick(800);
  assert.equal(document.querySelector('.preloader'), null);
  const none = preloader('<main></main>');
  assert.equal(none.timers.pending, 0);
});

function starred({ config = null, placements = [] } = {}) {
  const dom = browser('<div id="proj-starred-grid"></div>');
  const { document } = dom;
  const registered = [], plans = [];
  const root = {
    PortfolioAdConfig: config ? { starred: config } : undefined,
    PortfolioStarredAdPlanner: { planBatch: (state, keys, options) => { plans.push({ keys, options }); return { state: { ...state, seen: keys.length }, placements }; } },
    PortfolioAdsense: { register: grid => registered.push(grid) }
  };
  load('starred-ads.js', { document, window: root, Object });
  const grid = document.getElementById('proj-starred-grid');
  const cards = n => Array.from({ length: n }, (_, i) => Object.assign(document.createElement('article'), { id: `card-${i}` }));
  return { document, grid, ads: root.PortfolioStarredAds, registered, plans, cards };
}
const verified = { enabled: true, unit: { client: 'ca-pub-1234567890123456', slot: '42', format: 'fluid', layoutKey: '-6t+ed+2i-1n-4w' } };

test('R-UNIT-STARRED-01: Given no verified ad configuration, then cards are appended in order with no ad and the grid is still registered', () => {
  for (const config of [null, { ...verified, enabled: false }, { ...verified, unit: { ...verified.unit, client: 'pub-1' } }, { ...verified, unit: { ...verified.unit, format: 'auto' } }]) {
    const { grid, ads, registered, plans, cards } = starred({ config });
    ads.append(grid, cards(3), ['a', 'b', 'c'], true);
    assert.deepEqual([...grid.children].map(node => node.id), ['card-0', 'card-1', 'card-2']);
    assert.equal(plans.length, 0, 'the planner is not consulted');
    assert.deepEqual(registered, [grid]);
  }
});

test('R-UNIT-STARRED-02: Given a verified configuration, then cards are grouped and a planned ad is placed after the planned card', () => {
  const { grid, ads, plans, cards } = starred({ config: verified, placements: [{ key: 'starred-ad-1', afterIndex: 2 }] });
  ads.append(grid, cards(3), ['a', 'b', 'c'], true);
  assert.deepEqual(plans[0].keys, ['a', 'b', 'c']);
  assert.equal(plans[0].options.initial, true);
  const children = [...grid.children];
  assert.deepEqual(children.map(node => node.className), ['starred-card-group', 'ads-resume-post-advertising js-adsense', 'starred-card-group']);
  assert.deepEqual([...children[0].children].map(node => node.id), ['card-0', 'card-1']);
  assert.deepEqual([...children[2].children].map(node => node.id), ['card-2']);
  const ad = children[1];
  assert.equal(ad.getAttribute('aria-labelledby'), 'starred-ad-1-label');
  assert.equal(ad.dataset.adPlacement, 'starred-ad-1');
  const ins = ad.querySelector('template').content.querySelector('ins');
  assert.equal(ins.dataset.adClient, verified.unit.client);
  assert.equal(ins.dataset.adSlot, '42');
  assert.equal(ins.dataset.adFormat, 'fluid');
  assert.equal(ins.dataset.adLayoutKey, verified.unit.layoutKey);
});

test('R-UNIT-STARRED-03: Given a later batch, then its cards continue in the current group', () => {
  const { grid, ads, cards } = starred({ config: verified });
  ads.append(grid, cards(2), ['a', 'b'], true);
  const more = cards(1); more[0].id = 'card-next';
  ads.append(grid, more, ['c'], false);
  assert.equal(grid.children.length, 1);
  assert.deepEqual([...grid.children[0].children].map(node => node.id), ['card-0', 'card-1', 'card-next']);
});
