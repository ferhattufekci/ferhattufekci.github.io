import test from 'node:test';
import assert from 'node:assert/strict';
import { browser, load, key } from './helpers/browser-dom.js';

const markup = `
  <button class="resume-personality-info" aria-expanded="false" aria-describedby="personality-info-tip">i</button>
  <div id="personality-info-tip" role="tooltip"><a href="#report">report</a></div>
  <p id="outside">outside</p>`;

function setup({ focusVisible = false, html = markup } = {}) {
  const dom = browser(html);
  const { document, window } = dom;
  const button = document.querySelector('.resume-personality-info');
  if (button) button.matches = selector => (selector === ':focus-visible' ? focusVisible : window.Element.prototype.matches.call(button, selector));
  load('resume-info-tip.js', { document });
  const tip = document.getElementById('personality-info-tip');
  const click = node => { const event = new window.Event('click', { bubbles: true, cancelable: true }); node.dispatchEvent(event); return event; };
  const state = () => ({ open: tip.classList.contains('is-open'), expanded: button.getAttribute('aria-expanded'), suppressed: button.classList.contains('suppress-hover-tip') });
  return { ...dom, button, tip, click, state };
}

test('R-UNIT-TIP-01: Given the closed tooltip, when its button is clicked, then it opens with aria-expanded true; a second click closes it', () => {
  const { button, click, state } = setup();
  assert.equal(click(button).defaultPrevented, true);
  assert.deepEqual(state(), { open: true, expanded: 'true', suppressed: false });
  click(button);
  assert.deepEqual(state(), { open: false, expanded: 'false', suppressed: true }, 'closing by click also suppresses the CSS hover tooltip');
});

test('R-UNIT-TIP-02: Given the open tooltip, then a click outside closes it and a click inside it keeps it open', () => {
  const { document, button, tip, click, state } = setup();
  click(button);
  click(tip.querySelector('a'));
  assert.equal(state().open, true);
  click(document.getElementById('outside'));
  assert.deepEqual(state(), { open: false, expanded: 'false', suppressed: true });
});

test('R-UNIT-TIP-03: Given the open tooltip, when Escape is pressed, then it closes; other keys do nothing', () => {
  const { window, document, button, click, state } = setup();
  click(button);
  document.dispatchEvent(key(window, 'Enter'));
  assert.equal(state().open, true);
  document.dispatchEvent(key(window, 'Escape'));
  assert.equal(state().open, false);
});

test('R-UNIT-TIP-04: Given hover suppressed after a click close, then pointer exit or blur re-enables hover, except a pointer exit while keyboard-focused', () => {
  const mouse = setup();
  mouse.click(mouse.button); mouse.click(mouse.button);
  mouse.button.dispatchEvent(new mouse.window.Event('mouseleave'));
  assert.equal(mouse.state().suppressed, false);
  const keyboard = setup({ focusVisible: true });
  keyboard.click(keyboard.button); keyboard.click(keyboard.button);
  keyboard.button.dispatchEvent(new keyboard.window.Event('mouseleave'));
  assert.equal(keyboard.state().suppressed, true, 'a keyboard-focused button keeps hover suppressed on pointer exit');
  keyboard.button.dispatchEvent(new keyboard.window.Event('blur'));
  assert.equal(keyboard.state().suppressed, false);
});

test('R-UNIT-TIP-05: Given a page without the tooltip, then the script does nothing and throws nothing', () => {
  assert.doesNotThrow(() => setup({ html: '<p>no tooltip</p>' }));
});
