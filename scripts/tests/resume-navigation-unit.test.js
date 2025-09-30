import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { browser } from './helpers/browser-dom.js';

const require = createRequire(import.meta.url);
const navigation = require('../../js/resume-navigation.js');
const panels = require('../../js/page-content-panels.js');

const markup = (attrs = 'class="pt-page pt-page-current"') => `
  <section id="resume" ${attrs}>
    <h2 class="section-title">Resume</h2>
    <nav class="resume-navigation"><div class="category-filter-bar">
      <button data-resume-target="all">All</button>
      <button data-resume-target="resume-skills">Top Skills</button>
      <button data-resume-target="resume-certificates">Certifications</button>
    </div></nav>
    <div class="page-content-panel">
      <div id="resume-skills"><h3>Top Skills</h3></div>
      <div id="resume-certificates"><h3>Certifications</h3></div>
    </div>
  </section>`;

function setup(attrs, options) {
  const dom = browser(markup(attrs), options);
  dom.win.PortfolioContentPanels = panels;
  const page = dom.document.getElementById('resume');
  const panel = dom.scrollable(page.querySelector('.page-content-panel'));
  const bar = dom.scrollable(page.querySelector('.category-filter-bar'));
  dom.layout(panel, { top: 100, height: 600 });
  dom.layout(bar, { left: 0, width: 300 });
  dom.layout(dom.document.getElementById('resume-skills'), { top: 400 });
  dom.layout(dom.document.getElementById('resume-certificates'), { top: 1500 });
  const buttons = [...page.querySelectorAll('[data-resume-target]')];
  buttons.forEach((button, index) => dom.layout(button, { left: index * 150, width: 140 }));
  const controller = navigation.init(dom.document, dom.win);
  const click = (button, keyboard = false) =>
    button.dispatchEvent(Object.assign(new dom.window.Event('click', { bubbles: true }), { detail: keyboard ? 0 : 1 }));
  const lifecycle = (type, target = page) =>
    dom.document.dispatchEvent(Object.assign(new dom.window.Event(`portfolio:page-${type}`), { detail: { page: target } }));
  return { ...dom, page, panel, bar, buttons, controller, click, lifecycle };
}
const current = buttons => buttons.filter(button => button.getAttribute('aria-current') === 'location').map(b => b.textContent);

test('R-UNIT-RESNAV-01: Given Resume is current, then All is the only selection and the panel starts at the top', () => {
  const { buttons, scrolls, panel } = setup();
  assert.deepEqual(current(buttons), ['All']);
  assert.deepEqual(scrolls.at(-1), { node: panel, top: 0, behavior: 'instant' });
});

test('R-UNIT-RESNAV-02: Given a destination, when clicked, then it is selected and the panel scrolls to it below the panel padding', () => {
  const { buttons, click, scrolls, panel } = setup();
  click(buttons[1]);
  assert.deepEqual(current(buttons), ['Top Skills']);
  // target top 400 - panel top 100 - padding 16 = 284
  assert.deepEqual(scrolls.at(-1), { node: panel, top: 284, behavior: 'smooth' });
  assert.equal(scrolls.at(-2).behavior, 'instant', 'a previous smooth scroll is cancelled first');
});

test('R-UNIT-RESNAV-03: Given reduced motion, then the jump is instant; All always returns to the top and resets the bar', () => {
  const { buttons, click, scrolls, bar } = setup(undefined, { reducedMotion: true });
  click(buttons[2]);
  assert.equal(scrolls.at(-1).behavior, 'instant');
  bar.scrollLeft = 120;
  click(buttons[0]);
  assert.equal(scrolls.at(-1).top, 0);
  assert.equal(bar.scrollLeft, 0);
});

test('R-UNIT-RESNAV-04: Given keyboard activation, then focus moves to the target heading without scrolling the page', () => {
  const { buttons, click, document } = setup();
  const heading = document.querySelector('#resume-certificates h3');
  let options = null;
  heading.focus = value => { options = value; };
  click(buttons[2], true);
  assert.equal(heading.getAttribute('tabindex'), '-1');
  assert.deepEqual(options, { preventScroll: true });
});

test('R-UNIT-RESNAV-05: Given a button outside the visible bar, when focused or chosen, then only the bar scrolls horizontally', () => {
  const { buttons, bar, window } = setup();
  buttons[2].dispatchEvent(new window.Event('focusin', { bubbles: true }));
  // button right 440 exceeds bar right 300 by 140, plus the 3px margin
  assert.equal(bar.scrollLeft, 143);
});

test('R-UNIT-RESNAV-06: Given a page transition, then a request waits for it to settle and only the latest one runs', () => {
  const { buttons, click, lifecycle, scrolls } = setup();
  lifecycle('activate');
  const before = scrolls.length;
  click(buttons[1]); click(buttons[2]);
  assert.equal(scrolls.length, before, 'nothing scrolls during the transition');
  lifecycle('settled');
  assert.equal(scrolls.at(-1).top, 1384, 'the last request (Certifications) wins: 1500 - 100 - 16');
  assert.deepEqual(current(buttons), ['Certifications']);
  lifecycle('settled');
  assert.equal(scrolls.at(-1).top, 1384, 'a second settle does not repeat it');
});

test('R-UNIT-RESNAV-07: Given another page or an inert Resume, then clicks and lifecycle events do nothing', () => {
  const { buttons, click, lifecycle, scrolls, page, document } = setup();
  const before = scrolls.length;
  lifecycle('activate', document.body);
  lifecycle('settled', document.body);
  page.setAttribute('inert', '');
  click(buttons[1]);
  assert.equal(scrolls.length, before);
  assert.deepEqual(current(buttons), ['All']);
});

test('R-UNIT-RESNAV-08: Given no Resume navigation, then init returns null; repeated init reuses the controller until pagehide', () => {
  const empty = browser('<section id="resume" class="pt-page"></section>');
  empty.win.PortfolioContentPanels = panels;
  assert.equal(navigation.init(empty.document, empty.win), null);
  const { document, win, window, controller, buttons, click, scrolls } = setup();
  assert.equal(navigation.init(document, win), controller);
  win.dispatchEvent(Object.assign(new window.Event('pagehide'), { persisted: false }));
  const before = scrolls.length;
  click(buttons[1]);
  assert.equal(scrolls.length, before, 'listeners are removed after a real pagehide');
});
