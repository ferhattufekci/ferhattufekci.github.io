import test from 'node:test';
import assert from 'node:assert/strict';
import { browser, load, key } from './helpers/browser-dom.js';

const markup = `
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="mobile-header"><button class="menu-toggle" aria-expanded="false"><i class="fa fa-bars"></i></button></div>
  <header id="site_header"><ul class="site-main-menu"><li><a class="pt-trigger" href="#blog">Blog</a></li></ul></header>
  <div class="mobile-menu-overlay"></div>
  <main id="main"><section class="pt-page pt-page-current"><h2>Blog</h2></section></main>
  <button id="outside">outside</button>`;

function setup({ innerWidth = 390, toggleVisible = true } = {}) {
  const dom = browser(markup);
  const { document, window, win } = dom;
  dom.layout(document.querySelector('.mobile-header'), { height: 68 });
  const toggle = document.querySelector('.menu-toggle');
  toggle.getClientRects = () => (toggleVisible ? [{}] : []);
  const focused = [];
  for (const node of document.querySelectorAll('a, button, h2, main')) node.focus = options => { focused.push([node, options]); };
  const waits = [];
  win.innerWidth = innerWidth;
  load('site-shell.js', { document, window: win,
    PortfolioMotionCompletion: { wait: (nodes, kind) => { const motion = { nodes, kind, cancelled: false, finished: Promise.resolve(), cancel() { motion.cancelled = true; } }; waits.push(motion); return motion; } } });
  const click = (node, keyboard = false) =>
    node.dispatchEvent(Object.assign(new window.Event('click', { bubbles: true, cancelable: true }), { detail: keyboard ? 0 : 1 }));
  return { ...dom, toggle, header: document.getElementById('site_header'), focused, waits, click };
}
// Focus calls come from the script's own realm, so compare the node and the option value.
const lastFocus = focused => ({ node: focused.at(-1)?.[0], preventScroll: focused.at(-1)?.[1]?.preventScroll });
const isOpen = ({ document, toggle }) => document.body.classList.contains('mobile-menu-open') && toggle.getAttribute('aria-expanded') === 'true';

test('R-UNIT-SHELL-01: Given the skip link, when used, then the current page heading takes focus without changing the URL', () => {
  const { document, window, focused } = setup();
  const event = new window.Event('click', { bubbles: true, cancelable: true });
  document.querySelector('.skip-link').dispatchEvent(event);
  assert.equal(event.defaultPrevented, true, 'the hash route is kept');
  const heading = document.querySelector('.pt-page-current h2');
  assert.equal(heading.getAttribute('tabindex'), '-1');
  assert.deepEqual(lastFocus(focused), { node: heading, preventScroll: true });
});

test('R-UNIT-SHELL-02: Given a phone, then the drawer starts closed and hidden from assistive technology, and the header height is published', () => {
  const { document, toggle, header } = setup();
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(toggle.getAttribute('aria-label'), 'Open menu');
  assert.equal(header.hasAttribute('inert'), true);
  assert.equal(header.getAttribute('aria-hidden'), 'true');
  assert.equal(document.documentElement.style.getPropertyValue('--mobile-header-height'), '68px');
});

test('R-UNIT-SHELL-03: Given the toggle, when clicked, then the drawer opens with matching state, label and icon, and a second click closes it', () => {
  const ctx = setup();
  const { toggle, header, click } = ctx;
  click(toggle);
  assert.equal(isOpen(ctx), true);
  assert.equal(toggle.getAttribute('aria-label'), 'Close menu');
  assert.equal(toggle.querySelector('i').className.includes('fa-times'), true);
  assert.equal(header.hasAttribute('inert'), false);
  click(toggle);
  assert.equal(isOpen(ctx), false);
  assert.equal(toggle.querySelector('i').className.includes('fa-bars'), true);
  assert.equal(ctx.waits.at(-1).kind, 'transition', 'closing waits for the real drawer transition');
});

test('R-UNIT-SHELL-04: Given an open drawer, then Escape, a navigation link and an outside click each close it', () => {
  const ctx = setup();
  const { window, document, toggle, click } = ctx;
  click(toggle);
  const escape = key(window, 'Escape'); document.dispatchEvent(escape);
  assert.equal(isOpen(ctx), false); assert.equal(escape.defaultPrevented, true);
  assert.deepEqual(lastFocus(ctx.focused), { node: toggle, preventScroll: true }, 'Escape returns focus to the toggle');
  click(toggle); click(document.querySelector('.pt-trigger'));
  assert.equal(isOpen(ctx), false);
  click(toggle); click(document.getElementById('outside'));
  assert.equal(isOpen(ctx), false);
  const closedEscape = key(window, 'Escape'); document.dispatchEvent(closedEscape);
  assert.equal(closedEscape.defaultPrevented, false, 'Escape is left alone when the drawer is closed');
});

test('R-UNIT-SHELL-05: Given keyboard opening, when the drawer motion finishes, then focus enters the first menu link', async () => {
  const { toggle, click, document, waits, focused } = setup();
  Object.defineProperty(document, 'activeElement', { configurable: true, get: () => toggle });
  click(toggle, true);
  await waits.at(-1).finished; await Promise.resolve();
  assert.deepEqual(lastFocus(focused), { node: document.querySelector('.site-main-menu a'), preventScroll: true });
});

test('R-UNIT-SHELL-06: Given a resize, then the drawer closes and a desktop width drops the drawer animation class', () => {
  const ctx = setup();
  const { win, window, toggle, header, click } = ctx;
  click(toggle);
  assert.equal(header.classList.contains('animate'), true);
  win.innerWidth = 1200;
  win.dispatchEvent(new window.Event('resize'));
  assert.equal(isOpen(ctx), false);
  assert.equal(header.classList.contains('animate'), false);
});

test('R-UNIT-SHELL-07: Given closeMenu, then it closes the drawer and resolves after the closing motion', async () => {
  const ctx = setup();
  ctx.click(ctx.toggle);
  await ctx.win.PortfolioSiteShell.closeMenu();
  assert.equal(isOpen(ctx), false);
});

test('R-UNIT-SHELL-08: Given hybrid input on the page arrows, then the latest pointer type is recorded for styling', () => {
  const dom = browser('<div class="mobile-header"></div><button class="menu-toggle"><i></i></button><header id="site_header"></header><nav class="lmpixels-arrows-nav"></nav>');
  dom.document.querySelector('.menu-toggle').getClientRects = () => [{}];
  load('site-shell.js', { document: dom.document, window: dom.win, PortfolioMotionCompletion: { wait: () => ({ finished: Promise.resolve(), cancel() {} }) } });
  const arrows = dom.document.querySelector('.lmpixels-arrows-nav');
  for (const pointerType of ['touch', 'mouse']) arrows.dispatchEvent(Object.assign(new dom.window.Event('pointerdown'), { pointerType }));
  assert.equal(arrows.getAttribute('data-pointer-type'), 'mouse');
});
