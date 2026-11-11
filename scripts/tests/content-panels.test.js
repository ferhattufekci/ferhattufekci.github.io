import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { browser, key } from './helpers/browser-dom.js';

const panels = createRequire(import.meta.url)('../../js/page-content-panels.js');
const page = (attrs = 'class="pt-page pt-page-current"') =>
  `<section id="blog" ${attrs}><div class="page-content-panel" tabindex="0"><a href="#x">link</a></div></section>`;

function setup(html = page(), options) {
  const dom = browser(html, options);
  const panel = dom.scrollable(dom.document.querySelector('.page-content-panel'));
  Object.defineProperty(panel, 'scrollHeight', { value: 3000 });
  Object.defineProperty(panel, 'clientHeight', { value: 500 });
  const controller = panels.init(dom.document, dom.win);
  return { ...dom, panel, controller };
}

test('R-UNIT-PANELS-01: Given a page, then its content panel is the scroll owner, or the page itself without one', () => {
  const { document } = browser(page() + '<section id="plain" class="pt-page"></section>');
  assert.equal(panels.get(document.getElementById('blog')).className, 'page-content-panel');
  assert.equal(panels.get(document.getElementById('plain')).id, 'plain');
});

test('R-UNIT-PANELS-02: Given the current page, when reset, then its panel returns to the top; hidden or inert pages are left alone', () => {
  const { document, panel, scrolls } = setup(page() + '<section id="other" class="pt-page"><div class="page-content-panel"></div></section>');
  panel.scrollTop = 800;
  panels.reset(document.getElementById('blog'));
  assert.deepEqual(scrolls.at(-1), { node: panel, top: 0, behavior: 'instant' });
  const before = scrolls.length;
  panels.reset(document.getElementById('other'));
  document.getElementById('blog').setAttribute('inert', '');
  panels.reset(document.getElementById('blog'));
  panels.reset(null);
  assert.equal(scrolls.length, before, 'no scroll for a non-current, inert or missing page');
});

test('R-UNIT-PANELS-03: Given the focused panel, when Home, End, PageDown or PageUp is pressed, then it scrolls to the matching position', () => {
  const { window, panel, scrolls } = setup();
  const press = name => { const event = key(window, name); panel.dispatchEvent(event); return event; };
  assert.equal(press('End').defaultPrevented, true);
  assert.equal(scrolls.at(-1).top, 3000);
  press('Home'); assert.equal(scrolls.at(-1).top, 0);
  press('PageDown'); assert.equal(scrolls.at(-1).top, 450, '90% of the visible height');
  press('PageUp'); assert.equal(scrolls.at(-1).top, 0);
  assert.equal(scrolls.at(-1).behavior, 'smooth');
  // Every jump first pins the current position so an earlier smooth scroll cannot undo it.
  assert.equal(scrolls.at(-2).behavior, 'instant');
});

test('R-UNIT-PANELS-04: Given reduced motion, when paging, then the jump is instant', () => {
  const { window, panel, scrolls } = setup(page(), { reducedMotion: true });
  panel.dispatchEvent(key(window, 'End'));
  assert.equal(scrolls.at(-1).behavior, 'instant');
});

test('R-UNIT-PANELS-05: Given a modifier, another key, a descendant target or an inert page, then native keyboard behaviour is untouched', () => {
  const { window, document, panel, scrolls } = setup();
  for (const event of [key(window, 'End', { shiftKey: true }), key(window, 'End', { ctrlKey: true }), key(window, 'ArrowDown')]) {
    panel.dispatchEvent(event); assert.equal(event.defaultPrevented, false);
  }
  const link = document.querySelector('a'), fromLink = key(window, 'End');
  link.dispatchEvent(fromLink);
  assert.equal(fromLink.defaultPrevented, false, 'a focused link inside the panel keeps its own keys');
  document.getElementById('blog').setAttribute('inert', '');
  const inert = key(window, 'End'); panel.dispatchEvent(inert);
  assert.equal(inert.defaultPrevented, false);
  assert.equal(scrolls.length, 0);
});

test('R-UNIT-PANELS-06: Given repeated initialisation, then one controller exists, and a final pagehide removes it', () => {
  const { window, document, win, panel, controller, scrolls } = setup();
  assert.equal(panels.init(document, win), controller, 'second init returns the same controller');
  win.dispatchEvent(Object.assign(new window.Event('pagehide'), { persisted: true }));
  panel.dispatchEvent(key(window, 'End'));
  assert.equal(scrolls.length, 2, 'a bfcache pagehide keeps the controller');
  win.dispatchEvent(Object.assign(new window.Event('pagehide'), { persisted: false }));
  panel.dispatchEvent(key(window, 'Home'));
  assert.equal(scrolls.length, 2, 'after a real pagehide the listener is gone');
  assert.notEqual(panels.init(document, win), controller, 'a new controller can be created');
});
