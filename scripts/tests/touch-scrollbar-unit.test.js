import test from 'node:test';
import assert from 'node:assert/strict';
import { browser, load } from './helpers/browser-dom.js';

// layout: gutter is the probe's scrollbar width (5 = classic styled bar, 0 = overlay).
function setup({ coarse = true, gutter = 0, scrollHeight = 3000, clientHeight = 600 } = {}) {
  const dom = browser('<section class="pt-page pt-page-current" id="resume"><div class="page-content-panel"></div></section>', { coarse });
  const { document, window, win, layout } = dom;
  const proto = Object.getPrototypeOf(Object.getPrototypeOf(document.body));
  Object.defineProperty(proto, 'offsetWidth', { configurable: true, get() {
    return this.classList?.contains('touch-scrollbar-probe') ? 50 : this.classList?.contains('touch-scrollbar') ? 5 : 0; } });
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get() {
    return this.classList?.contains('touch-scrollbar-probe') ? 50 - gutter : 0; } });
  const panel = dom.scrollable(document.querySelector('.page-content-panel'));
  Object.defineProperty(panel, 'scrollHeight', { configurable: true, get: () => scrollHeight });
  Object.defineProperty(panel, 'clientHeight', { configurable: true, value: clientHeight });
  layout(panel, { top: 100, left: 0, width: 390, height: clientHeight });
  Object.assign(win, { innerHeight: 700 });
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 390 });
  load('touch-scrollbar.js', {
    document, window: win,
    getComputedStyle: node => ({ overflowY: node === panel ? 'auto' : 'visible' })
  });
  const bar = () => document.querySelector('.touch-scrollbar');
  const thumb = () => document.querySelector('.touch-scrollbar-thumb');
  return { ...dom, panel, bar, thumb, api: win.touchScrollbar, window };
}

test('R-UNIT-TOUCHBAR-01: Given a fine pointer or a classic styled scrollbar, then no bar is drawn and the native one is kept', () => {
  for (const options of [{ coarse: false }, { coarse: true, gutter: 5 }]) {
    const { document, bar } = setup(options);
    assert.equal(bar(), null, JSON.stringify(options));
    assert.equal(document.documentElement.classList.contains('has-touch-scrollbar'), false);
    assert.equal(document.querySelector('.touch-scrollbar-probe'), null, 'the probe is removed after measuring');
  }
});

test('R-UNIT-TOUCHBAR-02: Given a coarse pointer with overlay scrollbars, then one decorative bar is drawn beside the scroll owner', () => {
  const { document, bar } = setup();
  assert.equal(document.documentElement.classList.contains('has-touch-scrollbar'), true);
  assert.equal(document.querySelectorAll('.touch-scrollbar').length, 1);
  assert.equal(bar().getAttribute('aria-hidden'), 'true');
  assert.equal(bar().hidden, false);
  assert.equal(bar().style.top, '100px');
  assert.equal(bar().style.height, '600px');
  assert.equal(bar().style.left, '385px', 'owner right 390 - bar width 5');
});

// The script listens for scroll in the capture phase, which linkedom does not implement;
// a bubbling scroll event reaches the same document listener with the same target.
const scroll = ({ window, flush }, node) => { node.dispatchEvent(new window.Event('scroll', { bubbles: true })); flush(); };

test('R-UNIT-TOUCHBAR-03: Given the owner scrolls, then the thumb keeps its proportional size and follows the position', () => {
  const ctx = setup();
  const { panel, thumb } = ctx;
  assert.equal(thumb().style.height, '120px', '600 * 600 / 3000');
  panel.scrollTop = 2400; // the end: range = 3000 - 600
  scroll(ctx, panel);
  assert.equal(thumb().style.transform, 'translateY(480px)', 'track 600 - thumb 120');
  panel.scrollTop = 1200;
  scroll(ctx, panel);
  assert.equal(thumb().style.transform, 'translateY(240px)');
});

test('R-UNIT-TOUCHBAR-04: Given content that does not overflow, then the bar is hidden; a tiny ratio keeps a 24px thumb', () => {
  const short = setup({ scrollHeight: 600 });
  assert.equal(short.bar().hidden, true);
  const long = setup({ scrollHeight: 60000 });
  assert.equal(long.thumb().style.height, '24px');
});

test('R-UNIT-TOUCHBAR-05: Given start is called again, then no second bar is created', () => {
  const { document, api } = setup();
  api.start(); api.update();
  assert.equal(document.querySelectorAll('.touch-scrollbar').length, 1);
});
